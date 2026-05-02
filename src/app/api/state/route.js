import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/db';
import { broadcast as sseBroadcast } from '@/lib/sse';
import logger from '@/lib/logger';

const KEYS = {
  bracket: 'dashboard:bracket',
  broadcast: 'dashboard:currentBroadcast',
  display: 'dashboard:currentDisplay',
  mapScores: 'dashboard:mapScores',
  banpickData: 'dashboard:banpickData',
  welcomeConfig: 'dashboard:welcomeConfig',
};

// ---- 輕量結構驗證：用來擋下明顯脏資料，避免寫入 DB 後讓 OBS 端崩潰 ----

const VALID_DISPLAY_IDS = new Set(['welcome', 'bracket', 'banpick', 'map-score']);
const VALID_STAGES = new Set(['qf', 'sf', 'f', 'champ']);

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function validateBracket(b) {
  if (!isPlainObject(b)) {return false;}
  // qf / sf / f 為陣列；champ 為物件。允許長度與細節寬鬆，只要型別正確。
  if (!Array.isArray(b.qf) || !Array.isArray(b.sf) || !Array.isArray(b.f)) {return false;}
  if (!isPlainObject(b.champ)) {return false;}
  return true;
}

function validateCurrentBroadcast(cb) {
  if (!isPlainObject(cb)) {return false;}
  // stage 允許 null 或合法 stage 字串
  if (cb.stage !== null && cb.stage !== undefined && !VALID_STAGES.has(cb.stage)) {
    return false;
  }
  // index 允許 null 或數字
  if (cb.index !== null && cb.index !== undefined && typeof cb.index !== 'number') {
    return false;
  }
  return true;
}

function validateCurrentDisplay(d) {
  return typeof d === 'string' && VALID_DISPLAY_IDS.has(d);
}

function validateMapScores(m) {
  // 必須是物件，鍵為 stage:index 字串，值為陣列
  if (!isPlainObject(m)) {return false;}
  for (const v of Object.values(m)) {
    if (!Array.isArray(v)) {return false;}
  }
  return true;
}

function validateBanpickData(b) {
  // 物件，每個值是 { teamA: { bans: [] }, teamB: { bans: [] } } 或類似
  if (!isPlainObject(b)) {return false;}
  return true;
}

function validateWelcomeConfig(w) {
  if (!isPlainObject(w)) {return false;}
  if (w.bannerUrl !== undefined && typeof w.bannerUrl !== 'string') {return false;}
  return true;
}

export async function GET() {
  try {
    // Default Values
    const DEFAULT_BRACKET = {
      qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
      sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
      f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
      champ: { team: '', score: '0' }
    };
    const DEFAULT_BROADCAST = { stage: null, index: null };
    const DEFAULT_DISPLAY = 'welcome';
    const DEFAULT_MAP_SCORES = {};
    const DEFAULT_BANPICK = {};
    const DEFAULT_WELCOME = { bannerUrl: '/images/AET2025_full_title_logo.png' };

    const bracket = kvGet(KEYS.bracket);
    const broadcast = kvGet(KEYS.broadcast);
    const display = kvGet(KEYS.display);
    const mapScores = kvGet(KEYS.mapScores);
    const banpickData = kvGet(KEYS.banpickData);
    const welcomeConfig = kvGet(KEYS.welcomeConfig);

    // Merge with defaults to ensure no empty values
    const responseData = {
      bracket: bracket || DEFAULT_BRACKET,
      currentBroadcast: (broadcast && broadcast.stage !== null) ? broadcast : DEFAULT_BROADCAST,
      currentDisplay: display || DEFAULT_DISPLAY,
      mapScores: mapScores || DEFAULT_MAP_SCORES,
      banpickData: banpickData || DEFAULT_BANPICK,
      welcomeConfig: welcomeConfig || DEFAULT_WELCOME,
    };

    return NextResponse.json({
      ok: true,
      data: responseData,
    }, { status: 200 });
  } catch (error) {
    logger.error('[API] GET /api/state 失敗:', error.message);
    return NextResponse.json({ ok: false, error: 'READ_FAILED' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ ok: false, error: 'EMPTY_BODY' }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON', details: parseError.message }, { status: 400 });
    }

    if (!isPlainObject(body)) {
      return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
    }

    const { bracket, currentBroadcast, currentDisplay, mapScores, banpickData, welcomeConfig } = body;

    // 收集驗證錯誤；任何一個欄位驗證失敗 → 整個請求拒絕（不部分寫入）
    const errors = [];
    if (bracket !== undefined && !validateBracket(bracket)) {errors.push('bracket');}
    if (currentBroadcast !== undefined && !validateCurrentBroadcast(currentBroadcast)) {errors.push('currentBroadcast');}
    if (currentDisplay !== undefined && !validateCurrentDisplay(currentDisplay)) {errors.push('currentDisplay');}
    if (mapScores !== undefined && !validateMapScores(mapScores)) {errors.push('mapScores');}
    if (banpickData !== undefined && !validateBanpickData(banpickData)) {errors.push('banpickData');}
    if (welcomeConfig !== undefined && !validateWelcomeConfig(welcomeConfig)) {errors.push('welcomeConfig');}

    if (errors.length) {
      logger.warn('[API] POST /api/state 驗證失敗:', errors.join(','));
      return NextResponse.json({ ok: false, error: 'VALIDATION_FAILED', fields: errors }, { status: 400 });
    }

    if (bracket !== undefined) {
      kvSet(KEYS.bracket, bracket);
      // 廣播 bracket 更新，讓 OBS 即時同步
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'bracket-update',
          data: { bracket },
          timestamp: Date.now(),
        });
      } catch {}
    }
    if (currentBroadcast !== undefined) {
      kvSet(KEYS.broadcast, currentBroadcast);
      // 廣播目前播報對戰更新，供 OBS 高亮顯示
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'current-broadcast-update',
          data: { currentBroadcast },
          timestamp: Date.now(),
        });
      } catch {}
    }
    if (currentDisplay !== undefined) {
      kvSet(KEYS.display, currentDisplay);
      // 同步透過 SSE 廣播顯示切換，確保 OBS 即時更新
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'display-change',
          data: { displayId: String(currentDisplay) },
          timestamp: Date.now(),
        });
      } catch {}
    }

    if (mapScores !== undefined) {
      kvSet(KEYS.mapScores, mapScores);
      // 廣播地圖與比數更新，提供 OBS 或其他客戶端同步
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'map-score-update',
          data: { mapScores },
          timestamp: Date.now(),
        });
      } catch {}
    }


    if (banpickData !== undefined) {
      kvSet(KEYS.banpickData, banpickData);
      // 廣播banpick資料更新
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'banpick-update',
          data: { banpickData },
          timestamp: Date.now(),
        });
      } catch {}
    }

    if (welcomeConfig !== undefined) {
      kvSet(KEYS.welcomeConfig, welcomeConfig);
      // 廣播 welcomeConfig 更新
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'welcome-config-update',
          data: { welcomeConfig },
          timestamp: Date.now(),
        });
      } catch {}
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED', details: e.message }, { status: 500 });
  }
}

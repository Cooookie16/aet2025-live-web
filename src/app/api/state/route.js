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
    
    const { bracket, currentBroadcast, currentDisplay, mapScores, banpickData, welcomeConfig } = body || {};

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

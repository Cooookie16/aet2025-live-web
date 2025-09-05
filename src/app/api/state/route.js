import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/db';
import { broadcast as sseBroadcast } from '@/lib/sse';

const KEYS = {
  bracket: 'dashboard:bracket',
  broadcast: 'dashboard:currentBroadcast',
  display: 'dashboard:currentDisplay',
  mapScores: 'dashboard:mapScores',
  teamImages: 'dashboard:teamImages',
  selectedTeamForDisplay: 'dashboard:selectedTeamForDisplay',
  banpickData: 'dashboard:banpickData',
};

export async function GET() {
  try {
    const bracket = kvGet(KEYS.bracket);
    const broadcast = kvGet(KEYS.broadcast);
    const display = kvGet(KEYS.display);
    const mapScores = kvGet(KEYS.mapScores);
    const teamImages = kvGet(KEYS.teamImages);
    const selectedTeamForDisplay = kvGet(KEYS.selectedTeamForDisplay);
    const banpickData = kvGet(KEYS.banpickData);
    
    const responseData = {};
    if (bracket) responseData.bracket = bracket;
    if (broadcast && broadcast.stage !== null) responseData.currentBroadcast = broadcast;
    if (display) responseData.currentDisplay = display;
    if (mapScores) responseData.mapScores = mapScores;
    if (teamImages) responseData.teamImages = teamImages;
    if (selectedTeamForDisplay) responseData.selectedTeamForDisplay = selectedTeamForDisplay;
    if (banpickData) responseData.banpickData = banpickData;
    
    return NextResponse.json({
      ok: true,
      data: responseData,
    }, { status: 200 });
  } catch (e) {
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
      console.error('解析請求JSON失敗:', parseError);
      return NextResponse.json({ ok: false, error: 'INVALID_JSON', details: parseError.message }, { status: 400 });
    }
    
    const { bracket, currentBroadcast, currentDisplay, mapScores, teamImages, selectedTeamForDisplay, banpickData } = body || {};

    console.log('API接收到的資料:', {
      bracket: bracket ? '有資料' : '無資料',
      currentBroadcast: currentBroadcast ? '有資料' : '無資料',
      currentDisplay: currentDisplay ? '有資料' : '無資料',
      mapScores: mapScores ? '有資料' : '無資料',
      teamImages: teamImages ? '有資料' : '無資料',
      selectedTeamForDisplay: selectedTeamForDisplay ? '有資料' : '無資料',
      banpickData: banpickData ? '有資料' : '無資料'
    });

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

    if (teamImages !== undefined) {
      kvSet(KEYS.teamImages, teamImages);
      // 廣播隊伍圖片更新
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'team-images-update',
          data: { teamImages },
          timestamp: Date.now(),
        });
      } catch {}
    }

    if (selectedTeamForDisplay !== undefined) {
      kvSet(KEYS.selectedTeamForDisplay, selectedTeamForDisplay);
      // 廣播選定隊伍更新
      try {
        sseBroadcast({
          action: 'broadcast',
          type: 'selected-team-update',
          data: { selectedTeamForDisplay: String(selectedTeamForDisplay) },
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('API狀態更新失敗:', e);
    console.error('錯誤堆疊:', e.stack);
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED', details: e.message }, { status: 500 });
  }
}

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
};

export async function GET() {
  try {
    const bracket = kvGet(KEYS.bracket);
    const broadcast = kvGet(KEYS.broadcast);
    const display = kvGet(KEYS.display);
    const mapScores = kvGet(KEYS.mapScores);
    const teamImages = kvGet(KEYS.teamImages);
    const selectedTeamForDisplay = kvGet(KEYS.selectedTeamForDisplay);
    
    const responseData = {};
    if (bracket) responseData.bracket = bracket;
    if (broadcast && broadcast.stage !== null) responseData.currentBroadcast = broadcast;
    if (display) responseData.currentDisplay = display;
    if (mapScores) responseData.mapScores = mapScores;
    if (teamImages) responseData.teamImages = teamImages;
    if (selectedTeamForDisplay) responseData.selectedTeamForDisplay = selectedTeamForDisplay;
    
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
    const body = await request.json();
    const { bracket, currentBroadcast, currentDisplay, mapScores, teamImages, selectedTeamForDisplay } = body || {};

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
      kvSet(KEYS.display, String(currentDisplay));
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
      kvSet(KEYS.selectedTeamForDisplay, String(selectedTeamForDisplay));
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('API狀態更新失敗:', e);
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED', details: e.message }, { status: 500 });
  }
}

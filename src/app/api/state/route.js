import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/db';
import { broadcast as sseBroadcast } from '@/lib/sse';

const KEYS = {
  bracket: 'dashboard:bracket',
  broadcast: 'dashboard:currentBroadcast',
  display: 'dashboard:currentDisplay',
};

export async function GET() {
  try {
    const bracket = kvGet(KEYS.bracket);
    const broadcast = kvGet(KEYS.broadcast);
    const display = kvGet(KEYS.display);
    return NextResponse.json({
      ok: true,
      data: {
        bracket: bracket ?? null,
        currentBroadcast: broadcast ?? null,
        currentDisplay: display ?? null,
      },
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'READ_FAILED' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bracket, currentBroadcast, currentDisplay } = body || {};

    if (bracket !== undefined) {
      kvSet(KEYS.bracket, JSON.stringify(bracket));
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
      kvSet(KEYS.broadcast, JSON.stringify(currentBroadcast));
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED' }, { status: 500 });
  }
}

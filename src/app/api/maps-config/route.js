import { NextResponse } from 'next/server';
import { getAllMaps, updateMapsConfig } from '@/lib/db';
import { broadcast as sseBroadcast } from '@/lib/sse';

export async function GET() {
  try {
    const json = getAllMaps();
    return NextResponse.json(json, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to read maps from DB', e);
    return NextResponse.json({ error: 'Failed to read maps' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    updateMapsConfig(body);
    
    // 廣播地圖配置更新事件，讓 OBS 頁面即時重新載入地圖資料
    try {
      sseBroadcast({
        action: 'broadcast',
        type: 'maps-config-update',
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      });
    } catch {}
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save maps to DB', e);
    return NextResponse.json({ error: 'Failed to save maps' }, { status: 500 });
  }
}
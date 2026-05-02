import { NextResponse } from 'next/server';

// 簡易記憶體存活表：clientId → { lastSeen, source, page }
// 使用者很少（OBS 1~2 個來源 + Dashboard），不需持久化。
// 模組層級的 Map 在 Next.js Node runtime 下會跨請求共享。
const heartbeats = new Map();

// 視為「離線」的閾值：超過此時間未上報就不再列入線上
const OFFLINE_AFTER_MS = 30000;

function pruneStale() {
  const now = Date.now();
  for (const [id, h] of heartbeats.entries()) {
    if (!h || (now - (h.lastSeen || 0)) > OFFLINE_AFTER_MS * 4) {
      heartbeats.delete(id);
    }
  }
}

export async function POST(request) {
  try {
    const text = await request.text();
    let body = {};
    if (text) {
      try { body = JSON.parse(text); } catch { body = {}; }
    }
    const clientId = typeof body.clientId === 'string' && body.clientId
      ? body.clientId.slice(0, 64)
      : `anon-${Math.random().toString(36).slice(2, 10)}`;
    const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'unknown';
    const page = typeof body.page === 'string' ? body.page.slice(0, 64) : '';

    heartbeats.set(clientId, {
      lastSeen: Date.now(),
      source,
      page,
    });
    pruneStale();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED', details: e?.message }, { status: 500 });
  }
}

export async function GET() {
  pruneStale();
  const now = Date.now();
  const list = [];
  for (const [clientId, h] of heartbeats.entries()) {
    const ageMs = now - (h.lastSeen || 0);
    list.push({
      clientId,
      source: h.source || 'unknown',
      page: h.page || '',
      lastSeen: h.lastSeen || 0,
      ageMs,
      online: ageMs <= OFFLINE_AFTER_MS,
    });
  }
  // 依最後出現時間排序
  list.sort((a, b) => b.lastSeen - a.lastSeen);
  const onlineCount = list.filter((h) => h.online).length;
  const onlineBySource = list.reduce((acc, h) => {
    if (!h.online) {return acc;}
    acc[h.source] = (acc[h.source] || 0) + 1;
    return acc;
  }, {});
  return NextResponse.json(
    { ok: true, now, onlineCount, onlineBySource, clients: list },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

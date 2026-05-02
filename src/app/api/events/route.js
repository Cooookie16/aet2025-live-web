// 以 Server-Sent Events 提供單向即時訊息
import { subscribe, getSince, getLastEventId } from '@/lib/sse';
import { kvGet } from '@/lib/db';

export async function GET(request) {
  const encoder = new TextEncoder();
  let isClosed = false;
  let heartbeat;
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk) => {
        if (isClosed) {
          return false;
        }
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          isClosed = true;
          try { clearInterval(heartbeat); } catch {}
          try { unsubscribe(); } catch {}
          try { controller.close(); } catch {}
          return false;
        }
      };

      // 心跳（保護 enqueue）
      heartbeat = setInterval(() => {
        if (isClosed) {
          return;
        }
        safeEnqueue(encoder.encode(`: heartbeat\n\n`));
      }, 10000);

      // 初始訊息
      safeEnqueue(encoder.encode(`event: connected\n`));
      safeEnqueue(encoder.encode(`id: ${getLastEventId()}\n`));
      safeEnqueue(encoder.encode(`data: {"message":"SSE connected"}\n\n`));

      // 斷線回放：如客戶端帶 Last-Event-ID，回補缺漏事件；超出緩衝則發送 resync 信號
      let shouldSendStateSnapshot = true;
      try {
        const lastIdHeader = request.headers.get('last-event-id') || request.headers.get('Last-Event-ID');
        if (lastIdHeader) {
          const { events: missed, lostEvents } = getSince(lastIdHeader);
          if (lostEvents) {
            // 緩衝外的事件已遺失 → 通知客戶端執行全量同步（拉 /api/state）
            const resyncPayload = JSON.stringify({
              action: 'broadcast',
              type: 'resync',
              data: { reason: 'buffer_overflow' },
              timestamp: Date.now(),
            });
            safeEnqueue(encoder.encode(`id: ${getLastEventId()}\n`));
            safeEnqueue(encoder.encode(`data: ${resyncPayload}\n\n`));
            shouldSendStateSnapshot = false;
          } else if (missed.length) {
            for (const record of missed) {
              safeEnqueue(encoder.encode(`id: ${record.id}\n`));
              safeEnqueue(encoder.encode(`data: ${record.payload}\n\n`));
            }
            shouldSendStateSnapshot = false;
          } else {
            // 沒漏事件，不需重送 snapshot
            shouldSendStateSnapshot = false;
          }
        }
      } catch {}

      // 首次連線（沒有 Last-Event-ID）：推送目前的畫面狀態，避免客戶端刷新後回到 welcome
      if (shouldSendStateSnapshot) {
        try {
          const currentDisplay = kvGet('dashboard:currentDisplay');
          if (currentDisplay) {
            const snapshot = JSON.stringify({
              action: 'broadcast',
              type: 'display-change',
              data: { displayId: currentDisplay },
              timestamp: Date.now(),
            });
            safeEnqueue(encoder.encode(`id: ${getLastEventId()}\n`));
            safeEnqueue(encoder.encode(`data: ${snapshot}\n\n`));
          }
        } catch {}
      }

      // 推送函式
      const send = (record) => {
        if (isClosed) {
          return;
        }
        if (!safeEnqueue(encoder.encode(`id: ${record.id}\n`))) {
          return;
        }
        safeEnqueue(encoder.encode(`data: ${record.payload}\n\n`));
      };

      // 訂閱
      unsubscribe = subscribe(send);

      // 嘗試監聽 abort（改用 request.signal）
      try {
        request?.signal?.addEventListener?.('abort', () => {
          if (isClosed) {
            return;
          }
          isClosed = true;
          try { clearInterval(heartbeat); } catch {}
          try { unsubscribe(); } catch {}
          try { controller.close(); } catch {}
        });
      } catch {}
    },
    cancel() {
      if (isClosed) {
        return;
      }
      isClosed = true;
      try { clearInterval(heartbeat); } catch {}
      try { unsubscribe(); } catch {}
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
      'Keep-Alive': 'timeout=60',
    },
  });
}

// 禁用非 GET
export async function POST() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

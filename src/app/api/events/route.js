// 以 Server-Sent Events 提供單向即時訊息
import { subscribe } from '@/lib/sse';
import { kvGet } from '@/lib/db';

export async function GET() {
  const encoder = new TextEncoder();
  let isClosed = false;
  let heartbeat;
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      // 心跳（保護 enqueue）
      heartbeat = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          isClosed = true;
          try { clearInterval(heartbeat); } catch {}
          try { unsubscribe(); } catch {}
          try { controller.close(); } catch {}
        }
      }, 10000);

      // 初始訊息
      try {
        controller.enqueue(encoder.encode(`event: connected\n`));
        controller.enqueue(encoder.encode(`data: {"message":"SSE connected"}\n\n`));
      } catch {
        isClosed = true;
      }

      // 立即推送目前的畫面狀態（避免客戶端刷新後回到 welcome）
      try {
        const currentDisplay = kvGet('dashboard:currentDisplay');
        if (currentDisplay) {
          const snapshot = JSON.stringify({
            action: 'broadcast',
            type: 'display-change',
            data: { displayId: currentDisplay },
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(`data: ${snapshot}\n\n`));
        }
      } catch {}

      // 推送函式
      const send = (payload) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          isClosed = true;
          try { clearInterval(heartbeat); } catch {}
          try { unsubscribe(); } catch {}
          try { controller.close(); } catch {}
        }
      };

      // 訂閱
      unsubscribe = subscribe(send);

      // 嘗試監聽 abort（某些環境不提供 signal）
      try {
        // @ts-ignore
        controller.signal?.addEventListener?.('abort', () => {
          if (isClosed) return;
          isClosed = true;
          try { clearInterval(heartbeat); } catch {}
          try { unsubscribe(); } catch {}
          try { controller.close(); } catch {}
        });
      } catch {}
    },
    cancel() {
      if (isClosed) return;
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

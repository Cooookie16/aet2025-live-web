// 廣播訊息 API（同時推送 SSE）
import { broadcast as sseBroadcast } from '@/lib/sse';
let messages = [];

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // 專門處理舊版輪詢端點：紀錄來源，回 410 並建議停止重試
    if (action === 'get-messages') {
      // 靜默處理deprecated警告

      return new Response(JSON.stringify({
        error: 'This endpoint is deprecated. Use SSE at /api/events.',
        hint: 'Please remove polling and switch to Server-Sent Events.'
      }), {
        status: 410, // Gone
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '120'
        }
      });
    }

    // 其他 query 一律 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // 移除 update-count 功能，因為現在由 events API 管理
    
    if (data.action === 'broadcast') {
      // 廣播訊息
      const message = {
        ...data,
        timestamp: Date.now()
      };
      messages.push(message);
      // 透過 SSE 推送即時訊息
      sseBroadcast(message);
      
      // 保持訊息數量在合理範圍內
      if (messages.length > 100) {
        messages = messages.slice(-50);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

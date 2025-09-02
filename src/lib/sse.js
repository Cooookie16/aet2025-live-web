// 簡易的 SSE 事件匯流排（記憶體級，僅適合單實例）
/** @type {Set<(record: { id: number, payload: string }) => void>} */
const subscribers = new Set();

// 事件序號與環形緩存（用於斷線回放）
let nextEventId = 1;
const RING_CAPACITY = 200;
/** @type {{ id: number, payload: string }[]} */
const ringBuffer = [];

export function subscribe(send) {
  subscribers.add(send);
  return () => {
    subscribers.delete(send);
  };
}

export function broadcast(event) {
  // 確保時間戳存在
  const enriched = {
    ...event,
    timestamp: typeof event?.timestamp === 'number' ? event.timestamp : Date.now(),
  };
  const id = nextEventId++;
  const payload = JSON.stringify(enriched);
  const record = { id, payload };

  // 寫入環形緩存
  ringBuffer.push(record);
  if (ringBuffer.length > RING_CAPACITY) {
    ringBuffer.shift();
  }

  // 廣播給所有訂閱者
  for (const send of subscribers) {
    try {
      send(record);
    } catch {
      // 忽略單一客戶端錯誤
    }
  }
}

export function getSubscriberCount() {
  return subscribers.size;
}

export function getSince(lastEventId) {
  const since = Number(lastEventId);
  if (!Number.isFinite(since) || since < 0) return [...ringBuffer];
  return ringBuffer.filter(r => r.id > since);
}

export function getLastEventId() {
  return ringBuffer.length ? ringBuffer[ringBuffer.length - 1].id : 0;
}


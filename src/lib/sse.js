import logger from '@/lib/logger';
// 簡易的 SSE 事件匯流排（記憶體級，僅適合單實例）
/** @type {Set<(record: { id: number, payload: string }) => void>} */
const subscribers = new Set();

// 事件序號與環形緩存（用於斷線回放）
// 使用者很少，記憶體成本極低；放大緩衝降低斷線過長導致狀態不一致機率
let nextEventId = 1;
const RING_CAPACITY = 2000;
/** @type {{ id: number, payload: string }[]} */
const ringBuffer = [];

export function subscribe(send) {
  subscribers.add(send);
  return () => {
    subscribers.delete(send);
  };
};

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
    } catch (error) {
      // 使用輕量 logger 降低生產環境噪音
      logger.error('[SSE] 客戶端廣播失敗:', error.message);
    }
  }
}

export function getSubscriberCount() {
  return subscribers.size;
}

/**
 * 取得 lastEventId 之後的事件。
 * 回傳 { events, lostEvents }：
 *   - events: 緩衝中比 lastEventId 還新的事件
 *   - lostEvents: true 代表 lastEventId 已不在緩衝範圍內（客戶端應做全量同步）
 */
export function getSince(lastEventId) {
  const since = Number(lastEventId);
  if (!Number.isFinite(since) || since < 0) {
    return { events: [], lostEvents: false };
  }
  if (ringBuffer.length === 0) {
    return { events: [], lostEvents: false };
  }
  const oldestId = ringBuffer[0].id;
  const newestId = ringBuffer[ringBuffer.length - 1].id;
  // 已經是最新或更新（不可能但以防萬一）
  if (since >= newestId) {
    return { events: [], lostEvents: false };
  }
  // 斷線太久，緩衝裡最舊的事件 id 已經比 since 還新 → 中間有漏，需 resync
  if (since < oldestId - 1) {
    return { events: [], lostEvents: true };
  }
  return {
    events: ringBuffer.filter(r => r.id > since),
    lostEvents: false,
  };
}

export function getLastEventId() {
  return ringBuffer.length ? ringBuffer[ringBuffer.length - 1].id : 0;
}

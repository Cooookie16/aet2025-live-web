// 簡易的 SSE 事件匯流排（記憶體級，僅適合單實例）
/** @type {Set<(data: any) => void>} */
const subscribers = new Set();

export function subscribe(send) {
  subscribers.add(send);
  return () => {
    subscribers.delete(send);
  };
}

export function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const send of subscribers) {
    try {
      send(payload);
    } catch {
      // 忽略單一客戶端錯誤
    }
  }
}

export function getSubscriberCount() {
  return subscribers.size;
}



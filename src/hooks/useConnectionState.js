'use client';

import { useEffect, useState } from 'react';
import { fetchJsonSafe } from '@/lib/fetchWithRetry';
import { useLiveSync } from '@/hooks/useLiveSync';

/**
 * useConnectionState — Dashboard 用的連線/在線監控。
 *
 * 提供：
 *  - isConnected：到 server 的 SSE 是否活著
 *  - lastEventTime：最後收到 SSE 事件的時間
 *  - obsOnline：是否至少有一個 OBS 來源（powertech / bigspace / scorebar）正在心跳
 *  - obsClients：在線 OBS 來源的詳細列表
 */
export function useConnectionState({ pollMs = 5000 } = {}) {
  const [obsClients, setObsClients] = useState([]);

  const { status, lastEventTime } = useLiveSync({
    // Dashboard 不需處理事件本身（其他 hook 已經各自處理），這裡只關心連線狀態
    onEvent: undefined,
    onResync: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const json = await fetchJsonSafe('/api/heartbeat', { cache: 'no-store' }, null);
      if (cancelled) {
        return;
      }
      const list = Array.isArray(json?.clients) ? json.clients : [];
      // 只保留 OBS 來源（避免把 dashboard 自己的心跳算進去；目前 dashboard 不上報）
      const obsList = list.filter((c) => typeof c?.source === 'string' && c.source.startsWith('obs-') && c.online);
      setObsClients(obsList);
    };
    tick();
    const t = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      try { clearInterval(t); } catch {}
    };
  }, [pollMs]);

  const isConnected = status === 'open';
  const obsOnline = obsClients.length > 0;

  return {
    isConnected,
    lastEventTime,
    obsOnline,
    obsClients,
  };
}

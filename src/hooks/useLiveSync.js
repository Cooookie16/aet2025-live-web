'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useLiveSync — 整合 OBS / 顯示頁的 SSE 連線、看門狗、退避重連、
 * 可見性與網路恢復偵測，並把事件派發給呼叫端的 onEvent 回呼。
 *
 * 設計重點（針對 OBS 無法刷新場景）：
 *  - 看門狗：超過 staleThresholdMs 沒有任何事件 → 強制重建 EventSource
 *  - 指數退避重連：上限 capDelayMs
 *  - 收到 `resync` 事件或重新連線時呼叫 onResync 觸發全量同步
 *  - 提供 status 與 lastEventTime 給 UI 用於顯示「重連中」覆蓋層
 *
 * 注意：onEvent / onResync 用 ref 持有最新版本，呼叫端不需 useCallback 也不會重連。
 *
 * @param {{
 *   url?: string,
 *   onEvent?: (msg: any) => void,
 *   onResync?: () => void | Promise<void>,
 *   staleThresholdMs?: number,
 *   watchdogIntervalMs?: number,
 *   capDelayMs?: number,
 *   enabled?: boolean,
 * }} opts
 */
export function useLiveSync({
  url = '/api/events',
  onEvent,
  onResync,
  staleThresholdMs = 25000,
  watchdogIntervalMs = 5000,
  capDelayMs = 30000,
  enabled = true,
} = {}) {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'open' | 'reconnecting' | 'stale'
  const [lastEventTime, setLastEventTime] = useState(0);

  // 將 callback 放到 ref，避免依賴變化導致重建連線
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onResyncRef.current = onResync; }, [onResync]);

  const esRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const lastEventTimeRef = useRef(0);
  const mountedRef = useRef(true);

  const safeSetStatus = useCallback((s) => {
    if (!mountedRef.current) {
      return;
    }
    setStatus(s);
  }, []);

  const safeSetLastEventTime = useCallback((t) => {
    lastEventTimeRef.current = t;
    if (!mountedRef.current) {
      return;
    }
    setLastEventTime(t);
  }, []);

  const closeEventSource = useCallback(() => {
    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback((connectFn) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
    const attempt = retryAttemptRef.current || 0;
    const delayMs = Math.min(capDelayMs, 1000 * Math.pow(2, attempt));
    retryAttemptRef.current = attempt + 1;
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connectFn();
      }
    }, delayMs);
  }, [capDelayMs]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || typeof window === 'undefined') {
      return () => {};
    }

    const connect = () => {
      closeEventSource();
      safeSetStatus(esRef.current ? 'reconnecting' : 'connecting');

      let es;
      try {
        es = new EventSource(url);
      } catch {
        scheduleReconnect(connect);
        return;
      }
      esRef.current = es;

      es.onopen = () => {
        retryAttemptRef.current = 0;
        safeSetStatus('open');
        // 連線成功時更新一次 lastEventTime，避免 watchdog 立即誤判
        safeSetLastEventTime(Date.now());
        // 重新連線後觸發一次全量同步，補齊任何可能漏掉的狀態
        try {
          if (typeof onResyncRef.current === 'function') {
            onResyncRef.current();
          }
        } catch {}
      };

      es.onerror = () => {
        closeEventSource();
        safeSetStatus('reconnecting');
        scheduleReconnect(connect);
      };

      es.onmessage = (evt) => {
        try {
          const raw = (evt && typeof evt.data === 'string') ? evt.data.trim() : '';
          if (!raw || raw[0] !== '{') {
            return;
          }
          const msg = JSON.parse(raw);
          if (!msg) {
            return;
          }
          // 任何事件都更新 lastEventTime（包含未識別的事件，代表連線活著）
          safeSetLastEventTime(msg.timestamp || Date.now());

          // 服務端要求全量同步：例如客戶端斷太久，環形緩衝外的事件已經遺失
          if (msg.type === 'resync') {
            try {
              if (typeof onResyncRef.current === 'function') {
                onResyncRef.current();
              }
            } catch {}
            return;
          }

          if (typeof onEventRef.current === 'function') {
            onEventRef.current(msg);
          }
        } catch {
          // 單一壞訊息不應中斷整個連線
        }
      };
    };

    // 看門狗：超過 staleThresholdMs 沒有任何事件 → 主動關閉並重建
    const watchdog = setInterval(() => {
      const now = Date.now();
      const last = lastEventTimeRef.current || 0;
      const stale = last > 0 && (now - last) > staleThresholdMs;
      if (esRef.current && stale) {
        safeSetStatus('stale');
        // 立即重連，不等待退避
        retryAttemptRef.current = 0;
        closeEventSource();
        connect();
      }
    }, watchdogIntervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !esRef.current) {
        retryAttemptRef.current = 0;
        connect();
      }
    };
    const onOnline = () => {
      if (!esRef.current) {
        retryAttemptRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    connect();

    return () => {
      mountedRef.current = false;
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
      try { window.removeEventListener('online', onOnline); } catch {}
      try { clearInterval(watchdog); } catch {}
      if (retryTimerRef.current) {
        try { clearTimeout(retryTimerRef.current); } catch {}
      }
      closeEventSource();
    };
  }, [url, enabled, staleThresholdMs, watchdogIntervalMs, closeEventSource, scheduleReconnect, safeSetStatus, safeSetLastEventTime]);

  return { status, lastEventTime };
}

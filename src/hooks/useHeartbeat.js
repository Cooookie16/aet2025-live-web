'use client';

import { useEffect, useRef } from 'react';
import { postJsonWithRetry } from '@/lib/fetchWithRetry';

/**
 * useHeartbeat — 定時上報「我還活著」給 /api/heartbeat。
 *
 * Dashboard 透過 GET /api/heartbeat 觀察 OBS 來源是否真的在運作，
 * 而不只是 SSE 連線開著。
 *
 * @param {{
 *   source: string,        // 'obs-powertech' | 'obs-bigspace' | 'obs-scorebar' | ...
 *   intervalMs?: number,
 *   enabled?: boolean,
 * }} opts
 */
export function useHeartbeat({ source, intervalMs = 10000, enabled = true } = {}) {
  const clientIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    if (!clientIdRef.current) {
      try {
        const stored = sessionStorage.getItem('aet:clientId');
        if (stored) {
          clientIdRef.current = stored;
        } else {
          const id = `${source}-${Math.random().toString(36).slice(2, 10)}`;
          sessionStorage.setItem('aet:clientId', id);
          clientIdRef.current = id;
        }
      } catch {
        clientIdRef.current = `${source}-${Math.random().toString(36).slice(2, 10)}`;
      }
    }

    const send = () => {
      try {
        postJsonWithRetry('/api/heartbeat', {
          clientId: clientIdRef.current,
          source,
          page: typeof window !== 'undefined' ? window.location?.pathname || '' : '',
        }, { retry: { retries: 1, timeoutMs: 4000 } });
      } catch {}
    };

    // 立即送一次，然後固定間隔
    send();
    const t = setInterval(send, intervalMs);

    // 頁面從隱藏轉為可見時也補送一次
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        send();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      try { clearInterval(t); } catch {}
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
    };
  }, [source, intervalMs, enabled]);
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveSync } from '@/hooks/useLiveSync';
import { fetchJsonSafe } from '@/lib/fetchWithRetry';

/**
 * useObsLiveData — OBS 顯示頁共用的資料同步 hook。
 *
 * 整合：
 *  - 啟動時與 SSE resync 時的全量 /api/state 拉取
 *  - SSE 事件分發（display-change / bracket-update / current-broadcast-update /
 *    map-score-update / banpick-update / welcome-config-update / banner-update /
 *    maps-config-update / custom-message）
 *  - imageTimestamp（用於強制重載地圖 / banner 圖片）
 *
 * 也回傳 useLiveSync 的 status / lastEventTime 給 UI 用於顯示重連覆蓋層。
 */
export function useObsLiveData() {
  const [currentDisplay, setCurrentDisplay] = useState(null);
  const [displayData, setDisplayData] = useState({});
  const [bracket, setBracket] = useState(null);
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [banpickData, setBanpickData] = useState({});
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now());

  const lastUpdateRef = useRef(0);
  const currentDisplayRef = useRef(null);
  useEffect(() => { currentDisplayRef.current = currentDisplay; }, [currentDisplay]);

  // 全量同步：啟動 + SSE resync + 連線恢復時呼叫
  const fullSync = useCallback(async () => {
    const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
    const d = json?.data;
    if (!d) {
      return;
    }
    if (typeof d.currentDisplay === 'string' && d.currentDisplay) {
      setCurrentDisplay(d.currentDisplay);
    }
    if (d.bracket) {
      setBracket(d.bracket);
    }
    if (d.currentBroadcast) {
      setCurrentBroadcast(d.currentBroadcast);
    }
    if (d.mapScores) {
      setDisplayData((prev) => ({ ...prev, mapScores: d.mapScores }));
    }
    if (d.banpickData) {
      setBanpickData(d.banpickData);
    }
    if (d.welcomeConfig) {
      setDisplayData((prev) => ({ ...prev, welcomeConfig: d.welcomeConfig }));
    }
  }, []);

  // 事件分發
  const handleEvent = useCallback((msg) => {
    if (!msg) {
      return;
    }
    if (msg.timestamp && msg.timestamp <= (lastUpdateRef.current || 0)) {
      return;
    }
    const ts = msg.timestamp || Date.now();
    lastUpdateRef.current = ts;

    switch (msg.type) {
      case 'display-change': {
        if (msg?.data?.displayId) {
          setCurrentDisplay(msg.data.displayId);
        }
        // 合併（不要覆蓋 mapScores）
        setDisplayData((prev) => ({
          ...prev,
          ...(msg.data || {}),
          lastUpdate: ts,
        }));
        break;
      }
      case 'bracket-update': {
        if (msg?.data?.bracket) {
          setBracket(msg.data.bracket);
        }
        break;
      }
      case 'current-broadcast-update': {
        if (msg?.data?.currentBroadcast) {
          setCurrentBroadcast(msg.data.currentBroadcast);
        }
        break;
      }
      case 'map-score-update': {
        if (msg?.data?.mapScores) {
          setDisplayData((prev) => ({ ...prev, mapScores: msg.data.mapScores }));
        }
        break;
      }
      case 'banpick-update': {
        if (msg?.data?.banpickData) {
          setBanpickData(msg.data.banpickData);
        }
        break;
      }
      case 'welcome-config-update': {
        if (msg?.data?.welcomeConfig) {
          setDisplayData((prev) => ({
            ...prev,
            welcomeConfig: msg.data.welcomeConfig,
            lastUpdate: ts,
          }));
        }
        break;
      }
      case 'banner-update': {
        setImageTimestamp(Date.now());
        if (msg?.data?.url) {
          setDisplayData((prev) => ({
            ...prev,
            welcomeConfig: { ...(prev.welcomeConfig || {}), bannerUrl: msg.data.url },
            lastUpdate: ts,
          }));
        }
        break;
      }
      case 'maps-config-update': {
        setImageTimestamp(Date.now());
        break;
      }
      case 'custom-message': {
        setDisplayData((prev) => ({
          ...prev,
          customMessage: msg?.data?.message,
          timestamp: msg?.data?.timestamp,
          lastUpdate: ts,
        }));
        break;
      }
      default:
        break;
    }
  }, []);

  // 啟動時拉一次全量
  useEffect(() => {
    fullSync();
  }, [fullSync]);

  // 切換到 map-score 或切換目前對戰時，主動補一次 mapScores（避免 SSE 漏推）
  useEffect(() => {
    const isMapScore = currentDisplay === 'map-score';
    const { stage, index } = currentBroadcast || {};
    if (!isMapScore || (!stage && stage !== 0) || typeof index !== 'number') {
      return;
    }
    (async () => {
      const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
      const d = json?.data;
      if (d?.mapScores) {
        setDisplayData((prev) => ({ ...prev, mapScores: d.mapScores }));
      }
    })();
  }, [currentDisplay, currentBroadcast]);

  const { status, lastEventTime } = useLiveSync({
    onEvent: handleEvent,
    onResync: fullSync,
  });

  return {
    currentDisplay,
    displayData,
    bracket,
    currentBroadcast,
    banpickData,
    imageTimestamp,
    status,
    lastEventTime,
  };
}

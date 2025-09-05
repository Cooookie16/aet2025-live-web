'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import OBSWelcomeDisplay from '@/components/obs/OBSWelcomeDisplay';
import OBSBracketDisplay from '@/components/obs/OBSBracketDisplay';
import OBSBanpickDisplay from '@/components/obs/OBSBanpickDisplay';
import OBSMapScoreDisplay from '@/components/obs/OBSMapScoreDisplay';
import OBSTeamImageDisplay from '@/components/obs/OBSTeamImageDisplay';
import './obs.css';

// 關閉 OBS 端除錯輸出
if (typeof window !== 'undefined') {
  try {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.error = noop;
  } catch {}
}

export default function OBSLiveUI() {
  const [currentDisplay, setCurrentDisplay] = useState(null);
  const [displayData, setDisplayData] = useState({});
  const [bracket, setBracket] = useState(null); // 從後端載入並由 SSE 即時更新
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [isConnected, setIsConnected] = useState(false);
  const [teamImages, setTeamImages] = useState({});
  const [selectedTeamForDisplay, setSelectedTeamForDisplay] = useState('');
  const [banpickData, setBanpickData] = useState({});
  
  // 以 SSE 取代輪詢（僅在掛載時建立一次連線）
  const lastUpdateRef = useRef(0);
  const esRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const currentDisplayRef = useRef(null);

  useEffect(() => { currentDisplayRef.current = currentDisplay; }, [currentDisplay]);

  useEffect(() => {
    // 啟動時從後端讀取當前狀態，避免在沒有收到即時事件前畫面無法同步
    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          let json = null;
          try { json = await res.json(); } catch { json = null; }
          const d = json?.data || {};
          if (typeof d?.currentDisplay === 'string' && d.currentDisplay) {
            setCurrentDisplay(d.currentDisplay);
          }
          if (d?.bracket) {
            setBracket(d.bracket);
          }
          if (d?.currentBroadcast) {
            setCurrentBroadcast(d.currentBroadcast);
          }
          if (d?.mapScores) {
            setDisplayData(prev => ({
              ...prev,
              mapScores: d.mapScores
            }));
          }
          if (d?.teamImages) {
            setTeamImages(d.teamImages);
          }
          if (d?.selectedTeamForDisplay) {
            setSelectedTeamForDisplay(d.selectedTeamForDisplay);
          }
          if (d?.banpickData) {
            setBanpickData(d.banpickData);
          }
        }
      } catch (e) {
        // 靜默處理錯誤
      }
    })();

    // 後備：每 3 秒輪詢一次狀態以矯正畫面（當 SSE 未連線時才輪詢）
    const poll = setInterval(async () => {
      // 若 SSE 連線存在但長時間未更新，也主動校正一次狀態
      const now = Date.now();
      const tooStale = (now - (lastUpdateRef.current || 0)) > 15000; // 15s 無事件視為過舊
      if (esRef.current && !tooStale) return; // SSE 正常且不過舊時暫停輪詢
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        let json = null;
        try { json = await res.json(); } catch { json = null; }
        const d = json?.data || {};
        const srv = typeof d?.currentDisplay === 'string' ? d.currentDisplay : null;
        if (srv && srv !== currentDisplayRef.current) {
          setCurrentDisplay(srv);
        }
        if (d?.bracket) {
          setBracket(d.bracket);
        }
        if (d?.currentBroadcast) {
          setCurrentBroadcast(d.currentBroadcast);
        }
        if (d?.mapScores) {
          setDisplayData(prev => ({ ...prev, mapScores: d.mapScores }));
        }
        if (d?.teamImages) {
          setTeamImages(d.teamImages);
        }
        if (d?.selectedTeamForDisplay) {
          setSelectedTeamForDisplay(d.selectedTeamForDisplay);
        }
        if (d?.banpickData) {
          setBanpickData(d.banpickData);
        }
      } catch {}
    }, 3000);

    const connect = () => {
      try {
        if (esRef.current) {
          try { esRef.current.close(); } catch {}
          esRef.current = null;
        }
        const es = new EventSource('/api/events');
        esRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
          retryAttemptRef.current = 0; // 重置退避
        };
        es.onerror = (evt) => {
          setIsConnected(false);
          try { es.close(); } catch {}
          esRef.current = null;
          // 指數退避（上限 30s）
          const nextDelay = Math.min(30000, 1000 * Math.pow(2, retryAttemptRef.current || 0));
          retryAttemptRef.current = (retryAttemptRef.current || 0) + 1;
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => connect(), nextDelay);
        };
        es.onmessage = (evt) => {
          try {
            // 忽略空白或無效資料框，避免 JSON.parse 例外
            const raw = (evt && typeof evt.data === 'string') ? evt.data.trim() : '';
            if (!raw || raw[0] !== '{') return;
            const latestMessage = JSON.parse(raw);
            if (!latestMessage) return;
            if (latestMessage.timestamp && latestMessage.timestamp <= (lastUpdateRef.current || 0)) return;

            if (latestMessage.type === 'display-change') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              setCurrentDisplay(latestMessage.data.displayId);
              // 重要：合併，不要覆蓋既有 mapScores
              setDisplayData(prev => ({
                ...prev,
                ...latestMessage.data,
                lastUpdate: lastUpdateRef.current
              }));
            } else if (latestMessage.type === 'bracket-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.bracket) {
                setBracket(latestMessage.data.bracket);
              }
            } else if (latestMessage.type === 'current-broadcast-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.currentBroadcast) {
                setCurrentBroadcast(latestMessage.data.currentBroadcast);
              }
            } else if (latestMessage.type === 'map-score-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.mapScores) {
                setDisplayData(prev => ({
                  ...prev,
                  mapScores: latestMessage.data.mapScores
                }));
                // 如果整體 mapScores 被重置為空物件，清空本地快取，避免殘留顯示
                try {
                  const isEmpty = latestMessage && latestMessage.data && latestMessage.data.mapScores && Object.keys(latestMessage.data.mapScores).length === 0;
                  if (isEmpty) {
                    lastMapsCacheRef.current = {};
                  }
                } catch {}
              }
            } else if (latestMessage.type === 'custom-message') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              setDisplayData(prev => ({
                ...prev,
                customMessage: latestMessage.data.message,
                timestamp: latestMessage.data.timestamp,
                lastUpdate: lastUpdateRef.current
              }));
            } else if (latestMessage.type === 'team-images-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.teamImages) {
                setTeamImages(latestMessage.data.teamImages);
              }
            } else if (latestMessage.type === 'selected-team-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.selectedTeamForDisplay) {
                setSelectedTeamForDisplay(latestMessage.data.selectedTeamForDisplay);
              }
            } else if (latestMessage.type === 'banpick-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.banpickData) {
                setBanpickData(latestMessage.data.banpickData);
              }
            }
          } catch (e) {
            // 靜默處理錯誤
          }
        };
      } catch (e) {
        setIsConnected(false);
      }
    };
    // 看門狗：若 25s 沒有任何事件，主動關閉 SSE 並觸發重連
    const watchdog = setInterval(() => {
      const now = Date.now();
      const staleMs = now - (lastUpdateRef.current || 0);
      if (esRef.current && staleMs > 25000) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
        // 立即嘗試重連（不等待退避）
        connect();
      }
    }, 5000);


    // 初次建立連線
    connect();

    // 當頁面由隱藏轉為顯示、或網路回復時，嘗試重連
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !esRef.current) {
        connect();
      }
    };
    const onOnline = () => {
      if (!esRef.current) connect();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
      try { window.removeEventListener('online', onOnline); } catch {}
      try { clearInterval(poll); } catch {}
      try { clearInterval(watchdog); } catch {}
      if (retryTimerRef.current) {
        try { clearTimeout(retryTimerRef.current); } catch {}
      }
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, []);

  // 新增：當切換顯示至 map-score 或切換目前對戰時，立即拉取最新 state 並更新 mapScores
  useEffect(() => {
    const fetchForSwitch = async () => {
      const isMapScore = currentDisplay === 'map-score';
      const { stage, index } = currentBroadcast || {};
      if (!isMapScore || (!stage && stage !== 0) || typeof index !== 'number') return;
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const d = json?.data || {};
        if (d?.mapScores) {
          setDisplayData(prev => ({ ...prev, mapScores: d.mapScores }));
        }
      } catch {}
    };
    fetchForSwitch();
  }, [currentDisplay, currentBroadcast]);


  // 渲染不同的顯示介面
  const renderDisplay = () => {
    if (!currentDisplay) return null; // 尚未取得狀態前不渲染，避免 welcome 閃爍
    switch (currentDisplay) {
      case 'welcome':
        return <OBSWelcomeDisplay data={displayData} />;
      case 'bracket':
        return <OBSBracketDisplay data={{ bracket, currentBroadcast }} />;
      case 'banpick':
        return <OBSBanpickDisplay data={{ currentBroadcast, banpickData, bracket }} />;
      case 'map-score':
        return <OBSMapScoreDisplay data={{ currentBroadcast, mapScores: displayData.mapScores, bracket }} />;
      case 'team-image':
        return <OBSTeamImageDisplay data={{ selectedTeamForDisplay, teamImages }} />;
      default:
        return null;
    }
  };

  return (
    <div className="obs-container bg-transparent text-white">
      {/* 主要顯示區域 - 限制在 800x600 */}
      <div className="w-[800px] h-[600px] flex items-center justify-center overflow-hidden">
        {renderDisplay()}
      </div>
    </div>
  );
}
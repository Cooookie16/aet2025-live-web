'use client';

import { useState, useEffect, useMemo } from 'react';

// 地圖比數狀態管理 hook
export function useMapScores() {
  const [mapScores, setMapScores] = useState({});
  const [mapsData, setMapsData] = useState([]);

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              const d = json?.data || {};
              if (d.mapScores) {
                setMapScores(d.mapScores || {});
              }
            } catch (parseError) {
              console.warn('解析API回應JSON失敗:', parseError);
            }
          }
        }
      } catch {}
      
      // 後備：從 localStorage 載入
      try {
        const rawMapScores = localStorage.getItem('dashboard:mapScores');
        if (rawMapScores) {
          setMapScores(JSON.parse(rawMapScores));
        }
      } catch {}
    };
    loadState();
  }, []);

  // 載入地圖資料庫
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const res = await fetch('/maps.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('maps.json 載入失敗');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setMapsData(data);
        }
      } catch (e) {
        console.warn('載入地圖資料庫失敗:', e);
        setMapsData([]);
      }
    };
    loadMaps();
  }, []);

  // 同步地圖比數到後端
  useEffect(() => {
    try { localStorage.setItem('dashboard:mapScores', JSON.stringify(mapScores)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapScores })
        });
      } catch {}
    })();
  }, [mapScores]);

  // 取得可用的模式選項
  const modeOptions = useMemo(() => {
    return mapsData.map(item => item.mode);
  }, [mapsData]);

  // 根據選擇的模式取得對應的地圖選項
  const getMapOptionsForMode = (mode) => {
    const modeData = mapsData.find(item => item.mode === mode);
    return modeData ? modeData.maps : [];
  };

  // 取得目前播報對戰的地圖資料
  const getCurrentMatchMaps = (currentBroadcast) => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) return [];
    if (typeof index !== 'number') return [];
    
    const key = `${stage}:${index}`;
    const entry = mapScores[key];
    if (Array.isArray(entry) && entry.length === 5) return entry;
    return Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: '0', scoreB: '0' }));
  };

  // 更新目前對戰的地圖資料
  const updateCurrentMatchMap = (currentBroadcast, idx, field, value) => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) return;
    if (typeof index !== 'number') return;
    
    const key = `${stage}:${index}`;
    setMapScores(prev => {
      const current = Array.isArray(prev[key]) ? [...prev[key]] : Array.from({ length: 5 }, () => ({ mode: '', map: '' }));
      const item = { ...current[idx], [field]: value };
      current[idx] = item;
      return { ...prev, [key]: current };
    });
  };

  // 重置地圖比數
  const handleResetMapScores = () => {
    try {
      const ok = window.confirm('確認要重置所有地圖與比數資料嗎？此動作無法復原。');
      if (!ok) return;
    } catch {}
    setMapScores({});
  };

  return {
    mapScores,
    setMapScores,
    mapsData,
    modeOptions,
    getMapOptionsForMode,
    getCurrentMatchMaps,
    updateCurrentMatchMap,
    handleResetMapScores
  };
}

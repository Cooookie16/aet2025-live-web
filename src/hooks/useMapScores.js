'use client';

import { useState, useEffect, useMemo } from 'react';

// 地圖比數狀態管理 hook
export function useMapScores() {
  const [mapScores, setMapScores] = useState({});
  const [mapsData, setMapsData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      let apiDataLoaded = false;
      
      // 優先從 API 載入
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
                apiDataLoaded = true;
              }
            } catch {
              // 靜默處理錯誤
            }
          }
        }
      } catch {
        // 靜默處理錯誤
      }
      
      // 只有在 API 載入失敗時才使用 localStorage 作為後備
      if (!apiDataLoaded) {
        try {
          const rawMapScores = localStorage.getItem('dashboard:mapScores');
          if (rawMapScores) {
            setMapScores(JSON.parse(rawMapScores));
          }
        } catch {
          // 靜默處理錯誤
        }
      }
      
      // 載入完成後設定初始化標記
      setIsInitialized(true);
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
      } catch {
        // 靜默處理錯誤
        setMapsData([]);
      }
    };
    loadMaps();
  }, []);

  // 同步地圖比數到後端
  useEffect(() => {
    // 只有在初始化完成後才進行同步
    if (!isInitialized) {
      return;
    }
    
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
  }, [mapScores, isInitialized]);

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
    if (!stage && stage !== 0) {return [];}
    if (typeof index !== 'number') {return [];}
    
    const key = `${stage}:${index}`;
    const entry = mapScores[key];
    if (Array.isArray(entry) && entry.length === 5) {
      // 確保每個地圖都有 scoreA 和 scoreB 欄位
      return entry.map(map => ({
        mode: map.mode || '',
        map: map.map || '',
        scoreA: map.scoreA || '0',
        scoreB: map.scoreB || '0'
      }));
    }
    return Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: '0', scoreB: '0' }));
  };

  // 更新目前對戰的地圖資料
  const updateCurrentMatchMap = (currentBroadcast, idx, field, value) => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {return;}
    if (typeof index !== 'number') {return;}
    
    const key = `${stage}:${index}`;
    setMapScores(prev => {
      const current = Array.isArray(prev[key]) ? [...prev[key]] : Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: '0', scoreB: '0' }));
      const item = { ...current[idx], [field]: value };
      current[idx] = item;
      
      // 計算該場對戰贏得的地圖數量
      const mapsWonA = current.reduce((count, map) => {
        const scoreA = parseInt(map.scoreA || '0');
        const scoreB = parseInt(map.scoreB || '0');
        return count + (scoreA > scoreB ? 1 : 0);
      }, 0);
      
      const mapsWonB = current.reduce((count, map) => {
        const scoreA = parseInt(map.scoreA || '0');
        const scoreB = parseInt(map.scoreB || '0');
        return count + (scoreB > scoreA ? 1 : 0);
      }, 0);
      
      // 同步總分到 Bracket（透過 API）
      syncTotalScoreToBracket(stage, index, mapsWonA, mapsWonB);
      
      return { ...prev, [key]: current };
    });
  };

  // 同步總分到 Bracket
  const syncTotalScoreToBracket = async (stage, index, scoreA, scoreB) => {
    try {
      // 先取得目前的 bracket 資料
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const json = JSON.parse(text);
          const bracket = json?.data?.bracket;
          
          if (bracket) {
            const updatedBracket = { ...bracket };
            
            // 更新對應位置的總分
            if (stage === 'champ') {
              updatedBracket.champ.score = String(scoreA);
            } else if (updatedBracket[stage] && Array.isArray(updatedBracket[stage]) && index < updatedBracket[stage].length) {
              updatedBracket[stage][index] = {
                ...updatedBracket[stage][index],
                a: { ...updatedBracket[stage][index].a, score: String(scoreA) },
                b: { ...updatedBracket[stage][index].b, score: String(scoreB) }
              };
            }
            
            // 更新 bracket 資料
            await fetch('/api/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bracket: updatedBracket })
            });
          }
        }
      }
    } catch {
      // 靜默處理錯誤
    }
  };

  // 重置地圖比數
  const handleResetMapScores = () => {
    try {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('確認要重置所有地圖與比數資料嗎？此動作無法復原。');
      if (!ok) {
        return;
      }
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

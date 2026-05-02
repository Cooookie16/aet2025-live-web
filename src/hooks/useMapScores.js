'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchJsonSafe, postJsonWithRetry } from '@/lib/fetchWithRetry';

// 地圖比數狀態管理 hook
export function useMapScores() {
  const [mapScores, setMapScores] = useState({});
  const [mapsData, setMapsData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
      const d = json?.data;
      if (d?.mapScores) {
        setMapScores(d.mapScores || {});
      } else {
        // API 失敗時使用 localStorage 後備
        try {
          const rawMapScores = localStorage.getItem('dashboard:mapScores');
          if (rawMapScores) {
            setMapScores(JSON.parse(rawMapScores));
          }
        } catch {}
      }
      setIsInitialized(true);
    };
    loadState();
  }, []);

  // 載入地圖資料庫
  useEffect(() => {
    const loadMaps = async () => {
      const data = await fetchJsonSafe('/api/maps-config', { cache: 'no-store' }, []);
      if (Array.isArray(data)) {
        setMapsData(data);
      } else {
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
    postJsonWithRetry('/api/state', { mapScores });
  }, [mapScores, isInitialized]);

  // 取得可用的模式選項
  const modeOptions = useMemo(() => {
    return mapsData.map(item => item.mode);
  }, [mapsData]);

  // 根據選擇的模式取得對應的地圖選項
  const getMapOptionsForMode = (mode) => {
    const modeData = mapsData.find(item => item.mode === mode);
    // mapsData 更新為物件陣列，這裡只回傳名稱供下拉選單使用
    return modeData ? modeData.maps.map(m => m.name) : [];
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
    const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
    const bracket = json?.data?.bracket;
    if (!bracket) {
      return;
    }
    const updatedBracket = { ...bracket };
    if (stage === 'champ') {
      updatedBracket.champ.score = String(scoreA);
    } else if (updatedBracket[stage] && Array.isArray(updatedBracket[stage]) && index < updatedBracket[stage].length) {
      updatedBracket[stage][index] = {
        ...updatedBracket[stage][index],
        a: { ...updatedBracket[stage][index].a, score: String(scoreA) },
        b: { ...updatedBracket[stage][index].b, score: String(scoreB) }
      };
    }
    postJsonWithRetry('/api/state', { bracket: updatedBracket });
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

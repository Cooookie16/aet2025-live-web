'use client';

import { useState, useEffect } from 'react';
import { fetchJsonSafe, postJsonWithRetry } from '@/lib/fetchWithRetry';

// 賽程表狀態管理 hook
export function useBracketState() {
  const [bracket, setBracket] = useState({
    qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [isInitialized, setIsInitialized] = useState(false); // 追蹤是否已完成初始載入

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
      const data = json?.data;
      if (data) {
        if (data.bracket) {
          setBracket(data.bracket);
        }
        if (data.currentBroadcast) {
          setCurrentBroadcast(data.currentBroadcast);
        }
      } else {
        // API 完全失敗時，嘗試讀取 localStorage 後備
        try {
          const rawBracket = localStorage.getItem('dashboard:bracket');
          if (rawBracket) {
            setBracket(JSON.parse(rawBracket));
          }
          const rawBroadcast = localStorage.getItem('dashboard:currentBroadcast');
          if (rawBroadcast) {
            const parsed = JSON.parse(rawBroadcast);
            if (parsed && typeof parsed.stage !== 'undefined') {
              setCurrentBroadcast(parsed);
            }
          }
        } catch {}
      }
      setIsInitialized(true);
    };
    loadState();
  }, []);

  // 同步賽程表到後端（只在初始化完成後才保存）
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    try {
      localStorage.setItem('dashboard:bracket', JSON.stringify(bracket));
    } catch {}
    postJsonWithRetry('/api/state', { bracket });
  }, [bracket, isInitialized]);

  // 同步目前播報對戰到後端（只在初始化完成後才保存）
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    try { localStorage.setItem('dashboard:currentBroadcast', JSON.stringify(currentBroadcast)); } catch {}
    postJsonWithRetry('/api/state', { currentBroadcast });
  }, [currentBroadcast, isInitialized]);

  // 監聽地圖分數變化並自動更新 Bracket 總分
  useEffect(() => {
    const checkMapScoresAndUpdateBracket = async () => {
      const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
      const mapScores = json?.data?.mapScores;
      if (!mapScores) {
        return;
      }
      // 檢查每個對戰的地圖分數並計算總分
      Object.keys(mapScores).forEach(key => {
        const [stage, index] = key.split(':');
        const maps = mapScores[key];

        if (Array.isArray(maps)) {
          // 計算贏得的地圖數量
          const mapsWonA = maps.reduce((count, map) => {
            const scoreA = parseInt(map.scoreA || '0');
            const scoreB = parseInt(map.scoreB || '0');
            return count + (scoreA > scoreB ? 1 : 0);
          }, 0);

          const mapsWonB = maps.reduce((count, map) => {
            const scoreA = parseInt(map.scoreA || '0');
            const scoreB = parseInt(map.scoreB || '0');
            return count + (scoreB > scoreA ? 1 : 0);
          }, 0);

          // 檢查是否需要更新 Bracket 中的總分
          setBracket(prev => {
            const updated = { ...prev };
            let needsUpdate = false;

            if (stage === 'champ') {
              if (updated.champ.score !== String(mapsWonA)) {
                updated.champ.score = String(mapsWonA);
                needsUpdate = true;
              }
            } else if (updated[stage] && Array.isArray(updated[stage]) && parseInt(index) < updated[stage].length) {
              const match = updated[stage][parseInt(index)];
              if (match && (match.a.score !== String(mapsWonA) || match.b.score !== String(mapsWonB))) {
                updated[stage][parseInt(index)] = {
                  ...match,
                  a: { ...match.a, score: String(mapsWonA) },
                  b: { ...match.b, score: String(mapsWonB) }
                };
                needsUpdate = true;
              }
            }

            return needsUpdate ? updated : prev;
          });
        }
      });
    };

    // 每 2 秒檢查一次地圖分數變化
    const interval = setInterval(checkMapScoresAndUpdateBracket, 2000);

    // 初始檢查
    checkMapScoresAndUpdateBracket();

    return () => clearInterval(interval);
  }, []);

  // bracket 單一位置（比賽、上下方）的欄位更新
  const handleMatchChange = (stage, matchIndex, side, field, value) => {
    setBracket(prev => {
      const next = { ...prev };
      if (stage === 'champ') {
        next.champ = { ...next.champ, [field]: value };
        return next;
      }
      const list = [...next[stage]];
      const match = { ...list[matchIndex] };
      match[side] = { ...match[side], [field]: value };
      list[matchIndex] = match;
      next[stage] = list;
      return next;
    });
  };

  // 設定目前播報對戰
  const setBroadcastMatch = (stage, index) => {
    setCurrentBroadcast({ stage, index });
  };

  // 重置整個賽程表為初始狀態
  const buildInitialBracket = () => ({
    qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });

  const handleResetBrackets = () => {
    try {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('確認要清空所有賽程表資料嗎？此動作無法復原。');
      if (!ok) {
        return;
      }
    } catch {}
    setBracket(buildInitialBracket());
  };

  // 取得目前播報對戰的隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage, index } = currentBroadcast || {};
    if (stage === null || stage === undefined) {
      return { a: '', b: '' };
    }
    const list = bracket[stage];
    if (!list || typeof index !== 'number' || !list[index]) {
      return { a: '', b: '' };
    }
    const a = list[index]?.a?.team || '';
    const b = list[index]?.b?.team || '';
    return { a, b };
  };

  return {
    bracket,
    setBracket,
    currentBroadcast,
    setCurrentBroadcast,
    handleMatchChange,
    setBroadcastMatch,
    handleResetBrackets,
    getCurrentBroadcastTeams
  };
}

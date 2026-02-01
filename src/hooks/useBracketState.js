'use client';

import { useState, useEffect } from 'react';

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
      let apiData = {};
      let localBracket = null;
      let localBroadcast = null;
      
      // 同時從 localStorage 載入（同步操作）
      try {
        const rawBracket = localStorage.getItem('dashboard:bracket');
        if (rawBracket) {
          localBracket = JSON.parse(rawBracket);
          console.log('[useBracketState] 從 localStorage 載入 bracket:', localBracket);
        } else {
          console.log('[useBracketState] localStorage 中沒有 bracket');
        }
      } catch (e) {
        console.error('[useBracketState] localStorage 載入 bracket 失敗:', e);
      }

      try {
        const rawBroadcast = localStorage.getItem('dashboard:currentBroadcast');
        if (rawBroadcast) {
          const parsed = JSON.parse(rawBroadcast);
          if (parsed && parsed.stage !== null) {
            localBroadcast = parsed;
            console.log('[useBracketState] 從 localStorage 載入 broadcast:', localBroadcast);
          }
        }
      } catch (e) {
        console.error('[useBracketState] localStorage 載入 broadcast 失敗:', e);
      }
      
      // 從 API 載入
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              apiData = json?.data || {};
              console.log('[useBracketState] 從 API 載入:', apiData);
            } catch {
              console.error('[useBracketState] API 回應解析失敗');
              apiData = {};
            }
          }
        }
      } catch (e) {
        console.error('[useBracketState] API 載入失敗:', e);
      }
      
      // 載入 bracket：優先使用有資料的來源
      if (apiData.bracket && Object.keys(apiData.bracket).length > 0) {
        console.log('[useBracketState] 使用 API bracket');
        setBracket(apiData.bracket);
      } else if (localBracket) {
        console.log('[useBracketState] 使用 localStorage bracket');
        setBracket(localBracket);
      } else {
        console.log('[useBracketState] 沒有可用的 bracket 資料，使用初始值');
      }
      
      // 載入 currentBroadcast：優先使用有資料的來源
      const validStages = ['qf', 'sf', 'f'];
      
      if (apiData.currentBroadcast && apiData.currentBroadcast.stage !== null) {
        // 驗證 API 資料的 stage 是否有效
        if (validStages.includes(apiData.currentBroadcast.stage)) {
          console.log('[useBracketState] 使用 API broadcast');
          setCurrentBroadcast(apiData.currentBroadcast);
        } else {
          // 無效的 stage，重置為 null
          console.log('[useBracketState] API broadcast stage 無效，重置');
          setCurrentBroadcast({ stage: null, index: null });
        }
      } else if (localBroadcast) {
        // 驗證 localStorage 資料的 stage 是否有效
        if (validStages.includes(localBroadcast.stage)) {
          console.log('[useBracketState] 使用 localStorage broadcast');
          setCurrentBroadcast(localBroadcast);
        } else {
          // 無效的 stage，重置為 null
          console.log('[useBracketState] localStorage broadcast stage 無效，重置');
          setCurrentBroadcast({ stage: null, index: null });
        }
      }
      
      // 標記初始化完成
      setIsInitialized(true);
      console.log('[useBracketState] 初始化完成');
    };
    loadState();
  }, []);

  // 同步賽程表到後端（只在初始化完成後才保存）
  useEffect(() => {
    if (!isInitialized) {
      console.log('[useBracketState] 跳過保存：尚未初始化完成');
      return;
    }
    
    console.log('[useBracketState] bracket 變更，準備保存:', bracket);
    try { 
      localStorage.setItem('dashboard:bracket', JSON.stringify(bracket)); 
      console.log('[useBracketState] 已保存到 localStorage');
    } catch (e) {
      console.error('[useBracketState] localStorage 保存失敗:', e);
    }
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bracket })
        });
        console.log('[useBracketState] 已保存到 API');
      } catch (e) {
        console.error('[useBracketState] API 保存失敗:', e);
      }
    })();
  }, [bracket, isInitialized]);

  // 同步目前播報對戰到後端（只在初始化完成後才保存）
  useEffect(() => {
    if (!isInitialized) {
      console.log('[useBracketState] 跳過保存 broadcast：尚未初始化完成');
      return;
    }
    
    try { localStorage.setItem('dashboard:currentBroadcast', JSON.stringify(currentBroadcast)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentBroadcast })
        });
      } catch {}
    })();
  }, [currentBroadcast, isInitialized]);

  // 監聽地圖分數變化並自動更新 Bracket 總分
  useEffect(() => {
    const checkMapScoresAndUpdateBracket = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const json = JSON.parse(text);
            const mapScores = json?.data?.mapScores || {};
            
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
          }
        }
      } catch {
        // 靜默處理錯誤
      }
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

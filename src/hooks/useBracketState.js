'use client';

import { useState, useEffect } from 'react';

// 賽程表狀態管理 hook
export function useBracketState() {
  const [bracket, setBracket] = useState({
    qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    lf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })), // 遺材賽
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      let apiData = {};
      
      // 先嘗試從API載入
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          let json = null;
          try { json = await res.json(); } catch { json = null; }
          apiData = json?.data || {};
        }
      } catch (error) {
        console.warn('載入API狀態失敗:', error);
      }
      
      // 載入bracket：API優先，localStorage為後備
      if (apiData.bracket) {
        setBracket(apiData.bracket);
      } else {
        try {
          const rawBracket = localStorage.getItem('dashboard:bracket');
          if (rawBracket) {
            setBracket(JSON.parse(rawBracket));
          }
        } catch (error) {
          console.warn('載入localStorage bracket失敗:', error);
        }
      }
      
      // 載入currentBroadcast：API優先，localStorage為後備
      if (apiData.currentBroadcast && apiData.currentBroadcast.stage !== null) {
        setCurrentBroadcast(apiData.currentBroadcast);
      } else {
        try {
          const rawBroadcast = localStorage.getItem('dashboard:currentBroadcast');
          if (rawBroadcast) {
            const parsedBroadcast = JSON.parse(rawBroadcast);
            // 只有當localStorage中的值不是null時才使用
            if (parsedBroadcast && parsedBroadcast.stage !== null) {
              setCurrentBroadcast(parsedBroadcast);
            }
          }
        } catch (error) {
          console.warn('載入localStorage currentBroadcast失敗:', error);
        }
      }
    };
    loadState();
  }, []);

  // 同步賽程表到後端
  useEffect(() => {
    try { localStorage.setItem('dashboard:bracket', JSON.stringify(bracket)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bracket })
        });
      } catch {}
    })();
  }, [bracket]);

  // 同步目前播報對戰到後端
  useEffect(() => {
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
  }, [currentBroadcast]);

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
    lf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })), // 遺材賽
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });

  const handleResetBrackets = () => {
    try {
      const ok = window.confirm('確認要清空所有賽程表資料嗎？此動作無法復原。');
      if (!ok) return;
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

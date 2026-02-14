'use client';

import { useState, useEffect } from 'react';

// Banpick狀態管理 hook
export function useBanpickState() {
  const [banpickData, setBanpickData] = useState({});
  const [brawlersData, setBrawlersData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false); // 追蹤是否已完成初始載入

  // 載入角色資料
  useEffect(() => {
    const loadBrawlers = async () => {
      try {
        // 從檔案系統讀取角色列表
        const res = await fetch('/api/brawlers', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setBrawlersData(data);
        }
      } catch {
        // 靜默處理錯誤
      }
    };
    loadBrawlers();
  }, []);

  // 載入banpick資料
  useEffect(() => {
    const loadBanpickData = async () => {
      let apiData = {};
      let localData = null;
      
      // 從 localStorage 載入
      try {
        const rawBanpickData = localStorage.getItem('dashboard:banpickData');
        if (rawBanpickData) {
          localData = JSON.parse(rawBanpickData);
        }
      } catch {
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
            } catch {
            }
          }
        }
      } catch {
      }
      
      // 優先使用有資料的來源
      if (apiData.banpickData && Object.keys(apiData.banpickData).length > 0) {
        setBanpickData(apiData.banpickData);
      } else if (localData) {
        setBanpickData(localData);
      } else {
      }
      
      // 標記初始化完成
      setIsInitialized(true);
    };
    loadBanpickData();
  }, []);

  // 同步banpick資料到後端（只在初始化完成後才保存）
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    
    try {
      localStorage.setItem('dashboard:banpickData', JSON.stringify(banpickData));
    } catch {
    }
    
    // 同步到後端
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banpickData })
        });
      } catch {
      }
    })();
  }, [banpickData, isInitialized]);

  // 取得目前對戰的banpick資料
  const getCurrentMatchBanpick = (currentBroadcast) => {
    if (!currentBroadcast) {
      return null;
    }
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    return banpickData[matchKey] || null;
  };

  // 更新選手ban角
  const updatePlayerBan = (currentBroadcast, teamSide, playerIndex, brawlerName) => {
    if (!currentBroadcast) {
      return;
    }
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    const newBanpickData = { ...banpickData };
    
    if (!newBanpickData[matchKey]) {
      newBanpickData[matchKey] = {
        teamA: { bans: ['', '', ''] },
        teamB: { bans: ['', '', ''] }
      };
    }
    
    newBanpickData[matchKey][teamSide].bans[playerIndex] = brawlerName;
    setBanpickData(newBanpickData);
  };

  // 重置對戰banpick資料
  const resetMatchBanpick = (currentBroadcast) => {
    if (!currentBroadcast) {
      return;
    }
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    const newBanpickData = { ...banpickData };
    
    if (newBanpickData[matchKey]) {
      delete newBanpickData[matchKey];
      setBanpickData(newBanpickData);
    }
  };

  // 取得選手已ban的角色
  const getPlayerBans = (currentBroadcast, teamSide, playerIndex) => {
    const matchData = getCurrentMatchBanpick(currentBroadcast);
    if (!matchData || !matchData[teamSide]) {
      return '';
    }
    return matchData[teamSide].bans[playerIndex] || '';
  };

  return {
    banpickData,
    brawlersData,
    getCurrentMatchBanpick,
    updatePlayerBan,
    resetMatchBanpick,
    getPlayerBans
  };
};
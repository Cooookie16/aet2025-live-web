'use client';

import { useState, useEffect } from 'react';

// Banpick狀態管理 hook
export function useBanpickState() {
  const [banpickData, setBanpickData] = useState({});
  const [brawlersData, setBrawlersData] = useState([]);

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
      } catch (error) {
        console.warn('載入角色資料失敗:', error);
      }
    };
    loadBrawlers();
  }, []);

  // 載入banpick資料
  useEffect(() => {
    const loadBanpickData = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              const data = json?.data || {};
              if (data.banpickData) {
                setBanpickData(data.banpickData);
              }
            } catch (parseError) {
              console.warn('解析banpick資料失敗:', parseError);
            }
          }
        }
      } catch (error) {
        console.warn('載入banpick資料失敗:', error);
      }
      
      // 後備：從 localStorage 載入
      try {
        const rawBanpickData = localStorage.getItem('dashboard:banpickData');
        if (rawBanpickData) {
          setBanpickData(JSON.parse(rawBanpickData));
        }
      } catch (error) {
        console.warn('載入localStorage banpick資料失敗:', error);
      }
    };
    loadBanpickData();
  }, []);

  // 同步banpick資料到後端
  useEffect(() => {
    try {
      localStorage.setItem('dashboard:banpickData', JSON.stringify(banpickData));
    } catch (error) {
      console.warn('儲存banpick資料到localStorage失敗:', error);
    }
    
    // 同步到後端
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banpickData })
        });
      } catch (error) {
        console.warn('同步banpick資料到後端失敗:', error);
      }
    })();
  }, [banpickData]);

  // 取得目前對戰的banpick資料
  const getCurrentMatchBanpick = (currentBroadcast) => {
    if (!currentBroadcast) return null;
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    return banpickData[matchKey] || null;
  };

  // 更新選手ban角
  const updatePlayerBan = (currentBroadcast, teamSide, playerIndex, brawlerName) => {
    if (!currentBroadcast) return;
    
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
    if (!currentBroadcast) return;
    
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
    if (!matchData || !matchData[teamSide]) return '';
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
}

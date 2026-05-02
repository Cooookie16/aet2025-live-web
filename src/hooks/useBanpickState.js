'use client';

import { useState, useEffect } from 'react';
import { fetchJsonSafe, postJsonWithRetry } from '@/lib/fetchWithRetry';

// Banpick狀態管理 hook
export function useBanpickState() {
  const [banpickData, setBanpickData] = useState({});
  const [brawlersData, setBrawlersData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false); // 追蹤是否已完成初始載入

  // 載入角色資料
  useEffect(() => {
    const loadBrawlers = async () => {
      const data = await fetchJsonSafe('/api/brawlers', { cache: 'no-store' }, null);
      if (Array.isArray(data)) {
        setBrawlersData(data);
      }
    };
    loadBrawlers();
  }, []);

  // 載入banpick資料
  useEffect(() => {
    const loadBanpickData = async () => {
      let localData = null;
      try {
        const rawBanpickData = localStorage.getItem('dashboard:banpickData');
        if (rawBanpickData) {
          localData = JSON.parse(rawBanpickData);
        }
      } catch {}

      const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
      const apiData = json?.data || {};

      if (apiData.banpickData && Object.keys(apiData.banpickData).length > 0) {
        setBanpickData(apiData.banpickData);
      } else if (localData) {
        setBanpickData(localData);
      }

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
    } catch {}
    postJsonWithRetry('/api/state', { banpickData });
  }, [banpickData, isInitialized]);

  // 建立空的 match 結構（含個人 bans 與每隊兩個全局 ban）
  const buildEmptyMatch = () => ({
    teamA: { bans: ['', '', ''], globalBans: ['', ''] },
    teamB: { bans: ['', '', ''], globalBans: ['', ''] }
  });

  // 確保隊伍結構含 globalBans 欄位（向後相容舊資料）
  const ensureTeamShape = (team) => {
    const next = team ? { ...team } : { bans: ['', '', ''], globalBans: ['', ''] };
    if (!Array.isArray(next.bans) || next.bans.length !== 3) {
      next.bans = ['', '', ''];
    }
    if (!Array.isArray(next.globalBans) || next.globalBans.length !== 2) {
      next.globalBans = ['', ''];
    }
    return next;
  };

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

    const existing = newBanpickData[matchKey] || buildEmptyMatch();
    const team = ensureTeamShape(existing[teamSide]);
    const nextBans = [...team.bans];
    nextBans[playerIndex] = brawlerName;
    newBanpickData[matchKey] = {
      ...existing,
      [teamSide]: { ...team, bans: nextBans },
    };
    setBanpickData(newBanpickData);
  };

  // 更新全局 Ban（每隊兩個，共四個）
  const updateGlobalBan = (currentBroadcast, teamSide, banIndex, brawlerName) => {
    if (!currentBroadcast) {
      return;
    }

    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    const newBanpickData = { ...banpickData };

    const existing = newBanpickData[matchKey] || buildEmptyMatch();
    const team = ensureTeamShape(existing[teamSide]);
    const nextGlobals = [...team.globalBans];
    nextGlobals[banIndex] = brawlerName;
    newBanpickData[matchKey] = {
      ...existing,
      [teamSide]: { ...team, globalBans: nextGlobals },
    };
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
    return matchData[teamSide].bans?.[playerIndex] || '';
  };

  // 取得全局 Ban
  const getGlobalBan = (currentBroadcast, teamSide, banIndex) => {
    const matchData = getCurrentMatchBanpick(currentBroadcast);
    if (!matchData || !matchData[teamSide]) {
      return '';
    }
    return matchData[teamSide].globalBans?.[banIndex] || '';
  };

  return {
    banpickData,
    brawlersData,
    getCurrentMatchBanpick,
    updatePlayerBan,
    updateGlobalBan,
    resetMatchBanpick,
    getPlayerBans,
    getGlobalBan
  };
};
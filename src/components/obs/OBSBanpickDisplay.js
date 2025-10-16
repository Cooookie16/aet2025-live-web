'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// OBS Banpick 顯示
export default function OBSBanpickDisplay({ data }) {
  const { currentBroadcast, banpickData, bracket } = data || {};
  const [teamsData, setTeamsData] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);

  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (res.ok) {
          const teams = await res.json();
          setTeamsData(teams);
        }
      } catch {
        // 靜默處理錯誤
      }
    };
    loadTeams();
    // 訂閱 SSE：隊伍更新時自動重新載入
    let es;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (evt) => {
        try {
          const raw = (evt && typeof evt.data === 'string') ? evt.data.trim() : '';
          if (!raw || raw[0] !== '{') {return;}
          const msg = JSON.parse(raw);
          if (msg?.type === 'teams-update') {
            loadTeams();
          }
        } catch {}
      };
    } catch {}
    return () => {
      try { es?.close?.(); } catch {}
    };
  }, []);

  // 取得目前對戰資訊
  useEffect(() => {
    if (!currentBroadcast || !bracket || !teamsData.length) {
      setCurrentMatch(null);
      return;
    }

    const { stage, index } = currentBroadcast;
    const stageData = bracket[stage];
    
    if (!stageData || !stageData[index]) {
      setCurrentMatch(null);
      return;
    }

    const match = stageData[index];
    const teamAName = match.a?.team?.trim();
    const teamBName = match.b?.team?.trim();
    
    if (!teamAName || !teamBName) {
      setCurrentMatch(null);
      return;
    }

    const teamA = teamsData.find(team => team.name === teamAName);
    const teamB = teamsData.find(team => team.name === teamBName);
    
    if (teamA && teamB) {
      setCurrentMatch({ teamA, teamB });
    } else {
      setCurrentMatch(null);
    }
  }, [currentBroadcast, bracket, teamsData]);

  // 取得banpick資料
  const getBanpickData = () => {
    if (!currentBroadcast || !banpickData) {
      return null;
    }
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    return banpickData[matchKey] || null;
  };

  const banpick = getBanpickData();

  // 如果沒有對戰資料，顯示等待訊息
  if (!currentMatch) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-300">請先在賽程表中選擇一場對戰</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      {/* 最上方新增標題：兩方BAN角 */}
      <div className="w-full text-center mb-4">
        <h1 className="text-4xl font-extrabold text-white tracking-wide">兩方BAN角</h1>
      </div>
      {/* 已移除 Banpick 次標題 */}
      
      {/* 主要內容區域 */}
      <div className="w-full max-w-[700px] grid grid-cols-2 gap-8">
        {/* 左側隊伍 */}
        <div className="flex flex-col gap-2">
          {/* 隊伍名稱 */}
          <div className="text-center mb-2">
            <h3 className="text-xl font-bold text-emerald-400">{currentMatch.teamA.name}</h3>
          </div>
          
          {/* 三個選手ban角 */}
          {currentMatch.teamA.members.map((player, index) => {
            const bannedBrawler = banpick?.teamA?.bans?.[index] || '';
            return (
              <div key={`teamA-${player}`} className="flex flex-col items-center gap-1">
                {/* 選手名稱 */}
                <div className="text-sm font-medium text-white text-center">
                  {player}
                </div>
                
                {/* 英雄圖片方塊 */}
                <div className="w-24 h-24 rounded-lg border-2 border-emerald-500 bg-gray-800 overflow-hidden flex items-center justify-center relative">
                  {bannedBrawler ? (
                    <>
                      <Image 
                        src={`/brawlers/${bannedBrawler}.png`}
                        alt={bannedBrawler}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover filter grayscale"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target?.parentElement?.querySelector('[data-fallback]');
                          if (fallback) { fallback.style.display = 'flex'; }
                        }}
                      />
                      {/* 禁止樣式：45度紅色粗線，不超出方框（由外層 overflow-hidden 控制） */}
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-4 bg-red-600 rotate-45 rounded"></div>
                    </>
                  ) : null}
                  <div 
                    className="w-full h-full flex items-center justify-center text-gray-500 text-xs"
                    data-fallback
                    style={{ display: bannedBrawler ? 'none' : 'flex' }}
                  >
                    未選擇
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 右側隊伍 */}
        <div className="flex flex-col gap-2">
          {/* 隊伍名稱 */}
          <div className="text-center mb-2">
            <h3 className="text-xl font-bold text-sky-400">{currentMatch.teamB.name}</h3>
          </div>
          
          {/* 三個選手ban角 */}
          {currentMatch.teamB.members.map((player, index) => {
            const bannedBrawler = banpick?.teamB?.bans?.[index] || '';
            return (
              <div key={`teamB-${player}`} className="flex flex-col items-center gap-1">
                {/* 選手名稱 */}
                <div className="text-sm font-medium text-white text-center">
                  {player}
                </div>
                
                {/* 英雄圖片方塊 */}
                <div className="w-24 h-24 rounded-lg border-2 border-sky-500 bg-gray-800 overflow-hidden flex items-center justify-center relative">
                  {bannedBrawler ? (
                    <>
                      <Image 
                        src={`/brawlers/${bannedBrawler}.png`}
                        alt={bannedBrawler}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover filter grayscale"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target?.parentElement?.querySelector('[data-fallback]');
                          if (fallback) { fallback.style.display = 'flex'; }
                        }}
                      />
                      {/* 禁止樣式：45度紅色粗線，不超出方框（由外層 overflow-hidden 控制） */}
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-4 bg-red-600 rotate-45 rounded"></div>
                    </>
                  ) : null}
                  <div 
                    className="w-full h-full flex items-center justify-center text-gray-500 text-xs"
                    data-fallback
                    style={{ display: bannedBrawler ? 'none' : 'flex' }}
                  >
                    未選擇
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';

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
      } catch (error) {
        console.warn('載入隊伍資料失敗:', error);
      }
    };
    loadTeams();
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
    if (!currentBroadcast || !banpickData) return null;
    
    const matchKey = `${currentBroadcast.stage}:${currentBroadcast.index}`;
    return banpickData[matchKey] || null;
  };

  const banpick = getBanpickData();

  // 如果沒有對戰資料，顯示等待訊息
  if (!currentMatch) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Banpick</h2>
          <p className="text-xl text-gray-300">請先在賽程表中選擇一場對戰</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      {/* 標題 */}
      <h2 className="text-3xl font-bold text-white mb-8">Banpick</h2>
      
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
              <div key={`teamA-${index}`} className="flex flex-col items-center gap-1">
                {/* 選手名稱 */}
                <div className="text-sm font-medium text-white text-center">
                  {player}
                </div>
                
                {/* 英雄圖片方塊 */}
                <div className="w-24 h-24 rounded-lg border-2 border-emerald-500 bg-gray-800 overflow-hidden flex items-center justify-center">
                  {bannedBrawler ? (
                    <img 
                      src={`/brawlers/${bannedBrawler}.png`}
                      alt={bannedBrawler}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-full flex items-center justify-center text-gray-500 text-xs"
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
              <div key={`teamB-${index}`} className="flex flex-col items-center gap-1">
                {/* 選手名稱 */}
                <div className="text-sm font-medium text-white text-center">
                  {player}
                </div>
                
                {/* 英雄圖片方塊 */}
                <div className="w-24 h-24 rounded-lg border-2 border-sky-500 bg-gray-800 overflow-hidden flex items-center justify-center">
                  {bannedBrawler ? (
                    <img 
                      src={`/brawlers/${bannedBrawler}.png`}
                      alt={bannedBrawler}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-full flex items-center justify-center text-gray-500 text-xs"
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
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// OBS Banpick 顯示
export default function OBSBanpickDisplay({ data, imageTimestamp = Date.now() }) {
  const { currentBroadcast, banpickData, bracket } = data || {};
  const [teamsData, setTeamsData] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);

  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (res.ok) {
          const body = await res.json();
          setTeamsData(body.data || []);
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

  // 單一 Ban 角方塊（共用渲染）
  // accentColor: 'blue' | 'red'
  // size: 96 (個人) | 72 (全局)
  const BanCell = ({ brawlerName, accentColor, size }) => {
    const borderClass = accentColor === 'blue' ? 'border-blue-500' : 'border-red-500';
    const px = `${size}px`;
    return (
      <div
        className={`rounded-lg border-2 ${borderClass} bg-gray-800 overflow-hidden flex items-center justify-center relative`}
        style={{ width: px, height: px }}
      >
        {brawlerName ? (
          <>
            <Image
              src={`/brawlers/${brawlerName}.png?t=${imageTimestamp}`}
              alt={brawlerName}
              width={size}
              height={size}
              className="w-full h-full object-cover filter grayscale"
              onError={(e) => {
                try {
                  e.target.style.display = 'none';
                  const fallback = e.target?.parentElement?.querySelector('[data-fallback]');
                  if (fallback) { fallback.style.display = 'flex'; }
                } catch {}
              }}
            />
            {/* 禁止樣式：45 度紅色粗線，由外層 overflow-hidden 截斷 */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-3 bg-red-600 rotate-45 rounded"></div>
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]"
            data-fallback
          >
            未選擇
          </div>
        )}
      </div>
    );
  };

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
      {/* 最上方標題 */}
      <div className="w-full text-center mb-4">
        <h1 className="text-4xl font-extrabold text-white tracking-wide">雙方BAN角</h1>
      </div>

      {/* 主要內容：四欄並排
          [藍隊全局Ban] [藍隊個人Ban] [紅隊個人Ban] [紅隊全局Ban] */}
      <div className="flex items-start justify-center gap-6">
        {/* 藍隊全局 Ban（左外側，垂直排列 2 個） */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-blue-300 tracking-wide whitespace-nowrap mb-1">
            全局Ban
          </div>
          {/* 與下方主隊伍區的「隊伍名」高度對齊：佔位空白 */}
          <div className="h-7" />
          {[0, 1].map((banIdx) => (
            <BanCell
              key={`teamA-global-${banIdx}`}
              brawlerName={banpick?.teamA?.globalBans?.[banIdx] || ''}
              accentColor="blue"
              size={72}
            />
          ))}
        </div>

        {/* 藍隊個人 Ban */}
        <div className="flex flex-col gap-2">
          <div className="text-center mb-2">
            <h3 className="text-xl font-bold text-blue-400">{currentMatch.teamA.name}</h3>
          </div>
          {[0, 1, 2].map((index) => (
            <div key={`teamA-ban-${index}`} className="flex flex-col items-center gap-1">
              <BanCell
                brawlerName={banpick?.teamA?.bans?.[index] || ''}
                accentColor="blue"
                size={96}
              />
            </div>
          ))}
        </div>

        {/* 紅隊個人 Ban */}
        <div className="flex flex-col gap-2">
          <div className="text-center mb-2">
            <h3 className="text-xl font-bold text-red-400">{currentMatch.teamB.name}</h3>
          </div>
          {[0, 1, 2].map((index) => (
            <div key={`teamB-ban-${index}`} className="flex flex-col items-center gap-1">
              <BanCell
                brawlerName={banpick?.teamB?.bans?.[index] || ''}
                accentColor="red"
                size={96}
              />
            </div>
          ))}
        </div>

        {/* 紅隊全局 Ban（右外側，垂直排列 2 個） */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-red-300 tracking-wide whitespace-nowrap mb-1">
            全局Ban
          </div>
          {/* 與隊伍名對齊的佔位 */}
          <div className="h-7" />
          {[0, 1].map((banIdx) => (
            <BanCell
              key={`teamB-global-${banIdx}`}
              brawlerName={banpick?.teamB?.globalBans?.[banIdx] || ''}
              accentColor="red"
              size={72}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

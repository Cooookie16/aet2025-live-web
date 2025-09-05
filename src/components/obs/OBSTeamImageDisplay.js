'use client';

import { useState, useEffect } from 'react';

// OBS 隊伍圖片顯示
export default function OBSTeamImageDisplay({ data }) {
  const selectedTeamForDisplay = data?.selectedTeamForDisplay;
  const teamImages = data?.teamImages || {};
  const [teamsData, setTeamsData] = useState([]);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  
  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTeamsData(data);
        }
      } catch (e) {
        console.warn('載入隊伍資料失敗:', e);
      }
    };
    loadTeams();
  }, []);

  // 當隊伍圖片更新時，更新時間戳以強制重新載入
  useEffect(() => {
    if (selectedTeamForDisplay && teamImages[selectedTeamForDisplay]) {
      setImageTimestamp(Date.now());
    }
  }, [selectedTeamForDisplay, teamImages]);

  // 根據隊伍名稱取得選手陣列
  const getTeamMembers = (teamName) => {
    if (!teamName) return '';
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '';
  };

  // 取得選定隊伍的圖片
  const selectedTeamImage = selectedTeamForDisplay ? teamImages[selectedTeamForDisplay] : null;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-[800px] h-full flex flex-col items-center justify-center">
        {selectedTeamForDisplay ? (
          <>
            {selectedTeamImage ? (
              /* 有圖片時：顯示置中的圖片 */
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={`${selectedTeamImage.url}?t=${imageTimestamp}`}
                  alt={`${selectedTeamForDisplay} 隊伍圖片`}
                  className="max-w-[790px] h-auto object-contain"
                  style={{ maxHeight: '100%' }}
                />
              </div>
            ) : (
              /* 沒有圖片時：顯示隊伍名稱和選手名稱 */
              <div className="text-center">
                {/* 隊伍名稱 */}
                <div className="text-6xl font-bold text-white mb-4">
                  {selectedTeamForDisplay}
                </div>
                
                {/* 選手名稱 */}
                <div className="text-2xl text-gray-300">
                  {getTeamMembers(selectedTeamForDisplay)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">👥</div>
            <div className="text-2xl">請在控制台選擇要顯示的隊伍</div>
          </div>
        )}
      </div>
    </div>
  );
}

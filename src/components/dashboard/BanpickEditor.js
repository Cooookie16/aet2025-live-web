'use client';

import { useBanpickState } from '@/hooks/useBanpickState';

export default function BanpickEditor({ 
  currentBroadcast, 
  teamOptions = [],
  bracket
}) {
  const {
    brawlersData,
    updatePlayerBan,
    updateGlobalBan,
    resetMatchBanpick,
    getPlayerBans,
    getGlobalBan
  } = useBanpickState();

  // 取得目前對戰的隊伍資訊
  const getCurrentTeams = () => {
    if (!currentBroadcast || !bracket) {
      return { teamA: null, teamB: null };
    }
    
    const { stage, index } = currentBroadcast;
    const stageData = bracket[stage];
    
    if (!stageData || !stageData[index]) {
      return { teamA: null, teamB: null };
    }
    
    const match = stageData[index];
    
    // 檢查隊伍名稱是否為空字串
    const teamAName = match.a?.team?.trim();
    const teamBName = match.b?.team?.trim();
    
    if (!teamAName || !teamBName) {
      return { teamA: null, teamB: null };
    }
    
    const teamA = teamOptions.find(team => team.name === teamAName);
    const teamB = teamOptions.find(team => team.name === teamBName);
    
    return { teamA, teamB };
  };

  const { teamA, teamB } = getCurrentTeams();

  // 處理選手ban角選擇
  const handleBrawlerSelect = (teamSide, playerIndex, brawlerName) => {
    updatePlayerBan(currentBroadcast, teamSide, playerIndex, brawlerName);
  };

  // 處理全局 Ban 選擇（每隊 2 個）
  const handleGlobalBanSelect = (teamSide, banIndex, brawlerName) => {
    updateGlobalBan(currentBroadcast, teamSide, banIndex, brawlerName);
  };

  // 重置目前對戰的banpick資料
  const handleResetBanpick = () => {
    // eslint-disable-next-line no-alert
    if (confirm('確定要重置這場對戰的所有ban角選擇嗎？')) {
      resetMatchBanpick(currentBroadcast);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 標題列 */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Banpick 系統
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              各選手獨立選擇要ban的角色
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* 重置按鈕 */}
            <button
              onClick={handleResetBanpick}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
            >
              重置Banpick
            </button>
          </div>
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="p-6">
        {!currentBroadcast || !teamA || !teamB ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
              📋
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              請先在賽程表中選擇一場對戰
            </p>
            {/* 除錯資訊 */}
            <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 p-3 rounded">
              <div>目前對戰狀態: {currentBroadcast ? `${currentBroadcast.stage}-${currentBroadcast.index}` : '無'}</div>
              <div>隊伍A: {currentBroadcast?.a?.team || '未設定'}</div>
              <div>隊伍B: {currentBroadcast?.b?.team || '未設定'}</div>
              <div>找到隊伍A: {teamA ? '是' : '否'}</div>
              <div>找到隊伍B: {teamB ? '是' : '否'}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {/* 隊伍A區域 */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {teamA.name}
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  選手: {teamA.members.join(', ')}
                </div>
              </div>
              
              {/* 隊伍A的三個選手ban角選單 */}
              <div className="space-y-4">
                {teamA.members.map((member, index) => (
                  <div key={`teamA-${member}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      {member}
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        選擇要ban的角色:
                      </label>
                      <select
                        value={getPlayerBans(currentBroadcast, 'teamA', index)}
                        onChange={(e) => handleBrawlerSelect('teamA', index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">請選擇角色</option>
                        {brawlersData.map((brawler) => (
                          <option key={`brawler-${brawler}`} value={brawler}>
                            {brawler}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* 隊伍A 全局 Ban（兩個） */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  全局 Ban（共 2 個）
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((banIdx) => (
                    <div key={`teamA-global-${banIdx}`}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        全局 Ban {banIdx + 1}:
                      </label>
                      <select
                        value={getGlobalBan(currentBroadcast, 'teamA', banIdx)}
                        onChange={(e) => handleGlobalBanSelect('teamA', banIdx, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">請選擇角色</option>
                        {brawlersData.map((brawler) => (
                          <option key={`brawler-tA-g-${brawler}`} value={brawler}>
                            {brawler}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 隊伍B區域 */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {teamB.name}
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  選手: {teamB.members.join(', ')}
                </div>
              </div>
              
              {/* 隊伍B的三個選手ban角選單 */}
              <div className="space-y-4">
                {teamB.members.map((member, index) => (
                  <div key={`teamB-${member}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      {member}
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        選擇要ban的角色:
                      </label>
                      <select
                        value={getPlayerBans(currentBroadcast, 'teamB', index)}
                        onChange={(e) => handleBrawlerSelect('teamB', index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">請選擇角色</option>
                        {brawlersData.map((brawler) => (
                          <option key={`brawler-${brawler}`} value={brawler}>
                            {brawler}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* 隊伍B 全局 Ban（兩個） */}
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3">
                  全局 Ban（共 2 個）
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((banIdx) => (
                    <div key={`teamB-global-${banIdx}`}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        全局 Ban {banIdx + 1}:
                      </label>
                      <select
                        value={getGlobalBan(currentBroadcast, 'teamB', banIdx)}
                        onChange={(e) => handleGlobalBanSelect('teamB', banIdx, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">請選擇角色</option>
                        {brawlersData.map((brawler) => (
                          <option key={`brawler-tB-g-${brawler}`} value={brawler}>
                            {brawler}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

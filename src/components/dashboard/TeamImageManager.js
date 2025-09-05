'use client';

// 隊伍圖片管理組件
export default function TeamImageManager({ 
  teamOptions, 
  teamImages, 
  selectedTeamForDisplay, 
  onTeamImageUpload, 
  onSelectedTeamChange,
  onDeleteTeamImage,
  onDeleteAllImages
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          隊伍圖片管理
        </h2>
        
        {/* 刪除全部照片按鈕 */}
        <button
          onClick={() => {
            try {
              const ok = window.confirm('確認要刪除所有隊伍圖片嗎？此動作無法復原。');
              if (ok) {
                onDeleteAllImages();
              }
            } catch {}
          }}
          className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
          title="刪除所有隊伍圖片"
        >
          🗑️ 刪除全部照片
        </button>
      </div>
      
      {/* 當前選定顯示隊伍 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          當前選定要顯示的隊伍
        </label>
        <select
          value={selectedTeamForDisplay}
          onChange={(e) => onSelectedTeamChange(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="">請選擇隊伍</option>
          {teamOptions.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>

      {/* 隊伍圖片上傳區域 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {teamOptions.map((team) => (
          <div key={team} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 truncate">
              {team}
            </h3>
            
            {/* 已上傳的圖片預覽 */}
            {teamImages[team] && (
              <div className="mb-3">
                <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={teamImages[team].url}
                    alt={`${team} 隊伍圖片`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  已上傳: {teamImages[team].filename}
                </p>
              </div>
            )}
            
            {/* 上傳按鈕 */}
            <div className="relative mb-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    onTeamImageUpload(team, file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="w-full px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors">
                {teamImages[team] ? '重新上傳' : '上傳圖片'}
              </button>
            </div>

            {/* 刪除按鈕 */}
            <button
              onClick={() => {
                if (!teamImages[team]) {
                  return;
                }
                try {
                  const ok = window.confirm(`確認要刪除 ${team} 的圖片嗎？`);
                  if (ok) {
                    onDeleteTeamImage(team);
                  }
                } catch {}
              }}
              disabled={!teamImages[team]}
              className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                teamImages[team]
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              }`}
              title={teamImages[team] ? `刪除 ${team} 的圖片` : '該隊伍尚未上傳圖片'}
            >
              🗑️ 刪除圖片
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

// 地圖與比數編輯組件
export default function MapScoreEditor({ 
  currentBroadcast, 
  currentMatchMaps, 
  modeOptions, 
  mapsData, 
  onUpdateMap, 
  onResetMapScores 
}) {
  // 根據選擇的模式取得對應的地圖選項
  const getMapOptionsForMode = (mode) => {
    const modeData = mapsData.find(item => item.mode === mode);
    return modeData ? modeData.maps : [];
  };

  // 轉換階段顯示標籤
  const getStageLabel = (stage) => {
    if (stage === 'qf') {return '八強';}
    if (stage === 'sf') {return '四強';}
    if (stage === 'lf') {return '遺材賽';}
    if (stage === 'f') {return '冠亞賽';}
    return '';
  };

  // 取得目前播報對戰的隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage } = currentBroadcast || {};
    if (!stage && stage !== 0) {
      return { a: '', b: '' };
    }
    // 這裡需要從 bracket 資料取得隊伍名稱，但為了簡化，先返回空值
    // 實際使用時需要傳入 bracket 資料
    return { a: '', b: '' };
  };

  const teams = getCurrentBroadcastTeams();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">地圖與比數</h2>
        <button
          onClick={onResetMapScores}
          className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          title="清空所有地圖與比數資料"
        >
          RESET ALL
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        目前播報對戰：
        <span className="ml-1 font-medium text-gray-900 dark:text-gray-200">
          {getStageLabel(currentBroadcast.stage) || '未選擇'}
          {typeof currentBroadcast.index === 'number' ? ` 第 ${currentBroadcast.index + 1} 場` : ''}
        </span>
        <span className="ml-3">{teams.a || '—'} vs {teams.b || '—'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {currentMatchMaps.map((m, i) => (
          <div
            key={`map-${m.map || `map-${i}`}`}
            className={
              `p-4 rounded-lg border-2 text-left transition-all ` +
              `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`
            }
          >
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">地圖 {i + 1}</div>
            <div className="space-y-2">
              {/* 模式選擇 */}
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={m.mode}
                onChange={(e) => {
                  const newMode = e.target.value;
                  onUpdateMap(i, 'mode', newMode);
                  // 當模式改變時，清空地圖選擇
                  if (newMode !== m.mode) {
                    onUpdateMap(i, 'map', '');
                  }
                }}
              >
                <option value="">選擇模式</option>
                {modeOptions.map(mode => (
                  <option key={`mode-${mode}`} value={mode}>{mode}</option>
                ))}
              </select>
              {/* 地圖名稱選擇 */}
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={m.map}
                onChange={(e) => onUpdateMap(i, 'map', e.target.value)}
                disabled={!m.mode}
              >
                <option value="">{m.mode ? '選擇地圖' : '請先選擇模式'}</option>
                {m.mode && getMapOptionsForMode(m.mode).map(map => (
                  <option key={`map-${map}`} value={map}>{map}</option>
                ))}
              </select>
              {/* 分數選擇（最高 2） */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">上方隊伍</div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={m.scoreA || '0'}
                    onChange={(e) => onUpdateMap(i, 'scoreA', e.target.value)}
                  >
                    {['0','1','2'].map(v => <option key={`scoreA-${v}`} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">下方隊伍</div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={m.scoreB || '0'}
                    onChange={(e) => onUpdateMap(i, 'scoreB', e.target.value)}
                  >
                    {['0','1','2'].map(v => <option key={`scoreB-${v}`} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

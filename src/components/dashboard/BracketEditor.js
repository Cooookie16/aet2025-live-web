'use client';

// 對戰編輯元件：上下兩列（A/B），每列含隊伍與分數下拉 + 播報按鈕
function MatchEditor({ stage, index, match, teams, onChange, label, isCurrent, onSetCurrent }) {
  return (
    <div className={`rounded-lg border p-4 min-w-[260px] overflow-hidden ${
      isCurrent 
        ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10 dark:border-emerald-500' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50'
    }`}>
      {/* 標籤與播報按鈕 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
        {isCurrent ? (
          <button className="px-2 py-1 text-xs rounded-md bg-emerald-600 text-white cursor-default">目前播報</button>
        ) : (
          <button onClick={() => onSetCurrent(stage, index)} className="px-2 py-1 text-xs rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">點此播報</button>
        )}
      </div>
      {/* A 方 */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <select
          className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          value={match.a.team}
          onChange={(e) => onChange(stage, index, 'a', 'team', e.target.value)}
        >
          <option value="">選擇隊伍</option>
          {teams.map(t => <option key={`${stage}-${index}-a-${t.name || t}`} value={t.name || t}>{t.name || t}</option>)}
        </select>
        <div className="shrink-0 w-20 sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
          {match.a.score}
        </div>
      </div>
      {/* B 方 */}
      <div className="flex items-center gap-2 min-w-0">
        <select
          className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          value={match.b.team}
          onChange={(e) => onChange(stage, index, 'b', 'team', e.target.value)}
        >
          <option value="">選擇隊伍</option>
          {teams.map(t => <option key={`${stage}-${index}-b-${t.name || t}`} value={t.name || t}>{t.name || t}</option>)}
        </select>
        <div className="shrink-0 w-20 sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
          {match.b.score}
        </div>
      </div>
    </div>
  );
}

// 賽程表 Brackets 組件
export default function BracketEditor({ 
  bracket, 
  teamOptions, 
  currentBroadcast, 
  onMatchChange, 
  onSetBroadcastMatch, 
  onResetBrackets 
}) {
  // 是否為目前播報對戰
  const isCurrentMatch = (stage, index) => {
    if (!currentBroadcast) return false;
    return currentBroadcast.stage === stage && currentBroadcast.index === index;
  };

  // 轉換階段顯示標籤
  const getStageLabel = (stage) => {
    if (stage === 'qf') return '八強';
    if (stage === 'sf') return '四強';
    if (stage === 'lf') return '遺材賽';
    if (stage === 'f') return '冠亞賽';
    return '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">賽程表 Brackets</h2>
        <button
          onClick={onResetBrackets}
          className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          title="清空所有賽程表資料"
        >
          RESET ALL
        </button>
      </div>

      {/* 對戰樹佈局：四欄（八強/四強+遺材賽/冠亞/冠軍） */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[900px] grid grid-cols-4 gap-8">
          {/* 八強（4 場） */}
          <div className="space-y-10 flex flex-col justify-center">
            {bracket.qf.map((m, i) => (
              <div key={`qf-m-${i}`} className="relative">
                {/* 連接線（往四強） */}
                <div className="hidden md:block absolute right-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                <MatchEditor
                  stage="qf"
                  index={i}
                  match={m}
                  teams={teamOptions}
                  onChange={onMatchChange}
                  label={`八強 ${i + 1}`}
                  isCurrent={isCurrentMatch('qf', i)}
                  onSetCurrent={onSetBroadcastMatch}
                />
              </div>
            ))}
          </div>

          {/* 四強與遺材賽（同欄位，遺材賽在上方和下方） */}
          <div className="space-y-28 flex flex-col justify-center">
            {/* 上方遺材賽 */}
            <div className="space-y-10">
              {bracket.lf.slice(0, 1).map((m, i) => (
                <div key={`lf-top-${i}`} className="relative">
                  {/* 連接線（左方彙入 & 往下） */}
                  <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                  <div className="hidden md:block absolute bottom-[-16px] left-1/2 w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                  <MatchEditor
                    stage="lf"
                    index={i}
                    match={m}
                    teams={teamOptions}
                    onChange={onMatchChange}
                    label={`遺材賽 ${i + 1}`}
                    isCurrent={isCurrentMatch('lf', i)}
                    onSetCurrent={onSetBroadcastMatch}
                  />
                </div>
              ))}
            </div>

            {/* 四強 */}
            <div className="space-y-10">
              {bracket.sf.map((m, i) => (
                <div key={`sf-m-${i}`} className="relative">
                  {/* 連接線（左方彙入 & 往決賽） */}
                  <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                  <div className="hidden md:block absolute right-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                  <MatchEditor
                    stage="sf"
                    index={i}
                    match={m}
                    teams={teamOptions}
                    onChange={onMatchChange}
                    label={`四強 ${i + 1}`}
                    isCurrent={isCurrentMatch('sf', i)}
                    onSetCurrent={onSetBroadcastMatch}
                  />
                </div>
              ))}
            </div>

            {/* 下方遺材賽 */}
            <div className="space-y-10">
              {bracket.lf.slice(1, 2).map((m, i) => (
                <div key={`lf-bottom-${i}`} className="relative">
                  {/* 連接線（左方彙入 & 往上） */}
                  <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                  <div className="hidden md:block absolute top-[-16px] left-1/2 w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                  <MatchEditor
                    stage="lf"
                    index={i + 1}
                    match={m}
                    teams={teamOptions}
                    onChange={onMatchChange}
                    label={`遺材賽 ${i + 2}`}
                    isCurrent={isCurrentMatch('lf', i + 1)}
                    onSetCurrent={onSetBroadcastMatch}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 冠亞賽（1 場） */}
          <div className="flex flex-col justify-center">
            {bracket.f.map((m, i) => (
              <div key={`f-m-${i}`} className="relative">
                {/* 連接線（左方彙入） */}
                <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                <MatchEditor
                  stage="f"
                  index={i}
                  match={m}
                  teams={teamOptions}
                  onChange={onMatchChange}
                  label={`冠亞賽`}
                  isCurrent={isCurrentMatch('f', i)}
                  onSetCurrent={onSetBroadcastMatch}
                />
              </div>
            ))}
          </div>

          {/* 冠軍（單一） */}
          <div className="flex flex-col justify-center">
            <div className="relative">
              {/* 連接線（左方彙入） */}
              <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
              <div className="rounded-lg border border-amber-400 dark:border-amber-500 p-4 bg-amber-50/60 dark:bg-amber-500/10 min-w-[220px] overflow-hidden">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">冠軍</div>
                <div className="flex items-center gap-2 min-w-0">
                  <select
                    className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={bracket.champ.team}
                    onChange={(e) => onMatchChange('champ', 0, 'team', 'team', e.target.value)}
                  >
                    <option value="">選擇隊伍</option>
                    {teamOptions.map(t => <option key={`champ-${t.name || t}`} value={t.name || t}>{t.name || t}</option>)}
                  </select>
                  <div className="shrink-0 w-20 sm:w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
                    {bracket.champ.score}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

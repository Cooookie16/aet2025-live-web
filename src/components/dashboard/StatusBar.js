'use client';

// 底部懸浮狀態列
export default function StatusBar({ stageLabel, teamA, teamB, displayName, isConnected }) {
  return (
    <div className="fixed left-4 right-4 bottom-4 z-40">
      <div className="mx-auto max-w-7xl rounded-xl bg-white/90 dark:bg-gray-800/90 shadow-lg ring-1 ring-black/5 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="truncate text-sm sm:text-base text-gray-700 dark:text-gray-200">
            <span className="font-semibold">目前播報</span>
            {stageLabel ? <span className="mx-2 text-gray-500">{stageLabel}</span> : null}
            {teamA || teamB ? (
              <span className="font-medium">{teamA || '未選擇'} <span className="mx-1 text-gray-400">vs</span> {teamB || '未選擇'}</span>
            ) : (
              <span className="text-gray-500">尚未選擇對戰</span>
            )}
          </div>
        </div>
        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 shrink-0">
          <span className="mr-2">目前畫面</span>
          <span className="font-semibold">{displayName}</span>
        </div>
      </div>
    </div>
  );
}

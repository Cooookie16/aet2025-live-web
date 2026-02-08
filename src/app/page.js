import Link from 'next/link';

export const metadata = {
  title: 'AET直播控制系統',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3" style={{ fontSize: '1.875rem' }}>
            <h1 className="text-3xl font-bold text-gray-900">
              AET 專用賽事直播控制系統
            </h1>
          </div>
          <p className="mt-2 text-base text-gray-600">
            網站開發 By Cookie
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Dashboard 卡片 */}
          <Link href="/dashboard" className="group" target="_blank" rel="noopener noreferrer" prefetch={false}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center transition-colors">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  控制台
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  操作各種指令，控制遠端顯示內容
                </p>
                <div className="text-blue-600 dark:text-blue-400 font-medium inline-block relative after:block after:h-[2px] after:bg-blue-600 dark:after:bg-blue-400 after:w-0 after:transition-all after:duration-300 group-hover:after:w-full">
                  前往控制台 →
                </div>
              </div>
            </div>
          </Link>

          {/* Live UI 卡片（改為 OBS 版本） */}
          <Link href="/live/bigspace" className="group" target="_blank" rel="noopener noreferrer">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center transition-colors">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  直播介面
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  遠端顯示介面，即時更新內容
                </p>
                <div className="text-green-600 dark:text-green-400 font-medium inline-block relative after:block after:h-[2px] after:bg-green-600 dark:after:bg-green-400 after:w-0 after:transition-all after:duration-300 group-hover:after:w-full">
                  查看直播介面 →
                </div>
              </div>
            </div>
          </Link>

          {/* Scorebar 卡片 */}
          <Link href="/live/scorebar" className="group" target="_blank" rel="noopener noreferrer">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center transition-colors">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  計分條
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  獨立的賽事比分顯示，適用於疊加層
                </p>
                <div className="text-pink-600 dark:text-pink-400 font-medium inline-block relative after:block after:h-[2px] after:bg-pink-600 dark:after:bg-pink-400 after:w-0 after:transition-all after:duration-300 group-hover:after:w-full">
                  查看計分條 →
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 移除：OBS 專用連結卡片（已整合至上方綠色卡片） */}

        {/* 使用說明區塊已移除（依需求） */}
      </div>
    </div>
  );
};
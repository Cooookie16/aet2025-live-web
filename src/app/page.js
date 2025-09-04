import Link from 'next/link';

// 自訂本頁頁籤標題
export const metadata = {
  title: '首頁｜AET2025直播控制系統',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3" style={{ fontSize: '1.875rem' }}>
            <img src="/globe.svg" alt="Logo" className="h-[1em] w-[1em]" />
            <h1 className="text-3xl font-bold text-gray-900">
              AET2025直播控制系統
            </h1>
          </div>
          <p className="mt-2 text-base text-gray-600">
            雙頁面即時通訊系統
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Dashboard 卡片 */}
          <Link href="/dashboard" className="group" target="_blank" rel="noopener noreferrer">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
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
          <Link href="/live/jianss/ui/obs" className="group" target="_blank" rel="noopener noreferrer">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 aspect-square flex flex-col items-center justify-center transition-colors">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
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
        </div>

        {/* 移除：OBS 專用連結卡片（已整合至上方綠色卡片） */}

        {/* 使用說明區塊已移除（依需求） */}
      </div>
    </div>
  );
}
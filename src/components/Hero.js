export default function Hero() {
  return (
    <section id="home" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            歡迎來到
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              AET2025
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            一個現代化、響應式的 Next.js 網站，採用最新的技術和設計理念
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
              開始使用
            </button>
            <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
              了解更多
            </button>
          </div>
        </div>

        {/* Hero Image/Illustration */}
        <div className="mt-16 flex justify-center">
          <div className="relative">
            <div className="w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl shadow-2xl flex items-center justify-center">
              <div className="text-white text-6xl font-bold">
                🚀
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 -left-8 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

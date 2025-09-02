export default function Features() {
  const features = [
    {
      icon: '⚡',
      title: '快速載入',
      description: '採用 Next.js 的最新技術，提供極速的頁面載入體驗'
    },
    {
      icon: '📱',
      title: '響應式設計',
      description: '完美適配各種裝置，從手機到桌面都能提供最佳體驗'
    },
    {
      icon: '🎨',
      title: '現代化設計',
      description: '採用 Tailwind CSS 打造美觀且一致的視覺設計'
    },
    {
      icon: '🔧',
      title: '易於維護',
      description: '清晰的代碼結構和組件化設計，讓開發和維護變得簡單'
    },
    {
      icon: '🌙',
      title: '深色模式',
      description: '支援深色和淺色主題，提供更好的使用體驗'
    },
    {
      icon: '🚀',
      title: 'SEO 優化',
      description: '內建 SEO 優化功能，提升搜尋引擎排名'
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            主要功能
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            我們提供完整的解決方案，讓您的網站脫穎而出
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

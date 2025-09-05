/** @type {import('next').NextConfig} */
const nextConfig = {
  // 針對低使用量但需要高穩定性的優化配置
  
  // 實驗性功能 - 提升性能和穩定性
  experimental: {
    // 暫時關閉實驗性功能以提升穩定性
    // reactCompiler: false,
    // optimizePackageImports: ['react', 'react-dom'],
  },

  // 編譯器選項 - 提升代碼品質
  compiler: {
    // 移除 console.log（生產環境）
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 性能優化
  poweredByHeader: false, // 移除 X-Powered-By 標頭
  generateEtags: true, // 啟用 ETags 快取
  compress: true, // 啟用 gzip 壓縮

  // 圖片優化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天快取
    dangerouslyAllowSVG: false, // 安全考量
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 允許所有圖片來源（包括動態上傳的圖片）
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/team-images/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/maps/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/brawlers/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/images/**',
      },
      // 允許所有本地路徑
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
    // 允許未優化的圖片（用於動態上傳的圖片）
    unoptimized: true,
  },

  // 安全標頭（排除 Next 開發資源與 HMR 路徑，避免影響 WebSocket）
  async headers() {
    return [
      {
        // 只對非 _next 資源套用
        source: '/:path((?!_next/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },

  // 重寫規則 - 提升 SEO 和用戶體驗
  async rewrites() {
    return [
      // 可以在此添加 API 重寫規則
    ];
  },

  // 重定向規則
  async redirects() {
    return [
      // 可以在此添加重定向規則
    ];
  },

  // 環境變數驗證
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 輸出配置 - 僅在正式環境使用 standalone，避免干擾開發 HMR
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  trailingSlash: false, // 統一 URL 格式
  
  // 開發環境優化
  ...(process.env.NODE_ENV === 'development' && {
    // 開發環境特定配置
    onDemandEntries: {
      // 頁面在記憶體中保留的時間
      maxInactiveAge: 25 * 1000,
      // 同時保留的頁面數量
      pagesBufferLength: 2,
    },
  }),
};

export default nextConfig;

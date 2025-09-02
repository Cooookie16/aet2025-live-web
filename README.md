# AET2025 Web Test

一個現代化、高穩定性的 Next.js 網站，專為低使用量但需要高即時性和穩定性的場景設計。

## 🚀 主要特色

- **高穩定性**: 嚴格的 ESLint 規則和代碼品質檢查
- **即時性**: 優化的 Next.js 配置和性能設定
- **安全性**: 內建安全標頭和最佳實踐
- **響應式設計**: 完美適配各種裝置
- **深色模式**: 自動適配系統主題偏好

## 🛠️ 技術棧

- **框架**: Next.js 15.5.2 (App Router)
- **前端**: React 19.1.0
- **樣式**: Tailwind CSS 4.0
- **語言**: JavaScript (無 TypeScript)
- **建置工具**: Turbopack

## 📦 安裝和運行

### 開發環境

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 開啟瀏覽器訪問
# http://localhost:3000
```

### 生產環境

```bash
# 建置專案（包含 linting 檢查）
npm run build

# 啟動生產伺服器
npm start
```

## 🔧 可用腳本

```bash
# 開發
npm run dev          # 啟動開發伺服器

# 建置和部署
npm run build        # 建置專案（包含 linting）
npm run start        # 啟動生產伺服器

# 代碼品質
npm run lint         # 運行 ESLint 檢查
npm run lint:fix     # 自動修復 ESLint 問題

# 維護
npm run clean        # 清理建置檔案
npm run health-check # 健康檢查
```

## 🏗️ 專案結構

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API 路由
│   │   └── health/     # 健康檢查端點
│   ├── globals.css     # 全域樣式
│   ├── layout.js       # 根佈局
│   └── page.js         # 首頁
└── components/         # React 組件
    ├── Header.js       # 導航列
    ├── Hero.js         # 主要橫幅
    ├── Features.js     # 功能展示
    └── Footer.js       # 頁尾
```

## ⚙️ 配置說明

### ESLint 配置
- 嚴格的代碼品質規則
- 防止運行時錯誤
- React 和 Next.js 最佳實踐
- 性能優化建議

### Next.js 配置
- 安全標頭設定
- 圖片優化
- 壓縮和快取
- 獨立部署支援

### 性能優化
- Turbopack 快速建置
- 現代圖片格式支援
- ETags 快取
- Gzip 壓縮

## 🔍 健康檢查

網站提供健康檢查端點：

```
GET /api/health
```

回應包含：
- 服務狀態
- 運行時間
- 記憶體使用情況
- 環境資訊

## 🚀 部署

### Vercel (推薦)
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### Docker
```bash
# 建置 Docker 映像
docker build -t aet2025-web .

# 運行容器
docker run -p 3000:3000 aet2025-web
```

### 其他平台
專案配置為 `standalone` 輸出，可部署到任何支援 Node.js 的平台。

## 📝 開發指南

### 代碼規範
- 使用 ESLint 進行代碼檢查
- 遵循 React 最佳實踐
- 使用語義化的 HTML 標籤
- 保持組件簡潔和可重用

### 性能考量
- 使用 Next.js Image 組件
- 避免不必要的重新渲染
- 優化圖片和資源載入
- 使用適當的快取策略

### 安全最佳實踐
- 避免 XSS 攻擊
- 使用安全的標頭
- 驗證用戶輸入
- 定期更新依賴

## 🤝 貢獻

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

此專案採用 MIT 授權 - 查看 [LICENSE](LICENSE) 檔案了解詳情。

## 📞 支援

如有問題或建議，請：
- 開啟 [Issue](https://github.com/your-repo/issues)
- 發送郵件至 info@aet2025.com
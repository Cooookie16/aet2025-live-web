import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  {
    // 針對穩定性和即時性優化的規則
    rules: {
      // 防止潛在的運行時錯誤
      "no-console": "warn", // 警告 console 語句，避免生產環境洩露
      "no-debugger": "error", // 禁止 debugger 語句
      "no-alert": "error", // 禁止 alert 語句
      "no-var": "error", // 強制使用 let/const
      "prefer-const": "error", // 優先使用 const
      
      // React 相關穩定性規則
      "react/no-unescaped-entities": "error", // 防止 XSS
      "react/jsx-key": "error", // 確保列表有 key
      "react-hooks/exhaustive-deps": "warn", // 檢查 useEffect 依賴
      "react/no-array-index-key": "warn", // 避免使用陣列索引作為 key
      
      // Next.js 最佳實踐
      "@next/next/no-img-element": "error", // 強制使用 Next.js Image 組件
      "@next/next/no-html-link-for-pages": "error", // 使用 Next.js Link 組件
      
      // 代碼品質和可維護性
      "no-unused-vars": "error", // 禁止未使用的變數
      "no-undef": "error", // 禁止未定義的變數
      "eqeqeq": "error", // 強制使用 === 和 !==
      "curly": "error", // 強制使用大括號
      "no-eval": "error", // 禁止 eval
      "no-implied-eval": "error", // 禁止隱式 eval
      "no-new-func": "error", // 禁止 new Function
      
      // 性能相關
      "no-loop-func": "error", // 禁止在循環中創建函數
      "no-inner-declarations": "error", // 禁止在嵌套塊中聲明函數
    },
  },
];

export default eslintConfig;

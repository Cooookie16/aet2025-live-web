'use client';

import { useEffect } from 'react';

// Next.js 全域錯誤兜底：當 root layout 拋錯時觸發
// 對 OBS 場景而言，主播無法手動刷新，所以自動 reload。
// eslint-disable-next-line no-unused-vars
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // 5 秒後自動嘗試 reload；若仍失敗則重複
    const t = setTimeout(() => {
      try { window.location.reload(); } catch {
        try { reset(); } catch {}
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <html lang="zh-TW">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: 'rgba(0,0,0,0.55)',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>系統錯誤</div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            5 秒後自動嘗試重新載入…
          </div>
        </div>
      </body>
    </html>
  );
}

'use client';

import { useEffect } from 'react';

// /live/* 路由錯誤兜底：OBS 來源無法手動刷新，所以自動 reload
// eslint-disable-next-line no-unused-vars
export default function LiveError({ error, reset }) {
  useEffect(() => {
    const t = setTimeout(() => {
      try { window.location.reload(); } catch {
        try { reset(); } catch {}
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 99999,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>顯示載入失敗</div>
      <div style={{ fontSize: 14, opacity: 0.85 }}>5 秒後自動重新載入…</div>
    </div>
  );
}

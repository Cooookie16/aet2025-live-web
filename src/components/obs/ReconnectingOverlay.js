'use client';

import { useEffect, useState } from 'react';

/**
 * 軟重連 / 錯誤覆蓋層（OBS 顯示頁專用）。
 *
 * 設計：
 *  - 平時完全透明，OBS 觀眾不會看到。
 *  - 連線斷開超過 visibleAfterMs 才出現右上角小提示，避免短暫抖動觸發。
 *  - error 模式：頁面崩潰時顯示，N 秒後自動 reload（OBS 端無法手動刷新）。
 */
export default function ReconnectingOverlay({
  status, // 'connecting' | 'open' | 'reconnecting' | 'stale'
  lastEventTime = 0,
  visibleAfterMs = 8000,
  mode = 'connection', // 'connection' | 'error'
  errorReloadAfterMs = 5000,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (mode !== 'error') {
      return undefined;
    }
    const reload = setTimeout(() => {
      try { window.location.reload(); } catch {}
    }, errorReloadAfterMs);
    return () => clearTimeout(reload);
  }, [mode, errorReloadAfterMs]);

  if (mode === 'error') {
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
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          將於 {Math.ceil(errorReloadAfterMs / 1000)} 秒後自動重新載入…
        </div>
      </div>
    );
  }

  // 連線狀態指示
  const isProblem = status === 'reconnecting' || status === 'stale' || status === 'connecting';
  const elapsed = lastEventTime > 0 ? Math.max(0, now - lastEventTime) : 0;
  const shouldShow = isProblem && elapsed >= visibleAfterMs;

  if (!shouldShow) {
    return null;
  }

  const seconds = Math.floor(elapsed / 1000);
  const label =
    status === 'stale' ? '訊號中斷，重新連線中' :
    status === 'reconnecting' ? '重新連線中' :
    '建立連線中';

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'rgba(220, 38, 38, 0.85)',
        color: 'white',
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 99999,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#fff',
          marginRight: 6,
          verticalAlign: 'middle',
          animation: 'aet-pulse 1.2s infinite',
        }}
      />
      {label}（{seconds}s）
      <style>{`
        @keyframes aet-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

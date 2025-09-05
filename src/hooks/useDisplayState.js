'use client';

import { useState, useEffect, useMemo } from 'react';

// 顯示介面狀態管理 hook
export function useDisplayState() {
  const [currentDisplay, setCurrentDisplay] = useState('welcome');
  const [displayLoaded, setDisplayLoaded] = useState(false);

  // 合法顯示介面清單與清理函式
  const VALID_DISPLAY_IDS = useMemo(() => ['welcome', 'bracket', 'banpick', 'map-score', 'team-image'], []);
  const sanitizeDisplay = (val) => {
    try {
      const s = (val ?? '').toString().trim();
      return VALID_DISPLAY_IDS.includes(s) ? s : null;
    } catch {
      return null;
    }
  };

  // 供 UI 呈現選中狀態用：若當前值無效則回退為 welcome（不改動原始狀態）
  const selectedDisplayId = useMemo(() => {
    if (!displayLoaded) {
      return null;
    }
    return sanitizeDisplay(currentDisplay) || 'welcome';
  }, [currentDisplay, displayLoaded]);

  // 可用的顯示介面選項
  const displayOptions = useMemo(() => [
    { id: 'welcome', name: '歡迎畫面', description: '顯示活動歡迎畫面' },
    { id: 'bracket', name: '目前賽程 Bracket', description: '顯示當前賽程對戰樹' },
    { id: 'banpick', name: '目前 Banpick', description: '顯示當前 Ban/Pick 狀態' },
    { id: 'map-score', name: '地圖與比數', description: '顯示地圖與當前比數' },
    { id: 'team-image', name: '顯示選手圖', description: '顯示選定隊伍的選手圖片' }
  ], []);

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              const d = json?.data || {};
              // 先嘗試使用後端值；若沒有再嘗試 localStorage
              let nextDisplay = sanitizeDisplay(d.currentDisplay);
              if (!nextDisplay) {
                try {
                  const rawDisplay = localStorage.getItem('dashboard:currentDisplay');
                  const cleaned = sanitizeDisplay(rawDisplay);
                  if (cleaned) {
                    nextDisplay = cleaned;
                  }
                } catch {}
              }
              if (nextDisplay) {
                setCurrentDisplay(nextDisplay);
              }
              setDisplayLoaded(true);
              return;
            } catch (parseError) {
              console.warn('解析API回應JSON失敗:', parseError);
            }
          }
        }
      } catch {}
      
      // 後備：從 localStorage 載入
      try {
        const rawDisplay = localStorage.getItem('dashboard:currentDisplay');
        const cleaned = sanitizeDisplay(rawDisplay);
        if (cleaned) {
          setCurrentDisplay(cleaned);
        }
      } catch {}
      setDisplayLoaded(true);
    };
    loadState();
  }, []);

  // 同步顯示介面到後端
  useEffect(() => {
    if (!displayLoaded) {
      return; // 尚未載入前不要覆蓋後端的已存值
    }
    try { localStorage.setItem('dashboard:currentDisplay', currentDisplay); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentDisplay })
        });
      } catch {}
    })();
  }, [currentDisplay, displayLoaded]);

  // 切換顯示介面
  const switchDisplay = (displayId) => {
    setCurrentDisplay(displayId);
    // 立即同步到後端，觸發 SSE，確保 OBS 立刻更新畫面
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentDisplay: displayId })
        });
      } catch {}
    })();
  };

  return {
    currentDisplay,
    setCurrentDisplay,
    displayLoaded,
    selectedDisplayId,
    displayOptions,
    switchDisplay
  };
}

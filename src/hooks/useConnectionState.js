'use client';

import { useState, useEffect } from 'react';

// 連線狀態管理 hook
export function useConnectionState() {
  const [isConnected, setIsConnected] = useState(false);

  // 簡化的連線檢查（改用 /api/health，避免觸發舊的 get-messages）
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (response.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('連線檢查失敗:', error);
        setIsConnected(false);
      }
    };
    
    // 立即檢查一次
    checkConnection();
  }, []);

  return {
    isConnected,
    setIsConnected
  };
}

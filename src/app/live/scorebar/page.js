'use client';

import { useState, useEffect, useRef } from 'react';

// 關閉 OBS 端除錯輸出
if (typeof window !== 'undefined') {
  try {
    const noop = () => {};
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.warn = noop;
    // eslint-disable-next-line no-console
    console.error = noop;
  } catch {}
}

// Auto-scaling text component
const AutoFitText = ({ text, maxWidth = 260, align = 'left', className = '' }) => {
  const textRef = useRef(null);
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    if (textRef.current) {
      // Reset to measure
      textRef.current.style.transform = 'scale(1)';
      textRef.current.style.width = 'auto';
      
      const contentWidth = textRef.current.scrollWidth;
      // If content is wider than maxWidth, scale down
      if (contentWidth > maxWidth) {
        setScale(maxWidth / contentWidth);
        textRef.current.style.width = `${contentWidth}px`; // Force width to keep flow correct with scale
      } else {
        setScale(1);
        textRef.current.style.width = 'auto';
      }
    }
  }, [text, maxWidth]);

  return (
    <div 
      style={{ 
        width: maxWidth, 
        display: 'flex', 
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        overflow: 'visible' // Allow transform to scale visually without clipping if needed, though we shrink so it fits
      }}
    >
      <div 
        ref={textRef} 
        className={className}
        style={{ 
            whiteSpace: 'nowrap', 
            transform: `scale(${scale})`, 
            transformOrigin: align === 'right' ? 'right center' : 'left center',
            display: 'block'
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default function ScoreBarPage() {
  const [bracket, setBracket] = useState(null);
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [mapScores, setMapScores] = useState({});
  
  // SSERefs
  const lastUpdateRef = useRef(0);
  const esRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);

  // 1. 初始化資料
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          let json = null;
          try { json = await res.json(); } catch { json = null; }
          const d = json?.data || {};
          
          if (d?.bracket) {setBracket(d.bracket);}
          if (d?.currentBroadcast) {setCurrentBroadcast(d.currentBroadcast);}
          if (d?.mapScores) {setMapScores(d.mapScores);}
        }
      } catch {}
    })();

    // 2. SSE 連線
    const connect = () => {
      try {
        if (esRef.current) {
          try { esRef.current.close(); } catch {}
          esRef.current = null;
        }
        const es = new EventSource('/api/events');
        esRef.current = es;

        es.onopen = () => {
          retryAttemptRef.current = 0;
        };
        es.onerror = () => {
          try { es.close(); } catch {}
          esRef.current = null;
          const nextDelay = Math.min(30000, 1000 * Math.pow(2, retryAttemptRef.current || 0));
          retryAttemptRef.current = (retryAttemptRef.current || 0) + 1;
          if (retryTimerRef.current) {clearTimeout(retryTimerRef.current);}
          retryTimerRef.current = setTimeout(() => connect(), nextDelay);
        };
        es.onmessage = (evt) => {
          try {
            const raw = (evt && typeof evt.data === 'string') ? evt.data.trim() : '';
            if (!raw || raw[0] !== '{') {return;}
            const msg = JSON.parse(raw);
            if (!msg) {return;}
            
            if (msg.timestamp && msg.timestamp <= (lastUpdateRef.current || 0)) {return;}

            // 處理各類更新
            if (msg.type === 'bracket-update') {
              lastUpdateRef.current = msg.timestamp || Date.now();
              if (msg?.data?.bracket) {setBracket(msg.data.bracket);}
            } else if (msg.type === 'current-broadcast-update') {
              lastUpdateRef.current = msg.timestamp || Date.now();
              if (msg?.data?.currentBroadcast) {setCurrentBroadcast(msg.data.currentBroadcast);}
            } else if (msg.type === 'map-score-update') {
              lastUpdateRef.current = msg.timestamp || Date.now();
              if (msg?.data?.mapScores) {setMapScores(msg.data.mapScores);}
            } else if (msg.type === 'display-change') {
                // 即使是 display-change，裡面也常帶有最新的 mapScores，順便更新確保同步
                lastUpdateRef.current = msg.timestamp || Date.now();
                if (msg?.data?.mapScores) {
                    setMapScores(data => ({ ...data, ...msg.data.mapScores }));
                }
            }
          } catch {}
        };
      } catch {}
    };

    // 看門狗：若 25s 沒有任何事件，主動關閉 SSE 並觸發重連
    const watchdog = setInterval(() => {
        const now = Date.now();
        const staleMs = now - (lastUpdateRef.current || 0);
        if (esRef.current && staleMs > 25000) {
          try { esRef.current.close(); } catch {}
          esRef.current = null;
          connect();
        }
      }, 5000);

    connect();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !esRef.current) {connect();}
    };
    const onOnline = () => {
      if (!esRef.current) {connect();}
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
      try { window.removeEventListener('online', onOnline); } catch {}
      try { clearInterval(watchdog); } catch {}
      if (retryTimerRef.current) {clearTimeout(retryTimerRef.current);}
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, []);

  // 取得目前隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {return { a: '', b: '' };}
    
    // 安全存取 bracket
    const list = bracket?.[stage];
    if (!list || typeof index !== 'number' || !list[index]) {return { a: '', b: '' };}
    
    const a = list[index]?.a?.team || '';
    const b = list[index]?.b?.team || '';
    return { a, b };
  };

  // 計算大比分
  const getBigScore = (team) => {
    const { stage, index } = currentBroadcast || {};
    if ((!stage && stage !== 0) || typeof index !== 'number') {return 0;}

    const key = `${stage}:${index}`;
    const entry = mapScores?.[key]; // Array of 5 maps

    if (!Array.isArray(entry)) {return 0;}

    const scoreKey = team === 'A' ? 'scoreA' : 'scoreB';
    const won = entry.reduce((acc, m) => {
      const v = m?.[scoreKey];
      if (v === undefined || v === null) {return acc;}
      const n = Number(v);
      return acc + (n === 2 ? 1 : 0); // 拿 2 分算贏一盤
    }, 0);
    
    return Math.min(5, won);
  };

  const teams = getCurrentBroadcastTeams();
  const scoreA = getBigScore('A');
  const scoreB = getBigScore('B');

  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 1100px;
          height: 160px;
          overflow: hidden;
          background: transparent !important;
        }
        #__next {
          background: transparent !important;
        }
      `}</style>
      
      {/* 主要容器：分為左右兩邊 */}
      <div className="w-[1100px] h-[160px] flex items-center justify-between px-0 box-border overflow-hidden rounded-3xl border-0">
        
        {/* 左側：Team A 區域 (藍色背景) */}
        <div className="flex-1 h-full flex items-center gap-6 pl-8" style={{ backgroundColor: '#5050FF' }}>
          {/* A 隊分數 */}
          <div className="text-8xl font-extrabold text-white w-[100px] text-center leading-none">
            {scoreA}
          </div>
          
          {/* 分隔線 */}
          <div className="w-1 h-28 bg-white/30"></div>

          {/* A 隊名稱 */}
          <AutoFitText 
            text={teams.a} 
            align="left" 
            className="text-4xl font-medium leading-tight text-white"
          />
        </div>

        {/* 右側：Team B 區域 (紅色背景) */}
        <div className="flex-1 h-full flex items-center gap-6 flex-row-reverse pr-8" style={{ backgroundColor: '#FF4E7F' }}>
          {/* B 隊分數 */}
          <div className="text-8xl font-extrabold text-white w-[100px] text-center leading-none">
            {scoreB}
          </div>

          {/* 分隔線 */}
          <div className="w-1 h-28 bg-white/30"></div>
          
          {/* B 隊名稱 */}
          <AutoFitText 
            text={teams.b} 
            align="right" 
            className="text-4xl font-medium leading-tight text-white"
          />
        </div>

      </div>
    </>
  );
};
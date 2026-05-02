'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveSync } from '@/hooks/useLiveSync';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { fetchJsonSafe } from '@/lib/fetchWithRetry';
import ReconnectingOverlay from '@/components/obs/ReconnectingOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';

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
        overflow: 'visible',
      }}
    >
      <div
        ref={textRef}
        className={className}
        style={{
            whiteSpace: 'nowrap',
            transform: `scale(${scale})`,
            transformOrigin: align === 'right' ? 'right center' : 'left center',
            display: 'block',
        }}
      >
        {text}
      </div>
    </div>
  );
};

function ScoreBarContent() {
  const [bracket, setBracket] = useState(null);
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [mapScores, setMapScores] = useState({});

  const lastUpdateRef = useRef(0);

  // 全量同步（啟動 + SSE resync 觸發）
  const fullSync = useCallback(async () => {
    const json = await fetchJsonSafe('/api/state', { cache: 'no-store' }, null);
    const d = json?.data;
    if (!d) {
      return;
    }
    if (d.bracket) {setBracket(d.bracket);}
    if (d.currentBroadcast) {setCurrentBroadcast(d.currentBroadcast);}
    if (d.mapScores) {setMapScores(d.mapScores);}
  }, []);

  const handleEvent = useCallback((msg) => {
    if (!msg) {return;}
    if (msg.timestamp && msg.timestamp <= (lastUpdateRef.current || 0)) {return;}
    lastUpdateRef.current = msg.timestamp || Date.now();

    if (msg.type === 'bracket-update' && msg?.data?.bracket) {
      setBracket(msg.data.bracket);
    } else if (msg.type === 'current-broadcast-update' && msg?.data?.currentBroadcast) {
      setCurrentBroadcast(msg.data.currentBroadcast);
    } else if (msg.type === 'map-score-update' && msg?.data?.mapScores) {
      setMapScores(msg.data.mapScores);
    } else if (msg.type === 'display-change' && msg?.data?.mapScores) {
      // display-change 也可能帶有 mapScores
      setMapScores((prev) => ({ ...prev, ...msg.data.mapScores }));
    }
  }, []);

  const { status, lastEventTime } = useLiveSync({
    onEvent: handleEvent,
    onResync: fullSync,
  });

  useHeartbeat({ source: 'obs-scorebar' });

  // 取得目前隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {return { a: '', b: '' };}

    const list = bracket?.[stage];
    if (!list || typeof index !== 'number' || !list[index]) {return { a: '', b: '' };}

    const a = list[index]?.a?.team || '';
    const b = list[index]?.b?.team || '';
    return { a, b };
  };

  const getBigScore = (team) => {
    const { stage, index } = currentBroadcast || {};
    if ((!stage && stage !== 0) || typeof index !== 'number') {return 0;}

    const key = `${stage}:${index}`;
    const entry = mapScores?.[key];

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
          width: 1500px;
          height: 160px;
          overflow: hidden;
          background: transparent !important;
        }
        #__next {
          background: transparent !important;
        }
      `}</style>

      {/* 主要容器：藍色與紅色區塊中間留 450px 透明間隔 */}
      <div className="w-[1500px] h-[160px] flex items-center px-0 box-border gap-[450px]">

        {/* 左側：Team A 區域 (藍色背景) */}
        <div
          className="flex-1 h-full flex items-center gap-6 pl-8 rounded-3xl overflow-hidden"
          style={{ backgroundColor: '#5050FF' }}
        >
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
        <div
          className="flex-1 h-full flex items-center gap-6 flex-row-reverse pr-8 rounded-3xl overflow-hidden"
          style={{ backgroundColor: '#FF4E7F' }}
        >
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
      <ReconnectingOverlay status={status} lastEventTime={lastEventTime} />
    </>
  );
}

export default function ScoreBarPage() {
  return (
    <ErrorBoundary
      renderFallback={() => <ReconnectingOverlay mode="error" status="open" />}
    >
      <ScoreBarContent />
    </ErrorBoundary>
  );
};

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import './obs.css';

export default function OBSLiveUI() {
  const [currentDisplay, setCurrentDisplay] = useState(null);
  const [displayData, setDisplayData] = useState({});
  const [bracket, setBracket] = useState(null); // 從後端載入並由 SSE 即時更新
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  const [isConnected, setIsConnected] = useState(false);
  
  // 以 SSE 取代輪詢（僅在掛載時建立一次連線）
  const lastUpdateRef = useRef(0);
  const esRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const currentDisplayRef = useRef(null);

  useEffect(() => { currentDisplayRef.current = currentDisplay; }, [currentDisplay]);

  useEffect(() => {
    console.log('[OBS] init: start load /api/state');
    // 啟動時從後端讀取當前狀態，避免在沒有收到即時事件前畫面無法同步
    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        console.log('[OBS] /api/state status:', res.status);
        if (res.ok) {
          const json = await res.json();
          const d = json?.data || {};
          console.log('[OBS] /api/state data:', d);
          if (typeof d?.currentDisplay === 'string' && d.currentDisplay) {
            console.log('[OBS] set currentDisplay from state:', d.currentDisplay);
            setCurrentDisplay(d.currentDisplay);
          }
          if (d?.bracket) {
            setBracket(d.bracket);
          }
          if (d?.currentBroadcast) {
            setCurrentBroadcast(d.currentBroadcast);
          }
        }
      } catch (e) {
        console.warn('[OBS] /api/state failed:', e);
      }
    })();

    // 後備：每 3 秒輪詢一次狀態以矯正畫面（當 SSE 未連線時才輪詢）
    const poll = setInterval(async () => {
      if (esRef.current) return; // SSE 正常時暫停輪詢
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const d = json?.data || {};
        const srv = typeof d?.currentDisplay === 'string' ? d.currentDisplay : null;
        if (srv && srv !== currentDisplayRef.current) {
          console.log('[OBS] POLL sync display ->', srv, '(was:', currentDisplayRef.current, ')');
          setCurrentDisplay(srv);
        }
        if (d?.bracket) {
          setBracket(d.bracket);
        }
        if (d?.currentBroadcast) {
          setCurrentBroadcast(d.currentBroadcast);
        }
      } catch {}
    }, 3000);

    const connect = () => {
      try {
        if (esRef.current) {
          try { esRef.current.close(); } catch {}
          esRef.current = null;
        }
        console.log('[OBS] SSE connect -> /api/events');
        const es = new EventSource('/api/events');
        esRef.current = es;

        es.onopen = () => {
          console.log('[OBS] SSE onopen');
          setIsConnected(true);
          retryAttemptRef.current = 0; // 重置退避
        };
        es.onerror = (evt) => {
          console.warn('[OBS] SSE onerror:', evt);
          setIsConnected(false);
          try { es.close(); } catch {}
          esRef.current = null;
          // 指數退避（上限 30s）
          const nextDelay = Math.min(30000, 1000 * Math.pow(2, retryAttemptRef.current || 0));
          console.log('[OBS] retry in', nextDelay, 'ms, attempt', retryAttemptRef.current);
          retryAttemptRef.current = (retryAttemptRef.current || 0) + 1;
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => connect(), nextDelay);
        };
        es.onmessage = (evt) => {
          try {
            const latestMessage = JSON.parse(evt.data);
            console.log('[OBS] SSE message:', latestMessage);
            if (!latestMessage) return;
            if (latestMessage.timestamp && latestMessage.timestamp <= (lastUpdateRef.current || 0)) return;

            if (latestMessage.type === 'display-change') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              console.log('[OBS] display-change ->', latestMessage.data?.displayId, 'ts:', lastUpdateRef.current);
              setCurrentDisplay(latestMessage.data.displayId);
              setDisplayData({
                ...latestMessage.data,
                lastUpdate: lastUpdateRef.current
              });
            } else if (latestMessage.type === 'bracket-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              console.log('[OBS] bracket-update');
              if (latestMessage?.data?.bracket) {
                setBracket(latestMessage.data.bracket);
              }
            } else if (latestMessage.type === 'current-broadcast-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              if (latestMessage?.data?.currentBroadcast) {
                setCurrentBroadcast(latestMessage.data.currentBroadcast);
              }
            } else if (latestMessage.type === 'custom-message') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              console.log('[OBS] custom-message ->', latestMessage.data);
              setDisplayData(prev => ({
                ...prev,
                customMessage: latestMessage.data.message,
                timestamp: latestMessage.data.timestamp,
                lastUpdate: lastUpdateRef.current
              }));
            }
          } catch (e) {
            console.warn('[OBS] onmessage parse error:', e, 'raw:', evt?.data);
          }
        };
      } catch (e) {
        console.error('[OBS] connect error:', e);
        setIsConnected(false);
      }
    };

    // 初次建立連線
    connect();

    // 當頁面由隱藏轉為顯示、或網路回復時，嘗試重連
    const onVisible = () => {
      console.log('[OBS] visibilitychange:', document.visibilityState);
      if (document.visibilityState === 'visible' && !esRef.current) {
        connect();
      }
    };
    const onOnline = () => {
      console.log('[OBS] online');
      if (!esRef.current) connect();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      console.log('[OBS] cleanup');
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
      try { window.removeEventListener('online', onOnline); } catch {}
      try { clearInterval(poll); } catch {}
      if (retryTimerRef.current) {
        try { clearTimeout(retryTimerRef.current); } catch {}
      }
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, []);

  // 顯示介面變更偵錯
  useEffect(() => {
    console.log('[OBS] render display ->', currentDisplay);
  }, [currentDisplay]);

  // 顯示資料變更偵錯
  useEffect(() => {
    console.log('[OBS] displayData updated ->', displayData);
  }, [displayData]);

  // 渲染不同的顯示介面
  const renderDisplay = () => {
    if (!currentDisplay) return null; // 尚未取得狀態前不渲染，避免 welcome 閃爍
    switch (currentDisplay) {
      case 'welcome':
        return <OBSWelcomeDisplay data={displayData} />;
      case 'bracket':
        return <OBSBracketDisplay data={{ bracket, currentBroadcast }} />;
      case 'banpick':
        return <OBSBanpickDisplay data={displayData} />;
      case 'map-score':
        return <OBSMapScoreDisplay data={displayData} />;
      default:
        return null;
    }
  };

  return (
    <div className="obs-container bg-transparent text-white">
      {/* 主要顯示區域 - 限制在 800x600 */}
      <div className="w-[800px] h-[600px] flex items-center justify-center overflow-hidden">
        {renderDisplay()}
      </div>
    </div>
  );
}

// OBS 優化的歡迎畫面組件
function OBSWelcomeDisplay({ data }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 歡迎畫面：僅顯示活動 Logo */}
      <div className="max-w-[80vw] max-h-[80vh] w-full h-auto flex items-center justify-center p-8">
        <Image
          src="/images/AET2025_full_title_logo.png"
          alt="AET2025 Logo"
          width={1920}
          height={1080}
          priority
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}

// OBS Bracket 顯示
function OBSBracketDisplay({ data }) {
  const bracket = data?.bracket;
  const currentBroadcast = data?.currentBroadcast;
  const qf = bracket?.qf || Array.from({ length: 4 }).map(() => ({ a: { team: '隊伍 A', score: 'n/a' }, b: { team: '隊伍 B', score: 'n/a' } }));
  const sf = bracket?.sf || Array.from({ length: 2 }).map(() => ({ a: { team: '勝者', score: 'n/a' }, b: { team: '勝者', score: 'n/a' } }));
  const f = bracket?.f || [{ a: { team: '勝者', score: 'n/a' }, b: { team: '勝者', score: 'n/a' } }];
  const champ = bracket?.champ || { team: '最終勝者', score: 'n/a' };
  const isLive = (stage, idx) => currentBroadcast && currentBroadcast.stage === stage && currentBroadcast.index === idx;

  return (
    <div className="w-full h-full flex items-center justify-center p-3">
      <div className="w-full max-w-[760px]">
        <h2 className="text-2xl font-bold mb-4 text-white">目前賽程 Bracket</h2>
        <div className="relative w-full overflow-hidden">
          <div className="w-full grid grid-cols-4 gap-3">
            {/* 八強（4 場） */}
            <div className="space-y-6 flex flex-col justify-center">
              {qf.map((m, i) => (
                <div key={`qf-${i}`} className="relative">
                  {/* 往四強的水平連接線 */}
                  <div className="hidden md:block absolute right-[-8px] top-1/2 w-2 border-t border-white"></div>
                  <div className={`relative rounded-xl bg-white p-2 min-w-0 ${isLive('qf', i) ? 'border-2 border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.3)]' : 'border border-white'}`}>
                    {isLive('qf', i) ? (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">LIVE</div>
                    ) : null}
                    <div className="text-[10px] leading-none text-black mb-2 text-left">八強 {i + 1}</div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-emerald-50">
                        <span className="text-black text-sm truncate">{m?.a?.team || '隊伍 A'}</span>
                        <span className="text-emerald-700 font-extrabold text-lg ml-2">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-sky-50">
                        <span className="text-black text-sm truncate">{m?.b?.team || '隊伍 B'}</span>
                        <span className="text-sky-700 font-extrabold text-lg ml-2">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 四強（2 場） */}
            <div className="space-y-6 flex flex-col justify-center">
              {sf.map((m, i) => (
                <div key={`sf-${i}`} className="relative">
                  {/* 左右匯入/導向的水平連接線 */}
                  <div className="hidden md:block absolute left-[-8px] top-1/2 w-2 border-t border-white"></div>
                  <div className="hidden md:block absolute right-[-8px] top-1/2 w-2 border-t border-white"></div>
                  <div className={`relative rounded-xl bg-white p-2 min-w-0 ${isLive('sf', i) ? 'border-2 border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.3)]' : 'border border-white'}`}>
                    {isLive('sf', i) ? (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">LIVE</div>
                    ) : null}
                    <div className="text-[10px] leading-none text-black mb-2 text-left">四強 {i + 1}</div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-emerald-50">
                        <span className="text-black text-sm truncate">{m?.a?.team || '勝者'}</span>
                        <span className="text-emerald-700 font-extrabold text-lg ml-2">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-sky-50">
                        <span className="text-black text-sm truncate">{m?.b?.team || '勝者'}</span>
                        <span className="text-sky-700 font-extrabold text-lg ml-2">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 冠亞（1 場） */}
            <div className="flex flex-col justify-center">
              {f.map((m, i) => (
                <div key={`f-${i}`} className="relative">
                  <div className="hidden md:block absolute left-[-8px] top-1/2 w-2 border-t border-white"></div>
                  <div className={`relative rounded-xl bg-white p-2 min-w-0 ${isLive('f', i) ? 'border-2 border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.3)]' : 'border border-white'}`}>
                    {isLive('f', i) ? (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">LIVE</div>
                    ) : null}
                    <div className="text-[10px] leading-none text-black mb-2 text-left">冠亞賽</div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-emerald-50">
                        <span className="text-black text-sm truncate">{m?.a?.team || '勝者'}</span>
                        <span className="text-emerald-700 font-extrabold text-lg ml-2">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md px-2 py-1 bg-sky-50">
                        <span className="text-black text-sm truncate">{m?.b?.team || '勝者'}</span>
                        <span className="text-sky-700 font-extrabold text-lg ml-2">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 冠軍（單一） */}
            <div className="flex flex-col justify-center">
              <div className="relative">
                <div className="hidden md:block absolute left-[-18px] top-1/2 w-5 border-t border-amber-300"></div>
                <div className="rounded-xl bg-amber-300 border border-amber-300 p-3 min-w-[160px]">
                  <div className="text-xs font-semibold text-amber-900 mb-1">冠軍</div>
                  <div className="rounded-md bg-amber-200 px-2 py-2 text-amber-900 text-sm">{champ?.team || '最終勝者'}{champ?.score && champ.score !== 'n/a' ? `（${champ.score}）` : ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// OBS Banpick 顯示
function OBSBanpickDisplay({ data }) {
  // 左 3 個方塊、右 3 個方塊
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4 text-white">目前 Ban/Pick</h2>
      <div className="w-full max-w-[760px] grid grid-cols-2 gap-6">
        {/* 左側 3 塊 */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`l-${idx}`} className="h-16 rounded-xl border-2 border-emerald-500 bg-white flex items-center justify-center text-xl font-bold text-emerald-700">
              左 {idx + 1}
            </div>
          ))}
        </div>
        {/* 右側 3 塊 */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`r-${idx}`} className="h-16 rounded-xl border-2 border-sky-500 bg-white flex items-center justify-center text-xl font-bold text-sky-700">
              右 {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// OBS 地圖與比數顯示
function OBSMapScoreDisplay({ data }) {
  const mapName = data?.map?.name || 'Map 1';
  const scoreA = data?.score?.a ?? 0;
  const scoreB = data?.score?.b ?? 0;
  const teamA = data?.teams?.a || 'Team A';
  const teamB = data?.teams?.b || 'Team B';
  // 以 7 寬 x 2 高的方塊格狀呈現（800x600 優化）
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[760px] grid grid-cols-7 grid-rows-2 gap-2">
        {/* 第一列：依序放入隊伍 A、分數 A、地圖、分隔、地圖、分數 B、隊伍 B */}
        <div className="rounded-lg border border-white bg-white flex items-center justify-center px-2 text-base text-black truncate h-12">{teamA}</div>
        <div className="rounded-lg border border-emerald-500 bg-white flex items-center justify-center text-2xl font-extrabold text-emerald-600 h-12">{scoreA}</div>
        <div className="rounded-lg border border-white bg-white flex items-center justify-center text-sm text-black truncate h-12">{mapName}</div>
        <div className="rounded-lg border border-white bg-white flex items-center justify-center text-xl text-black h-12">VS</div>
        <div className="rounded-lg border border-white bg-white flex items-center justify-center text-sm text-black truncate h-12">{mapName}</div>
        <div className="rounded-lg border border-sky-500 bg-white flex items-center justify-center text-2xl font-extrabold text-sky-600 h-12">{scoreB}</div>
        <div className="rounded-lg border border-white bg-white flex items-center justify-center px-2 text-base text-black truncate h-12">{teamB}</div>

        {/* 第二列：保留為資訊輔助或未來擴充（目前僅顯示空白框以符合 7x2） */}
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={`f2-${idx}`} className="rounded-lg border border-white bg-white h-8" />
        ))}
      </div>
    </div>
  );
}

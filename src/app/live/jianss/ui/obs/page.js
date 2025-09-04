'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
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
          let json = null;
          try { json = await res.json(); } catch { json = null; }
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
          if (d?.mapScores) {
            setDisplayData(prev => ({
              ...prev,
              mapScores: d.mapScores
            }));
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
        let json = null;
        try { json = await res.json(); } catch { json = null; }
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
            } else if (latestMessage.type === 'map-score-update') {
              lastUpdateRef.current = latestMessage.timestamp || Date.now();
              console.log('[OBS] map-score-update');
              if (latestMessage?.data?.mapScores) {
                setDisplayData(prev => ({
                  ...prev,
                  mapScores: latestMessage.data.mapScores
                }));
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
        return <OBSMapScoreDisplay data={{ currentBroadcast, mapScores: displayData.mapScores, bracket }} />;
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
  const [teamsData, setTeamsData] = useState([]);
  
  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTeamsData(data);
        }
      } catch (e) {
        console.warn('載入隊伍資料失敗:', e);
      }
    };
    loadTeams();
  }, []);

  // 根據隊伍名稱取得選手陣列
  const getTeamMembers = (teamName) => {
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '選手A1, 選手A2';
  };

  const qf = bracket?.qf || Array.from({ length: 4 }).map(() => ({ a: { team: '隊伍 A', score: 'n/a' }, b: { team: '隊伍 B', score: 'n/a' } }));
  const sf = bracket?.sf || Array.from({ length: 2 }).map(() => ({ a: { team: '勝者', score: 'n/a' }, b: { team: '勝者', score: 'n/a' } }));
  const lf = bracket?.lf || Array.from({ length: 2 }).map(() => ({ a: { team: '敗者', score: 'n/a' }, b: { team: '敗者', score: 'n/a' } }));
  const f = bracket?.f || [{ a: { team: '勝者', score: 'n/a' }, b: { team: '勝者', score: 'n/a' } }];
  const champ = bracket?.champ || { team: '最終勝者', score: 'n/a' };
  const isLive = (stage, idx) => currentBroadcast && currentBroadcast.stage === stage && currentBroadcast.index === idx;

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="w-full max-w-[780px]">
        <h2 className="text-xl font-bold mb-2 text-pink-300">目前賽程 Bracket</h2>
        <div className="relative w-full overflow-hidden">
          <div className="w-full grid grid-cols-4 gap-2">
            {/* 八強（4 場） */}
            <div className="space-y-3 flex flex-col justify-center">
              {qf.map((m, i) => (
                <div key={`qf-${i}`} className="relative">
                  {/* 往四強的水平連接線 */}
                  <div className="hidden md:block absolute right-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                  <div className={`relative rounded-lg bg-white p-1.5 min-w-0 ${isLive('qf', i) ? 'border-2 border-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.3)]' : 'border border-pink-300'}`}>
                    {isLive('qf', i) ? (
                      <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">LIVE</div>
                    ) : null}
                    <div className="text-[10px] leading-none text-black mb-1 text-left">八強 {i + 1}</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.a?.team || '隊伍 A'}</span>
                          <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '隊伍 B'}</span>
                          <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 四強與遺材賽（同欄位，四強往右推） */}
            <div className="space-y-3 flex flex-col justify-center">
              {/* 上方遺材賽 */}
              <div className="space-y-3">
                {lf.slice(0, 1).map((m, i) => (
                  <div key={`lf-top-${i}`} className="relative">
                    <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                    <div className="hidden md:block absolute bottom-[-6px] left-1/2 w-0.5 h-1.5 bg-pink-300"></div>
                    <div className={`relative rounded-lg bg-white p-1.5 min-w-0 ${isLive('lf', i) ? 'border-2 border-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.3)]' : 'border border-pink-300'}`}>
                      {isLive('lf', i) ? (
                        <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">LIVE</div>
                      ) : null}
                      <div className="text-[10px] leading-none text-black mb-1 text-left">遺材賽 {i + 1}</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.a?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.b?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 四強（往右推） */}
              <div className="space-y-3 ml-4">
                {sf.map((m, i) => (
                  <div key={`sf-${i}`} className="relative">
                    <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                    <div className="hidden md:block absolute right-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                    <div className={`relative rounded-lg bg-white p-1.5 min-w-0 ${isLive('sf', i) ? 'border-2 border-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.3)]' : 'border border-pink-300'}`}>
                      {isLive('sf', i) ? (
                        <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">LIVE</div>
                      ) : null}
                      <div className="text-[10px] leading-none text-black mb-1 text-left">四強 {i + 1}</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.a?.team || '勝者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.b?.team || '勝者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 下方遺材賽 */}
              <div className="space-y-3">
                {lf.slice(1, 2).map((m, i) => (
                  <div key={`lf-bottom-${i}`} className="relative">
                    <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                    <div className="hidden md:block absolute top-[-6px] left-1/2 w-0.5 h-1.5 bg-pink-300"></div>
                    <div className={`relative rounded-lg bg-white p-1.5 min-w-0 ${isLive('lf', i + 1) ? 'border-2 border-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.3)]' : 'border border-pink-300'}`}>
                      {isLive('lf', i + 1) ? (
                        <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">LIVE</div>
                      ) : null}
                      <div className="text-[10px] leading-none text-black mb-1 text-left">遺材賽 {i + 2}</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.a?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.b?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          </div>
                          <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 冠亞（1 場） */}
            <div className="flex flex-col justify-center">
              {f.map((m, i) => (
                <div key={`f-${i}`} className="relative">
                  <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                  <div className={`relative rounded-lg bg-white p-1.5 min-w-0 ${isLive('f', i) ? 'border-2 border-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.3)]' : 'border border-pink-300'}`}>
                    {isLive('f', i) ? (
                      <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">LIVE</div>
                    ) : null}
                    <div className="text-[10px] leading-none text-black mb-1 text-left">冠亞賽</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.a?.team || '勝者'}</span>
                          <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '勝者'}</span>
                          <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== 'n/a') ? m.b.score : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 冠軍（單一） */}
            <div className="flex flex-col justify-center">
              <div className="relative">
                <div className="hidden md:block absolute left-[-12px] top-1/2 w-3 border-t border-pink-400"></div>
                <div className="rounded-lg bg-pink-400 border border-pink-400 p-2 min-w-[140px]">
                  <div className="text-xs font-semibold text-pink-900 mb-1">冠軍</div>
                  <div className="rounded bg-pink-300 px-1.5 py-1 text-pink-900 text-xs">
                    <div>{champ?.team || '最終勝者'}</div>
                    <div className="text-[10px]">{getTeamMembers(champ?.team)}</div>
                  </div>
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
  const currentBroadcast = data?.currentBroadcast;
  const mapScores = data?.mapScores;
  const bracket = data?.bracket;
  const [teamsData, setTeamsData] = useState([]);
  
  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTeamsData(data);
        }
      } catch (e) {
        console.warn('載入隊伍資料失敗:', e);
      }
    };
    loadTeams();
  }, []);

  // 根據隊伍名稱取得選手陣列
  const getTeamMembers = (teamName) => {
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '選手A1, 選手A2';
  };

  // 取得目前播報對戰的隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {
      return { a: '', b: '' };
    }
    const list = bracket?.[stage];
    if (!list || typeof index !== 'number' || !list[index]) {
      return { a: '', b: '' };
    }
    const a = list[index]?.a?.team || '';
    const b = list[index]?.b?.team || '';
    return { a, b };
  };

  // 取得目前播報對戰的地圖資料
  const getCurrentMatchMaps = () => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) return [];
    if (typeof index !== 'number') return [];
    
    const key = `${stage}:${index}`;
    const entry = mapScores?.[key];
    if (Array.isArray(entry) && entry.length === 5) return entry;
    return Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: 'n/a', scoreB: 'n/a' }));
  };

  const teams = getCurrentBroadcastTeams();
  const maps = getCurrentMatchMaps();

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="bg-white rounded-lg shadow-lg p-4">
        {/* 7x2 方塊陣列 - 左邊隊伍名稱，右邊是該隊伍在各張地圖的比分 */}
        <div className="grid grid-cols-7 grid-rows-2 gap-2">
          {/* A1 - 隊伍 A 名稱 */}
          <div className="w-20 h-20 border border-gray-300 p-2 flex flex-col justify-center items-center bg-blue-50 rounded">
            <div className="text-xs font-bold text-blue-800 text-center leading-tight">{teams.a || '隊伍 A'}</div>
            <div className="text-[10px] text-blue-600 text-center mt-1 leading-tight">{getTeamMembers(teams.a)}</div>
          </div>
          
          {/* A2 - 隊伍 B 名稱 */}
          <div className="w-20 h-20 border border-gray-300 p-2 flex flex-col justify-center items-center bg-red-50 rounded">
            <div className="text-xs font-bold text-red-800 text-center leading-tight">{teams.b || '隊伍 B'}</div>
            <div className="text-[10px] text-red-600 text-center mt-1 leading-tight">{getTeamMembers(teams.b)}</div>
          </div>
          
          {/* B1~F1 - 第一橫排：A1 隊伍在各張地圖的比分 */}
          {maps.map((map, index) => (
            <div 
              key={`map-a-${index}`}
              className="w-20 h-20 border border-gray-300 p-2 flex flex-col justify-center items-center bg-blue-50 rounded"
            >
              <div className="text-[10px] font-semibold text-blue-700 text-center mb-1 leading-tight">
                {map.mode || '未選擇'}
              </div>
              <div className="text-2xl font-bold text-blue-800">
                {map.scoreA === 'n/a' ? '-' : map.scoreA}
              </div>
            </div>
          ))}
          
          {/* B2~F2 - 第二橫排：A2 隊伍在各張地圖的比分 */}
          {maps.map((map, index) => (
            <div 
              key={`map-b-${index}`}
              className="w-20 h-20 border border-gray-300 p-2 flex flex-col justify-center items-center bg-red-50 rounded"
            >
              <div className="text-[10px] font-semibold text-red-700 text-center mb-1 leading-tight">
                {map.mode || '未選擇'}
              </div>
              <div className="text-2xl font-bold text-red-800">
                {map.scoreB === 'n/a' ? '-' : map.scoreB}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

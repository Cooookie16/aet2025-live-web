'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Image from 'next/image';
import './obs.css';

const OBS_DEBUG = false; // 關閉 OBS 端除錯輸出
if (typeof window !== 'undefined' && !OBS_DEBUG) {
  try {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.error = noop;
  } catch {}
}

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
        if (d?.mapScores) {
          setDisplayData(prev => ({ ...prev, mapScores: d.mapScores }));
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
              // 重要：合併，不要覆蓋既有 mapScores
              setDisplayData(prev => ({
                ...prev,
                ...latestMessage.data,
                lastUpdate: lastUpdateRef.current
              }));
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
                // 如果整體 mapScores 被重置為空物件，清空本地快取，避免殘留顯示
                try {
                  const isEmpty = latestMessage && latestMessage.data && latestMessage.data.mapScores && Object.keys(latestMessage.data.mapScores).length === 0;
                  if (isEmpty) {
                    lastMapsCacheRef.current = {};
                  }
                } catch {}
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

  // 新增：當切換顯示至 map-score 或切換目前對戰時，立即拉取最新 state 並更新 mapScores
  useEffect(() => {
    const fetchForSwitch = async () => {
      const isMapScore = currentDisplay === 'map-score';
      const { stage, index } = currentBroadcast || {};
      if (!isMapScore || (!stage && stage !== 0) || typeof index !== 'number') return;
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const d = json?.data || {};
        if (d?.mapScores) {
          setDisplayData(prev => ({ ...prev, mapScores: d.mapScores }));
        }
      } catch {}
    };
    fetchForSwitch();
  }, [currentDisplay, currentBroadcast]);

  // 顯示介面變更偵錯
  useEffect(() => {
    if (OBS_DEBUG) console.log('[OBS] render display ->', currentDisplay);
  }, [currentDisplay]);

  // 顯示資料變更偵錯
  useEffect(() => {
    if (OBS_DEBUG) console.log('[OBS] displayData updated ->', displayData);
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

  // 根據隊伍名稱取得選手陣列（未選隊伍時不顯示）
  const getTeamMembers = (teamName) => {
    if (!teamName) return '';
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '';
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
                          {getTeamMembers(m?.a?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                          ) : null}
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '隊伍 B'}</span>
                          {getTeamMembers(m?.b?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          ) : null}
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
                        </div>
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.b?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          </div>
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
                        </div>
                        <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                          <div className="flex flex-col">
                            <span className="text-black text-xs truncate">{m?.b?.team || '敗者'}</span>
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          </div>
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
                          {getTeamMembers(m?.a?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.a?.team)}</span>
                          ) : null}
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== 'n/a') ? m.a.score : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '勝者'}</span>
                          {getTeamMembers(m?.b?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          ) : null}
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
  const [mapsData, setMapsData] = useState([]);
  const lastMapsCacheRef = useRef({}); // rename for clarity
  const [overrideMaps, setOverrideMaps] = useState(null);

  // 當切換對戰或重整時，主動拉取一次最新 /api/state，以確保即時資料
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const all = json?.data?.mapScores || {};
        const { stage, index } = currentBroadcast || {};
        if (!stage && stage !== 0) return;
        if (typeof index !== 'number') return;
        const key = `${stage}:${index}`;
        const entry = all?.[key];
        if (Array.isArray(entry) && entry.length > 0) {
          const padded = [...entry];
          while (padded.length < 5) padded.push({ mode: '', map: '', scoreA: 'n/a', scoreB: 'n/a' });
          setOverrideMaps(padded.slice(0, 5));
        }
      } catch {}
    };
    fetchLatest();
  }, [currentBroadcast]);

  // 同步 overrideMaps：SSE 推來的新 mapScores 或目前對戰變動時立即套用
  useEffect(() => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {
      setOverrideMaps(null);
      return;
    }
    if (typeof index !== 'number') {
      setOverrideMaps(null);
      return;
    }
    const key = `${stage}:${index}`;
    const entry = mapScores?.[key];
    if (Array.isArray(entry) && entry.length > 0) {
      const padded = [...entry];
      while (padded.length < 5) padded.push({ mode: '', map: '', scoreA: 'n/a', scoreB: 'n/a' });
      setOverrideMaps(padded.slice(0, 5));
    } else {
      setOverrideMaps(null);
    }
  }, [mapScores, currentBroadcast]);

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

  // 載入地圖資料
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const res = await fetch('/maps.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setMapsData(data);
        }
      } catch (e) {
        console.warn('載入地圖資料失敗:', e);
      }
    };
    loadMaps();
  }, []);

  // 根據隊伍名稱取得選手陣列（未選隊伍時不顯示）
  const getTeamMembers = (teamName) => {
    if (!teamName) return '';
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '';
  };

  // 根據地圖名稱取得地圖圖片路徑
  const getMapImagePath = (mapName) => {
    if (!mapName) {
      if (OBS_DEBUG) console.log('[OBS] getMapImagePath: mapName is null/empty');
      return null;
    }
    
    // 地圖名稱對應圖片檔名的映射（根據 maps.json 和實際圖片檔案名稱）
    const mapImageMap = {
      // 寶石爭奪戰
      '戈壁陷阱 Deathcap Trap': '/maps/deathcap_trap.png',
      '咻咻作響 Double Swoosh': '/maps/double_swoosh.png',
      '堅石礦井 Hard Rock Mine': '/maps/hard_rock_mine.png',
      
      // 亂鬥足球
      '精準射門 Pinhole Punt': '/maps/pinhole_punt.png',
      '綠蔭球場 Sneaky Fields': '/maps/sneaky_fields.png',
      '三重威脅 Triple Dribble': '/maps/triple_dribble.png',
      
      // 金庫攻防戰
      '遙遠的橋 Bridge Too Far': '/maps/bridge_too_far.png',
      '轟隆峽谷 Kaboom Canyon': '/maps/kaboom_canyon.png',
      '安全區域 Safe Zone': '/maps/safe_zone.png',
      
      // 搶星大作戰
      '草叢迷蹤 Hideout': '/maps/hideout.png',
      '夾心蛋糕 Layer Cake': '/maps/layer_cake.png',
      '神秘流星 Shooting Star': '/maps/shooting_star.png',
      
      // 據點搶奪戰
      '甲蟲決鬥 Dueling Beetles': '/maps/dueling_beetles.png',
      '開門大吉 Open Business': '/maps/open_business.png',
      '灼熱火圈 Ring of Fire': '/maps/ring_of_fire.png',
      
      // 極限淘汰賽
      '搖滾蓓爾 Belle\'s Rock': '/maps/belles_rock.png',
      '金臂峽谷 Goldarm Gulch': '/maps/goldarm_gulch.png',
      '空礦地帶 Out in the Open': '/maps/out_in_the_open.png'
    };
    
    const imagePath = mapImageMap[mapName];
    if (OBS_DEBUG) console.log('[OBS] getMapImagePath:', { mapName, imagePath, found: !!imagePath });
    return imagePath || null;
  };

  // 檢查該盤是否已開始（有分數）
  const isRoundStarted = (map) => {
    // 分數需為已填寫值：不可為 undefined/null/'n/a'/空字串
    const hasScoreA = map.scoreA !== undefined && map.scoreA !== null && map.scoreA !== 'n/a' && map.scoreA !== '';
    const hasScoreB = map.scoreB !== undefined && map.scoreB !== null && map.scoreB !== 'n/a' && map.scoreB !== '';
    const result = hasScoreA || hasScoreB;
    if (OBS_DEBUG) console.log('[OBS] isRoundStarted:', { 
      mapName: map.map, 
      scoreA: map.scoreA, 
      scoreB: map.scoreB, 
      hasScoreA, 
      hasScoreB, 
      result 
    });
    return result;
  };

  // 從 mapsData 依地圖中文+英文名稱尋找所屬模式
  const findModeByMapName = (mapName) => {
    if (!mapName || !Array.isArray(mapsData) || mapsData.length === 0) return { modeZh: null, modeEn: null };
    for (const entry of mapsData) {
      if (Array.isArray(entry.maps) && entry.maps.includes(mapName)) {
        return { modeZh: entry.mode || null, modeEn: entry.mode_en || null };
      }
    }
    return { modeZh: null, modeEn: null };
  };

  // 由 map 物件推導目前模式（若 map.mode 或 map.mode_en 缺失，改以地圖名稱反推）
  const getModeInfo = (map) => {
    const modeZh = map?.mode || null;
    const modeEn = map?.mode_en || null;
    if (modeZh && modeEn) return { modeZh, modeEn };

    // 先用地圖名稱反推
    const byMap = findModeByMapName(map?.map);
    if (byMap.modeZh || byMap.modeEn) return byMap;

    // 再以 mapsData 的中文模式對照英文
    if (modeZh && Array.isArray(mapsData)) {
      const hit = mapsData.find(e => e.mode === modeZh);
      if (hit) return { modeZh: hit.mode || modeZh, modeEn: hit.mode_en || null };
    }
    return { modeZh: modeZh || null, modeEn: modeEn || null };
  };

  // 依 mode_en 取得 icon 路徑
  const getModeIconPathByEn = (modeEn) => {
    if (!modeEn) return null;
    return `/icons/${modeEn}.png`;
  };

  // 根據目前階段取得標籤（八強/四強/遺材賽/冠亞賽）
  const getStageLabel = () => {
    const stage = currentBroadcast?.stage;
    if (!stage) return '';
    const mapStageToLabel = {
      qf: '八強',
      sf: '四強',
      lf: '遺材賽',
      f: '冠亞賽',
    };
    return mapStageToLabel[stage] || '';
  };

  // 取得模式 icon 路徑（/public/icons）
  const getModeIconPath = (modeZh) => {
    if (!modeZh) return null;
    const modeMap = {
      '寶石爭奪戰': '/icons/gem_grab.png',
      '亂鬥足球': '/icons/brawl_ball.png',
      '金庫攻防戰': '/icons/heist.png',
      '搶星大作戰': '/icons/bounty.png',
      '據點搶奪戰': '/icons/hot_zone.png',
      '極限淘汰賽': '/icons/knock_out.png',
    };
    return modeMap[modeZh] || null;
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
    if (OBS_DEBUG) console.log('[OBS] getCurrentMatchMaps:', { stage, index, key, entry, mapScores });
    
    // 1) 優先使用 overrideMaps（剛抓回的最新值）
    if (Array.isArray(overrideMaps) && overrideMaps.length === 5) {
      return overrideMaps;
    }

    // 若有陣列資料，補齊為 5 筆並快取
    if (Array.isArray(entry) && entry.length > 0) {
      const padded = [...entry];
      while (padded.length < 5) {
        padded.push({ mode: '', map: '', scoreA: 'n/a', scoreB: 'n/a' });
      }
      lastMapsCacheRef.current[key] = padded.slice(0, 5);
      return lastMapsCacheRef.current[key];
    }
    // 無新資料 → 不再回傳快取，確保 RESET ALL 後能立即清空顯示
    return [];
  };

  const teams = getCurrentBroadcastTeams();
  const maps = getCurrentMatchMaps();

  // 資料就緒判斷
  const mapsReady = Array.isArray(maps) && maps.length === 5;
  const iconsReady = mapsReady && Array.isArray(mapsData) && mapsData.length > 0;

  // 計算隊伍贏的地圖數（得分==2 算贏 1 盤，封頂 5）
  const getTeamMapsWon = (list, team) => {
    if (!Array.isArray(list)) return 0;
    const key = team === 'A' ? 'scoreA' : 'scoreB';
    const won = list.reduce((acc, m) => {
      const v = m?.[key];
      if (v === undefined || v === null) return acc;
      const n = Number(v);
      return acc + (n === 2 ? 1 : 0);
    }, 0);
    return Math.min(5, won);
  };

  // 顯示用：將分數限制在 0~2，無效值顯示 '-'
  const formatScoreDisplay = (v) => {
    if (v === undefined || v === null || v === '' || v === 'n/a') return '-';
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    const clamped = Math.max(0, Math.min(2, n));
    return String(clamped);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="bg-black rounded-lg shadow-lg p-4">
        {/* 重新設計的佈局：隊伍名稱在左側上下排列，地圖比分在右側 */}
        <div className="flex flex-col gap-0">
          {/* 上方模式列：左側顯示階段標籤；右側顯示每盤模式 icon */}
          <div className="flex gap-0">
            {/* 左側階段標籤（同寬 24） */}
            <div className="w-24 h-12 bg-black p-2 flex items-center justify-center">
              <div className="text-sm font-bold text-white text-center leading-tight">
                {getStageLabel() || ''}
              </div>
            </div>
            {/* 中間垂直分隔線（與主表對齊） */}
            <div className="w-px h-12 bg-gray-600"></div>
            {/* 右側每盤模式 icon（5 欄 + 額外 1 欄） */}
            <div className="flex gap-0">
              {(mapsReady ? maps : Array.from({ length: 5 }).map(() => null)).map((map, index) => {
                const { modeEn } = map ? getModeInfo(map) : { modeEn: null };
                const iconPath = iconsReady && modeEn ? getModeIconPathByEn(modeEn) : null;
                const showIcon = !!iconPath;
                return (
                  <div key={`mode-${index}`} className="w-24 h-12 bg-black p-2 flex items-center justify-center">
                    {showIcon ? (
                      <img src={iconPath} alt={modeEn || `第${index + 1}盤`} className="max-w-full max-h-full object-contain" />
                    ) : (
                      // 資料未就緒顯示空白；資料就緒但無 icon 顯示問號
                      iconsReady && mapsReady ? (
                        <div className="text-xl font-bold text-gray-500">?</div>
                      ) : (
                        <div className="w-full h-full" />
                      )
                    )}
                  </div>
                );
              })}
              {/* 額外欄位 */}
              <div className="w-24 h-12 bg-black p-2 flex items-center justify-center">
                <div className="text-sm font-bold text-white">-</div>
              </div>
            </div>
          </div>

          {/* 頂部列與主體之間的水平分隔線 */}
          <div className="w-full h-px bg-gray-600"></div>

          {/* 主體列（原本的左/中/右三區） */}
          <div className="flex gap-0">
            {/* 左側：隊伍名稱上下排列 */}
            <div className="flex flex-col gap-0">
              {/* 隊伍 A */}
              <div className="w-24 h-24 bg-black p-2 flex flex-col justify-center items-center">
                <div className="text-sm font-bold text-white text-center leading-tight">{teams.a || '隊伍 A'}</div>
                {getTeamMembers(teams.a) ? (
                <div className="text-xs text-gray-300 text-center mt-1 leading-tight">{getTeamMembers(teams.a)}</div>
              ) : null}
            </div>
            
            {/* 隊伍 A 和 B 之間的分隔線 */}
            <div className="w-24 h-px bg-gray-600"></div>
            
            {/* 隊伍 B */}
            <div className="w-24 h-24 bg-black p-2 flex flex-col justify-center items-center">
              <div className="text-sm font-bold text-white text-center leading-tight">{teams.b || '隊伍 B'}</div>
              {getTeamMembers(teams.b) ? (
              <div className="text-xs text-gray-300 text-center mt-1 leading-tight">{getTeamMembers(teams.b)}</div>
            ) : null}
          </div>
        </div>
        
        {/* 中間垂直分隔線 */}
        <div className="flex flex-col gap-0">
          <div className="w-px h-24 bg-gray-600"></div>
          <div className="w-px h-px bg-gray-600"></div>
          <div className="w-px h-24 bg-gray-600"></div>
        </div>
        {/* 中間垂直分隔線結束 */}
 
        {/* 右側：地圖比分 */}
        <div className="flex flex-col gap-0">
          {/* 地圖圖片區域 - 跨越上下兩個位置 */}
          <div className="flex gap-0">
            {(mapsReady ? maps : Array.from({ length: 5 }).map(() => null)).map((map, index) => {
              const roundStarted = map ? isRoundStarted(map) : false;
              const mapImagePath = map && !roundStarted ? getMapImagePath(map.map) : null;
              
              return (
                <div 
                  key={`map-${index}`}
                  className="w-24 h-48 bg-black p-2 flex flex-col justify-center items-center"
                >
                  {roundStarted ? (
                    // 已開始的盤：顯示分數佈局（移除模式名稱）
                    <>
                      {/* 隊伍 A 分數 */}
                      <div className="h-24 flex flex-col justify-center items-center">
                        <div className="text-4xl font-extrabold text-white">
                          {formatScoreDisplay(map?.scoreA)}
                        </div>
                      </div>
                      
                      {/* 分隔線 */}
                      <div className="w-full h-px bg-gray-600"></div>
                      
                      {/* 隊伍 B 分數 */}
                      <div className="h-24 flex flex-col justify-center items-center">
                        <div className="text-4xl font-extrabold text-white">
                          {formatScoreDisplay(map?.scoreB)}
                        </div>
                      </div>
                    </>
                  ) : (
                    // 未開始的盤：顯示地圖圖片或問號（資料未就緒則留空）
                    <div className="w-full h-full flex items-center justify-center">
                      {map ? (
                        mapImagePath ? (
                          <div className="w-full h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                              <img 
                                src={mapImagePath} 
                                alt={map.map || `第${index + 1}盤`}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="h-8 flex items-center justify-center px-1">
                              <div className="w-full text-[10px] leading-tight text-gray-300 text-center whitespace-normal break-words overflow-hidden">
                                {map.map || `第${index + 1}盤`}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // 只有在資料就緒且確定未選地圖時顯示問號
                          <div className="text-4xl font-bold text-gray-500">?</div>
                        )
                      ) : (
                        // maps 尚未就緒：顯示空白
                        <div className="w-full h-full" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 最右邊的總分欄位：上（A 總分）、中線、下（B 總分） */}
            <div className="w-24 h-48 bg-black p-2 flex flex-col justify-center items-center">
              <div className="h-24 flex flex-col justify-center items-center">
                <div className="text-4xl font-black text-pink-500">
                  {mapsReady ? getTeamMapsWon(maps, 'A') : ''}
                </div>
              </div>
              
              <div className="w-full h-px bg-gray-600"></div>
              
              <div className="h-24 flex flex-col justify-center items-center">
                <div className="text-4xl font-black text-pink-500">
                  {mapsReady ? getTeamMapsWon(maps, 'B') : ''}
                </div>
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
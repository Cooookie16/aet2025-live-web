'use client';

import { useState, useEffect } from 'react';

// OBS Bracket 顯示
export default function OBSBracketDisplay({ data }) {
  const bracket = data?.bracket;
  const currentBroadcast = data?.currentBroadcast;
  const [teamsData, setTeamsData] = useState([]);
  
  // 生成穩定的 key，不使用陣列索引
  const generateMatchKey = (stage, match, index) => {
    const teamA = match.a.team || `team-a-${index}`;
    const teamB = match.b.team || `team-b-${index}`;
    const scoreA = match.a.score || '0';
    const scoreB = match.b.score || '0';
    return `${stage}-${teamA}-${teamB}-${scoreA}-${scoreB}`;
  };
  
  // 載入隊伍資料
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (res.ok) {
          const body = await res.json();
          setTeamsData(body.data || []);
        }
      } catch {
        // 靜默處理錯誤
      }
    };
    loadTeams();
    // 訂閱 SSE：隊伍更新時自動重新載入
    let es;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (evt) => {
        try {
          const raw = (evt && typeof evt.data === 'string') ? evt.data.trim() : '';
          if (!raw || raw[0] !== '{') {return;}
          const msg = JSON.parse(raw);
          if (msg?.type === 'teams-update') {
            loadTeams();
          }
        } catch {}
      };
    } catch {}
    return () => {
      try { es?.close?.(); } catch {}
    };
  }, []);

  // 根據隊伍名稱取得選手陣列（未選隊伍時不顯示）
  const getTeamMembers = (teamName) => {
    if (!teamName) {return '';}
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '';
  };

  const qf = bracket?.qf || Array.from({ length: 4 }).map(() => ({ a: { team: '隊伍 A', score: '0' }, b: { team: '隊伍 B', score: '0' } }));
  const sf = bracket?.sf || Array.from({ length: 2 }).map(() => ({ a: { team: '勝者', score: '0' }, b: { team: '勝者', score: '0' } }));
  const f = bracket?.f || [{ a: { team: '勝者', score: '0' }, b: { team: '勝者', score: '0' } }];
  const champ = bracket?.champ || { team: '最終勝者', score: '0' };
  const isLive = (stage, idx) => currentBroadcast && currentBroadcast.stage === stage && currentBroadcast.index === idx;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-[1500px]">
        <h2 className="text-3xl font-bold mb-4 text-pink-300">目前賽程 Bracket</h2>
        <div className="relative w-full overflow-hidden">
          <div className="w-full grid grid-cols-4 gap-4">
            {/* 八強（4 場）— space-y-3 (12px)；每對 (0,1) 與 (2,3) 用垂直線連接 */}
            <div className="space-y-3 flex flex-col justify-center">
              {qf.map((m, i) => {
                const isPairTop = i % 2 === 0;
                return (
                <div key={generateMatchKey('qf', m, i)} className="relative">
                  {/* 往四強的水平連接線 */}
                  <div className="hidden md:block absolute right-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                  {/* 垂直連接線：上半向下延伸；下半向上延伸到 pair 中點 */}
                  {isPairTop ? (
                    <div
                      className="hidden md:block absolute right-[-6px] w-px bg-pink-300"
                      style={{ top: '50%', height: 'calc(50% + 6px)' }}
                    />
                  ) : (
                    <div
                      className="hidden md:block absolute right-[-6px] w-px bg-pink-300"
                      style={{ top: '-6px', height: 'calc(50% + 6px)' }}
                    />
                  )}
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
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== '0') ? m.a.score : '0'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '隊伍 B'}</span>
                          {getTeamMembers(m?.b?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          ) : null}
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== '0') ? m.b.score : '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* 四強 — space-y-28 (112px)；兩場用垂直線連接到冠亞賽 */}
            <div className="space-y-28 flex flex-col justify-center">
              {sf.map((m, i) => {
                const isPairTop = i % 2 === 0;
                return (
                <div key={generateMatchKey('sf', m, i)} className="relative">
                  <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                  <div className="hidden md:block absolute right-[-6px] top-1/2 w-1.5 border-t border-pink-300"></div>
                  {/* 垂直連接線（往冠亞賽彙整） */}
                  {isPairTop ? (
                    <div
                      className="hidden md:block absolute right-[-6px] w-px bg-pink-300"
                      style={{ top: '50%', height: 'calc(50% + 56px)' }}
                    />
                  ) : (
                    <div
                      className="hidden md:block absolute right-[-6px] w-px bg-pink-300"
                      style={{ top: '-56px', height: 'calc(50% + 56px)' }}
                    />
                  )}
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
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== '0') ? m.a.score : '0'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '勝者'}</span>
                          <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== '0') ? m.b.score : '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* 冠亞賽 */}
            <div className="flex flex-col justify-center">
              {f.map((m, i) => (
                <div key={generateMatchKey('f', m, i)} className="relative">
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
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.a?.score && m.a.score !== '0') ? m.a.score : '0'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded px-1.5 py-1 bg-pink-50">
                        <div className="flex flex-col">
                          <span className="text-black text-xs truncate">{m?.b?.team || '勝者'}</span>
                          {getTeamMembers(m?.b?.team) ? (
                            <span className="text-pink-600 text-[10px]">{getTeamMembers(m?.b?.team)}</span>
                          ) : null}
                        </div>
                        <span className="text-pink-700 font-extrabold text-base ml-1">{(m?.b?.score && m.b.score !== '0') ? m.b.score : '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 冠軍（獨立欄位，垂直置中）*/}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="hidden md:block absolute left-[-6px] top-1/2 w-1.5 border-t border-pink-400"></div>
                <div className="rounded-lg bg-pink-400 border border-pink-400 p-2 min-w-[120px]">
                  <div className="text-xs font-semibold text-pink-900 mb-1 text-center">冠軍</div>
                  <div className="rounded bg-pink-300 px-1.5 py-1 text-pink-900 text-xs text-center">
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

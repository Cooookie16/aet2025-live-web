'use client';

import { useState, useEffect } from 'react';

// OBS Bracket 顯示
export default function OBSBracketDisplay({ data }) {
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

  const qf = bracket?.qf || Array.from({ length: 4 }).map(() => ({ a: { team: '隊伍 A', score: '0' }, b: { team: '隊伍 B', score: '0' } }));
  const sf = bracket?.sf || Array.from({ length: 2 }).map(() => ({ a: { team: '勝者', score: '0' }, b: { team: '勝者', score: '0' } }));
  const lf = bracket?.lf || Array.from({ length: 2 }).map(() => ({ a: { team: '敗者', score: '0' }, b: { team: '敗者', score: '0' } }));
  const f = bracket?.f || [{ a: { team: '勝者', score: '0' }, b: { team: '勝者', score: '0' } }];
  const champ = bracket?.champ || { team: '最終勝者', score: '0' };
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

'use client';

import { useState, useEffect, useMemo } from 'react';

export default function Dashboard() {
  const [currentDisplay, setCurrentDisplay] = useState('welcome');
  const [isConnected, setIsConnected] = useState(false);
  // 從檔案載入隊伍清單
  const [teamOptions, setTeamOptions] = useState([]);
  // 從檔案載入地圖資料庫
  const [mapsData, setMapsData] = useState([]);
  // 每場對戰（依 stage-index）對應 5 張地圖（含模式與地圖名）
  const [mapScores, setMapScores] = useState({});
  // 8 強到決賽（配對制）對戰樹狀態：每場比賽上下兩方與各自分數
  const [bracket, setBracket] = useState({
    qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    lf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })), // 遺材賽
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });
  // 目前播報中的對戰（以階段與索引識別）
  const [currentBroadcast, setCurrentBroadcast] = useState({ stage: null, index: null });
  // 初始載入完成旗標：避免在尚未載入前就將預設 welcome 覆蓋到後端
  const [displayLoaded, setDisplayLoaded] = useState(false);

  // 合法顯示介面清單與清理函式
  const VALID_DISPLAY_IDS = useMemo(() => ['welcome', 'bracket', 'banpick', 'map-score'], []);
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

  // 儲存鍵值
  const STORAGE_KEYS = {
    bracket: 'dashboard:bracket',
    broadcast: 'dashboard:currentBroadcast',
    display: 'dashboard:currentDisplay',
    mapScores: 'dashboard:mapScores'
  };

  // 可用的顯示介面選項
  const displayOptions = [
    { id: 'welcome', name: '歡迎畫面', description: '顯示活動歡迎畫面' },
    { id: 'bracket', name: '目前賽程 Bracket', description: '顯示當前賽程對戰樹' },
    { id: 'banpick', name: '目前 Banpick', description: '顯示當前 Ban/Pick 狀態' },
    { id: 'map-score', name: '地圖與比數', description: '顯示地圖與當前比數' }
  ];

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

  // 啟動時載入後端狀態（失敗時退回 localStorage）
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          let json = null;
          try { json = await res.json(); } catch { json = null; }
          const d = json?.data || {};
          if (d.bracket) {
            setBracket(d.bracket);
          }
          if (d.currentBroadcast) {
            setCurrentBroadcast(d.currentBroadcast);
          }
          if (d.mapScores) {
            setMapScores(d.mapScores || {});
          }
          // 先嘗試使用後端值；若沒有再嘗試 localStorage
          let nextDisplay = sanitizeDisplay(d.currentDisplay);
          if (!nextDisplay) {
            try {
              const rawDisplay = localStorage.getItem(STORAGE_KEYS.display);
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
        }
      } catch {}
      // 後端失敗 → 嘗試 localStorage
      try {
        const rawBracket = localStorage.getItem(STORAGE_KEYS.bracket);
        if (rawBracket) {
          setBracket(JSON.parse(rawBracket));
        }
      } catch {}
      try {
        const rawBroadcast = localStorage.getItem(STORAGE_KEYS.broadcast);
        if (rawBroadcast) {
          setCurrentBroadcast(JSON.parse(rawBroadcast));
        }
      } catch {}
      try {
        const rawMapScores = localStorage.getItem(STORAGE_KEYS.mapScores);
        if (rawMapScores) {
          setMapScores(JSON.parse(rawMapScores));
        }
      } catch {}
      try {
        const rawDisplay = localStorage.getItem(STORAGE_KEYS.display);
        const cleaned = sanitizeDisplay(rawDisplay);
        if (cleaned) {
          setCurrentDisplay(cleaned);
        }
      } catch {}
      setDisplayLoaded(true);
    };
    loadState();
  }, []);

  // 當狀態變更時同步到後端（亦寫入 localStorage 當作後備）
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.bracket, JSON.stringify(bracket)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bracket })
        });
      } catch {}
    })();
  }, [bracket]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.broadcast, JSON.stringify(currentBroadcast)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentBroadcast })
        });
      } catch {}
    })();
  }, [currentBroadcast]);

  useEffect(() => {
    if (!displayLoaded) {
      return; // 尚未載入前不要覆蓋後端的已存值
    }
    try { localStorage.setItem(STORAGE_KEYS.display, currentDisplay); } catch {}
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

  // 當地圖與比數變更時同步到後端（亦寫入 localStorage 當作後備）
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.mapScores, JSON.stringify(mapScores)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapScores })
        });
      } catch {}
    })();
  }, [mapScores]);

  // 載入隊伍清單
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('teams.json 載入失敗');
        }
        const data = await res.json();
        const names = Array.isArray(data) ? data.map(t => t.name).filter(Boolean) : [];
        if (names.length) {
          setTeamOptions(names);
        } else {
          setTeamOptions(['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8']);
        }
      } catch (e) {
        console.warn('載入隊伍失敗，使用預設隊伍:', e);
        setTeamOptions(['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8']);
      }
    };
    loadTeams();
  }, []);

  // 載入地圖資料庫
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const res = await fetch('/maps.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('maps.json 載入失敗');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setMapsData(data);
        }
      } catch (e) {
        console.warn('載入地圖資料庫失敗:', e);
        setMapsData([]);
      }
    };
    loadMaps();
  }, []);

  // 發送控制指令
  const sendCommand = async (command) => {
    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'broadcast',
          type: 'display-change',
          data: command,
          timestamp: Date.now()
        }),
      });

      if (response.ok) {
        console.log('指令發送成功');
      }
    } catch (error) {
      console.error('發送指令失敗:', error);
    }
  };

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

  // 目前僅負責切換顯示介面（依需求可擴充資料載入與設定）

  // bracket 單一位置（比賽、上下方）的欄位更新
  const handleMatchChange = (stage, matchIndex, side, field, value) => {
    setBracket(prev => {
      const next = { ...prev };
      if (stage === 'champ') {
        next.champ = { ...next.champ, [field]: value };
        return next;
      }
      const list = [...next[stage]];
      const match = { ...list[matchIndex] };
      match[side] = { ...match[side], [field]: value };
      list[matchIndex] = match;
      next[stage] = list;
      return next;
    });
  };

  // 設定目前播報對戰
  const setBroadcastMatch = (stage, index) => {
    setCurrentBroadcast({ stage, index });
  };

  // 是否為目前播報對戰
  const isCurrentMatch = (stage, index) => (
    currentBroadcast.stage === stage && currentBroadcast.index === index
  );

  // 轉換階段顯示標籤
  const getStageLabel = (stage) => {
    if (stage === 'qf') {
      return '八強';
    }
    if (stage === 'sf') {
      return '四強';
    }
    if (stage === 'lf') {
      return '遺材賽';
    }
    if (stage === 'f') {
      return '冠亞賽';
    }
    return '';
  };

  // 取得目前播報對戰的隊伍名稱
  const getCurrentBroadcastTeams = () => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) {
      return { a: '', b: '' };
    }
    const list = bracket[stage];
    if (!list || typeof index !== 'number' || !list[index]) {
      return { a: '', b: '' };
    }
    const a = list[index]?.a?.team || '';
    const b = list[index]?.b?.team || '';
    return { a, b };
  };

  // 重置整個賽程表為初始狀態
  const buildInitialBracket = () => ({
    qf: Array.from({ length: 4 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    sf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    lf: Array.from({ length: 2 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })), // 遺材賽
    f:  Array.from({ length: 1 }, () => ({ a: { team: '', score: '0' }, b: { team: '', score: '0' } })),
    champ: { team: '', score: '0' }
  });

  const handleResetBrackets = () => {
    try {
      const ok = window.confirm('確認要清空所有賽程表資料嗎？此動作無法復原。');
      if (!ok) return;
    } catch {}
    setBracket(buildInitialBracket());
  };

  // 目前播報對戰的地圖鍵值與資料（避免在 render 內 setState）
  const currentMatchKey = useMemo(() => {
    const { stage, index } = currentBroadcast || {};
    if (!stage && stage !== 0) return null;
    if (typeof index !== 'number') return null;
    return `${stage}:${index}`;
  }, [currentBroadcast]);

  // 若當前對戰尚未有地圖資料，於 effect 中初始化
  useEffect(() => {
    if (!currentMatchKey) return;
    const entry = mapScores[currentMatchKey];
    if (Array.isArray(entry) && entry.length === 5) return;
    const init = Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: '0', scoreB: '0' }));
    setMapScores(prev => ({ ...prev, [currentMatchKey]: init }));
  }, [currentMatchKey]);

  // 依據地圖比分自動計算每場對戰的總和分數，並更新 bracket 顯示
  useEffect(() => {
    try {
      const stages = ['qf', 'sf', 'lf', 'f'];
      setBracket(prev => {
        let changed = false;
        const next = { ...prev };
        for (const stage of stages) {
          const list = Array.isArray(prev[stage]) ? [...prev[stage]] : [];
          for (let i = 0; i < list.length; i++) {
            const key = `${stage}:${i}`;
            const maps = mapScores?.[key];
            let aSum = '0';
            let bSum = '0';
            if (Array.isArray(maps) && maps.length > 0) {
              const aWins = maps.reduce((acc, m) => acc + (Number(m?.scoreA) === 2 ? 1 : 0), 0);
              const bWins = maps.reduce((acc, m) => acc + (Number(m?.scoreB) === 2 ? 1 : 0), 0);
              aSum = String(Math.min(5, aWins));
              bSum = String(Math.min(5, bWins));
            }
            const match = list[i] || { a: { team: '', score: '0' }, b: { team: '', score: '0' } };
            const newA = { ...match.a, score: aSum };
            const newB = { ...match.b, score: bSum };
            if (match.a.score !== newA.score || match.b.score !== newB.score) {
              list[i] = { ...match, a: newA, b: newB };
              changed = true;
            }
          }
          if (changed) {
            next[stage] = list;
          }
        }
        return changed ? next : prev;
      });
    } catch {}
  }, [mapScores]);

  const currentMatchMaps = useMemo(() => {
    if (!currentMatchKey) return [];
    const entry = mapScores[currentMatchKey];
    if (Array.isArray(entry) && entry.length === 5) return entry;
    return Array.from({ length: 5 }, () => ({ mode: '', map: '', scoreA: '0', scoreB: '0' }));
  }, [mapScores, currentMatchKey]);

  const updateCurrentMatchMap = (idx, field, value) => {
    const key = currentMatchKey;
    if (!key) return;
    setMapScores(prev => {
      const current = Array.isArray(prev[key]) ? [...prev[key]] : Array.from({ length: 5 }, () => ({ mode: '', map: '' }));
      const item = { ...current[idx], [field]: value };
      current[idx] = item;
      return { ...prev, [key]: current };
    });
  };

  // 取得可用的模式選項
  const modeOptions = useMemo(() => {
    return mapsData.map(item => item.mode);
  }, [mapsData]);

  // 根據選擇的模式取得對應的地圖選項
  const getMapOptionsForMode = (mode) => {
    const modeData = mapsData.find(item => item.mode === mode);
    return modeData ? modeData.maps : [];
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 標題列 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                直播控制台
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                控制遠端顯示介面的內容
              </p>
            </div>
                         <div className="flex items-center space-x-4">
               {/* 連線狀態 */}
               <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                 isConnected 
                   ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                   : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
               }`}>
                 <div className={`w-2 h-2 rounded-full ${
                   isConnected ? 'bg-green-500' : 'bg-red-500'
                 }`}></div>
                 <span>{isConnected ? '已連線' : '未連線'}</span>
               </div>
               
               {/* 前往 OBS 直播畫面按鈕 */}
               <a
                 href="/live/jianss/ui/obs"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
               >
                 前往直播畫面
               </a>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* 顯示介面選擇（保留） */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              選擇顯示介面
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => switchDisplay(option.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedDisplayId && selectedDisplayId === option.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 賽程表 Brackets 區域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">賽程表 Brackets</h2>
              <button
                onClick={handleResetBrackets}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                title="清空所有賽程表資料"
              >
                RESET ALL
              </button>
            </div>

            {/* 對戰樹佈局：四欄（八強/四強+遺材賽/冠亞/冠軍） */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-4 gap-8">
                {/* 八強（4 場） */}
                <div className="space-y-10 flex flex-col justify-center">
                  {bracket.qf.map((m, i) => (
                    <div key={`qf-m-${i}`} className="relative">
                      {/* 連接線（往四強） */}
                      <div className="hidden md:block absolute right-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                      <MatchEditor
                        stage="qf"
                        index={i}
                        match={m}
                        teams={teamOptions}
                        onChange={handleMatchChange}
                        label={`八強 ${i + 1}`}
                        isCurrent={isCurrentMatch('qf', i)}
                        onSetCurrent={setBroadcastMatch}
                      />
                    </div>
                  ))}
                </div>

                {/* 四強與遺材賽（同欄位，遺材賽在上方和下方） */}
                <div className="space-y-28 flex flex-col justify-center">
                  {/* 上方遺材賽 */}
                  <div className="space-y-10">
                    {bracket.lf.slice(0, 1).map((m, i) => (
                      <div key={`lf-top-${i}`} className="relative">
                        {/* 連接線（左方彙入 & 往下） */}
                        <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="hidden md:block absolute bottom-[-16px] left-1/2 w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                        <MatchEditor
                          stage="lf"
                          index={i}
                          match={m}
                          teams={teamOptions}
                          onChange={handleMatchChange}
                          label={`遺材賽 ${i + 1}`}
                          isCurrent={isCurrentMatch('lf', i)}
                          onSetCurrent={setBroadcastMatch}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 四強 */}
                  <div className="space-y-10">
                    {bracket.sf.map((m, i) => (
                      <div key={`sf-m-${i}`} className="relative">
                        {/* 連接線（左方彙入 & 往決賽） */}
                        <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="hidden md:block absolute right-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                        <MatchEditor
                          stage="sf"
                          index={i}
                          match={m}
                          teams={teamOptions}
                          onChange={handleMatchChange}
                          label={`四強 ${i + 1}`}
                          isCurrent={isCurrentMatch('sf', i)}
                          onSetCurrent={setBroadcastMatch}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 下方遺材賽 */}
                  <div className="space-y-10">
                    {bracket.lf.slice(1, 2).map((m, i) => (
                      <div key={`lf-bottom-${i}`} className="relative">
                        {/* 連接線（左方彙入 & 往上） */}
                        <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="hidden md:block absolute top-[-16px] left-1/2 w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                        <MatchEditor
                          stage="lf"
                          index={i + 1}
                          match={m}
                          teams={teamOptions}
                          onChange={handleMatchChange}
                          label={`遺材賽 ${i + 2}`}
                          isCurrent={isCurrentMatch('lf', i + 1)}
                          onSetCurrent={setBroadcastMatch}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 冠亞賽（1 場） */}
                <div className="flex flex-col justify-center">
                  {bracket.f.map((m, i) => (
                    <div key={`f-m-${i}`} className="relative">
                      {/* 連接線（左方彙入） */}
                      <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                      <MatchEditor
                        stage="f"
                        index={i}
                        match={m}
                        teams={teamOptions}
                        onChange={handleMatchChange}
                        label={`冠亞賽`}
                        isCurrent={isCurrentMatch('f', i)}
                        onSetCurrent={setBroadcastMatch}
                      />
                    </div>
                  ))}
                </div>

                {/* 冠軍（單一） */}
                <div className="flex flex-col justify-center">
                  <div className="relative">
                    {/* 連接線（左方彙入） */}
                    <div className="hidden md:block absolute left-[-16px] top-1/2 w-4 border-t border-gray-300 dark:border-gray-600"></div>
                    <div className="rounded-lg border border-amber-400 dark:border-amber-500 p-4 bg-amber-50/60 dark:bg-amber-500/10 min-w-[220px] overflow-hidden">
                      <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">冠軍</div>
                      <div className="flex items-center gap-2 min-w-0">
                        <select
                          className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          value={bracket.champ.team}
                          onChange={(e) => handleMatchChange('champ', 0, 'team', 'team', e.target.value)}
                        >
                          <option value="">選擇隊伍</option>
                          {teamOptions.map(t => <option key={`champ-${t}`} value={t}>{t}</option>)}
                        </select>
                        <div className="shrink-0 w-20 sm:w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
                          {bracket.champ.score}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 地圖與比數 區域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">地圖與比數</h2>
              <button
                onClick={() => {
                  try {
                    const ok = window.confirm('確認要重置所有地圖與比數資料嗎？此動作無法復原。');
                    if (!ok) return;
                  } catch {}
                  setMapScores({});
                }}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                title="清空所有地圖與比數資料"
              >
                RESET ALL
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              目前播報對戰：
              <span className="ml-1 font-medium text-gray-900 dark:text-gray-200">
                {getStageLabel(currentBroadcast.stage) || '未選擇'}
                {typeof currentBroadcast.index === 'number' ? ` 第 ${currentBroadcast.index + 1} 場` : ''}
              </span>
              <span className="ml-3">{getCurrentBroadcastTeams().a || '—'} vs {getCurrentBroadcastTeams().b || '—'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {currentMatchMaps.map((m, i) => (
                <div
                  key={`map-${i}`}
                  className={
                    `p-4 rounded-lg border-2 text-left transition-all ` +
                    `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`
                  }
                >
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">地圖 {i + 1}</div>
                  <div className="space-y-2">
                    {/* 模式選擇 */}
                    <select
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      value={m.mode}
                      onChange={(e) => {
                        const newMode = e.target.value;
                        updateCurrentMatchMap(i, 'mode', newMode);
                        // 當模式改變時，清空地圖選擇
                        if (newMode !== m.mode) {
                          updateCurrentMatchMap(i, 'map', '');
                        }
                      }}
                    >
                      <option value="">選擇模式</option>
                      {modeOptions.map(mode => (
                        <option key={`mode-${mode}`} value={mode}>{mode}</option>
                      ))}
                    </select>
                    {/* 地圖名稱選擇 */}
                    <select
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      value={m.map}
                      onChange={(e) => updateCurrentMatchMap(i, 'map', e.target.value)}
                      disabled={!m.mode}
                    >
                      <option value="">{m.mode ? '選擇地圖' : '請先選擇模式'}</option>
                      {m.mode && getMapOptionsForMode(m.mode).map(map => (
                        <option key={`map-${map}`} value={map}>{map}</option>
                      ))}
                    </select>
                    {/* 分數選擇（最高 2） */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">上方隊伍</div>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          value={m.scoreA || '0'}
                          onChange={(e) => updateCurrentMatchMap(i, 'scoreA', e.target.value)}
                        >
                                                      {['0','1','2'].map(v => <option key={`scoreA-${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">下方隊伍</div>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          value={m.scoreB || '0'}
                          onChange={(e) => updateCurrentMatchMap(i, 'scoreB', e.target.value)}
                        >
                                                      {['0','1','2'].map(v => <option key={`scoreB-${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 預覽區域已移除，改由 OBS 顯示端呈現實際畫面 */}
      </div>
      <StatusBar 
        stageLabel={getStageLabel(currentBroadcast.stage)} 
        teamA={getCurrentBroadcastTeams().a} 
        teamB={getCurrentBroadcastTeams().b} 
        displayName={displayLoaded ? (displayOptions.find(opt => opt.id === selectedDisplayId)?.name || '歡迎畫面') : ''} 
        isConnected={isConnected} 
      />
    </div>
  );
}

// 對戰編輯元件：上下兩列（A/B），每列含隊伍與分數下拉 + 播報按鈕
function MatchEditor({ stage, index, match, teams, onChange, label, isCurrent, onSetCurrent }) {
  return (
    <div className={`rounded-lg border p-4 min-w-[260px] overflow-hidden ${
      isCurrent 
        ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10 dark:border-emerald-500' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50'
    }`}>
      {/* 標籤與播報按鈕 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
        {isCurrent ? (
          <button className="px-2 py-1 text-xs rounded-md bg-emerald-600 text-white cursor-default">目前播報</button>
        ) : (
          <button onClick={() => onSetCurrent(stage, index)} className="px-2 py-1 text-xs rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">點此播報</button>
        )}
      </div>
      {/* A 方 */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <select
          className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          value={match.a.team}
          onChange={(e) => onChange(stage, index, 'a', 'team', e.target.value)}
        >
          <option value="">選擇隊伍</option>
          {teams.map(t => <option key={`${stage}-${index}-a-${t}`} value={t}>{t}</option>)}
        </select>
        <div className="shrink-0 w-20 sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
          {match.a.score}
        </div>
      </div>
      {/* B 方 */}
      <div className="flex items-center gap-2 min-w-0">
        <select
          className="w-0 flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          value={match.b.team}
          onChange={(e) => onChange(stage, index, 'b', 'team', e.target.value)}
        >
          <option value="">選擇隊伍</option>
          {teams.map(t => <option key={`${stage}-${index}-b-${t}`} value={t}>{t}</option>)}
        </select>
        <div className="shrink-0 w-20 sm:w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
          {match.b.score}
        </div>
      </div>
    </div>
  );
}

// 底部懸浮狀態列
function StatusBar({ stageLabel, teamA, teamB, displayName, isConnected }) {
  return (
    <div className="fixed left-4 right-4 bottom-4 z-40">
      <div className="mx-auto max-w-7xl rounded-xl bg-white/90 dark:bg-gray-800/90 shadow-lg ring-1 ring-black/5 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="truncate text-sm sm:text-base text-gray-700 dark:text-gray-200">
            <span className="font-semibold">目前播報</span>
            {stageLabel ? <span className="mx-2 text-gray-500">{stageLabel}</span> : null}
            {teamA || teamB ? (
              <span className="font-medium">{teamA || '未選擇'} <span className="mx-1 text-gray-400">vs</span> {teamB || '未選擇'}</span>
            ) : (
              <span className="text-gray-500">尚未選擇對戰</span>
            )}
          </div>
        </div>
        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 shrink-0">
          <span className="mr-2">目前畫面</span>
          <span className="font-semibold">{displayName}</span>
        </div>
      </div>
    </div>
  );
}

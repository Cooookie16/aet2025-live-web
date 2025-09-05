'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// 關閉 OBS 端除錯輸出

// OBS 地圖與比數顯示
export default function OBSMapScoreDisplay({ data }) {
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
        if (!res.ok) {return;}
        const json = await res.json().catch(() => null);
        const all = json?.data?.mapScores || {};
        const { stage, index } = currentBroadcast || {};
        if (!stage && stage !== 0) {return;}
        if (typeof index !== 'number') {return;}
        const key = `${stage}:${index}`;
        const entry = all?.[key];
        if (Array.isArray(entry) && entry.length > 0) {
          const padded = [...entry];
          while (padded.length < 5) {padded.push({ mode: '', map: '', scoreA: '0', scoreB: '0' });}
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
      while (padded.length < 5) {padded.push({ mode: '', map: '', scoreA: '0', scoreB: '0' });}
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
      } catch {
        // 靜默處理錯誤
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
      } catch {
        // 靜默處理錯誤
      }
    };
    loadMaps();
  }, []);

  // 根據隊伍名稱取得選手陣列（未選隊伍時不顯示）
  const getTeamMembers = (teamName) => {
    if (!teamName) {return '';}
    const team = teamsData.find(t => t.name === teamName);
    return team ? team.members.join(', ') : '';
  };

  // 根據地圖名稱取得地圖圖片路徑
  const getMapImagePath = (mapName) => {
    if (!mapName) {
      // 靜默處理除錯
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
    // 靜默處理除錯
    return imagePath || null;
  };

  // 檢查該盤是否已開始（有分數且不為0）
  const isRoundStarted = (map) => {
    // 分數需為已填寫值且不為0：不可為 undefined/null/'0'/空字串
    const hasScoreA = map.scoreA !== undefined && map.scoreA !== null && map.scoreA !== '0' && map.scoreA !== '';
    const hasScoreB = map.scoreB !== undefined && map.scoreB !== null && map.scoreB !== '0' && map.scoreB !== '';
    const result = hasScoreA || hasScoreB;
    // 靜默處理除錯
    return result;
  };

  // 從 mapsData 依地圖中文+英文名稱尋找所屬模式
  const findModeByMapName = (mapName) => {
    if (!mapName || !Array.isArray(mapsData) || mapsData.length === 0) {return { modeZh: null, modeEn: null };}
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
    if (modeZh && modeEn) {return { modeZh, modeEn };}

    // 先用地圖名稱反推
    const byMap = findModeByMapName(map?.map);
    if (byMap.modeZh || byMap.modeEn) {return byMap;}

    // 再以 mapsData 的中文模式對照英文
    if (modeZh && Array.isArray(mapsData)) {
      const hit = mapsData.find(e => e.mode === modeZh);
      if (hit) {return { modeZh: hit.mode || modeZh, modeEn: hit.mode_en || null };}
    }
    return { modeZh: modeZh || null, modeEn: modeEn || null };
  };

  // 依 mode_en 取得 icon 路徑
  const getModeIconPathByEn = (modeEn) => {
    if (!modeEn) {return null;}
    return `/icons/${modeEn}.png`;
  };

  // 根據目前階段取得標籤（八強/四強/遺材賽/冠亞賽）
  const getStageLabel = () => {
    const stage = currentBroadcast?.stage;
    if (!stage) {return '';}
    const mapStageToLabel = {
      qf: '八強',
      sf: '四強',
      lf: '遺材賽',
      f: '冠亞賽',
    };
    return mapStageToLabel[stage] || '';
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
    if (!stage && stage !== 0) {return [];}
    if (typeof index !== 'number') {return [];}
    
    const key = `${stage}:${index}`;
    const entry = mapScores?.[key];
    // 靜默處理除錯
    
    // 1) 優先使用 overrideMaps（剛抓回的最新值）
    if (Array.isArray(overrideMaps) && overrideMaps.length === 5) {
      return overrideMaps;
    }

    // 若有陣列資料，補齊為 5 筆並快取
    if (Array.isArray(entry) && entry.length > 0) {
      const padded = [...entry];
      while (padded.length < 5) {
        padded.push({ mode: '', map: '', scoreA: '0', scoreB: '0' });
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
    if (!Array.isArray(list)) {return 0;}
    const key = team === 'A' ? 'scoreA' : 'scoreB';
    const won = list.reduce((acc, m) => {
      const v = m?.[key];
      if (v === undefined || v === null) {return acc;}
      const n = Number(v);
      return acc + (n === 2 ? 1 : 0);
    }, 0);
    return Math.min(5, won);
  };

  // 顯示用：將分數限制在 0~2，無效值顯示 '0'
  const formatScoreDisplay = (v) => {
    if (v === undefined || v === null || v === '' || v === '0') {return '0';}
    const n = Number(v);
    if (!Number.isFinite(n)) {return '0';}
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
                  <div key={`mode-${map?.map || `mode-${index}`}`} className="w-24 h-12 bg-black p-2 flex items-center justify-center">
                    {showIcon ? (
                      <Image src={iconPath} alt={modeEn || `第${index + 1}盤`} width={96} height={48} className="max-w-full max-h-full object-contain" />
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
              const hasMap = map && map.map && map.map.trim() !== '';
              
              return (
                <div 
                  key={`map-${map?.map || `map-${index}`}`}
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
                    // 未開始的盤：顯示地圖圖片或問號
                    <div className="w-full h-full flex items-center justify-center">
                      {map ? (
                        hasMap && mapImagePath ? (
                          <div className="w-full h-full flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                              <Image 
                                src={mapImagePath} 
                                alt={map.map || `第${index + 1}盤`}
                                width={200}
                                height={200}
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
                          // 沒有地圖時顯示置中的問號
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

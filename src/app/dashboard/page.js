'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DisplaySelector from '@/components/dashboard/DisplaySelector';
import BracketEditor from '@/components/dashboard/BracketEditor';
import MapScoreEditor from '@/components/dashboard/MapScoreEditor';
import BanpickEditor from '@/components/dashboard/BanpickEditor';
import StatusBar from '@/components/dashboard/StatusBar';
import SideNavbar from '@/components/dashboard/SideNavbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { useDisplayState } from '@/hooks/useDisplayState';
import { useBracketState } from '@/hooks/useBracketState';
import { useMapScores } from '@/hooks/useMapScores';
import { useConnectionState } from '@/hooks/useConnectionState';
import { getStageLabel } from '@/utils/displayUtils';

export default function Dashboard() {
  // 使用自定義 hooks
  const { selectedDisplayId, displayOptions, switchDisplay } = useDisplayState();
  const { bracket, currentBroadcast, handleMatchChange, setBroadcastMatch, handleResetBrackets, getCurrentBroadcastTeams } = useBracketState();
  const { mapsData, modeOptions, getCurrentMatchMaps, updateCurrentMatchMap, handleResetMapScores } = useMapScores();
  const { isConnected } = useConnectionState();

  // 從檔案載入隊伍清單
  const [teamOptions, setTeamOptions] = useState([]);

  // 載入隊伍清單
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (res.ok) {
          const body = await res.json();
          setTeamOptions(body.data || []);
        }
      } catch {
        setTeamOptions([]);
      }
    };
    loadTeams();
    // 訂閱 SSE：收到 teams-update 事件時重新載入隊伍
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

  // 依據地圖比分自動計算每場對戰的總和分數，並更新 bracket 顯示
  // 注意：這個邏輯已經移到 useBracketState hook 中處理

  // 取得目前播報對戰的地圖資料
  const currentMatchMaps = getCurrentMatchMaps(currentBroadcast);
  const currentBroadcastTeams = getCurrentBroadcastTeams();

  // 側邊導航區域定義
  const navSections = [
    {
      id: 'display-selector',
      name: '顯示選擇',
      description: '選擇OBS顯示內容',
      icon: '📺'
    },
    {
      id: 'bracket-editor',
      name: '賽程表',
      description: '編輯對戰組合',
      icon: '🏆'
    },
    {
      id: 'banpick-editor',
      name: 'Banpick',
      description: '管理禁用與選擇',
      icon: '⚔️'
    },
    {
      id: 'map-scores',
      name: '地圖分數',
      description: '設定地圖比分',
      icon: '🗺️'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 側邊導航 - 桌面版顯示，手機版隱藏 */}
      <div className="hidden lg:block">
        <SideNavbar sections={navSections} />
      </div>
      
      {/* 主要內容區域 */}
      <div>
      {/* 標題列 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  AET 直播控制台
                </h1>
              </Link>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                2026 2.0版 | 開發 by Cookie
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full sm:w-auto">
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

              {/* 工具按鈕群組 - 桌面版全顯示，手機版使用 Dropdown */}
              <div className="hidden sm:flex items-center gap-2">
                <a
                  href="/dashboard/teams"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
                >
                  編輯隊伍與選手
                </a>
                <a
                  href="/dashboard/editbanner"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
                >
                  編輯歡迎圖片
                </a>
                <a
                  href="/dashboard/brawlers"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
                >
                  編輯英雄列表
                </a>
                <a
                  href="/dashboard/maps"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
                >
                  編輯地圖與模式
                </a>
              </div>

              {/* 手機版工具選單 */}
              <div className="block sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
                    工具 ▾
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <a href="/dashboard/teams" target="_blank" rel="noopener noreferrer" className="w-full">
                        隊伍與選手
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/dashboard/editbanner" target="_blank" rel="noopener noreferrer" className="w-full">
                        編輯 Banner
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/dashboard/brawlers" target="_blank" rel="noopener noreferrer" className="w-full">
                        編輯 Brawlers
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/dashboard/maps" target="_blank" rel="noopener noreferrer" className="w-full">
                        地圖與模式
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區 - 桌面版使用垂直佈局，手機版使用 Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 桌面版：傳統垂直佈局 */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 gap-8">
            {/* 顯示介面選擇 */}
            <div id="display-selector">
              <DisplaySelector 
                displayOptions={displayOptions}
                selectedDisplayId={selectedDisplayId}
                onSwitchDisplay={switchDisplay}
              />
            </div>

            {/* 賽程表 Brackets 區域 */}
            <div id="bracket-editor">
              <BracketEditor 
                bracket={bracket}
                teamOptions={teamOptions}
                currentBroadcast={currentBroadcast}
                onMatchChange={handleMatchChange}
                onSetBroadcastMatch={setBroadcastMatch}
                onResetBrackets={handleResetBrackets}
              />
            </div>

            {/* Banpick 區域 */}
            <div id="banpick-editor">
              <BanpickEditor 
                currentBroadcast={currentBroadcast}
                teamOptions={teamOptions}
                bracket={bracket}
              />
            </div>

            {/* 地圖與比數 區域 */}
            <div id="map-scores">
              <MapScoreEditor 
                currentBroadcast={currentBroadcast}
                currentMatchMaps={currentMatchMaps}
                modeOptions={modeOptions}
                mapsData={mapsData}
                onUpdateMap={(idx, field, value) => updateCurrentMatchMap(currentBroadcast, idx, field, value)}
                onResetMapScores={handleResetMapScores}
              />
            </div>
          </div>
        </div>

        {/* 手機版：Tabs 佈局 */}
        <div className="block lg:hidden">
          <Tabs defaultValue="display-selector" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="display-selector" className="text-xs sm:text-sm">
                📺 顯示
              </TabsTrigger>
              <TabsTrigger value="bracket-editor" className="text-xs sm:text-sm">
                🏆 賽程
              </TabsTrigger>
              <TabsTrigger value="banpick-editor" className="text-xs sm:text-sm">
                ⚔️ Banpick
              </TabsTrigger>
              <TabsTrigger value="map-scores" className="text-xs sm:text-sm">
                🗺️ 地圖
              </TabsTrigger>
            </TabsList>

            <TabsContent value="display-selector">
              <DisplaySelector 
                displayOptions={displayOptions}
                selectedDisplayId={selectedDisplayId}
                onSwitchDisplay={switchDisplay}
              />
            </TabsContent>

            <TabsContent value="bracket-editor">
              <BracketEditor 
                bracket={bracket}
                teamOptions={teamOptions}
                currentBroadcast={currentBroadcast}
                onMatchChange={handleMatchChange}
                onSetBroadcastMatch={setBroadcastMatch}
                onResetBrackets={handleResetBrackets}
              />
            </TabsContent>

            <TabsContent value="banpick-editor">
              <BanpickEditor 
                currentBroadcast={currentBroadcast}
                teamOptions={teamOptions}
                bracket={bracket}
              />
            </TabsContent>

            <TabsContent value="map-scores">
              <MapScoreEditor 
                currentBroadcast={currentBroadcast}
                currentMatchMaps={currentMatchMaps}
                modeOptions={modeOptions}
                mapsData={mapsData}
                onUpdateMap={(idx, field, value) => updateCurrentMatchMap(currentBroadcast, idx, field, value)}
                onResetMapScores={handleResetMapScores}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <StatusBar 
        stageLabel={currentBroadcast?.stage ? getStageLabel(currentBroadcast.stage) : ''} 
        teamA={currentBroadcastTeams.a} 
        teamB={currentBroadcastTeams.b} 
        displayName={displayOptions.find(opt => opt.id === selectedDisplayId)?.name || '歡迎畫面'} 
        isConnected={isConnected} 
      />
      </div>
    </div>
  );
};
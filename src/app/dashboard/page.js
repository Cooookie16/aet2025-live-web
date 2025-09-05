'use client';

import { useState, useEffect } from 'react';
import DisplaySelector from '@/components/dashboard/DisplaySelector';
import TeamImageManager from '@/components/dashboard/TeamImageManager';
import BracketEditor from '@/components/dashboard/BracketEditor';
import MapScoreEditor from '@/components/dashboard/MapScoreEditor';
import BanpickEditor from '@/components/dashboard/BanpickEditor';
import StatusBar from '@/components/dashboard/StatusBar';
import SideNavbar from '@/components/dashboard/SideNavbar';
import { useDisplayState } from '@/hooks/useDisplayState';
import { useTeamImages } from '@/hooks/useTeamImages';
import { useBracketState } from '@/hooks/useBracketState';
import { useMapScores } from '@/hooks/useMapScores';
import { useConnectionState } from '@/hooks/useConnectionState';
import { loadTeamOptions } from '@/utils/teamUtils';
import { getStageLabel } from '@/utils/displayUtils';

export default function Dashboard() {
  // 使用自定義 hooks
  const { selectedDisplayId, displayOptions, switchDisplay } = useDisplayState();
  const { teamImages, selectedTeamForDisplay, setSelectedTeamForDisplay, handleTeamImageUpload, handleDeleteTeamImage, handleDeleteAllImages } = useTeamImages();
  const { bracket, currentBroadcast, handleMatchChange, setBroadcastMatch, handleResetBrackets, getCurrentBroadcastTeams } = useBracketState();
  const { mapsData, modeOptions, getCurrentMatchMaps, updateCurrentMatchMap, handleResetMapScores } = useMapScores();
  const { isConnected } = useConnectionState();

  // 從檔案載入隊伍清單
  const [teamOptions, setTeamOptions] = useState([]);

  // 載入隊伍清單
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/teams.json', { cache: 'no-store' });
        if (res.ok) {
          const teams = await res.json();
          setTeamOptions(teams);
        }
      } catch (error) {
        console.warn('載入隊伍資料失敗:', error);
        setTeamOptions([]);
      }
    };
    loadTeams();
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
      id: 'team-images',
      name: '隊伍圖片',
      description: '管理隊伍形象圖',
      icon: '🖼️'
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
      {/* 側邊導航 */}
      <SideNavbar sections={navSections} />
      
      {/* 主要內容區域 */}
      <div>
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
          {/* 顯示介面選擇 */}
          <div id="display-selector">
            <DisplaySelector 
              displayOptions={displayOptions}
              selectedDisplayId={selectedDisplayId}
              onSwitchDisplay={switchDisplay}
            />
          </div>

          {/* 隊伍圖片管理區域 */}
          <div id="team-images">
            <TeamImageManager
              teamOptions={teamOptions}
              teamImages={teamImages}
              selectedTeamForDisplay={selectedTeamForDisplay}
              onTeamImageUpload={handleTeamImageUpload}
              onSelectedTeamChange={setSelectedTeamForDisplay}
              onDeleteTeamImage={handleDeleteTeamImage}
              onDeleteAllImages={handleDeleteAllImages}
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
}
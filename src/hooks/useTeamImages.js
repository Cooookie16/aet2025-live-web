'use client';

import { useState, useEffect } from 'react';

// 隊伍圖片管理 hook
export function useTeamImages() {
  const [teamImages, setTeamImages] = useState({});
  const [selectedTeamForDisplay, setSelectedTeamForDisplay] = useState('');

  // 載入狀態
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              const d = json?.data || {};
              if (d.teamImages) {
                setTeamImages(d.teamImages || {});
              }
              if (d.selectedTeamForDisplay) {
                setSelectedTeamForDisplay(d.selectedTeamForDisplay || '');
              }
            } catch {
              // 靜默處理錯誤
            }
          }
        }
      } catch {}
      
      // 後備：從 localStorage 載入
      try {
        const rawTeamImages = localStorage.getItem('dashboard:teamImages');
        if (rawTeamImages) {
          setTeamImages(JSON.parse(rawTeamImages));
        }
      } catch {}
      try {
        const rawSelectedTeam = localStorage.getItem('dashboard:selectedTeamForDisplay');
        if (rawSelectedTeam) {
          setSelectedTeamForDisplay(rawSelectedTeam);
        }
      } catch {}
    };
    loadState();
  }, []);

  // 同步隊伍圖片到後端
  useEffect(() => {
    try { localStorage.setItem('dashboard:teamImages', JSON.stringify(teamImages)); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamImages })
        });
      } catch {}
    })();
  }, [teamImages]);

  // 同步選定隊伍到後端
  useEffect(() => {
    try { localStorage.setItem('dashboard:selectedTeamForDisplay', selectedTeamForDisplay); } catch {}
    (async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedTeamForDisplay })
        });
      } catch {}
    })();
  }, [selectedTeamForDisplay]);

  // 處理隊伍圖片上傳
  const handleTeamImageUpload = async (teamName, file) => {
    if (!file) {
      return;
    }
    
    try {
      // 建立 FormData 來上傳檔案
      const formData = new FormData();
      formData.append('image', file);
      formData.append('teamName', teamName);
      
      // 如果有舊圖片，傳送舊圖片URL以便刪除
      const oldImageUrl = teamImages[teamName]?.url;
      if (oldImageUrl) {
        formData.append('oldImageUrl', oldImageUrl);
      }
      
      const response = await fetch('/api/upload-team-image', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        // 更新本地狀態
        setTeamImages(prev => ({
          ...prev,
          [teamName]: {
            filename: result.filename,
            url: result.url
          }
        }));
        // console.log('圖片上傳成功:', result);
      } else {
        // console.error('圖片上傳失敗');
      }
    } catch {
      // console.error('圖片上傳錯誤:', error);
    }
  };

  // 刪除單一隊伍圖片
  const handleDeleteTeamImage = async (teamName) => {
    try {
      const imageData = teamImages[teamName];
      if (!imageData) {
        return;
      }

      const response = await fetch('/api/delete-team-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          teamName,
          imageUrl: imageData.url 
        })
      });
      
      if (response.ok) {
        // 從本地狀態中移除該隊伍的圖片
        setTeamImages(prev => {
          const newImages = { ...prev };
          delete newImages[teamName];
          return newImages;
        });
        // console.log('隊伍圖片刪除成功:', teamName);
      } else {
        // console.error('刪除隊伍圖片失敗');
      }
    } catch {
      // console.error('刪除隊伍圖片錯誤:', error);
    }
  };

  // 刪除全部隊伍圖片
  const handleDeleteAllImages = async () => {
    try {
      const response = await fetch('/api/delete-all-team-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamImages })
      });
      
      if (response.ok) {
        // 清空本地狀態
        setTeamImages({});
        // console.log('全部圖片刪除成功');
      } else {
        // console.error('刪除全部圖片失敗');
      }
    } catch {
      // console.error('刪除全部圖片錯誤:', error);
    }
  };

  return {
    teamImages,
    setTeamImages,
    selectedTeamForDisplay,
    setSelectedTeamForDisplay,
    handleTeamImageUpload,
    handleDeleteTeamImage,
    handleDeleteAllImages
  };
}

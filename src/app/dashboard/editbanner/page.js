/* eslint-disable */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';

export default function EditBannerPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast ();
  const [bannerUrl, setBannerUrl] = useState(''); // 預覽/待儲存的圖片 (目前選取的圖片)
  const [originalBannerUrl, setOriginalBannerUrl] = useState(''); // 目前線上生效的圖片
  const [saving, setSaving] = useState(false);
  const [historyImages, setHistoryImages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 用於捲動到預覽區
  const previewRef = useRef(null);

  // 載入設定與歷史圖片
  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const json = await res.json();
        const d = json?.data || {};
        if (d?.welcomeConfig?.bannerUrl) {
          setBannerUrl(d.welcomeConfig.bannerUrl);
          setOriginalBannerUrl(d.welcomeConfig.bannerUrl);
        } else {
          setBannerUrl('/images/AET2025_full_title_logo.png');
          setOriginalBannerUrl('/images/AET2025_full_title_logo.png');
        }
      }
    } catch {
      // quiet
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/upload'); // GET
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files)) {
          setHistoryImages(json.files);
        }
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    // 只有當預覽圖跟線上圖不同時才需要儲存
    if (bannerUrl === originalBannerUrl) {
       showToast({ title: '目前沒有變更', variant: 'info' });
       return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeConfig: {
            bannerUrl: bannerUrl.trim()
          }
        }),
      });
      if (res.ok) {
        showToast({ title: '儲存成功，直播已更新', variant: 'success' });
        setOriginalBannerUrl(bannerUrl); // 更新為當前生效
        setTimeout(() => {
          // router.push('/dashboard'); // 這裡可以選擇不跳轉，讓使用者繼續操作
        }, 500);
      } else {
        showToast({ title: '儲存失敗', variant: 'error' });
      }
    } catch {
      showToast({ title: '儲存失敗', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {return;}

    // 立即上傳
    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        setBannerUrl(json.url); // 只更新預覽
        // 上傳成功也會視為一張新圖，重新載入歷史列表
        loadHistory();
        showToast({ title: '上傳成功，請確認下方預覽並儲存', variant: 'success' });
      } else {
        showToast({ title: '上傳失敗', variant: 'error' });
      }
    } catch {
      showToast({ title: '上傳失敗', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (filename, url) => {
    if (url === originalBannerUrl) {
      showToast({ title: '無法刪除目前直播正在使用的圖片', variant: 'error' });
      return;
    }
    if (!confirm('確定要刪除這張圖片嗎？此操作無法復原。')) {
      return;
    }

    try {
      const res = await fetch(`/api/upload?filename=${filename}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast({ title: '刪除成功', variant: 'success' });
        loadHistory();
        // 如果刪除的是當前預覽的圖，則將預覽還原成線上圖
        if (url === bannerUrl) {
          setBannerUrl(originalBannerUrl);
        }
      } else {
        const json = await res.json();
        showToast({ title: json.error || '刪除失敗', variant: 'error' });
      }
    } catch {
      showToast({ title: '刪除失敗', variant: 'error' });
    }
  };

  const handleSwitch = (url) => {
    setBannerUrl(url);
    // 不再捲動
  };

  return (
    <ToastProvider>
      <ToastContainer />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">自訂「歡迎畫面圖片」</h1>
           <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
            >
              返回主頁
            </button>
        </div>
        
        {/* 主要狀態顯示區 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
           <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
             <span className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
             目前直播顯示 (Live)
           </h2>
           <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 flex justify-center">
              {originalBannerUrl ? (
                  <img src={originalBannerUrl} alt="Live" className="max-h-[200px] object-contain" />
              ) : (
                  <span className="text-gray-400">系統無設定圖片</span>
              )}
           </div>
        </div>

        {/* 上傳區塊 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            上傳新圖片 (上傳後會自動出現在下方列表)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-gray-700 dark:file:text-gray-200
            "
          />

        </div>

        {/* 歷史圖片區 + 預覽/發佈 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">選擇要顯示的圖片</h2>
          {loadingHistory ? (
            <div className="text-center text-gray-500 py-8">載入中...</div>
          ) : historyImages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">尚無歷史圖片</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {historyImages.map((img) => {
                const isCurrent = img.url === originalBannerUrl;
                const isSelected = img.url === bannerUrl;
                
                return (
                  <div key={img.name} 
                       className={`flex flex-col relative group border rounded-lg overflow-hidden transition-all duration-300
                         ${isSelected ? 'ring-4 ring-blue-500 scale-[1.02] z-10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                  >
                    <div 
                      className="aspect-video bg-gray-100 cursor-pointer relative"
                      onClick={() => handleSwitch(img.url)}
                    >
                      <img src={img.url} alt="history" className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="p-2 flex justify-between items-center bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 truncate flex-1 mr-2" title={new Date(img.created).toLocaleString()}>
                        {new Date(img.created).toLocaleDateString()}
                      </span>
                      {isCurrent ? (
                         <span className="text-xs font-bold text-red-600 px-2 py-1 bg-red-100 rounded animate-pulse">LIVE</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(img.name, img.url); }}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="刪除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* 當被選中且不是目前正在 Live 的圖片時，顯示確認按鈕 */}
                    {isSelected && !isCurrent && (
                      <div className="p-3 bg-blue-50 dark:bg-gray-800 border-t border-blue-100 dark:border-gray-600 animate-in slide-in-from-top-2 fade-in duration-300">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full bg-blue-600 text-white py-2 rounded font-bold shadow hover:bg-blue-700 transform active:scale-95 transition-all text-sm"
                        >
                          {saving ? '更新中...' : '確認變更 (GO LIVE)'}
                        </button>
                        <p className="mt-1 text-xs text-center text-gray-500">點擊上線</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
    </ToastProvider>
  );
}

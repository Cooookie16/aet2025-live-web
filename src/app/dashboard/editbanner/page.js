/* eslint-disable no-alert */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditBannerPage() {
  const router = useRouter();
  const [bannerUrl, setBannerUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 載入當前設定
    const load = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const json = await res.json();
          const d = json?.data || {};
          if (d?.welcomeConfig?.bannerUrl) {
            setBannerUrl(d.welcomeConfig.bannerUrl);
          } else {
            // 預設值
            setBannerUrl('/images/AET2025_full_title_logo.png');
          }
        }
      } catch {
        // quiet
      }
    };
    load();
  }, []);

  const handleSave = async () => {
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
        router.push('/dashboard');
      } else {
        alert('儲存失敗');
      }
    } catch {
      alert('儲存失敗');
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
        setBannerUrl(json.url);
      } else {
        alert('上傳失敗');
      }
    } catch {
      alert('上傳失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">歡迎畫面設定</h1>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              上傳新圖片
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
            <p className="mt-1 text-xs text-gray-500">
              上傳後將自動填入下方欄位，請確認預覽無誤後按下儲存。
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Banner 圖片網址
            </label>
            <input
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="/images/... 或 https://..."
            />
            <p className="mt-2 text-xs text-gray-500">
              若是專案內的圖檔請以 /images/ 開頭。若是外部圖片請輸入完整網址。
            </p>
          </div>

          {/* 預覽 */}
          <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900 flex justify-center">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="Preview" className="max-w-full max-h-[300px] object-contain" />
            ) : (
              <span className="text-gray-400">無圖片預覽</span>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存並返回'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

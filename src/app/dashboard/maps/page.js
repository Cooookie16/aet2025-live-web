/* eslint-disable no-alert, no-console, react/no-array-index-key */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion';

export default function MapsEditorPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [data, setData] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load maps config
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/maps-config', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/maps-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showToast({ title: '儲存成功', variant: 'success' });
      } else {
        showToast({ title: '儲存失敗', variant: 'error' });
      }
    } catch {
      showToast({ title: '儲存失敗', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMode = () => {
    // 使用簡單表單取代 prompt（已有 window 前綴避免 lint 錯誤）
    const name = window.prompt('輸新的模式名稱 (例如: 搶星大作戰)');
    if (!name) {
      return;
    }
    const en = window.prompt('輸入模式英文代號 (例如: bounty)，將用於 icon 匹配');
    if (!en) {
      return;
    }
    setData([...data, { mode: name, mode_en: en, maps: [] }]);
  };

  const handleDeleteMode = (index) => {
    if (!window.confirm('確定要刪除此模式及其所有地圖嗎？')) {
      return;
    }
    const updated = [...data];
    updated.splice(index, 1);
    setData(updated);
  };

  const handleUpdateMode = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    setData(updated);
  };

  const handleAddMap = (modeIndex) => {
    const updated = [...data];
    updated[modeIndex].maps.push({ name: '新地圖', image: '' });
    setData(updated);
  };

  const handleDeleteMap = (modeIndex, mapIndex) => {
    const updated = [...data];
    updated[modeIndex].maps.splice(mapIndex, 1);
    setData(updated);
  };

  const handleUpdateMap = (modeIndex, mapIndex, field, value) => {
    const updated = [...data];
    updated[modeIndex].maps[mapIndex] = { ...updated[modeIndex].maps[mapIndex], [field]: value };
    setData(updated);
  };

  const handleUploadImage = async (file, modeIndex, mapIndex) => {
    if (!file) {return;}
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/maps-upload', { // use separate upload API
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (res.ok && json.url) {
        handleUpdateMap(modeIndex, mapIndex, 'image', json.url);
        showToast({ title: '上傳成功', variant: 'success' });
      } else {
        showToast({ title: '上傳失敗', variant: 'error' });
      }
    } catch {
      showToast({ title: '上傳失敗', variant: 'error' });
    }
  };

  return (
    <ToastProvider>
      <ToastContainer />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">地圖與模式管理</h1>
          <div className="space-x-4">
             <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存變更'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              返回控制台
            </button>
          </div>
        </div>

        {/* 手機版：使用 Accordion 摺疊 */}
        <div className="block lg:hidden">
          <Accordion type="single" collapsible className="space-y-4">
            {data.map((modeData, modeIndex) => (
              <AccordionItem key={modeIndex} value={`mode-${modeIndex}`} className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <AccordionTrigger className="font-medium text-gray-900 dark:text-white">
                  {modeData.mode} ({modeData.mode_en})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b dark:border-gray-700">
                      <div className="flex-1 grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">模式名稱 (中文)</label>
                          <input
                            type="text"
                            className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={modeData.mode}
                            onChange={(e) => handleUpdateMode(modeIndex, 'mode', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">模式代號 (英文/圖示)</label>
                          <input
                            type="text"
                            className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                            value={modeData.mode_en}
                            onChange={(e) => handleUpdateMode(modeIndex, 'mode_en', e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMode(modeIndex)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                      >
                        刪除
                      </button>
                    </div>

                    <div className="space-y-4">
                      {modeData.maps.map((map, mapIndex) => (
                        <div key={mapIndex} className="border dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400">Map {mapIndex + 1}</span>
                            <button
                              onClick={() => handleDeleteMap(modeIndex, mapIndex)}
                              className="text-red-500 hover:text-red-700"
                              title="刪除地圖"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">地圖名稱</label>
                              <input
                                type="text"
                                className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                                value={map.name}
                                onChange={(e) => handleUpdateMap(modeIndex, mapIndex, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">地圖圖片</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  className="flex-1 border rounded p-2 text-xs dark:bg-gray-700 dark:text-gray-300"
                                  value={map.image || ''}
                                  placeholder="/maps/..."
                                  onChange={(e) => handleUpdateMap(modeIndex, mapIndex, 'image', e.target.value)}
                                />
                                <label className="cursor-pointer bg-blue-500 text-white px-2 py-2 rounded text-xs hover:bg-blue-600">
                                  上傳
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleUploadImage(e.target.files?.[0], modeIndex, mapIndex)}
                                  />
                                </label>
                              </div>
                              {map.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={map.image} 
                                  alt="preview" 
                                  className="mt-2 h-20 w-full object-contain bg-black/10 rounded" 
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddMap(modeIndex)}
                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded p-4 text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                      >
                        + 新增地圖
                      </button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* 桌面版：傳統佈局 */}
        <div className="hidden lg:block space-y-8">
          {data.map((modeData, modeIndex) => (
            <div key={modeIndex} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4 border-b pb-4 dark:border-gray-700">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">模式名稱 (中文)</label>
                    <input
                      type="text"
                      className="w-full border rounded p-1 dark:bg-gray-700 dark:text-white"
                      value={modeData.mode}
                      onChange={(e) => handleUpdateMode(modeIndex, 'mode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">模式代號 (英文/圖示)</label>
                    <input
                      type="text"
                      className="w-full border rounded p-1 dark:bg-gray-700 dark:text-white"
                      value={modeData.mode_en}
                      onChange={(e) => handleUpdateMode(modeIndex, 'mode_en', e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMode(modeIndex)}
                  className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  刪除模式
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modeData.maps.map((map, mapIndex) => (
                  <div key={mapIndex} className="border dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-bold text-gray-400">Map {mapIndex + 1}</span>
                       <button
                         onClick={() => handleDeleteMap(modeIndex, mapIndex)}
                         className="text-red-500 hover:text-red-700"
                         title="刪除地圖"
                       >
                         ✕
                       </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">地圖名稱</label>
                        <input
                          type="text"
                          className="w-full border rounded p-1 text-sm dark:bg-gray-700 dark:text-white"
                          value={map.name}
                          onChange={(e) => handleUpdateMap(modeIndex, mapIndex, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">地圖圖片</label>
                        <div className="flex items-center gap-2">
                          <input
                             type="text"
                             className="flex-1 border rounded p-1 text-xs dark:bg-gray-700 dark:text-gray-300"
                             value={map.image || ''}
                             placeholder="/maps/..."
                             onChange={(e) => handleUpdateMap(modeIndex, mapIndex, 'image', e.target.value)}
                          />
                          <label className="cursor-pointer bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">
                            上傳
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleUploadImage(e.target.files?.[0], modeIndex, mapIndex)}
                            />
                          </label>
                        </div>
                        {map.image && (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img 
                            src={map.image} 
                            alt="preview" 
                            className="mt-2 h-20 w-full object-contain bg-black/10 rounded" 
                           />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => handleAddMap(modeIndex)}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded p-4 flex items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors min-h-[200px]"
                >
                  + 新增地圖
                </button>
              </div>
            </div>
          ))}
        </div>

          <button
            onClick={handleAddMode}
            className="w-full py-4 border-2 border-dashed border-gray-400 text-gray-500 font-bold text-lg rounded-lg hover:bg-gray-50 hover:border-gray-500 transition-colors"
          >
            + 新增遊戲模式
          </button>
        </div>
      </div>
    </ToastProvider>
  );
}

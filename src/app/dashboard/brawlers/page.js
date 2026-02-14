/* eslint-disable no-console */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/Dialog';

export default function BrawlersPage() {
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [brawlers, setBrawlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Renaming state
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const loadBrawlers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/brawlers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBrawlers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrawlers();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill name logic: remove extension
      const name = file.name.replace(/\.[^/.]+$/, "");
      setNewName(name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newName.trim()) {return;}

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    // 強制轉為小寫
    formData.append('name', newName.trim().toLowerCase());

    try {
      const res = await fetch('/api/brawlers', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setNewName('');
        setSelectedFile(null);
        // Clear file input manually if needed, or rely on React key reset
        document.getElementById('fileInput').value = '';
        showToast({ title: '上傳成功!', variant: 'success' });
        await loadBrawlers();
      } else {
        const json = await res.json();
        const errorMsg = res.status === 409 ? '英雄名稱已存在!' : '上傳失敗!';
        showToast({ title: errorMsg, description: json.error, variant: 'error' });
      }
    } catch {
      showToast({ title: '上傳失敗!', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (name) => {
    setEditingId(name);
    setEditValue(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleRename = async () => {
    if (!editingId || !editValue.trim() || editingId === editValue.trim()) {
      cancelEdit();
      return;
    }
    
    setRenaming(true);
    try {
        const res = await fetch('/api/brawlers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName: editingId, newName: editValue.trim() }) // API will lowercase it
        });
        
        if (res.ok) {
            await loadBrawlers();
            cancelEdit();
            showToast({ title: '重新命名成功!', variant: 'success' });
        } else {
            const json = await res.json();
            const errorMsg = res.status === 409 ? '英雄名稱已存在!' : '重新命名失敗!';
            showToast({ title: errorMsg, description: json.error || 'Unknown error', variant: 'error' });
        }
    } catch {
        showToast({ title: '重新命名失敗!', variant: 'error' });
    } finally {
        setRenaming(false);
    }
  };

  const confirmDelete = (name) => {
    setDeleteConfirm(name);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      return;
    }
    const name = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const res = await fetch(`/api/brawlers?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast({ title: '刪除成功!', variant: 'success' });
        await loadBrawlers();
      } else {
        showToast({ title: '刪除失敗!', variant: 'error' });
      }
    } catch {
      showToast({ title: '刪除失敗!', variant: 'error' });
    }
  };

  return (
    <ToastProvider>
      <ToastContainer />
      
      {/* 刪除確認 Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogTitle>確認刪除</DialogTitle>
          <DialogDescription>
            確定要刪除「{deleteConfirm}」嗎？此操作無法復原。
          </DialogDescription>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              確認刪除
            </button>
            <DialogClose asChild>
              <button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                取消
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">英雄管理</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            返回主頁
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">新增英雄</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                選擇圖片 (.png)
              </label>
              <input
                id="fileInput"
                type="file"
                accept=".png"
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
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                英雄名稱 (ID)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="例如: Colt"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !newName.trim()}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? '上傳中...' : '上傳'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            注意：名稱將作為檔案名稱，請使用英文、數字。若名稱重複將會覆蓋舊檔案。
          </p>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">載入中...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {brawlers.map((name) => (
              <div key={name} className="relative group bg-white dark:bg-gray-800 rounded-lg shadow p-2 border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                <div className="w-full aspect-square relative mb-2 bg-gray-50 dark:bg-gray-900 rounded flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/brawlers/${name}.png?t=${Date.now()}`} // Cache busting
                    alt={name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                
                {editingId === name ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      className="w-full text-xs p-1 rounded border border-blue-500 bg-white dark:bg-gray-900"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {handleRename();}
                        if (e.key === 'Escape') {cancelEdit();}
                      }}
                      autoFocus
                    />
                    <button onClick={handleRename} disabled={renaming} className="text-green-600 hover:text-green-800">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    </button>
                    <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full px-1">
                    <span 
                        className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate flex-1 cursor-pointer hover:text-blue-600"
                        onClick={() => startEdit(name)}
                        title="點擊編輯名稱"
                    >
                      {name}
                    </span>
                    <button
                      onClick={() => startEdit(name)}
                      className="text-gray-400 hover:text-blue-600 ml-1"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => confirmDelete(name)}
                  className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity z-10"
                  title="刪除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {brawlers.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                目前沒有任何角色資料
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </ToastProvider>
  );
}

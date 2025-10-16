'use client';

import { useEffect, useState } from 'react';
import logger from '@/lib/logger';

function createEmptyTeams() {
  return Array.from({ length: 8 }).map((_, i) => ({ name: `Team ${i + 1}`, members: ['', '', ''] }));
}

export default function TeamsEditorPage() {
  const [teams, setTeams] = useState(createEmptyTeams());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 產生穩定 key（避免使用索引）
  const getTeamKey = (t) => {
    const name = (t && typeof t.name === 'string' && t.name.trim()) ? t.name.trim() : 'team';
    const members = Array.isArray(t?.members) ? t.members.join('|') : '';
    return `${name}-${members}`;
  };

  // 載入現有 teams.json
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage('');
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (!res.ok) { throw new Error('載入失敗'); }
        const body = await res.json();
        if (body?.ok && Array.isArray(body.data)) {
          // 僅保留前 8 筆，或補足到 8 筆
          const list = body.data.slice(0, 8);
          while (list.length < 8) { list.push({ name: `Team ${list.length + 1}`, members: ['', '', ''] }); }
          // 確保每隊 3 名成員
          const normalized = list.map(t => ({
            name: typeof t.name === 'string' ? t.name : '',
            members: Array.isArray(t.members) ? [t.members[0] || '', t.members[1] || '', t.members[2] || ''] : ['', '', ''],
          }));
          setTeams(normalized);
        } else {
          setTeams(createEmptyTeams());
        }
      } catch (loadError) {
        // 最小化日誌：僅在開發/伺服端協助定位問題
        logger.warn('[Dashboard][Teams] 載入 teams 失敗:', loadError?.message || loadError);
        setMessage('載入失敗，使用預設資料');
        setTeams(createEmptyTeams());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateTeamName = (index, value) => {
    setTeams(prev => prev.map((t, i) => i === index ? { ...t, name: value } : t));
  };

  const updateMember = (teamIndex, memberIndex, value) => {
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIndex) { return t; }
      const members = [...t.members];
      members[memberIndex] = value;
      return { ...t, members };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) { throw new Error(body?.error || '儲存失敗'); }
      setMessage('已儲存');
    } catch (e) {
      setMessage(`儲存失敗：${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">隊伍與選手管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">編輯 8 支隊伍與各 3 位選手，按「儲存」才會寫入檔案</p>
        </div>

        {message && (
          <div className="mb-4 text-sm px-3 py-2 rounded border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-gray-600 dark:text-gray-300">載入中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team, i) => (
              <div key={getTeamKey(team)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">隊伍 {i + 1} 名稱</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={team.name}
                    onChange={(e) => updateTeamName(i, e.target.value)}
                    placeholder={`Team ${i + 1}`}
                  />
                </div>
                <div className="space-y-2">
                  {[0,1,2].map(j => (
                    <div key={j}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">選手 {j + 1}</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={team.members[j]}
                        onChange={(e) => updateMember(i, j, e.target.value)}
                        placeholder={`Member ${j + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
          <a href="/dashboard" className="text-sm text-gray-600 dark:text-gray-300 hover:underline">返回控制台</a>
        </div>
      </div>
    </div>
  );
}



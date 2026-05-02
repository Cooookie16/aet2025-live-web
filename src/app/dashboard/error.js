'use client';

export default function DashboardError({ error, reset }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">控制台發生錯誤</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-all">
          {error?.message || '未知錯誤'}
        </div>
        <button
          type="button"
          onClick={() => {
            try { reset(); } catch {
              try { window.location.reload(); } catch {}
            }
          }}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          重試
        </button>
      </div>
    </div>
  );
}

'use client';

// 顯示介面選擇組件
export default function DisplaySelector({ 
  displayOptions, 
  selectedDisplayId, 
  onSwitchDisplay 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        選擇顯示介面
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSwitchDisplay(option.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedDisplayId && selectedDisplayId === option.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white">
              {option.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

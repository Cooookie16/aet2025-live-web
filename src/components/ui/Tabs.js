'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';

// Tabs 根元件
export const Tabs = TabsPrimitive.Root;

// Tabs 清單（導航列）
export function TabsList({ children, className = '', ...props }) {
  return (
    <TabsPrimitive.List
      className={`inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto ${className}`}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

// 單一 Tab 觸發器
export function TabsTrigger({ children, value, className = '', ...props }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap
        data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm
        data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900
        dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400
        dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:text-gray-200
        ${className}`}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

// Tab 內容面板
export function TabsContent({ children, value, className = '', ...props }) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={`focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  );
}

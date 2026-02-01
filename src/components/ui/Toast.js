'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { useState } from 'react';

// Toast Provider 元件
export function ToastProvider({ children }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 flex flex-col p-4 gap-2 w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
    </ToastPrimitive.Provider>
  );
}

// Toast Hook - 提供簡單的 API 來顯示通知
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = ({ title, description, variant = 'default', duration = 3000 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description, variant, duration, open: true }]);
    
    // 自動關閉
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    }, duration);

    // 移除已關閉的 toast
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration + 500);
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          open={toast.open}
          onOpenChange={(open) => {
            if (!open) {
              setToasts((prev) => prev.map((t) => (t.id === toast.id ? { ...t, open: false } : t)));
            }
          }}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 grid grid-cols-[auto_max-content] gap-x-4 items-center border ${
            toast.variant === 'error'
              ? 'border-red-500 dark:border-red-700'
              : toast.variant === 'success'
              ? 'border-green-500 dark:border-green-700'
              : 'border-gray-300 dark:border-gray-600'
          } data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut`}
        >
          <div>
            {toast.title && (
              <ToastPrimitive.Title className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {toast.title}
              </ToastPrimitive.Title>
            )}
            {toast.description && (
              <ToastPrimitive.Description className="text-sm text-gray-600 dark:text-gray-300">
                {toast.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
    </>
  );

  return { showToast, ToastContainer };
}

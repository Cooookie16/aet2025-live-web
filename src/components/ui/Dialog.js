'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

// Dialog 根元件
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// Dialog 內容（含遮罩）
export function DialogContent({ children, className = '', ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg max-h-[90vh] overflow-y-auto
          bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 
          data-[state=open]:animate-in data-[state=closed]:animate-out 
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
          data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] 
          data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
          mx-4 sm:mx-0
          ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// Dialog 標題
export function DialogTitle({ children, className = '', ...props }) {
  return (
    <DialogPrimitive.Title
      className={`text-xl font-semibold text-gray-900 dark:text-white mb-4 ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

// Dialog 描述
export function DialogDescription({ children, className = '', ...props }) {
  return (
    <DialogPrimitive.Description
      className={`text-sm text-gray-600 dark:text-gray-300 mb-4 ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

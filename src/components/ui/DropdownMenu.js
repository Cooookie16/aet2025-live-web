'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

// DropdownMenu 根元件
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

// DropdownMenu 內容
export function DropdownMenuContent({ children, className = '', align = 'end', ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        className={`z-50 min-w-[12rem] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-md
          data-[state=open]:animate-in data-[state=closed]:animate-out 
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
          data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 
          data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
          ${className}`}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

// DropdownMenu 項目
export function DropdownMenuItem({ children, className = '', ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors
        focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-gray-700 dark:focus:text-white
        data-[disabled]:pointer-events-none data-[disabled]:opacity-50
        ${className}`}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

// DropdownMenu 分隔線
export function DropdownMenuSeparator({ className = '', ...props }) {
  return (
    <DropdownMenuPrimitive.Separator
      className={`-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700 ${className}`}
      {...props}
    />
  );
}

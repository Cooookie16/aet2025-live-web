'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';

// Accordion 根元件
export const Accordion = AccordionPrimitive.Root;

// 單一 Accordion 項目
export function AccordionItem({ children, value, className = '', ...props }) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className={`border-b border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </AccordionPrimitive.Item>
  );
}

// Accordion 觸發器（標題）
export function AccordionTrigger({ children, className = '', ...props }) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={`flex flex-1 items-center justify-between py-4 px-4 font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white
          [&[data-state=open]>svg]:rotate-180 ${className}`}
        {...props}
      >
        {children}
        <svg
          className="w-4 h-4 transition-transform duration-200 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

// Accordion 內容
export function AccordionContent({ children, className = '', ...props }) {
  return (
    <AccordionPrimitive.Content
      className={`overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ${className}`}
      {...props}
    >
      <div className="pb-4 pt-0 px-4">{children}</div>
    </AccordionPrimitive.Content>
  );
}

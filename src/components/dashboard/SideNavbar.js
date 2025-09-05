'use client';

import { useState, useEffect } from 'react';

// 側邊導航組件
export default function SideNavbar({ sections }) {
  const [activeSection, setActiveSection] = useState('');

  // 監聽滾動位置，更新當前活動區域
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // 偏移量，提前觸發

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始檢查

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // 平滑滾動到指定區域
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 w-48 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 ${
                activeSection === section.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{section.icon}</span>
                <span className="text-sm font-medium">{section.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

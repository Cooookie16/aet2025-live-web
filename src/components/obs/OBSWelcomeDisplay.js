'use client';

import Image from 'next/image';

// OBS 優化的歡迎畫面組件
export default function OBSWelcomeDisplay({ data }) {
  const bannerUrl = data?.welcomeConfig?.bannerUrl || '/images/AET2025_full_title_logo.png';

  // 判斷是否為預設圖片，預設圖片使用 Next/Image 優化，自定義圖片使用一般 img 標籤避免 domain 限制
  const isDefault = bannerUrl.startsWith('/');

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 歡迎畫面：顯示活動 Logo 或自定義圖片 */}
      <div className="max-w-[80vw] max-h-[80vh] w-full h-auto flex items-center justify-center p-8">
        {isDefault ? (
          <Image
            src={bannerUrl}
            alt="Welcome Banner"
            width={1920}
            height={1080}
            priority
            className="w-full h-auto object-contain"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bannerUrl}
            alt="Welcome Banner"
            className="w-full h-auto object-contain"
          />
        )}
      </div>
    </div>
  );
}

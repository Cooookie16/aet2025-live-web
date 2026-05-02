'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const DEFAULT_BANNER = '/images/AET2025_full_title_logo.png';

// OBS 優化的歡迎畫面組件
export default function OBSWelcomeDisplay({ data, imageTimestamp = Date.now() }) {
  const requestedBanner = data?.welcomeConfig?.bannerUrl || DEFAULT_BANNER;
  const [errored, setErrored] = useState(false);

  // src 改變時重置錯誤狀態
  useEffect(() => {
    setErrored(false);
  }, [requestedBanner]);

  // 載入失敗時退回預設 logo，避免 OBS 顯示破圖示
  const bannerUrl = errored ? DEFAULT_BANNER : requestedBanner;
  const bannerUrlWithTimestamp = bannerUrl.includes('?')
    ? `${bannerUrl}&t=${imageTimestamp}`
    : `${bannerUrl}?t=${imageTimestamp}`;

  // 判斷是否為預設圖片，預設圖片使用 Next/Image 優化，自定義圖片使用一般 img 標籤避免 domain 限制
  const isDefault = bannerUrl.startsWith('/');

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* 歡迎畫面：顯示活動 Logo 或自定義圖片 */}
      <div className="max-w-[80vw] max-h-[80vh] w-full h-auto flex items-center justify-center p-8">
        {isDefault ? (
          <Image
            src={bannerUrlWithTimestamp}
            alt="Welcome Banner"
            width={1920}
            height={1080}
            priority
            className="w-full h-auto object-contain"
            onError={() => setErrored(true)}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bannerUrlWithTimestamp}
            alt="Welcome Banner"
            className="w-full h-auto object-contain"
            onError={() => setErrored(true)}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

/**
 * SafeImage — 載入失敗時不顯示破圖示。
 *
 * 對 OBS 透明背景場景特別重要：圖片 404 時，瀏覽器會渲染預設破圖示，
 * 在直播畫面中極為刺眼。改為錯誤時不渲染或渲染 fallbackSrc。
 *
 * 用法基本同 next/image：
 *   <SafeImage src={path} alt="..." width={W} height={H} />
 *   <SafeImage src={path} alt="..." width={W} height={H} fallbackSrc="/images/fallback.png" />
 */
export default function SafeImage({
  src,
  alt = '',
  width,
  height,
  className,
  style,
  priority,
  fallbackSrc,
  onError,
  unoptimized,
  ...rest
}) {
  const [errored, setErrored] = useState(false);
  // 重置 errored：src 改變時重新嘗試載入
  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src) {
    return null;
  }

  if (errored) {
    if (fallbackSrc) {
      // 用一般 <img> 顯示 fallback，避免 next/image domain 設定問題
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={style}
          {...rest}
        />
      );
    }
    // 不顯示任何視覺元素，避免破圖示
    return null;
  }

  // 自定義上傳路徑可能不在 next.config 設定範圍 → 用一般 <img>
  const isAbsoluteHttp = typeof src === 'string' && /^https?:\/\//.test(src);
  if (isAbsoluteHttp) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onError={(e) => {
          setErrored(true);
          if (typeof onError === 'function') {
            try { onError(e); } catch {}
          }
        }}
        {...rest}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
      unoptimized={unoptimized}
      onError={(e) => {
        setErrored(true);
        if (typeof onError === 'function') {
          try { onError(e); } catch {}
        }
      }}
      {...rest}
    />
  );
}

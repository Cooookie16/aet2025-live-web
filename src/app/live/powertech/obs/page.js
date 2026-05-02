'use client';

import OBSWelcomeDisplay from '@/components/obs/OBSWelcomeDisplay';
import OBSBracketDisplay from '@/components/obs/OBSBracketDisplay';
import OBSBanpickDisplay from '@/components/obs/OBSBanpickDisplay';
import OBSMapScoreDisplay from '@/components/obs/OBSMapScoreDisplay';
import ReconnectingOverlay from '@/components/obs/ReconnectingOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useObsLiveData } from '@/hooks/useObsLiveData';
import { useHeartbeat } from '@/hooks/useHeartbeat';

// 關閉 OBS 端除錯輸出
if (typeof window !== 'undefined') {
  try {
    const noop = () => {};
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.warn = noop;
    // eslint-disable-next-line no-console
    console.error = noop;
  } catch {}
}

function OBSLiveContent() {
  const {
    currentDisplay,
    displayData,
    bracket,
    currentBroadcast,
    banpickData,
    imageTimestamp,
    status,
    lastEventTime,
  } = useObsLiveData();

  useHeartbeat({ source: 'obs-powertech' });

  const renderDisplay = () => {
    if (!currentDisplay) {
      return null; // 尚未取得狀態前不渲染，避免 welcome 閃爍
    }
    switch (currentDisplay) {
      case 'welcome':
        return <OBSWelcomeDisplay data={displayData} imageTimestamp={imageTimestamp} />;
      case 'bracket':
        return <OBSBracketDisplay data={{ bracket, currentBroadcast }} imageTimestamp={imageTimestamp} />;
      case 'banpick':
        return <OBSBanpickDisplay data={{ currentBroadcast, banpickData, bracket }} imageTimestamp={imageTimestamp} />;
      case 'map-score':
        return <OBSMapScoreDisplay data={{ currentBroadcast, mapScores: displayData.mapScores, bracket }} imageTimestamp={imageTimestamp} />;
      default:
        return null;
    }
  };

  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 1600px;
          height: 1200px;
          overflow: hidden;
          background: transparent !important;
        }
        /* 移除 Next.js 可能的預設背景 */
        #__next {
          background: transparent !important;
        }
      `}</style>
      <div className="w-[1600px] h-[1200px] overflow-hidden relative bg-transparent text-white">
        {/* 主要顯示區域 - 限制在 1600x1200，基準畫布 800x600 左上角原點等比放大 */}
        <div className="w-[1600px] h-[1200px] overflow-hidden">
          <div className="w-[800px] h-[600px]" style={{ transform: 'scale(2)', transformOrigin: 'top left' }}>
            {renderDisplay()}
          </div>
        </div>
      </div>
      <ReconnectingOverlay status={status} lastEventTime={lastEventTime} />
    </>
  );
}

export default function OBSLiveUI() {
  return (
    <ErrorBoundary
      renderFallback={() => <ReconnectingOverlay mode="error" status="open" />}
    >
      <OBSLiveContent />
    </ErrorBoundary>
  );
}

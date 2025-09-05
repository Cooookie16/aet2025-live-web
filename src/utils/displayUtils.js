// 顯示相關工具函數

// 轉換階段顯示標籤
export function getStageLabel(stage) {
  if (stage === 'qf') return '八強';
  if (stage === 'sf') return '四強';
  if (stage === 'lf') return '遺材賽';
  if (stage === 'f') return '冠亞賽';
  return '';
}

// 取得目前播報對戰的隊伍名稱
export function getCurrentBroadcastTeams(currentBroadcast, bracket) {
  const { stage, index } = currentBroadcast || {};
  if (!stage && stage !== 0) {
    return { a: '', b: '' };
  }
  const list = bracket?.[stage];
  if (!list || typeof index !== 'number' || !list[index]) {
    return { a: '', b: '' };
  }
  const a = list[index]?.a?.team || '';
  const b = list[index]?.b?.team || '';
  return { a, b };
}

// 檢查是否為目前播報對戰
export function isCurrentMatch(currentBroadcast, stage, index) {
  return currentBroadcast && currentBroadcast.stage === stage && currentBroadcast.index === index;
}

// 發送控制指令
export async function sendCommand(command) {
  try {
    const response = await fetch('/api/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'broadcast',
        type: 'display-change',
        data: command,
        timestamp: Date.now()
      }),
    });

    if (response.ok) {
      console.log('指令發送成功');
    }
  } catch (error) {
    console.error('發送指令失敗:', error);
  }
}

// 隊伍相關工具函數

// 載入隊伍清單
export async function loadTeamOptions() {
  try {
    const res = await fetch('/api/teams', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('teams 資料載入失敗');
    }
    const body = await res.json();
    const data = body.data || [];
    const names = Array.isArray(data) ? data.map(t => t.name).filter(Boolean) : [];
    if (names.length) {
      return names;
    } else {
      return ['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8'];
    }
  } catch {
    // 靜默處理錯誤
    return ['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8'];
  }
}

// 載入完整隊伍資料（包含選手）
export async function loadTeamsData() {
  try {
    const res = await fetch('/api/teams', { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      return body.data || [];
    }
  } catch {
    // 靜默處理錯誤
  }
  return [];
}

// 根據隊伍名稱取得選手陣列
export function getTeamMembers(teamName, teamsData) {
  if (!teamName || !Array.isArray(teamsData)) {return '';}
  const team = teamsData.find(t => t.name === teamName);
  return team ? team.members.join(', ') : '';
}

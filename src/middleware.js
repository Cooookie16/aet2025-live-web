import { NextResponse } from 'next/server'

export function middleware(request) {
  
  // 我故意明寫的 不是Agent的鍋
  // 如果你看到這個代表你跟我有緣 == 歡迎來報名AET網站組 -> discord.aetbrawl.com
  const USER_NAME = 'aet';
  const PASSWORD = 'aet2026pumpkin';

  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    
    try {
      const authValue = authHeader.split(' ')[1];
      const decoded = atob(authValue);
      
      const colonIndex = decoded.indexOf(':');
      
      if (colonIndex !== -1) {
        const user = decoded.slice(0, colonIndex);
        const pwd = decoded.slice(colonIndex + 1);

        if (user === USER_NAME && pwd === PASSWORD) {
          return NextResponse.next();
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('user驗證失敗', e);
    }
  }

  // 檢查是否為 Next.js 的 Prefetch 請求
  // 如果是 Prefetch，直接回傳 401 但不要帶 WWW-Authenticate header
  // 這樣瀏覽器就不會跳出登入視窗，也不會影響頁面載入
  const isPrefetch = request.headers.get('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
  
  if (isPrefetch) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse('你無法進入此頁面，請輸入正確帳號密碼', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Dashboard Access"',
    },
  });
}

export const config = {
  matcher: '/dashboard/:path*',
}

import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const brawlersDir = join(process.cwd(), 'public', 'brawlers');
    const files = await readdir(brawlersDir);
    
    // 過濾出.png檔案並移除副檔名
    const brawlers = files
      .filter(file => file.endsWith('.png'))
      .map(file => file.replace('.png', ''))
      .sort(); // 按字母順序排序
    
    return NextResponse.json(brawlers, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('讀取角色列表失敗:', error);
    return NextResponse.json(
      { error: '讀取角色列表失敗' },
      { status: 500 }
    );
  }
}

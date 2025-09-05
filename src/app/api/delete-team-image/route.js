import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { teamName, imageUrl } = body;

    if (!teamName || !imageUrl) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    // 刪除圖片檔案
    try {
      const imagePath = join(process.cwd(), 'public', imageUrl);
      if (existsSync(imagePath)) {
        await unlink(imagePath);
        console.log(`隊伍圖片刪除記錄 - 隊伍: ${teamName}, 檔名: ${imageUrl}, 時間: ${new Date().toISOString()}`);
      }
    } catch (error) {
      console.warn('刪除圖片檔案失敗:', error);
    }

    return NextResponse.json({
      success: true,
      message: `成功刪除 ${teamName} 的圖片`,
      teamName: teamName
    });

  } catch (error) {
    console.error('刪除隊伍圖片錯誤:', error);
    return NextResponse.json({ error: '刪除隊伍圖片失敗' }, { status: 500 });
  }
}

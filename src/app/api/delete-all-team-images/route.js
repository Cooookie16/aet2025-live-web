import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, readdir } from 'fs';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);

export async function POST(request) {
  try {
    const body = await request.json();
    const { teamImages } = body || {};

    const uploadDir = join(process.cwd(), 'public', 'team-images');
    let deletedCount = 0;
    let errorCount = 0;

    // 刪除指定的圖片檔案
    if (teamImages && typeof teamImages === 'object') {
      for (const [, imageData] of Object.entries(teamImages)) {
        if (imageData && imageData.url) {
          try {
            const imagePath = join(process.cwd(), 'public', imageData.url);
            if (existsSync(imagePath)) {
              await unlink(imagePath);
              deletedCount++;
            }
          } catch {
            errorCount++;
          }
        }
      }
    }

    // 額外清理：刪除目錄中所有檔案（以防有遺漏）
    try {
      if (existsSync(uploadDir)) {
        const files = await readdirAsync(uploadDir);
        for (const file of files) {
          try {
            const filePath = join(uploadDir, file);
            await unlink(filePath);
            if (!teamImages || !Object.values(teamImages).some(img => img.url?.includes(file))) {
              deletedCount++;
            }
          } catch {
            errorCount++;
          }
        }
      }
    } catch {
      // 靜默處理錯誤
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      message: `成功刪除 ${deletedCount} 個檔案${errorCount > 0 ? `，${errorCount} 個檔案刪除失敗` : ''}`
    });

  } catch {
    return NextResponse.json({ error: '刪除全部圖片失敗' }, { status: 500 });
  }
}

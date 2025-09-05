import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const teamName = formData.get('teamName');
    const oldImageUrl = formData.get('oldImageUrl'); // 新增：舊圖片URL

    if (!image || !teamName) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    // 確保上傳目錄存在
    const uploadDir = join(process.cwd(), 'public', 'team-images');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // 目錄可能已存在，忽略錯誤
    }

    // 刪除舊圖片（如果有的話）
    if (oldImageUrl) {
      try {
        const oldImagePath = join(process.cwd(), 'public', oldImageUrl);
        if (existsSync(oldImagePath)) {
          await unlink(oldImagePath);
          console.log('已刪除舊圖片:', oldImagePath);
        }
      } catch (error) {
        console.warn('刪除舊圖片失敗:', error);
        // 不中斷上傳流程，繼續處理新圖片
      }
    }

    // 生成檔案名稱（使用隊伍名稱和時間戳）
    const timestamp = Date.now();
    const fileExtension = image.name.split('.').pop();
    const filename = `${teamName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_${timestamp}.${fileExtension}`;
    
    // 儲存檔案
    const filePath = join(uploadDir, filename);
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // 回傳檔案資訊
    const imageUrl = `/team-images/${filename}`;
    
    return NextResponse.json({
      success: true,
      filename: filename,
      url: imageUrl,
      teamName: teamName
    });

  } catch (error) {
    console.error('圖片上傳錯誤:', error);
    return NextResponse.json({ error: '圖片上傳失敗' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // 使用固定檔名來達成「覆蓋」效果，但添加 query param (timestamp) 讓前端更新
    // 或是乾脆每次都用新檔名，並由前端更新 URL。
    // 使用戶要求的「新覆蓋舊」，最直覺的是同一個檔名。
    // 但 Next.js / 瀏覽器快取很強，同檔名很難即時更新。
    // 採用：每次都存成 `uploads/banner-[timestamp].ext`，並刪除舊的（可選，這裡先不刪除舊的以免誤刪）。
    
    // 確保 public/uploads 存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 取得副檔名
    const ext = path.extname(file.name) || '.png';
    const filename = `banner-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ 
      ok: true, 
      url: `/uploads/${filename}` 
    });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

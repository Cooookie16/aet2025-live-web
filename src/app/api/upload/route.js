import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { broadcast as sseBroadcast } from '@/lib/sse';
import { optimizeImage } from '@/lib/imageOptimizer';
import { kvGet } from '@/lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Optimize header/banner image
    const optimizedBuffer = await optimizeImage(buffer, { maxWidth: 1920, quality: 80, format: 'webp' });

    // 確保 public/uploads 存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Always use .webp for optimized banners
    const ext = '.webp';
    const filename = `banner-${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, optimizedBuffer);

    const url = `/uploads/${filename}`;

    // 廣播 banner 更新事件，讓 OBS 頁面即時更新
    try {
      sseBroadcast({
        action: 'broadcast',
        type: 'banner-update',
        data: { url, timestamp: Date.now() },
        timestamp: Date.now(),
      });
    } catch (broadcastError) {
       // eslint-disable-next-line no-console
       console.error('Broadcast failed:', broadcastError);
    }

    return NextResponse.json({ 
      ok: true, 
      url 
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(file => file.startsWith('banner-') && file.endsWith('.webp'))
      .map(file => {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          url: `/uploads/${file}`,
          created: stats.birthtimeMs
        };
      })
      .sort((a, b) => b.created - a.created); // 新的在前面

    return NextResponse.json({ files });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('List files error:', e);
    return NextResponse.json({ error: 'List failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // 安全檢查：檢查是否為當前正在使用的 banner
    const currentConfig = await kvGet('dashboard:welcomeConfig');
    const currentBannerUrl = currentConfig?.bannerUrl;
    
    if (currentBannerUrl && currentBannerUrl.includes(filename)) {
      return NextResponse.json({ error: 'Cannot delete active banner', isCurrent: true }, { status: 403 });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Delete file error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

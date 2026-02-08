import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { optimizeImage } from '@/lib/imageOptimizer';

const UPLOAD_DIR = join(process.cwd(), 'public', 'maps');

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Optimize the image locally
    const optimizedBuffer = await optimizeImage(buffer);
    
    // Use .webp extension for optimized images
    const ext = 'webp'; 
    const timestamp = Date.now();
    // Use original name base if possible, but safely
    const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const filename = `${safeName}_${timestamp}.${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, optimizedBuffer);

    return NextResponse.json({ ok: true, url: `/maps/${filename}` });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Security check: ensure deleting only from /maps/
    if (!url.startsWith('/maps/')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    const filename = url.replace('/maps/', '');
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(UPLOAD_DIR, filename);
    await unlink(filePath).catch(() => {}); // ignore error if file missing

    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Delete error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

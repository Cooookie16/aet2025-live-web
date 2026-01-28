import { NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

const UPLOAD_DIR = join(process.cwd(), 'public', 'maps');

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate a unique filename or use logic to match map name?
    // Plan: Use a unique timestamped name to avoid cache, or just clean filename.
    // Dashboard will manage the association.
    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const filename = `map_${timestamp}.${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({ ok: true, url: `/maps/${filename}` });
  } catch (e) {
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
    console.error('Delete error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

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
      },
    });
  } catch {
    // 靜默處理錯誤
    return NextResponse.json(
      { error: '讀取角色列表失敗' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const name = formData.get('name');

    if (!file || !name) {
      return NextResponse.json({ error: 'Missing file or name' }, { status: 400 });
    }

    const brawlersDir = join(process.cwd(), 'public', 'brawlers');
    // Sanitize name to prevent path traversal
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check file signature or extension if needed, currently assuming .png from client or converting? 
    // Plan Implementation says "Only supports .png for now".
    // We will save as .png regardless of input name, or ensure input name has .png? 
    // Plan says: "Save file to public/brawlers/[name].png"
    
    // Ensure directory exists (should exist if GET works, but good practice)
    // await mkdir(brawlersDir, { recursive: true }); // fs/promises needed if we want to ensure

    // Use synchronous write or promise-based write. 
    // Need to import writeFile from fs/promises.
    const { writeFile } = require('fs/promises'); 
    await writeFile(join(brawlersDir, `${safeName}.png`), buffer);

    return NextResponse.json({ ok: true, name: safeName });
  } catch (e) {
    console.error('Upload brawler error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = join(process.cwd(), 'public', 'brawlers', `${safeName}.png`);
    
    const { unlink } = require('fs/promises');
    await unlink(filePath);

    return NextResponse.json({ ok: true });
  } catch (e) {
    // console.error('Delete brawler error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Missing oldName or newName' }, { status: 400 });
    }

    const brawlersDir = join(process.cwd(), 'public', 'brawlers');
    // Sanitize
    const safeOldName = oldName.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeNewName = newName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (!safeNewName) {
         return NextResponse.json({ error: 'Invalid new name' }, { status: 400 });
    }

    const oldPath = join(brawlersDir, `${safeOldName}.png`);
    const newPath = join(brawlersDir, `${safeNewName}.png`);

    const { rename, stat } = require('fs/promises');
    
    // Check if new name exists
    try {
        await stat(newPath);
        return NextResponse.json({ error: 'Name already exists' }, { status: 409 });
    } catch {
        // file does not exist, proceed
    }
    
    // Check if old file exists
    try {
        await stat(oldPath);
    } catch {
        return NextResponse.json({ error: 'Original file not found' }, { status: 404 });
    }

    await rename(oldPath, newPath);

    return NextResponse.json({ ok: true, name: safeNewName });
  } catch (e) {
    console.error('Rename error:', e);
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}

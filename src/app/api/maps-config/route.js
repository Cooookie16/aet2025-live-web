import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const MAPS_FILE = join(process.cwd(), 'public', 'maps.json');

export async function GET() {
  try {
    const data = await readFile(MAPS_FILE, 'utf-8');
    const json = JSON.parse(data);
    return NextResponse.json(json, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to read maps.json', e);
    return NextResponse.json({ error: 'Failed to read maps' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await writeFile(MAPS_FILE, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save maps.json', e);
    return NextResponse.json({ error: 'Failed to save maps' }, { status: 500 });
  }
}

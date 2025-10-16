import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { broadcast as sseBroadcast } from '@/lib/sse';
import logger from '@/lib/logger';

const TEAMS_PATH = path.join(process.cwd(), 'public', 'teams.json');

function readTeamsFile() {
  try {
    if (!fs.existsSync(TEAMS_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(TEAMS_PATH, 'utf-8');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.error('[API][teams] 讀取 teams.json 失敗:', error.message);
    return null;
  }
}

function writeTeamsFile(data) {
  try {
    fs.writeFileSync(TEAMS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error('[API][teams] 寫入 teams.json 失敗:', error.message);
    throw error;
  }
}

function createDefaultTeams() {
  return Array.from({ length: 8 }).map((_, i) => ({
    name: `Team ${i + 1}`,
    members: ['', '', ''],
  }));
}

function validateTeamsPayload(payload) {
  if (!Array.isArray(payload) || payload.length !== 8) {return 'INVALID_LENGTH';}
  for (let i = 0; i < payload.length; i++) {
    const t = payload[i];
    if (!t || typeof t.name !== 'string') {return `INVALID_TEAM_NAME_${i}`;}
    if (!Array.isArray(t.members) || t.members.length !== 3) {return `INVALID_MEMBERS_${i}`;}
    for (let j = 0; j < 3; j++) {
      if (typeof t.members[j] !== 'string') {return `INVALID_MEMBER_TYPE_${i}_${j}`;}
    }
  }
  return null;
}

export async function GET() {
  try {
    const data = readTeamsFile();
    const teams = Array.isArray(data) && data.length ? data : createDefaultTeams();
    return NextResponse.json({ ok: true, data: teams }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // 加入日誌以協助追蹤讀取失敗原因（僅在伺服端輸出）
    logger.error('[API][teams][GET] 讀取失敗:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'READ_FAILED' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ ok: false, error: 'EMPTY_BODY' }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      // 加入日誌以驗證是否為 JSON 解析錯誤
      logger.warn('[API][teams][PUT] JSON 解析失敗:', parseError?.message || parseError);
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const { teams } = body || {};
    const err = validateTeamsPayload(teams);
    if (err) {
      logger.warn('[API][teams] 驗證失敗:', err);
      return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }

    writeTeamsFile(teams);
    try {
      sseBroadcast({
        action: 'broadcast',
        type: 'teams-update',
        data: { updated: true },
        timestamp: Date.now(),
      });
    } catch {}
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'WRITE_FAILED', details: error.message }, { status: 500 });
  }
}



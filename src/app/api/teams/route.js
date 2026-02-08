import { NextResponse } from 'next/server';
import { getAllTeams, updateTeams } from '@/lib/db';
import { broadcast as sseBroadcast } from '@/lib/sse';
import logger from '@/lib/logger';

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
    let teams = getAllTeams();
    if (!Array.isArray(teams) || teams.length === 0) {
      teams = createDefaultTeams();
    }
    return NextResponse.json({ ok: true, data: teams }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
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
      logger.warn('[API][teams][PUT] JSON 解析失敗:', parseError?.message || parseError);
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const { teams } = body || {};
    const err = validateTeamsPayload(teams);
    if (err) {
      logger.warn('[API][teams] 驗證失敗:', err);
      return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }

    updateTeams(teams);
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



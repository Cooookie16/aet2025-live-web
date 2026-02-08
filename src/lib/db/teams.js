import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'db', 'teams.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    ensureSchema();
  }
  return db;
}

function ensureSchema() {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);
}

export function getAllTeams() {
  const db = getDb();
  
  // 用戶端期望格式：
  // [
  //   { name: "TeamName", members: ["P1", "P2", "P3"] }, ...
  // ]

  const teams = db.prepare('SELECT * FROM teams ORDER BY id ASC').all();
  
  return teams.map(team => {
    const members = db.prepare('SELECT name FROM members WHERE team_id = ? ORDER BY id ASC').all(team.id);
    return {
      name: team.name,
      members: members.map(m => m.name)
    };
  });
}

export function updateTeams(teamsList) {
  const db = getDb();
  
  const insertTeam = db.prepare('INSERT INTO teams (name) VALUES (@name)');
  const insertMember = db.prepare('INSERT INTO members (team_id, name) VALUES (@team_id, @name)');

  const transaction = db.transaction((data) => {
    // 簡單暴力：清空重寫，因為資料量很小
    db.exec('DELETE FROM members');
    db.exec('DELETE FROM teams');

    data.forEach(team => {
      const info = insertTeam.run({ name: team.name });
      const teamId = info.lastInsertRowid;

      if (Array.isArray(team.members)) {
        team.members.forEach(member => {
          insertMember.run({
            team_id: teamId,
            name: member
          });
        });
      }
    });
  });

  transaction(teamsList);
}

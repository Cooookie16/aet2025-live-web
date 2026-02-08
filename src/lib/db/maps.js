import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'db', 'maps.db');

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
    CREATE TABLE IF NOT EXISTS modes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode_slug TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      FOREIGN KEY(mode_slug) REFERENCES modes(slug) ON DELETE CASCADE
    )
  `);
}

export function getAllMaps() {
  const db = getDb();
  
  const modes = db.prepare('SELECT * FROM modes ORDER BY display_order ASC').all();
  
  return modes.map(mode => {
    const maps = db.prepare('SELECT name, image FROM maps WHERE mode_slug = ? ORDER BY id ASC').all(mode.slug);
    return {
      mode: mode.name,
      mode_en: mode.slug,
      maps: maps
    };
  });
}

export function updateMapsConfig(config) {
  const db = getDb();
  
  const insertMode = db.prepare('INSERT INTO modes (slug, name, display_order) VALUES (@slug, @name, @order) ON CONFLICT(slug) DO UPDATE SET name = @name, display_order = @order');
  const deleteMaps = db.prepare('DELETE FROM maps WHERE mode_slug = ?');
  const insertMap = db.prepare('INSERT INTO maps (mode_slug, name, image) VALUES (@mode_slug, @name, @image)');

  const deleteModesNotInList = db.prepare('DELETE FROM modes WHERE slug NOT IN (' + config.map(() => '?').join(',') + ')');
  const slugs = config.map(c => c.mode_en);

  const transaction = db.transaction((data) => {
    if (slugs.length > 0) {
      deleteModesNotInList.run(...slugs);
    } else {
      db.exec('DELETE FROM modes');
    }

    data.forEach((group, index) => {
      insertMode.run({
        slug: group.mode_en,
        name: group.mode,
        order: index
      });

      deleteMaps.run(group.mode_en);

      if (Array.isArray(group.maps)) {
        group.maps.forEach(map => {
          insertMap.run({
            mode_slug: group.mode_en,
            name: map.name,
            image: map.image
          });
        });
      }
    });
  });

  transaction(config);
}

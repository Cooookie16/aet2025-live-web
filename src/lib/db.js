import fs from 'fs';
import path from 'path';

const VAR_DIR = path.join(process.cwd(), 'var');
const STATE_PATH = path.join(VAR_DIR, 'state.json');

function ensureDir() {
  if (!fs.existsSync(VAR_DIR)) fs.mkdirSync(VAR_DIR, { recursive: true });
}

function readAll() {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    ensureDir();
    fs.writeFileSync(STATE_PATH, JSON.stringify(obj || {}, null, 2), 'utf-8');
  } catch {}
}

export function kvGet(key) {
  const data = readAll();
  return key in data ? data[key] : null;
}

export function kvSet(key, value) {
  const data = readAll();
  try {
    data[key] = JSON.parse(value);
  } catch {
    data[key] = value;
  }
  writeAll(data);
}

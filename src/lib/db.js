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
  } catch (error) {
    console.error('讀取狀態檔案失敗:', error);
    return {};
  }
}

function writeAll(obj) {
  try {
    ensureDir();
    fs.writeFileSync(STATE_PATH, JSON.stringify(obj || {}, null, 2), 'utf-8');
  } catch (error) {
    console.error('寫入狀態檔案失敗:', error);
  }
}

export function kvGet(key) {
  const data = readAll();
  return key in data ? data[key] : null;
}

export function kvSet(key, value) {
  const data = readAll();
  try {
    // 如果 value 是字串，嘗試解析為 JSON
    if (typeof value === 'string') {
      data[key] = JSON.parse(value);
    } else {
      // 如果 value 已經是物件，直接使用
      data[key] = value;
    }
  } catch {
    // 解析失敗時，直接使用原始值
    data[key] = value;
  }
  writeAll(data);
}

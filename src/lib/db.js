import fs from 'fs';
import path from 'path';
import logger from '@/lib/logger';

const VAR_DIR = path.join(process.cwd(), 'var');
const STATE_PATH = path.join(VAR_DIR, 'state.json');

function ensureDir() {
  if (!fs.existsSync(VAR_DIR)) {
    try {
      fs.mkdirSync(VAR_DIR, { recursive: true });
    } catch (error) {
      logger.error('[DB] 建立目錄失敗:', error.message);
      throw error;
    }
  }
}

function readAll() {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    logger.error('[DB] 讀取狀態檔案失敗:', error.message);
    return {};
  }
}

function writeAll(obj) {
  try {
    ensureDir();
    fs.writeFileSync(STATE_PATH, JSON.stringify(obj || {}, null, 2), 'utf-8');
  } catch (error) {
    logger.error('[DB] 狀態檔案寫入失敗:', error.message);
    throw error;
  }
}

export function kvGet(key) {
  const data = readAll();
  return key in data ? data[key] : null;
}

export function kvSet(key, value) {
  try {
    const data = readAll();
    // 如果 value 是字串，檢查是否為JSON格式
    if (typeof value === 'string') {
      // 檢查是否為JSON格式（以{或[開頭）
      if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          // 靜默處理錯誤
          data[key] = value;
        }
      } else {
        // 不是JSON格式，直接使用字串值
        data[key] = value;
      }
    } else {
      // 如果 value 已經是物件，直接使用
      data[key] = value;
    }
    writeAll(data);
  } catch (error) {
    // 靜默處理錯誤
    throw error;
  }
}

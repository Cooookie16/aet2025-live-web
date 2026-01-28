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

class Mutex {
  constructor() {
    this.mutex = Promise.resolve();
  }

  lock() {
    let begin = () => {};
    this.mutex = this.mutex.then(() => {
      return new Promise(resolve => {
        begin = resolve;
      });
    });
    return new Promise(resolve => {
      resolve(begin);
    });
  }

  async dispatch(fn) {
    const unlock = await this.lock();
    try {
      return await Promise.resolve(fn());
    } finally {
      unlock();
    }
  }
}

const dbMutex = new Mutex();

export function kvGet(key) {
  // 讀取通常不需要 lock，除非要求強一致性（但在檔案系統中這很難保證完全原子）
  // 為了避免讀到寫入一半的檔案，理論上讀寫都該 lock，但考慮效能，
  // 若 writeAll 使用 atomic rename (writeFileSync 通常是原子的) 則讀取風險較低。
  // 不過這是 nodejs fs，writeFileSync 不是真正 atomic (但 write 是截斷後寫入)。
  // 安全起見，這裡可以只依賴 OS 的文件鎖或簡單的互斥。
  // 鑑於這是簡易系統，我們假設 writeFileSync 足夠快。
  // 若要更安全，讀取也應該過 mutex。但現在先只鎖寫入避免 race waiting。
  const data = readAll();
  return key in data ? data[key] : null;
}

export async function kvSet(key, value) {
  return dbMutex.dispatch(() => {
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
  });
}

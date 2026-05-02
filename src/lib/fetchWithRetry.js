// 帶指數退避重試的 fetch 包裝；針對 OBS / Dashboard 的網路抖動容錯
// 使用者很少所以不必擔心連線數量；重點在「絕不靜默失敗」

const DEFAULT_OPTS = {
  retries: 4,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 8000,
  retryOnStatus: [408, 425, 429, 500, 502, 503, 504],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status, list) {
  return list.includes(status);
}

/**
 * fetchWithRetry — 重試與超時包裝。
 * @param {string|URL} input
 * @param {RequestInit & { retry?: Partial<typeof DEFAULT_OPTS> }} init
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(input, init = {}) {
  const { retry: retryOpts, ...fetchInit } = init || {};
  const opts = { ...DEFAULT_OPTS, ...(retryOpts || {}) };

  let attempt = 0;
  let lastErr = null;

  while (attempt <= opts.retries) {
    const controller = new AbortController();
    // 接力外層的 abort signal（若有）
    const externalSignal = fetchInit.signal;
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        const onAbort = () => controller.abort(externalSignal.reason);
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      try { controller.abort(new Error('TIMEOUT')); } catch {}
    }, opts.timeoutMs);

    try {
      const resp = await fetch(input, { ...fetchInit, signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        return resp;
      }
      // 非 2xx：判斷是否該重試
      if (shouldRetryStatus(resp.status, opts.retryOnStatus) && attempt < opts.retries) {
        attempt += 1;
        const wait = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1));
        await delay(wait);
        continue;
      }
      // 不可重試的非 2xx 直接回傳給呼叫端決策
      return resp;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // 外部主動 abort 不重試
      if (externalSignal && externalSignal.aborted) {
        throw err;
      }
      if (attempt >= opts.retries) {
        break;
      }
      attempt += 1;
      const wait = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1));
      await delay(wait);
    }
  }

  throw lastErr || new Error('fetchWithRetry: exhausted retries');
}

/**
 * 簡化版：取得 JSON，並提供 fallback。
 * 失敗時回傳 fallback 而非 throw，避免 OBS 場景下整頁炸開。
 */
export async function fetchJsonSafe(input, init, fallback = null) {
  try {
    const resp = await fetchWithRetry(input, init);
    if (!resp.ok) {
      return fallback;
    }
    const text = await resp.text();
    if (!text) {
      return fallback;
    }
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

/**
 * 寫入並重試。失敗時回傳 false，呼叫端可決定提示或進入待重發佇列。
 */
export async function postJsonWithRetry(input, body, init = {}) {
  try {
    const resp = await fetchWithRetry(input, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      body: JSON.stringify(body ?? {}),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

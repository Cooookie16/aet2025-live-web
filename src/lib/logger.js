/* eslint-disable no-console */

// 輕量日誌工具：在 production 環境降噪，在開發環境輸出到主控台
const isProd = process.env.NODE_ENV === 'production';

function format(args) {
  try {
    return args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  } catch {
    return args.join(' ');
  }
}

export const logger = {
  info: (...args) => {
    if (!isProd) { console.log(format(args)); }
  },
  warn: (...args) => {
    if (!isProd) { console.warn(format(args)); }
  },
  error: (...args) => {
    if (!isProd) { console.error(format(args)); }
  },
  debug: (...args) => {
    if (!isProd) { console.debug ? console.debug(format(args)) : console.log(format(args)); }
  },
};

export default logger;
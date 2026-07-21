
const REDACT_KEYS = ['password', 'pass', 'token', 'secret', 'authorization', 'cookie', 'otp', 'code'];
const MAX_ARG_LENGTH = 1000;

function shouldRedact(key) {
  const k = String(key || '').toLowerCase();
  return REDACT_KEYS.some((needle) => k.includes(needle));
}

function sanitizeString(value) {
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, MAX_ARG_LENGTH);
}

function sanitizeArg(value, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(String(value.message || '')),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeArg(item, seen));
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = shouldRedact(key) ? '[REDACTED]' : sanitizeArg(item, seen);
    }
    return out;
  }
  return sanitizeString(String(value));
}

function write(level, args) {
  let fn = console.log;
  if (level === 'error') fn = console.error;
  else if (level === 'warn') fn = console.warn;
  fn(...args.map((arg) => sanitizeArg(arg)));
}

module.exports = {
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      write('debug', args);
    }
  },
};

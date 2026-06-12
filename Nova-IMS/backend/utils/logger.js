/**
 * Logger mínimo para evitar console.* directo en código de aplicación (Sonar S106).
 * Scripts CLI e import-db pueden seguir usando console.
 */

function write(level, args) {
  let fn = console.log;
  if (level === 'error') fn = console.error;
  else if (level === 'warn') fn = console.warn;
  fn(...args);
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

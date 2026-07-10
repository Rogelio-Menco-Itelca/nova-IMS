const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error('[ERROR]', err);
  }
  res.status(status).json({
    error: {
      message: err.message || 'Error interno',
      details: err.details || undefined,
    },
  });
}

module.exports = errorHandler;

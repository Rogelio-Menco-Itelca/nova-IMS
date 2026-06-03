// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[ERROR]', err);
  }
  res.status(status).json({
    error: {
      message: err.message || 'Error interno',
      details: err.details || undefined,
    },
  });
};

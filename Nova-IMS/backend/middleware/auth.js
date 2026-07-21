const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Token no provisto'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return next(new HttpError(401, 'Token inválido o expirado'));
  }
}

function requireRole(...roleIds) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'No autenticado'));
    if (!roleIds.includes(req.user.role_id)) {
      return next(new HttpError(403, 'No tiene permisos suficientes'));
    }
    next();
  };
}

module.exports = { authRequired, requireRole };

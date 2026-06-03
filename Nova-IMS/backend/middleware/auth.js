const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');

/**
 * Extrae y valida el JWT del header Authorization: Bearer <token>
 * Deja el payload en req.user = { sub, username, name, role_id, role_name, agency_code }
 */
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
  } catch (err) {
    return next(new HttpError(401, 'Token inválido o expirado'));
  }
}

/**
 * Permite paso solo si el usuario pertenece a alguno de los roles dados.
 * Uso: router.delete('/...', authRequired, requireRole('RP-1'), handler)
 */
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

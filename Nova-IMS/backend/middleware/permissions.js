const HttpError = require('../utils/HttpError');
const giRoles = require('../db/gestionincidentes/roles');

function requirePermission(moduleName, action = 'view') {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.role_id;
      const agencyCode = req.user?.agency_code;
      if (!roleId) {
        return next(new HttpError(403, 'No tiene permiso para acceder a este recurso'));
      }

      const allowed = await giRoles.checkRolePermission(roleId, agencyCode, moduleName, action);
      if (!allowed) {
        return next(new HttpError(403, 'No tiene permiso para acceder a este recurso'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  view: (moduleName) => requirePermission(moduleName, 'view'),
  create: (moduleName) => requirePermission(moduleName, 'create'),
  edit: (moduleName) => requirePermission(moduleName, 'edit'),
  notify: (moduleName) => requirePermission(moduleName, 'notify'),
  export: (moduleName) => requirePermission(moduleName, 'export'),
};

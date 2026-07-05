const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { requireSessionAgency } = require('../utils/requestAgency');
const giRoles = require('../db/gestionincidentes/roles');
const { recordAudit } = require('../utils/auditTrail');

const ACTION_LABELS = {
  view: 'Ver',
  viewIncident: 'Ver incidente',
  create: 'Crear',
  edit: 'Editar',
  notify: 'Notificar',
  export: 'Exportar',
};

/**
 * Compara permisos antes/después y devuelve una descripción legible de los
 * cambios por módulo, p. ej.:
 *   «Dashboard: quitó "Ver". Reportes: agregó "Exportar", habilitó el módulo.»
 */
function describeModulePermissionChanges(prev, nextPerm) {
  const changes = [];

  const prevEnabled = !!prev?.enabled;
  const nextEnabled = !!nextPerm.enabled;
  if (prevEnabled !== nextEnabled) {
    changes.push(nextEnabled ? 'habilitó el módulo' : 'deshabilitó el módulo');
  }

  for (const [key, label] of Object.entries(ACTION_LABELS)) {
    const prevVal = !!prev?.actions?.[key];
    const nextVal = !!nextPerm.actions?.[key];
    if (prevVal !== nextVal) {
      changes.push(`${nextVal ? 'agregó' : 'quitó'} "${label}"`);
    }
  }

  return changes;
}

function describePermissionChanges(before, after) {
  const beforeByModule = Object.fromEntries((before || []).map((p) => [p.module, p]));
  const lines = [];

  for (const nextPerm of after || []) {
    const prev = beforeByModule[nextPerm.module];
    const changes = describeModulePermissionChanges(prev, nextPerm);
    if (changes.length) {
      lines.push(`${nextPerm.module}: ${changes.join(', ')}`);
    }
  }

  return lines;
}

exports.list = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  res.json(await giRoles.buildRolePermissions(agencyCode));
});

exports.create = asyncHandler(async (req, res) => {
  const name = req.body?.role || req.body?.name;
  if (!name) throw new HttpError(400, 'role (nombre) requerido');

  const id = await nextId('roles', 'ID_Rol', 'RP', 1);
  const agencyCode = requireSessionAgency(req);
  await giRoles.createRole(id, name, agencyCode);

  await recordAudit({
    req,
    user: req.user,
    categoria: 'configuracion',
    modulo: 'Administración',
    tablaAfectada: 'roles',
    accion: 'Creación de rol',
    resultado: 'exitoso',
    detalle: `Se creó el rol "${name}"`,
  });

  res.status(201).json(await giRoles.buildRolePermissions(agencyCode));
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const permissions = req.body?.permissions;
  if (!Array.isArray(permissions)) throw new HttpError(400, 'permissions[] requerido');

  const agencyCode = requireSessionAgency(req);
  if (!(await giRoles.roleExists(id, agencyCode))) {
    throw new HttpError(404, 'Rol no encontrado');
  }

  const before = await giRoles.getPermissionsForRole(id, agencyCode);
  await giRoles.updateRolePermissions(id, permissions);
  const all = await giRoles.buildRolePermissions(agencyCode);
  const roleName = all.find((r) => r.id === id)?.role || id;

  const changeLines = describePermissionChanges(before, permissions);
  const detalle = changeLines.length
    ? `Permisos del rol "${roleName}" — ${changeLines.join('. ')}.`
    : `Guardó los permisos del rol "${roleName}" sin cambios.`;

  await recordAudit({
    req,
    user: req.user,
    categoria: 'configuracion',
    modulo: 'Administración',
    tablaAfectada: 'permisos_de_rol',
    accion: `Actualización de permisos (${roleName})`,
    resultado: 'exitoso',
    detalle,
  });

  res.json(all);
});

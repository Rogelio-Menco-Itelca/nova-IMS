const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');
const { requireSessionAgency } = require('../utils/requestAgency');
const giRoles = require('../db/gestionincidentes/roles');

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

  await giRoles.updateRolePermissions(id, permissions);
  res.json(await giRoles.buildRolePermissions(agencyCode));
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agencyCode = requireSessionAgency(req);
  if (!(await giRoles.roleExists(id, agencyCode))) {
    throw new HttpError(404, 'Rol no encontrado');
  }
  if (/^RP-[1-9]$/.test(String(id))) {
    throw new HttpError(400, 'No se puede eliminar un rol del sistema');
  }
  await giRoles.deleteRole(id);
  res.status(204).send();
});

const logger = require('../utils/logger');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { writeAdminLog } = require('../utils/adminLog');
const { generateUniqueUsername } = require('../utils/usernameGenerator');
const { validatePassword } = require('../utils/passwordPolicy');
const { sendWelcomeEmail } = require('../services/email.service');
const { resolveAgency } = require('../db/gestionincidentes/agencies');
const { requireSessionAgency } = require('../utils/requestAgency');
const giUsers = require('../db/gestionincidentes/users');

function mapOperator(r) {
  return {
    id: r.id,
    username: r.username || r.id,
    name: r.name,
    primerNombre: r.primer_nombre || '',
    segundoNombre: r.segundo_nombre || '',
    primerApellido: r.primer_apellido || '',
    segundoApellido: r.segundo_apellido || '',
    email: r.email,
    telefono: r.telefono || '',
    agency: r.agency_code || '',
    agencyName: r.agency_name || '',
    role: r.role_name,
    status: r.status,
  };
}

function buildDisplayName(body) {
  return [body.primerNombre, body.segundoNombre, body.primerApellido, body.segundoApellido]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
}

function assertRequiredNames(body) {
  if (!String(body.primerNombre || '').trim()) {
    throw new HttpError(400, 'Primer nombre es requerido');
  }
  if (!String(body.primerApellido || '').trim()) {
    throw new HttpError(400, 'Primer apellido es requerido');
  }
}

exports.list = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  const rows = await giUsers.listOperators(agencyCode);
  res.json(rows.map(mapOperator));
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  assertRequiredNames(b);

  if (!b.email || !b.role) {
    throw new HttpError(400, 'email y role son requeridos');
  }

  // Tenant = agencia de la sesión; el cliente no puede crear usuarios en otra agencia.
  const agencyCode = requireSessionAgency(req);
  const agency = await resolveAgency(agencyCode);
  if (!agency) throw new HttpError(400, `Agencia no encontrada: ${agencyCode}`);

  const roleId = await giUsers.findRoleIdByName(b.role, agencyCode);
  if (!roleId) throw new HttpError(400, `Rol no encontrado: ${b.role}`);

  const displayName = buildDisplayName(b);
  let loginId = String(b.username || '').trim();
  if (!loginId) {
    loginId = await generateUniqueUsername(`${b.primerNombre} ${b.primerApellido}`);
  }
  loginId = loginId.toUpperCase();

  const email = b.email.trim().toLowerCase();

  if (await giUsers.emailExists(email, agencyCode)) {
    throw new HttpError(409, 'Ya existe un usuario con ese correo en esta agencia');
  }
  if (await giUsers.usernameExists(loginId, agencyCode)) {
    throw new HttpError(409, 'El nombre de usuario ya existe en esta agencia');
  }
  if (!b.password) {
    throw new HttpError(400, 'La contraseña es requerida');
  }

  const check = validatePassword(b.password);
  if (!check.ok) {
    throw new HttpError(400, check.errors.join(' '));
  }

  await giUsers.createOperator({
    id: loginId,
    primerNombre: b.primerNombre,
    segundoNombre: b.segundoNombre,
    primerApellido: b.primerApellido,
    segundoApellido: b.segundoApellido,
    email,
    telefono: b.telefono,
    passwordHash: b.password,
    roleId,
    agencyCode,
    status: b.status || 'Activo',
  });

  sendWelcomeEmail({
    to: email,
    name: displayName,
    username: loginId,
    password: b.password,
    agencyName: agency.name,
    agencyCode: agency.code,
    role: b.role,
    telefono: b.telefono,
  }).catch((err) => logger.warn('[MAIL] No se pudo enviar correo de bienvenida:', err.message));

  const user = await giUsers.findUserById(loginId, agencyCode);
  await writeAdminLog(
    req.user,
    'Creación de Operador',
    `Se creó el operador ${displayName} (${loginId})`,
    req,
    { tablaAfectada: 'usuarios' },
  );
  res.status(201).json(mapOperator(user));
});

function isSelfUser(jwtUser, operatorId, existingUser = null) {
  if (!jwtUser) return false;
  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase();
  const targetId = normalize(operatorId);
  const sub = normalize(jwtUser.sub);
  const username = normalize(jwtUser.username);
  const email = normalize(jwtUser.email);
  const bareSub = sub.startsWith('ldap:') ? sub.slice(5) : sub;
  const existingId = normalize(existingUser?.id);
  const existingUserName = normalize(existingUser?.username);
  const existingEmail = normalize(existingUser?.email);

  if (targetId && (targetId === sub || targetId === bareSub || targetId === username)) return true;
  if (existingId && (existingId === sub || existingId === bareSub || existingId === username)) return true;
  if (existingUserName && (existingUserName === sub || existingUserName === bareSub || existingUserName === username)) {
    return true;
  }
  if (email && existingEmail && email === existingEmail) return true;
  return false;
}

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const agencyCode = requireSessionAgency(req);
  const existing = await giUsers.findUserById(id, agencyCode);
  if (!existing) throw new HttpError(404, 'Operador no encontrado');

  const nextStatus = b.status != null ? String(b.status).trim() : null;
  if (nextStatus && nextStatus !== existing.status && isSelfUser(req.user, id, existing)) {
    throw new HttpError(400, 'No puede cambiar el estado de su propio usuario.');
  }

  assertRequiredNames({
    primerNombre: b.primerNombre ?? existing.primer_nombre,
    primerApellido: b.primerApellido ?? existing.primer_apellido,
  });

  let roleId = null;
  if (b.role) {
    roleId = await giUsers.findRoleIdByName(b.role, agencyCode);
    if (!roleId) throw new HttpError(400, `Rol no encontrado: ${b.role}`);
  }

  await giUsers.updateOperator(id, {
    primerNombre: b.primerNombre,
    segundoNombre: b.segundoNombre,
    primerApellido: b.primerApellido,
    segundoApellido: b.segundoApellido,
    email: b.email,
    telefono: b.telefono,
    roleId,
    status: b.status,
    agencyCode,
  });

  const user = await giUsers.findUserById(id, agencyCode);
  await writeAdminLog(req.user, 'Actualización de Operador', `Se actualizó el operador ${id}`, req, {
    tablaAfectada: 'usuarios',
  });
  res.json(mapOperator(user));
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agencyCode = requireSessionAgency(req);
  const existing = await giUsers.findUserById(id, agencyCode);
  if (!existing) throw new HttpError(404, 'Operador no encontrado');
  if (isSelfUser(req.user, id, existing)) {
    throw new HttpError(400, 'No puede eliminar su propio usuario.');
  }
  const affected = await giUsers.deleteOperator(id, agencyCode);
  if (!affected) throw new HttpError(404, 'Operador no encontrado');
  await writeAdminLog(req.user, 'Eliminación de Operador', `Se eliminó el operador ${id}`, req, {
    tablaAfectada: 'usuarios',
  });
  res.status(204).send();
});

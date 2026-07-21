const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

const PERM_SELECT =
  'habilitado, puede_ver, puede_crear, puede_editar, puede_notificar, puede_exportar, req_habilitado, req_puede_ver, req_puede_crear, req_puede_editar, req_puede_notificar, req_puede_exportar';

const EMPTY_PERMISSION_ROW = {
  habilitado: 0,
  puede_ver: 0,
  puede_verIncidente: 0,
  puede_crear: 0,
  puede_editar: 0,
  puede_notificar: 0,
  puede_exportar: 0,
  req_habilitado: 0,
  req_puede_ver: 0,
  req_puede_verIncidente: 0,
  req_puede_crear: 0,
  req_puede_editar: 0,
  req_puede_notificar: 0,
  req_puede_exportar: 0,
};

function effectiveFlag(actual, required) {
  return !!(actual || required);
}

const VIEW_INCIDENT_NA_MODULES = new Set(['Reportes', 'Administración']);

function mapPermissionRowToApi(p) {
  const viewIncidentNA = VIEW_INCIDENT_NA_MODULES.has(p.module);
  return {
    module: p.module,
    enabled: effectiveFlag(p.habilitado, p.req_habilitado),
    locks: {
      enabled: !!p.req_habilitado,
      view: !!p.req_puede_ver,
      viewIncident: viewIncidentNA || !!p.req_puede_verIncidente,
      create: !!p.req_puede_crear,
      edit: !!p.req_puede_editar,
      notify: !!p.req_puede_notificar,
      export: !!p.req_puede_exportar,
    },
    actions: {
      view: effectiveFlag(p.puede_ver, p.req_puede_ver),
      viewIncident: viewIncidentNA
        ? false
        : effectiveFlag(p.puede_verIncidente, p.req_puede_verIncidente),
      create: effectiveFlag(p.puede_crear, p.req_puede_crear),
      edit: effectiveFlag(p.puede_editar, p.req_puede_editar),
      notify: !!p.puede_notificar,
      export: !!p.puede_exportar,
    },
  };
}

async function listRolesSimple(agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  if (!agency) return [];
  const [rows] = await pool.query(
    `SELECT ID_Rol AS id, Rol AS name, activo
     FROM roles
     WHERE UPPER(ID_Agencia) = ?
     ORDER BY Rol`,
    [agency],
  );
  return rows;
}

async function buildRolePermissions(agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  const [roles] = agency
    ? await pool.query(
        `SELECT ID_Rol AS id, Rol AS name, es_protegido AS protected
         FROM roles WHERE UPPER(ID_Agencia) = ? ORDER BY ID_Rol`,
        [agency],
      )
    : await pool.query(
        `SELECT ID_Rol AS id, Rol AS name, es_protegido AS protected FROM roles ORDER BY ID_Rol`,
      );
  const [modules] = await pool.query(`SELECT id, name FROM modules ORDER BY id`);
  const [perms] = agency
    ? await pool.query(`SELECT * FROM permisos_de_rol WHERE UPPER(id_agencia) = ?`, [agency])
    : await pool.query(`SELECT * FROM permisos_de_rol`);

  const permByRole = {};
  perms.forEach((p) => {
    if (!permByRole[p.id_rol]) {
      permByRole[p.id_rol] = {};
    }
    permByRole[p.id_rol][p.id_modulo] = p;
  });

  return roles.map((r) => ({
    id: r.id,
    role: r.name,
    protected: !!r.protected,
    permissions: modules.map((m) => {
      const row = permByRole[r.id]?.[m.id] || EMPTY_PERMISSION_ROW;
      return mapPermissionRowToApi({ ...row, module: m.name });
    }),
  }));
}

async function createRole(id, name, agencyCode) {
  if (!agencyCode) throw new Error('Agencia requerida');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`INSERT INTO roles (ID_Rol, Rol, ID_Agencia, Descripcion) VALUES (?,?,?,?)`, [
      id,
      name,
      normalizeAgencyCode(agencyCode),
      name,
    ]);
    const [modules] = await conn.query(`SELECT id, name FROM modules`);
    for (const m of modules) {
      const isDashOrInc = m.name === 'Dashboard' || m.name === 'Incidentes';
      await conn.query(
        `INSERT INTO permisos_de_rol
          (id_rol, id_agencia, id_modulo, habilitado, puede_ver, puede_verIncidente, puede_crear, puede_editar, puede_notificar, puede_exportar)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          normalizeAgencyCode(agencyCode),
          m.id,
          isDashOrInc ? 1 : 0,
          isDashOrInc ? 1 : 0,
          m.name === 'Incidentes' ? 1 : 0,
          0,
          0,
          0,
          0,
        ],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function permissionValues(p) {
  const viewIncidentNA = VIEW_INCIDENT_NA_MODULES.has(p.module);
  return [
    p.enabled ? 1 : 0,
    p.actions?.view ? 1 : 0,
    viewIncidentNA ? 0 : p.actions?.viewIncident ? 1 : 0,
    p.actions?.create ? 1 : 0,
    p.actions?.edit ? 1 : 0,
    p.actions?.notify ? 1 : 0,
    p.actions?.export ? 1 : 0,
  ];
}

async function loadRolePermissionContext(roleId) {
  const [modules] = await pool.query(`SELECT * FROM modules`);
  const modIdByName = Object.fromEntries(modules.map((m) => [m.name, m.id]));
  const [roleRow] = await pool.query(`SELECT ID_Agencia FROM roles WHERE ID_Rol = ? LIMIT 1`, [
    roleId,
  ]);
  const agency = normalizeAgencyCode(roleRow[0]?.ID_Agencia || '');
  if (!agency) throw new Error('Rol sin agencia');
  return { modIdByName, agency };
}

async function upsertRolePermission(conn, roleId, agency, modId, permission) {
  const [existing] = await conn.query(
    `SELECT id_permiso FROM permisos_de_rol WHERE id_rol = ? AND id_modulo = ? LIMIT 1`,
    [roleId, modId],
  );
  const vals = permissionValues(permission);
  if (existing.length) {
    await conn.query(
      `UPDATE permisos_de_rol
       SET habilitado=?, puede_ver=?, puede_verIncidente=?, puede_crear=?, puede_editar=?, puede_notificar=?, puede_exportar=?
       WHERE id_permiso = ?`,
      [...vals, existing[0].id_permiso],
    );
    return;
  }
  await conn.query(
    `INSERT INTO permisos_de_rol
      (id_rol, id_agencia, id_modulo, habilitado, puede_ver, puede_verIncidente, puede_crear, puede_editar, puede_notificar, puede_exportar)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [roleId, agency, modId, ...vals],
  );
}

async function updateRolePermissions(roleId, permissions) {
  const { modIdByName, agency } = await loadRolePermissionContext(roleId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of permissions) {
      const modId = modIdByName[p.module];
      if (!modId) continue;
      await upsertRolePermission(conn, roleId, agency, modId, p);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function roleExists(id, agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  if (agency) {
    const [rows] = await pool.query(
      `SELECT ID_Rol FROM roles WHERE ID_Rol = ? AND UPPER(ID_Agencia) = ?`,
      [id, agency],
    );
    return rows.length > 0;
  }
  const [rows] = await pool.query(`SELECT ID_Rol FROM roles WHERE ID_Rol = ?`, [id]);
  return rows.length > 0;
}

async function getPermissionsForRole(roleId, agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  if (!roleId || !agency) return [];

  const [modules] = await pool.query(`SELECT id, name FROM modules ORDER BY id`);
  const [perms] = await pool.query(
    `SELECT * FROM permisos_de_rol WHERE id_rol = ? AND UPPER(id_agencia) = ?`,
    [roleId, agency],
  );

  const permByModId = Object.fromEntries(perms.map((p) => [p.id_modulo, p]));

  return modules.map((m) => {
    const row = permByModId[m.id] || EMPTY_PERMISSION_ROW;
    return mapPermissionRowToApi({ ...row, module: m.name });
  });
}

async function checkRolePermission(roleId, agencyCode, moduleName, action = 'view') {
  const agency = normalizeAgencyCode(agencyCode);
  if (!roleId || !agency || !moduleName) return false;

  const [modules] = await pool.query(`SELECT id FROM modules WHERE name = ? LIMIT 1`, [moduleName]);
  if (!modules.length) return false;

  const [rows] = await pool.query(
    `SELECT * FROM permisos_de_rol
     WHERE id_rol = ? AND id_modulo = ? AND UPPER(id_agencia) = ?
     LIMIT 1`,
    [roleId, modules[0].id, agency],
  );

  const row = rows[0];
  if (!row) return false;

  const enabled = effectiveFlag(row.habilitado, row.req_habilitado);
  if (!enabled) return false;

  if (action === 'view') return effectiveFlag(row.puede_ver, row.req_puede_ver);
  if (action === 'viewIncident') {
    if (VIEW_INCIDENT_NA_MODULES.has(moduleName)) return false;
    return effectiveFlag(row.puede_verIncidente, row.req_puede_verIncidente);
  }
  if (action === 'create') return effectiveFlag(row.puede_crear, row.req_puede_crear);
  if (action === 'edit') return effectiveFlag(row.puede_editar, row.req_puede_editar);
  if (action === 'notify') return !!(row.puede_notificar || row.req_puede_notificar);
  if (action === 'export') return !!(row.puede_exportar || row.req_puede_exportar);
  return false;
}

module.exports = {
  listRolesSimple,
  buildRolePermissions,
  createRole,
  updateRolePermissions,
  roleExists,
  getPermissionsForRole,
  checkRolePermission,
};

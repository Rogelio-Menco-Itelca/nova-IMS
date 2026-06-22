const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

const EMPTY_PERMISSION_ROW = {
  habilitado: 0,
  puede_ver: 0,
  puede_crear: 0,
  puede_editar: 0,
  puede_archivar: 0,
};

function mapPermissionRowToApi(p) {
  return {
    module: p.module,
    enabled: !!p.habilitado,
    actions: {
      view: !!p.puede_ver,
      create: !!p.puede_crear,
      edit: !!p.puede_editar,
      delete: !!p.puede_archivar,
    },
  };
}

async function listRolesSimple(agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  if (!agency) return [];
  const [rows] = await pool.query(
    `SELECT ID_Rol AS id, Rol AS name
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
        `SELECT ID_Rol AS id, Rol AS name FROM roles WHERE UPPER(ID_Agencia) = ? ORDER BY ID_Rol`,
        [agency],
      )
    : await pool.query(`SELECT ID_Rol AS id, Rol AS name FROM roles ORDER BY ID_Rol`);
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
          (id_rol, id_agencia, id_modulo, habilitado, puede_ver, puede_crear, puede_editar, puede_archivar)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          id,
          normalizeAgencyCode(agencyCode),
          m.id,
          isDashOrInc ? 1 : 0,
          isDashOrInc ? 1 : 0,
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
  return [
    p.enabled ? 1 : 0,
    p.actions?.view ? 1 : 0,
    p.actions?.create ? 1 : 0,
    p.actions?.edit ? 1 : 0,
    p.actions?.delete ? 1 : 0,
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
       SET habilitado=?, puede_ver=?, puede_crear=?, puede_editar=?, puede_archivar=?
       WHERE id_permiso = ?`,
      [...vals, existing[0].id_permiso],
    );
    return;
  }
  await conn.query(
    `INSERT INTO permisos_de_rol
      (id_rol, id_agencia, id_modulo, habilitado, puede_ver, puede_crear, puede_editar, puede_archivar)
     VALUES (?,?,?,?,?,?,?,?)`,
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

async function deleteRole(id) {
  const [r] = await pool.query(`DELETE FROM roles WHERE ID_Rol = ?`, [id]);
  return r.affectedRows;
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

module.exports = {
  listRolesSimple,
  buildRolePermissions,
  createRole,
  updateRolePermissions,
  deleteRole,
  roleExists,
};

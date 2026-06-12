const { pool } = require('../../config/db');
const { normalizeAgencyCode } = require('./maps');

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

async function buildRolePermissions() {
  const [roles] = await pool.query(`SELECT ID_Rol AS id, Rol AS name FROM roles ORDER BY ID_Rol`);
  const [modules] = await pool.query(`SELECT id, name FROM modules ORDER BY id`);
  const [perms] = await pool.query(`SELECT * FROM permisos_de_rol`);

  const permByRole = {};
  perms.forEach((p) => {
    if (!permByRole[p.id_rol]) {
      permByRole[p.id_rol] = {};
    }
    permByRole[p.id_rol][p.module_id] = p;
  });

  return roles.map((r) => ({
    id: r.id,
    role: r.name,
    permissions: modules.map((m) => {
      const p = permByRole[r.id]?.[m.id] || {
        enabled: 0,
        can_view: 0,
        can_create: 0,
        can_edit: 0,
        can_delete: 0,
      };
      return {
        module: m.name,
        enabled: !!p.enabled,
        actions: {
          view: !!p.can_view,
          create: !!p.can_create,
          edit: !!p.can_edit,
          delete: !!p.can_delete,
        },
      };
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
          (id_rol, ID_Agencia, module_id, enabled, can_view, can_create, can_edit, can_delete)
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

async function updateRolePermissions(roleId, permissions) {
  const [modules] = await pool.query(`SELECT * FROM modules`);
  const modIdByName = Object.fromEntries(modules.map((m) => [m.name, m.id]));
  const [roleRow] = await pool.query(`SELECT ID_Agencia FROM roles WHERE ID_Rol = ? LIMIT 1`, [
    roleId,
  ]);
  const agency = normalizeAgencyCode(roleRow[0]?.ID_Agencia || '');
  if (!agency) throw new Error('Rol sin agencia');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of permissions) {
      const modId = modIdByName[p.module];
      if (!modId) continue;
      const [existing] = await conn.query(
        `SELECT id_permiso FROM permisos_de_rol WHERE id_rol = ? AND module_id = ? LIMIT 1`,
        [roleId, modId],
      );
      const vals = [
        p.enabled ? 1 : 0,
        p.actions?.view ? 1 : 0,
        p.actions?.create ? 1 : 0,
        p.actions?.edit ? 1 : 0,
        p.actions?.delete ? 1 : 0,
      ];
      if (existing.length) {
        await conn.query(
          `UPDATE permisos_de_rol SET enabled=?, can_view=?, can_create=?, can_edit=?, can_delete=?
           WHERE id_permiso = ?`,
          [...vals, existing[0].id_permiso],
        );
      } else {
        await conn.query(
          `INSERT INTO permisos_de_rol
            (id_rol, ID_Agencia, module_id, enabled, can_view, can_create, can_edit, can_delete)
           VALUES (?,?,?,?,?,?,?,?)`,
          [roleId, agency, modId, ...vals],
        );
      }
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

async function roleExists(id) {
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

const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { nextId } = require('../utils/ids');

async function buildRolePermissions() {
  const [roles] = await pool.query(`SELECT * FROM roles ORDER BY id`);
  const [modules] = await pool.query(`SELECT * FROM modules ORDER BY id`);
  const [perms] = await pool.query(`SELECT * FROM role_permissions`);

  const permByRole = {};
  perms.forEach(p => {
    (permByRole[p.role_id] = permByRole[p.role_id] || {})[p.module_id] = p;
  });

  return roles.map(r => ({
    id: r.id,
    role: r.name,
    permissions: modules.map(m => {
      const p = permByRole[r.id]?.[m.id] || { enabled:0, can_view:0, can_create:0, can_edit:0, can_delete:0 };
      return {
        module: m.name,
        enabled: !!p.enabled,
        actions: {
          view:   !!p.can_view,
          create: !!p.can_create,
          edit:   !!p.can_edit,
          delete: !!p.can_delete,
        },
      };
    }),
  }));
}

// GET /api/roles
exports.list = asyncHandler(async (req, res) => {
  res.json(await buildRolePermissions());
});

// POST /api/roles  { role } -> crea rol nuevo con permisos mínimos
exports.create = asyncHandler(async (req, res) => {
  const name = (req.body || {}).role || req.body?.name;
  if (!name) throw new HttpError(400, 'role (nombre) requerido');

  const id = await nextId('roles', 'id', 'RP', 1);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO roles (id, name, is_system) VALUES (?,?,0)`, [id, name]);

    const [modules] = await conn.query(`SELECT id, name FROM modules`);
    for (const m of modules) {
      const isDashOrInc = m.name === 'Dashboard' || m.name === 'Incidentes';
      await conn.query(
        `INSERT INTO role_permissions (role_id, module_id, enabled, can_view, can_create, can_edit, can_delete)
         VALUES (?,?,?,?,0,0,0)`,
        [id, m.id, isDashOrInc ? 1 : 0, isDashOrInc ? 1 : 0]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }

  res.status(201).json(await buildRolePermissions());
});

// PUT /api/roles/:id   body: { permissions: [{module, enabled, actions:{view,create,edit,delete}}, ...] }
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body || {};
  if (!Array.isArray(permissions)) throw new HttpError(400, 'permissions[] requerido');

  const [roles] = await pool.query(`SELECT id FROM roles WHERE id = ?`, [id]);
  if (!roles.length) throw new HttpError(404, 'Rol no encontrado');

  const [modules] = await pool.query(`SELECT * FROM modules`);
  const modIdByName = Object.fromEntries(modules.map(m => [m.name, m.id]));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of permissions) {
      const modId = modIdByName[p.module];
      if (!modId) continue;
      await conn.query(
        `INSERT INTO role_permissions
           (role_id, module_id, enabled, can_view, can_create, can_edit, can_delete)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           enabled=VALUES(enabled),
           can_view=VALUES(can_view),
           can_create=VALUES(can_create),
           can_edit=VALUES(can_edit),
           can_delete=VALUES(can_delete)`,
        [id, modId,
         p.enabled ? 1 : 0,
         p.actions?.view ? 1 : 0,
         p.actions?.create ? 1 : 0,
         p.actions?.edit ? 1 : 0,
         p.actions?.delete ? 1 : 0]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }

  res.json(await buildRolePermissions());
});

// DELETE /api/roles/:id (bloquea roles del sistema)
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(`SELECT is_system FROM roles WHERE id = ?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Rol no encontrado');
  if (rows[0].is_system) throw new HttpError(400, 'No se puede eliminar un rol del sistema');

  await pool.query(`DELETE FROM roles WHERE id = ?`, [id]);
  res.status(204).send();
});

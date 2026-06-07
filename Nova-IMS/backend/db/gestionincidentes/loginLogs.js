const { pool } = require("../../config/db");
const logger = require("../../utils/logger");
const { normalizeAgencyCode } = require("./maps");

function truncate(value, max) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.substring(0, max);
}

async function insertLoginRecord({
  action,
  description,
  userId,
  agencyCode,
  roleId,
  rememberUser = false,
  status = "Pendiente",
}) {
  const agency = normalizeAgencyCode(agencyCode);
  const [result] = await pool.query(
    `INSERT INTO registro_logueos
      (Accion, Descripcion_accion, ID_Usuario, ID_Agencia, ID_Rol, IDAgencias,
       Recordar_usuario, Login_exitoso)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      truncate(action, 50) || "Inicio de sesión",
      truncate(description, 200),
      userId,
      agency,
      roleId,
      agency,
      rememberUser ? "Si" : "No",
      status,
    ],
  );
  return result.insertId;
}

async function updateLoginStatus(registroId, status, description = null) {
  if (!registroId) return;
  const params = [status];
  let sql = `UPDATE registro_logueos SET Login_exitoso = ?`;
  if (description) {
    sql += `, Descripcion_accion = ?`;
    params.push(truncate(description, 200));
  }
  sql += ` WHERE ID_registro = ?`;
  params.push(registroId);
  await pool.query(sql, params);
}

async function findPendingRegistro(userId, agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  const [rows] = await pool.query(
    `SELECT ID_registro
     FROM registro_logueos
     WHERE ID_Usuario = ? AND ID_Agencia = ? AND Login_exitoso = 'Pendiente'
     ORDER BY Fecha DESC
     LIMIT 1`,
    [userId, agency],
  );
  return rows[0]?.ID_registro || null;
}

async function insert2faRecord({
  action,
  userId,
  agencyCode,
  email,
  registroId,
}) {
  if (!registroId) return;
  const agency = normalizeAgencyCode(agencyCode);
  await pool.query(
    `INSERT INTO registrodobleautentificacion
      (accion, ID_Usuario, ID_Agencia, IDAgencias, Correo, ID_Registro)
     VALUES (?,?,?,?,?,?)`,
    [
      truncate(action, 200) || "Acción 2FA",
      userId,
      agency,
      agency,
      truncate(email, 100) || "sin-correo@local",
      registroId,
    ],
  );
}

async function safeLog(fn) {
  try {
    return await fn();
  } catch (err) {
    logger.error("[login-log]", err.message);
    return null;
  }
}

module.exports = {
  insertLoginRecord,
  updateLoginStatus,
  findPendingRegistro,
  insert2faRecord,
  safeLog,
};

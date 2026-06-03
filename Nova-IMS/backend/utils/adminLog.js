const { pool } = require("../config/db");
const { logId } = require("./ids");
const socket = require("../realtime/socket");
const { resolveDbUserId, sessionDisplayName } = require("./jwtUser");

async function writeAdminLog(jwtUser, action, details) {
  const id = logId("LOG");
  const userId = await resolveDbUserId(jwtUser);

  await pool.query(
    `INSERT INTO admin_logs (id, user_id, user_name, action, details) VALUES (?,?,?,?,?)`,
    [id, userId, sessionDisplayName(jwtUser), action, details],
  );

  const [rows] = await pool.query(`SELECT * FROM admin_logs WHERE id = ?`, [
    id,
  ]);
  socket.emit("admin:log", {
    id: rows[0].id,
    user: rows[0].user_name,
    action: rows[0].action,
    details: rows[0].details,
    timestamp: rows[0].created_at,
  });
}

module.exports = { writeAdminLog };

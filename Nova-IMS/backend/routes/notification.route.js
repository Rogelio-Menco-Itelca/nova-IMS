const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { resolveDbUserIdFromString } = require("../utils/jwtUser");

// Obtener notificaciones
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, u.name as triggered_by_name
      FROM notifications n
      LEFT JOIN users u ON n.triggered_by = u.id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({ error: "Error obteniendo notificaciones" });
  }
});

// Crear notificación
router.post("/", async (req, res) => {
  try {
    const { id, title, message, triggeredBy, incidentId } = req.body;
    const triggeredByDb = await resolveDbUserIdFromString(triggeredBy);

    await pool.query(
      `INSERT INTO notifications (id, incident_id, triggered_by, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [id, incidentId || null, triggeredByDb, title, message],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error creando notificación:", error);
    res.status(500).json({ error: "Error creando notificación" });
  }
});

// Marcar todas como leídas — soporta tanto PUT como PATCH
router.put("/read-all", markAllAsRead);
router.patch("/mark-all-read", markAllAsRead);

async function markAllAsRead(req, res) {
  try {
    const { userId } = req.body; // opcional: filtrar por usuario local en BD
    const userIdDb = await resolveDbUserIdFromString(userId);
    const query = userIdDb
      ? `UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND triggered_by = ?`
      : `UPDATE notifications SET is_read = 1 WHERE is_read = 0`;

    await pool.query(query, userIdDb ? [userIdDb] : []);
    res.json({ success: true });
  } catch (error) {
    console.error("Error actualizando notificaciones:", error);
    res.status(500).json({ error: "Error actualizando notificaciones" });
  }
}

module.exports = router;

const express = require("express");
const router = express.Router();
const path = require("path");
const { pool } = require("../config/db");
const socket = require("../realtime/socket");

// GET /location/share?request_id=XXX
router.get("/share", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/location-share.html"));
});

// POST /location/submit
router.post("/submit", async (req, res) => {
  const { request_id, lat, lng } = req.body || {};

  if (!request_id || typeof lat !== "number" || typeof lng !== "number") {
    return res
      .status(400)
      .json({ error: "request_id, lat y lng son requeridos" });
  }

  try {
    await pool.query(
      `UPDATE location_requests 
       SET received_lat=?, received_lng=?, received_at=NOW() 
       WHERE request_url LIKE ?`,
      [lat, lng, `%${request_id}%`],
    );

    const payload = {
      lat,
      lng,
      request_id,
      timestamp: Date.now(),
    };

    console.log("📡 EMITIENDO SOCKET:", payload);

    const io = socket.get();
    io.emit("location:received", payload);

    res.json({ ok: true });
  } catch (err) {
    console.error("[LOCATION] Error:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /location/requests/:id
router.get("/requests/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT id, phone, channel, request_url, received_lat, received_lng, received_at 
       FROM location_requests 
       WHERE id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Solicitud no encontrada",
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("[LOCATION] Error:", err.message);

    res.status(500).json({
      error: "Error interno",
    });
  }
});

// GET /location/requests
router.get("/requests", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, phone, channel, request_url, received_lat, received_lng, received_at 
       FROM location_requests 
       ORDER BY received_at DESC`,
    );

    res.json(rows);
  } catch (err) {
    console.error("[LOCATION] Error:", err.message);

    res.status(500).json({
      error: "Error interno",
    });
  }
});

module.exports = router;

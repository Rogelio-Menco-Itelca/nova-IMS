const { pool } = require("../config/db");
const HttpError = require("../utils/HttpError");
const asyncHandler = require("../utils/asyncHandler");
const socket = require("../realtime/socket");
const { resolveDbUserId } = require("../utils/jwtUser");

// POST /api/location-requests  { phone, channel: 'whatsapp'|'sms' }
exports.create = asyncHandler(async (req, res) => {
  const { phone, channel, incident_id } = req.body || {};
  if (!phone || !["whatsapp", "sms"].includes(channel)) {
    throw new HttpError(400, "phone y channel (whatsapp|sms) son requeridos");
  }
  const clean = String(phone).replace(/\D/g, "");
  const requestId = Date.now();
  const requestUrl = `http://localhost:3000/location/share?request_id=${requestId}`;
  const requestedBy = await resolveDbUserId(req.user);

  const [result] = await pool.query(
    `INSERT INTO location_requests (phone, channel, request_url, requested_by, incident_id)
     VALUES (?,?,?,?,?)`,
    [clean, channel, requestUrl, requestedBy, incident_id],
  );

  res.status(201).json({
    id: result.insertId,
    phone: clean,
    channel,
    requestUrl,
  });
});

// POST /api/location-requests/:id/received  { lat, lng }
exports.receive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpError(400, "lat/lng numéricos requeridos");
  }
  await pool.query(
    `UPDATE location_requests SET received_lat=?, received_lng=?, received_at=NOW() WHERE id=?`,
    [lat, lng, id],
  );

  const [rows] = await pool.query(
    `SELECT * FROM location_requests WHERE id = ?`,
    [id],
  );
  if (!rows.length) throw new HttpError(404, "Solicitud no encontrada");

  const payload = {
    id: rows[0].id,
    lat: Number(rows[0].received_lat),
    lng: Number(rows[0].received_lng),
    phoneNumber: rows[0].phone,
    timestamp: Date.now(),
  };
  socket.emit("location:received", payload);
  res.json(payload);
});

// GET /api/location-requests
exports.list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, phone, channel, request_url AS requestUrl,
            received_lat AS lat, received_lng AS lng,
            received_at AS receivedAt, created_at AS createdAt
       FROM location_requests ORDER BY created_at DESC LIMIT 100`,
  );
  res.json(rows);
});

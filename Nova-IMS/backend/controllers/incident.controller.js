const { pool } = require("../config/db");
const HttpError = require("../utils/HttpError");
const asyncHandler = require("../utils/asyncHandler");
const { nextId, logId } = require("../utils/ids");
const socket = require("../realtime/socket");
const { sendIncidentNotification } = require("../services/email.service");
const {
  diffNewCommentEntries,
  truncateAuditText,
} = require("../utils/incidentNotes");
const {
  resolveDbUserId,
  sessionDisplayName,
} = require("../utils/jwtUser");

async function writeAudit(
  conn,
  { incidentId, user, action, changes, details },
) {
  const userId = await resolveDbUserId(user);
  await conn.query(
    `INSERT INTO audit_logs (id, incident_id, user_id, user_name, action, changes, details_json)
     VALUES (?,?,?,?,?,?,?)`,
    [
      logId("LOG"),
      incidentId,
      userId,
      sessionDisplayName(user),
      action,
      changes || null,
      details ? JSON.stringify(details) : null,
    ],
  );
}

function pickCoord(primary, fallback) {
  const p = primary != null && primary !== "" ? Number(primary) : NaN;
  const f = fallback != null && fallback !== "" ? Number(fallback) : NaN;
  const ok = (n) => Number.isFinite(n) && Math.abs(n) > 0.0001;
  if (ok(p)) return p;
  if (ok(f)) return f;
  return null;
}

function mapIncidentRow(r) {
  return {
    id: r.id,
    event_id: r.event_id || "",
    incident_type_id: r.incident_type_id || undefined,
    priority_id: r.priority || "",
    type: r.type_name || "",
    priority: r.priority,
    status: r.status,
    origin: r.origin || "",
    phone: r.phone || "",
    ani: r.ani || "",
    location: r.location || "",
    departmentId: r.departmentId ?? r.department_id ?? null,
    municipalityId: r.municipalityId ?? r.municipality_id ?? null,
    departmentName: r.departmentName || "",
    municipalityName: r.municipalityName || "",

    lat: pickCoord(r.received_lat, r.lat),
    lng: pickCoord(r.received_lng, r.lng),

    comments: r.comments || "",
    details: r.details || "",
    contactInfo: r.contact_info || undefined,
    locationPhoneNumber:
      r.location_phone_number || r.location_phone || undefined,
    operator: r.operator_name || "",
    timestamp: r.created_at,
    updatedAt: r.updated_at || r.created_at,
    involvedPeople: r.involvedPeople || [],
    involvedVehicles: r.involvedVehicles || [],
  };
}

function parseAuditDetailsJson(raw) {
  if (raw == null) return [];
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function loadIncidentAuditLogs(incidentId, reader = pool) {
  const [auditRows] = await reader.query(
    `SELECT id, user_name AS user, action, changes, details_json, created_at AS timestamp
       FROM audit_logs
      WHERE incident_id = ?
      ORDER BY created_at ASC, id ASC`,
    [incidentId],
  );
  return auditRows.map((r) => ({
    id: r.id,
    user: r.user,
    action: r.action,
    changes: r.changes || "",
    timestamp: r.timestamp,
    details: parseAuditDetailsJson(r.details_json),
  }));
}

/** Sin columna closed_at en BD por ahora; se infiere del historial de auditoría. */
function resolveClosedAt(incident, auditLogs) {
  if (incident.status !== "Cerrado") return null;
  for (let i = auditLogs.length - 1; i >= 0; i--) {
    const log = auditLogs[i];
    if (
      log.action?.includes("Cerrado") ||
      log.changes?.includes("→ Cerrado")
    ) {
      return log.timestamp;
    }
    for (const d of log.details || []) {
      if (d.field === "Estado" && d.new === "Cerrado") {
        return log.timestamp;
      }
    }
  }
  return incident.updatedAt || null;
}

function fmtAuditValue(val) {
  if (val == null || val === "") return "(vacío)";
  return String(val);
}

/** Teléfono desde el cual llegó ubicación por SMS/WhatsApp; si no aplica, N/A. */
function fmtLocationPhoneVitacora(val) {
  const v = String(val ?? "").trim();
  if (!v || v.toUpperCase() === "N/A") return "N/A";
  return v;
}

function locationPhoneAuditValue(val) {
  return fmtLocationPhoneVitacora(val);
}

function summarizePeople(list) {
  if (!list?.length) return "(ninguna)";
  return list.map((p) => p.name).filter(Boolean).join(", ");
}

function summarizeVehicles(list) {
  if (!list?.length) return "(ninguno)";
  return list
    .map((v) => {
      const plate = String(v?.plate || "").trim().toUpperCase();
      if (!plate) return "";
      const role = String(v?.role || "Vehículo Involucrado").trim();
      const color = String(v?.color || "").trim();
      const make = String(v?.make || "").trim();
      const model = String(v?.model || "").trim();
      const details = [role, make, model, color].filter(Boolean).join(" | ");
      return details ? `${plate} (${details})` : plate;
    })
    .filter(Boolean)
    .sort()
    .join(", ");
}

function isValidPlate(plate) {
  const normalized = String(plate || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{5,8}$/.test(normalized);
}

function plateCompareKey(plate) {
  return String(plate || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeVehicle(v) {
  const rawPlate = String(v?.plate || "").trim();
  return {
    plate: rawPlate.toUpperCase(),
    plateKey: plateCompareKey(rawPlate),
    role: String(v?.role || "").trim(),
    make: String(v?.make || "").trim(),
    model: String(v?.model || "").trim(),
    color: String(v?.color || "").trim(),
    details: String(v?.details || "").trim(),
  };
}

function vehiclesAuditFingerprint(list) {
  return (list || [])
    .map(normalizeVehicle)
    .filter((v) => v.plateKey)
    .map(
      (v) =>
        `${v.plateKey}|${v.role}|${v.make}|${v.model}|${v.color}|${v.details}`,
    )
    .join(";");
}

function appendVehicleAuditDetails(details, beforeVehicles = [], afterVehicles = []) {
  const beforeList = (beforeVehicles || [])
    .map(normalizeVehicle)
    .filter((v) => v.plateKey);
  const afterList = (afterVehicles || [])
    .map(normalizeVehicle)
    .filter((v) => v.plateKey);
  const usedAfter = new Set();
  const sameCount = beforeList.length === afterList.length && beforeList.length > 0;
  const tracked = [
    ["role", "Rol"],
    ["make", "Marca"],
    ["model", "Modelo"],
    ["color", "Color"],
    ["details", "Detalle"],
  ];

  for (let i = 0; i < beforeList.length; i++) {
    const before = beforeList[i];
    let matchedIdx = -1;

    if (sameCount && !usedAfter.has(i)) {
      matchedIdx = i;
    }
    if (matchedIdx < 0) {
      matchedIdx = afterList.findIndex(
        (v, idx) => !usedAfter.has(idx) && v.plateKey === before.plateKey,
      );
    }
    if (matchedIdx < 0) {
      matchedIdx = afterList.findIndex((_, idx) => !usedAfter.has(idx));
    }

    if (matchedIdx < 0) {
      details.push({
        field: `Vehículo (${before.plate})`,
        old: "Existente",
        new: "(eliminado)",
      });
      continue;
    }

    const after = afterList[matchedIdx];
    usedAfter.add(matchedIdx);
    const ref = after.plate || before.plate || `#${i + 1}`;

    if (before.plateKey !== after.plateKey) {
      details.push({
        field: `Placa (${before.plate})`,
        old: fmtAuditValue(before.plate),
        new: fmtAuditValue(after.plate),
      });
    }

    for (const [key, label] of tracked) {
      const oldVal = fmtAuditValue(before[key]);
      const newVal = fmtAuditValue(after[key]);
      if (oldVal !== newVal) {
        details.push({
          field: `${label} (${ref})`,
          old: oldVal,
          new: newVal,
        });
      }
    }
  }

  for (let j = 0; j < afterList.length; j++) {
    if (usedAfter.has(j)) continue;
    const v = afterList[j];
    details.push({
      field: `Vehículo (${v.plate})`,
      old: "(no existía)",
      new: "Agregado",
    });
  }
}

function appendCommentHistoryAudit(details, before, after) {
  const beforeComments = String(before.comments ?? "").trim();
  const afterComments = String(after.comments ?? "").trim();
  if (beforeComments === afterComments) return;

  const { added, bulkChanged } = diffNewCommentEntries(
    beforeComments,
    afterComments,
  );

  if (added.length) {
    for (const entry of added) {
      const when = entry.timestamp ? `${entry.timestamp}: ` : "";
      details.push({
        field: "Comentario agregado",
        old: "—",
        new: truncateAuditText(`${when}${entry.text}`),
      });
    }
    return;
  }

  if (bulkChanged) {
    details.push({
      field: "Historial de comentarios",
      old: "(contenido anterior)",
      new: "(actualizado)",
    });
  }
}

function buildAuditDetails(before, after) {
  const fields = [
    ["status", "Estado"],
    ["priority", "Prioridad"],
    ["type", "Tipo"],
    ["origin", "Origen"],
    ["phone", "Teléfono llamada"],
    ["location", "Ubicación"],
    ["departmentName", "Departamento (hecho)"],
    ["municipalityName", "Municipio (hecho)"],
  ];
  const details = [];
  for (const [key, label] of fields) {
    const oldVal = fmtAuditValue(before[key]);
    const newVal = fmtAuditValue(after[key]);
    if (oldVal !== newVal) details.push({ field: label, old: oldVal, new: newVal });
  }

  const locPhoneOld = locationPhoneAuditValue(before.locationPhoneNumber);
  const locPhoneNew = locationPhoneAuditValue(after.locationPhoneNumber);
  if (locPhoneOld !== locPhoneNew) {
    details.push({
      field: "Teléfono ubicación (SMS/WhatsApp)",
      old: locPhoneOld,
      new: locPhoneNew,
    });
  }

  appendCommentHistoryAudit(details, before, after);
  const peopleOld = summarizePeople(before.involvedPeople);
  const peopleNew = summarizePeople(after.involvedPeople);
  if (peopleOld !== peopleNew) {
    details.push({ field: "Personas involucradas", old: peopleOld, new: peopleNew });
  }
  appendVehicleAuditDetails(details, before.involvedVehicles, after.involvedVehicles);

  const vehFpBefore = vehiclesAuditFingerprint(before.involvedVehicles);
  const vehFpAfter = vehiclesAuditFingerprint(after.involvedVehicles);
  if (
    vehFpBefore !== vehFpAfter &&
    !details.some((d) =>
      /vehículo|placa|marca|modelo|color|rol|detalle/i.test(String(d.field || "")),
    )
  ) {
    details.push({
      field: "Vehículos involucrados",
      old: summarizeVehicles(before.involvedVehicles),
      new: summarizeVehicles(after.involvedVehicles),
    });
  }

  const coordOld = `${before.lat ?? ""}, ${before.lng ?? ""}`;
  const coordNew = `${after.lat ?? ""}, ${after.lng ?? ""}`;
  if (coordOld !== coordNew) {
    details.push({ field: "Coordenadas", old: coordOld, new: coordNew });
  }
  return details;
}

async function replaceInvolved(conn, incidentId, people = [], vehicles = []) {
  await conn.query(`DELETE FROM incident_people WHERE incident_id = ?`, [incidentId]);
  await conn.query(`DELETE FROM incident_vehicles WHERE incident_id = ?`, [incidentId]);

  for (const p of people) {
    if (!String(p.name || "").trim()) continue;
    const gender = p.gender || null;
    const personParams = [
      incidentId,
      p.id || null,
      p.name,
      p.role || "Testigo",
      p.contact || null,
      p.phone || null,
      p.documentId || null,
      p.documentType || null,
      gender,
      p.address || null,
      p.details || null,
    ];
    try {
      await conn.query(
        `INSERT INTO incident_people
           (incident_id, person_id, name, role, contact, phone, document_id, document_type,
            gender, address, details)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        personParams,
      );
    } catch (err) {
      if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
      await conn.query(
        `INSERT INTO incident_people
           (incident_id, person_id, name, role, contact, phone, document_id, document_type, address, details)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          incidentId,
          p.id || null,
          p.name,
          p.role || "Testigo",
          p.contact || null,
          p.phone || null,
          p.documentId || null,
          p.documentType || null,
          p.address || null,
          p.details || null,
        ],
      );
    }
  }

  for (const v of vehicles) {
    if (!String(v.plate || "").trim()) continue;
    await insertInvolvedVehicle(conn, incidentId, v);
  }
}

async function insertInvolvedVehicle(conn, incidentId, v) {
  const params = [
    incidentId,
    String(v.plate).trim(),
    v.role || "Vehículo Involucrado",
    v.make || null,
    v.model || null,
    v.color || null,
    v.details || null,
  ];
  try {
    await conn.query(
      `INSERT INTO incident_vehicles
         (incident_id, plate, role, make, model, color, details, incident_date)
       VALUES (?,?,?,?,?,?,?,?)`,
      [...params, new Date()],
    );
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
    await conn.query(
      `INSERT INTO incident_vehicles
         (incident_id, plate, role, make, model, color, details)
       VALUES (?,?,?,?,?,?,?)`,
      params,
    );
  }
}

async function hydrateRelations(rows, reader = pool) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const [people] = await reader.query(
    `SELECT ip.incident_id, ip.name, ip.role, ip.contact, ip.phone,
            ip.document_id AS documentId, ip.document_type AS documentType,
            ip.gender, ip.address, ip.details, ip.person_id AS id
       FROM incident_people ip
      WHERE ip.incident_id IN (${placeholders})`,
    ids,
  );

  const [vehicles] = await reader.query(
    `SELECT incident_id, plate, role, make, model, color, details,
            incident_date AS incidentDate
       FROM incident_vehicles
      WHERE incident_id IN (${placeholders})`,
    ids,
  );

  const peopleByInc = {};
  people.forEach((p) => {
    const { incident_id, ...rest } = p;
    (peopleByInc[incident_id] = peopleByInc[incident_id] || []).push(rest);
  });
  const vehByInc = {};
  vehicles.forEach((v) => {
    const { incident_id, ...rest } = v;
    (vehByInc[incident_id] = vehByInc[incident_id] || []).push(rest);
  });

  return rows.map((r) => ({
    ...r,
    departmentId: r.department_id ?? r.departmentId ?? null,
    municipalityId: r.municipality_id ?? r.municipalityId ?? null,
    departmentName: r.departmentName || "",
    municipalityName: r.municipalityName || "",
    involvedPeople: peopleByInc[r.id] || [],
    involvedVehicles: vehByInc[r.id] || [],
  }));
}

function incidentGeoParams(body) {
  const departmentId = body.departmentId ?? body.department_id ?? null;
  const municipalityId = body.municipalityId ?? body.municipality_id ?? null;
  return [
    departmentId != null && departmentId !== "" ? Number(departmentId) : null,
    municipalityId != null && municipalityId !== ""
      ? Number(municipalityId)
      : null,
  ];
}

const INCIDENT_GEO_SELECT = `
  i.department_id AS departmentId,
  i.municipality_id AS municipalityId,
  d.name AS departmentName,
  m.name AS municipalityName`;

const INCIDENT_GEO_JOINS = `
  LEFT JOIN departments d ON d.id = i.department_id
  LEFT JOIN municipalities m ON m.id = i.municipality_id`;

async function insertIncidentRow(conn, params) {
  const base = [
    params.id,
    params.event_id,
    params.incident_type_id,
    params.type_name,
    params.priority,
    params.status,
    params.origin,
    params.phone,
    params.ani,
    params.location,
    params.lat,
    params.lng,
    params.comments,
    params.details,
    params.contact_info,
    params.location_phone_number,
    params.operator_id,
    params.operator_name,
  ];
  const [departmentId, municipalityId] = incidentGeoParams(params);
  try {
    await conn.query(
      `INSERT INTO incidents
         (id, event_id, incident_type_id, type_name, priority, status, origin, phone, ani,
          location, lat, lng, comments, details, contact_info, location_phone_number,
          operator_id, operator_name, department_id, municipality_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [...base, departmentId, municipalityId],
    );
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
    await conn.query(
      `INSERT INTO incidents
         (id, event_id, incident_type_id, type_name, priority, status, origin, phone, ani,
          location, lat, lng, comments, details, contact_info, location_phone_number,
          operator_id, operator_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      base,
    );
  }
}

async function updateIncidentRow(conn, id, params) {
  const [departmentId, municipalityId] = incidentGeoParams(params);
  const base = [
    params.event_id,
    params.incident_type_id,
    params.type_name,
    params.priority,
    params.status,
    params.origin,
    params.phone,
    params.ani,
    params.location,
    params.lat,
    params.lng,
    params.comments,
    params.details,
    params.contact_info,
    params.location_phone_number,
    id,
  ];
  try {
    await conn.query(
      `UPDATE incidents SET
         event_id = ?,
         incident_type_id = ?,
         type_name = ?,
         priority = ?,
         status = ?,
         origin = ?,
         phone = ?,
         ani = ?,
         location = ?,
         lat = ?,
         lng = ?,
         comments = ?,
         details = ?,
         contact_info = ?,
         location_phone_number = ?,
         department_id = ?,
         municipality_id = ?
       WHERE id = ?`,
      [
        ...base.slice(0, -1),
        departmentId,
        municipalityId,
        id,
      ],
    );
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
    await conn.query(
      `UPDATE incidents SET
         event_id = ?,
         incident_type_id = ?,
         type_name = ?,
         priority = ?,
         status = ?,
         origin = ?,
         phone = ?,
         ani = ?,
         location = ?,
         lat = ?,
         lng = ?,
         comments = ?,
         details = ?,
         contact_info = ?,
         location_phone_number = ?
       WHERE id = ?`,
      base,
    );
  }
}

// ---------- endpoints ----------
// 🔹 GET /api/incidents
const list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      i.*,
      ${INCIDENT_GEO_SELECT},
      lr.received_lat,
      lr.received_lng,
      lr.received_at,
      lr.phone AS location_phone
    FROM incidents i
    ${INCIDENT_GEO_JOINS}
    LEFT JOIN location_requests lr ON lr.id = (
      SELECT id FROM location_requests
       WHERE incident_id = i.id
       ORDER BY received_at DESC, id DESC
       LIMIT 1
    )
    ORDER BY i.created_at DESC
    LIMIT 100
  `);

  const hydrated = await hydrateRelations(rows);
  res.json(hydrated.map(mapIncidentRow));
});

// 🔹 GET /api/incidents/:id
const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT 
      i.*,
      ${INCIDENT_GEO_SELECT},
      lr.received_lat,
      lr.received_lng,
      lr.received_at,
      lr.phone AS location_phone
    FROM incidents i
    ${INCIDENT_GEO_JOINS}
    LEFT JOIN location_requests lr
      ON lr.incident_id = i.id
    WHERE i.id = ?
    ORDER BY lr.received_at DESC
    LIMIT 1
  `,
    [req.params.id],
  );

  if (!rows.length) throw new HttpError(404, "Incidente no encontrado");

  const hydrated = await hydrateRelations(rows);
  res.json(mapIncidentRow(hydrated[0]));
});

// 🔹 POST /api/incidents
const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const id = b.id || (await nextId("incidents", "id", "INC"));
  const invalidVehicle = (b.involvedVehicles || []).find(
    (v) => String(v?.plate || "").trim() && !isValidPlate(v.plate),
  );
  if (invalidVehicle) {
    throw new HttpError(
      400,
      `Placa inválida: "${invalidVehicle.plate}". Use solo letras/números (5-8 caracteres).`,
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const operatorId = await resolveDbUserId(req.user);
    const operatorName =
      sessionDisplayName(req.user, b.operator || "Sistema");

    await insertIncidentRow(conn, {
      id,
      event_id: b.event_id || null,
      incident_type_id: b.incident_type_id || null,
      type_name: b.type || null,
      priority: b.priority || "Media",
      status: b.status || "Nuevo",
      origin: b.origin || null,
      phone: b.phone || null,
      ani: b.ani || null,
      location: b.location || null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      comments: b.comments || null,
      details: b.details || null,
      contact_info: null,
      location_phone_number: fmtLocationPhoneVitacora(b.locationPhoneNumber),
      operator_id: operatorId,
      operator_name: operatorName,
      departmentId: b.departmentId,
      municipalityId: b.municipalityId,
    });

    await replaceInvolved(
      conn,
      id,
      b.involvedPeople || [],
      b.involvedVehicles || [],
    );

    await writeAudit(conn, {
      incidentId: id,
      user: req.user,
      action: "Creación",
      changes: "Incidente creado",
    });

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(
    `SELECT i.*, ${INCIDENT_GEO_SELECT}
       FROM incidents i
       ${INCIDENT_GEO_JOINS}
      WHERE i.id = ?`,
    [id],
  );
  const hydrated = await hydrateRelations(rows);
  const inc = mapIncidentRow(hydrated[0]);

  socket.emit("incident:created", inc);
  res.status(201).json(inc);
});

// 🔹 PUT /api/incidents/:id
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const invalidVehicle = (b.involvedVehicles || []).find(
    (v) => String(v?.plate || "").trim() && !isValidPlate(v.plate),
  );
  if (invalidVehicle) {
    throw new HttpError(
      400,
      `Placa inválida: "${invalidVehicle.plate}". Use solo letras/números (5-8 caracteres).`,
    );
  }

  const [existing] = await pool.query(`SELECT * FROM incidents WHERE id = ?`, [id]);
  if (!existing.length) throw new HttpError(404, "Incidente no encontrado");

  const beforeHydrated = await hydrateRelations(existing);
  const before = mapIncidentRow(beforeHydrated[0]);
  const newStatus = b.status || before.status;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await updateIncidentRow(conn, id, {
      event_id: b.event_id || null,
      incident_type_id: b.incident_type_id || null,
      type_name: b.type || null,
      priority: b.priority || before.priority,
      status: newStatus,
      origin: b.origin ?? null,
      phone: b.phone ?? null,
      ani: b.ani ?? b.phone ?? null,
      location: b.location ?? null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      comments: b.comments ?? null,
      details: b.details ?? null,
      contact_info: null,
      location_phone_number: fmtLocationPhoneVitacora(b.locationPhoneNumber),
      departmentId: b.departmentId,
      municipalityId: b.municipalityId,
    });

    await replaceInvolved(
      conn,
      id,
      b.involvedPeople || [],
      b.involvedVehicles || [],
    );

    const [afterRows] = await conn.query(
      `SELECT i.*, ${INCIDENT_GEO_SELECT}
         FROM incidents i
         ${INCIDENT_GEO_JOINS}
        WHERE i.id = ?`,
      [id],
    );
    const afterHydrated = await hydrateRelations(afterRows, conn);
    const after = mapIncidentRow(afterHydrated[0]);

    const afterForAudit = {
      ...after,
      phone: b.phone ?? after.phone,
      location: b.location ?? after.location,
      departmentName: after.departmentName,
      municipalityName: after.municipalityName,
      locationPhoneNumber:
        b.locationPhoneNumber ?? after.locationPhoneNumber,
      involvedPeople: Array.isArray(b.involvedPeople)
        ? b.involvedPeople
        : after.involvedPeople,
      involvedVehicles: Array.isArray(b.involvedVehicles)
        ? b.involvedVehicles
        : after.involvedVehicles,
    };
    const details = buildAuditDetails(before, afterForAudit);
    const statusChanged = before.status !== newStatus;
    await writeAudit(conn, {
      incidentId: id,
      user: req.user,
      action: statusChanged
        ? `Cambio de estado → ${newStatus}`
        : details.length
          ? "Actualización"
          : "Guardado",
      changes: details.length
        ? `${details.length} campo(s) modificado(s)`
        : statusChanged
          ? `Estado: ${before.status} → ${newStatus}`
          : "Formulario guardado",
      details:
        details.length > 0
          ? details
          : statusChanged
            ? [
                {
                  field: "Estado",
                  old: fmtAuditValue(before.status),
                  new: fmtAuditValue(newStatus),
                },
              ]
            : [
                {
                  field: "Registro",
                  old: "—",
                  new: "Guardado sin cambios en campos principales",
                },
              ],
    });

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(`SELECT * FROM incidents WHERE id = ?`, [id]);
  const hydrated = await hydrateRelations(rows);
  const inc = mapIncidentRow(hydrated[0]);

  socket.emit("incident:updated", inc);
  res.json(inc);
});

// 🔹 GET /api/incidents/vehicle-lookup/:plate
const lookupVehicleByPlate = asyncHandler(async (req, res) => {
  const rawPlate = String(req.params.plate || "");
  const normalized = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) {
    throw new HttpError(400, "Placa requerida");
  }

  const [rows] = await pool.query(
    `SELECT
       iv.plate,
       iv.make,
       iv.model,
       iv.color,
       iv.incident_id AS incidentId
     FROM incident_vehicles iv
     JOIN incidents i ON i.id = iv.incident_id
     WHERE REPLACE(UPPER(iv.plate), '-', '') = ?
     ORDER BY i.created_at DESC, iv.id DESC
     LIMIT 1`,
    [normalized],
  );

  if (!rows.length) throw new HttpError(404, "Vehículo no encontrado");
  res.json(rows[0]);
});

// 🔹 DELETE /api/incidents/:id
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM incidents WHERE id = ?`, [id]);
  res.status(204).send();
});

// 🔹 POST /api/incidents/:id/send-email  { recipients: string[] }
const sendEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const raw = req.body?.recipients;
  if (!Array.isArray(raw) || !raw.length) {
    throw new HttpError(400, "Seleccione al menos un correo destinatario.");
  }

  const recipients = [
    ...new Set(
      raw
        .map((e) => String(e || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!recipients.length) {
    throw new HttpError(400, "Seleccione al menos un correo destinatario.");
  }

  const placeholders = recipients.map(() => "?").join(",");
  const [allowed] = await pool.query(
    `SELECT email FROM notification_emails WHERE email IN (${placeholders})`,
    recipients,
  );
  const allowedSet = new Set(allowed.map((r) => r.email.toLowerCase()));
  const invalid = recipients.filter((e) => !allowedSet.has(e));
  if (invalid.length) {
    throw new HttpError(
      400,
      `Correo(s) no autorizado(s): ${invalid.join(", ")}`,
    );
  }

  const [rows] = await pool.query(
    `SELECT
       i.*,
       lr.received_lat,
       lr.received_lng,
       lr.received_at,
       lr.phone AS location_phone
     FROM incidents i
     LEFT JOIN location_requests lr ON lr.id = (
       SELECT id FROM location_requests
        WHERE incident_id = i.id
        ORDER BY received_at DESC, id DESC
        LIMIT 1
     )
     WHERE i.id = ?`,
    [id],
  );
  if (!rows.length) throw new HttpError(404, "Incidente no encontrado");

  const hydrated = await hydrateRelations(rows);
  const incident = mapIncidentRow(hydrated[0]);

  const allAuditLogs = await loadIncidentAuditLogs(id);
  incident.closedAt = resolveClosedAt(incident, allAuditLogs);
  // En el correo solo el último movimiento del historial (vitácora resumida)
  incident.auditLogs =
    allAuditLogs.length > 0
      ? [allAuditLogs[allAuditLogs.length - 1]]
      : [];

  const result = await sendIncidentNotification({ to: recipients, incident });

  res.json({
    ok: true,
    incidentId: id,
    recipients,
    mode: result.mode,
    message:
      result.mode === "console"
        ? "Correo simulado en consola del servidor (SMTP no configurado)."
        : `Notificación enviada a ${recipients.length} destinatario(s).`,
  });
});

// 🔹 EXPORTS
module.exports = {
  list,
  getOne,
  create,
  update,
  lookupVehicleByPlate,
  remove,
  sendEmail,
};

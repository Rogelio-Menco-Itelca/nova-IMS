const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const socket = require('../realtime/socket');
const { sendIncidentNotification } = require('../services/email.service');
const { diffNewCommentEntries, truncateAuditText } = require('../utils/incidentNotes');
const { sessionDisplayName } = require('../utils/jwtUser');
const giIncidents = require('../db/gestionincidentes/incidents');

function pickCoord(primary, fallback) {
  const p = primary != null && primary !== '' ? Number(primary) : NaN;
  const f = fallback != null && fallback !== '' ? Number(fallback) : NaN;
  const ok = (n) => Number.isFinite(n) && Math.abs(n) > 0.0001;
  if (ok(p)) return p;
  if (ok(f)) return f;
  return null;
}

function mapIncidentRow(r) {
  return {
    id: r.id,
    event_id: r.event_id || '',
    incident_type_id: r.incident_type_id || undefined,
    priority_id: r.priority || '',
    type: r.type_name || r.type || '',
    priority: r.priority,
    status: r.status,
    origin: r.origin || '',
    phone: r.phone || '',
    ani: r.ani || '',
    location: r.location || '',
    departmentId: r.departmentId ?? r.department_id ?? null,
    municipalityId: r.municipalityId ?? r.municipality_id ?? null,
    departmentName: r.departmentName || '',
    municipalityName: r.municipalityName || '',
    lat: pickCoord(r.received_lat, r.lat),
    lng: pickCoord(r.received_lng, r.lng),
    comments: r.comments || '',
    details: r.details || '',
    contactInfo: r.contact_info || undefined,
    locationPhoneNumber: r.location_phone_number || r.location_phone || undefined,
    operator: r.operator_name || r.operator || '',
    timestamp: r.created_at || r.timestamp,
    updatedAt: r.updated_at || r.updatedAt || r.created_at || r.timestamp,
    involvedPeople: r.involvedPeople || [],
    involvedPlaces: r.involvedPlaces || [],
    involvedVehicles: r.involvedVehicles || [],
  };
}

function parseAuditDetailsJson(raw) {
  if (raw == null) return [];
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function loadIncidentAuditLogs(incidentId) {
  const auditRows = await giIncidents.loadAuditLogs(incidentId);
  return auditRows.map((r) => ({
    id: r.id,
    user: r.user_id || 'Sistema',
    action: r.action,
    changes: r.changes || '',
    timestamp: r.timestamp,
    details: parseAuditDetailsJson(r.details_json),
  }));
}

const CLOSED_INCIDENT_STATUSES = ['Cerrado', 'Cerrado con solución'];

function resolveClosedAt(incident, auditLogs) {
  if (!CLOSED_INCIDENT_STATUSES.includes(incident.status)) return null;
  for (let i = auditLogs.length - 1; i >= 0; i--) {
    const log = auditLogs[i];
    if (
      CLOSED_INCIDENT_STATUSES.some((s) => log.action?.includes(s)) ||
      CLOSED_INCIDENT_STATUSES.some((s) => log.changes?.includes(`→ ${s}`))
    ) {
      return log.timestamp;
    }
    for (const d of log.details || []) {
      if (d.field === 'Estado' && CLOSED_INCIDENT_STATUSES.includes(d.new)) {
        return log.timestamp;
      }
    }
  }
  return incident.updatedAt || null;
}

function fmtAuditValue(val) {
  if (val == null || val === '') return '(vacío)';
  return String(val);
}

function fmtLocationPhoneVitacora(val) {
  const v = String(val ?? '').trim();
  if (!v || v.toUpperCase() === 'N/A') return 'N/A';
  return v;
}

function locationPhoneAuditValue(val) {
  return fmtLocationPhoneVitacora(val);
}

function summarizePeople(list) {
  if (!list?.length) return '(ninguna)';
  return list
    .map((p) => p.name)
    .filter(Boolean)
    .join(', ');
}

function summarizeVehicles(list) {
  if (!list?.length) return '(ninguno)';
  return list
    .map((v) => {
      const plate = String(v?.plate || '')
        .trim()
        .toUpperCase();
      if (!plate) return '';
      const role = String(v?.role || 'Vehículo Involucrado').trim();
      const color = String(v?.color || '').trim();
      const make = String(v?.make || '').trim();
      const model = String(v?.model || '').trim();
      const details = [role, make, model, color].filter(Boolean).join(' | ');
      return details ? `${plate} (${details})` : plate;
    })
    .filter(Boolean)
    .sort()
    .join(', ');
}

function isValidPlate(plate) {
  const normalized = String(plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{5,8}$/.test(normalized);
}

function normalizeVehicle(v) {
  const rawPlate = String(v?.plate || '').trim();
  return {
    plate: rawPlate.toUpperCase(),
    plateKey: rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    role: String(v?.role || '').trim(),
    make: String(v?.make || '').trim(),
    model: String(v?.model || '').trim(),
    color: String(v?.color || '').trim(),
    details: String(v?.details || '').trim(),
  };
}

function vehiclesAuditFingerprint(list) {
  return (list || [])
    .map(normalizeVehicle)
    .filter((v) => v.plateKey)
    .map((v) => `${v.plateKey}|${v.role}|${v.make}|${v.model}|${v.color}|${v.details}`)
    .join(';');
}

function appendVehicleAuditDetails(details, beforeVehicles = [], afterVehicles = []) {
  const beforeList = (beforeVehicles || []).map(normalizeVehicle).filter((v) => v.plateKey);
  const afterList = (afterVehicles || []).map(normalizeVehicle).filter((v) => v.plateKey);
  const usedAfter = new Set();
  const sameCount = beforeList.length === afterList.length && beforeList.length > 0;
  const tracked = [
    ['role', 'Rol'],
    ['make', 'Marca'],
    ['model', 'Modelo'],
    ['color', 'Color'],
    ['details', 'Detalle'],
  ];

  for (let i = 0; i < beforeList.length; i++) {
    const before = beforeList[i];
    let matchedIdx = sameCount && !usedAfter.has(i) ? i : -1;
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
        old: 'Existente',
        new: '(eliminado)',
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
        details.push({ field: `${label} (${ref})`, old: oldVal, new: newVal });
      }
    }
  }
  for (let j = 0; j < afterList.length; j++) {
    if (usedAfter.has(j)) continue;
    details.push({
      field: `Vehículo (${afterList[j].plate})`,
      old: '(no existía)',
      new: 'Agregado',
    });
  }
}

function appendCommentHistoryAudit(details, before, after) {
  const beforeComments = String(before.comments ?? '').trim();
  const afterComments = String(after.comments ?? '').trim();
  if (beforeComments === afterComments) return;
  const { added, bulkChanged } = diffNewCommentEntries(beforeComments, afterComments);
  if (added.length) {
    for (const entry of added) {
      const when = entry.timestamp ? `${entry.timestamp}: ` : '';
      details.push({
        field: 'Comentario agregado',
        old: '—',
        new: truncateAuditText(`${when}${entry.text}`),
      });
    }
    return;
  }
  if (bulkChanged) {
    details.push({
      field: 'Historial de comentarios',
      old: '(contenido anterior)',
      new: '(actualizado)',
    });
  }
}

function buildAuditDetails(before, after) {
  const fields = [
    ['status', 'Estado'],
    ['priority', 'Prioridad'],
    ['type', 'Tipo'],
    ['origin', 'Origen'],
    ['phone', 'Teléfono llamada'],
    ['location', 'Ubicación'],
    ['departmentName', 'Departamento (hecho)'],
    ['municipalityName', 'Municipio (hecho)'],
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
      field: 'Teléfono ubicación (SMS/WhatsApp)',
      old: locPhoneOld,
      new: locPhoneNew,
    });
  }
  appendCommentHistoryAudit(details, before, after);
  const peopleOld = summarizePeople(before.involvedPeople);
  const peopleNew = summarizePeople(after.involvedPeople);
  if (peopleOld !== peopleNew) {
    details.push({ field: 'Personas involucradas', old: peopleOld, new: peopleNew });
  }
  appendVehicleAuditDetails(details, before.involvedVehicles, after.involvedVehicles);
  const vehFpBefore = vehiclesAuditFingerprint(before.involvedVehicles);
  const vehFpAfter = vehiclesAuditFingerprint(after.involvedVehicles);
  if (
    vehFpBefore !== vehFpAfter &&
    !details.some((d) =>
      /vehículo|placa|marca|modelo|color|rol|detalle/i.test(String(d.field || '')),
    )
  ) {
    details.push({
      field: 'Vehículos involucrados',
      old: summarizeVehicles(before.involvedVehicles),
      new: summarizeVehicles(after.involvedVehicles),
    });
  }
  const coordOld = `${before.lat ?? ''}, ${before.lng ?? ''}`;
  const coordNew = `${after.lat ?? ''}, ${after.lng ?? ''}`;
  if (coordOld !== coordNew) {
    details.push({ field: 'Coordenadas', old: coordOld, new: coordNew });
  }
  return details;
}

const list = asyncHandler(async (req, res) => {
  const rows = await giIncidents.listIncidents();
  res.json(rows.map(mapIncidentRow));
});

const getOne = asyncHandler(async (req, res) => {
  const inc = await giIncidents.getIncident(req.params.id);
  if (!inc) throw new HttpError(404, 'Incidente no encontrado');
  res.json(mapIncidentRow(inc));
});

const create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const invalidVehicle = (b.involvedVehicles || []).find(
    (v) => String(v?.plate || '').trim() && !isValidPlate(v.plate),
  );
  if (invalidVehicle) {
    throw new HttpError(
      400,
      `Placa inválida: "${invalidVehicle.plate}". Use solo letras/números (5-8 caracteres).`,
    );
  }

  const visibleId = await giIncidents.createIncident(
    {
      ...b,
      operator: sessionDisplayName(req.user, b.operator || 'Sistema'),
      locationPhoneNumber: fmtLocationPhoneVitacora(b.locationPhoneNumber),
    },
    req.user,
  );

  await giIncidents.writeAudit(pool, {
    incidentId: visibleId,
    user: req.user,
    action: 'Creación',
    changes: 'Incidente creado',
  });

  const inc = mapIncidentRow(await giIncidents.getIncident(visibleId));
  socket.emit('incident:created', inc);
  res.status(201).json(inc);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const invalidVehicle = (b.involvedVehicles || []).find(
    (v) => String(v?.plate || '').trim() && !isValidPlate(v.plate),
  );
  if (invalidVehicle) {
    throw new HttpError(
      400,
      `Placa inválida: "${invalidVehicle.plate}". Use solo letras/números (5-8 caracteres).`,
    );
  }

  const before = mapIncidentRow(await giIncidents.getIncident(id));
  if (!before.id) throw new HttpError(404, 'Incidente no encontrado');

  const newStatus = b.status || before.status;
  await giIncidents.updateIncident(
    id,
    {
      ...b,
      status: newStatus,
      locationPhoneNumber: fmtLocationPhoneVitacora(b.locationPhoneNumber),
    },
    req.user,
  );

  const after = mapIncidentRow(await giIncidents.getIncident(id));
  const afterForAudit = {
    ...after,
    phone: b.phone ?? after.phone,
    location: b.location ?? after.location,
    locationPhoneNumber: b.locationPhoneNumber ?? after.locationPhoneNumber,
    involvedPeople: Array.isArray(b.involvedPeople) ? b.involvedPeople : after.involvedPeople,
    involvedVehicles: Array.isArray(b.involvedVehicles)
      ? b.involvedVehicles
      : after.involvedVehicles,
  };
  const details = buildAuditDetails(before, afterForAudit);
  const statusChanged = before.status !== newStatus;

  await giIncidents.writeAudit(pool, {
    incidentId: id,
    user: req.user,
    action: statusChanged
      ? `Cambio de estado → ${newStatus}`
      : details.length
        ? 'Actualización'
        : 'Guardado',
    changes: details.length
      ? `${details.length} campo(s) modificado(s)`
      : statusChanged
        ? `Estado: ${before.status} → ${newStatus}`
        : 'Formulario guardado',
    details:
      details.length > 0
        ? details
        : statusChanged
          ? [{ field: 'Estado', old: fmtAuditValue(before.status), new: fmtAuditValue(newStatus) }]
          : [{ field: 'Registro', old: '—', new: 'Guardado sin cambios en campos principales' }],
  });

  socket.emit('incident:updated', after);
  res.json(after);
});

const lookupVehicleByPlate = asyncHandler(async (req, res) => {
  const normalized = String(req.params.plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!normalized) throw new HttpError(400, 'Placa requerida');
  const row = await giIncidents.lookupVehicleByPlate(normalized);
  if (!row) throw new HttpError(404, 'Vehículo no encontrado');
  res.json(row);
});

const remove = asyncHandler(async (req, res) => {
  const affected = await giIncidents.deleteIncident(req.params.id);
  if (!affected) throw new HttpError(404, 'Incidente no encontrado');
  res.status(204).send();
});

const sendEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const raw = req.body?.recipients;
  if (!Array.isArray(raw) || !raw.length) {
    throw new HttpError(400, 'Seleccione al menos un correo destinatario.');
  }
  const recipients = [
    ...new Set(
      raw
        .map((e) =>
          String(e || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
  const allowed = await giIncidents.emailAllowed(recipients);
  const invalid = recipients.filter((e) => !allowed.has(e));
  if (invalid.length) {
    throw new HttpError(400, `Correo(s) no autorizado(s): ${invalid.join(', ')}`);
  }

  const incRaw = await giIncidents.getIncident(id);
  if (!incRaw) throw new HttpError(404, 'Incidente no encontrado');
  const incident = mapIncidentRow(incRaw);
  const allAuditLogs = await loadIncidentAuditLogs(id);
  incident.closedAt = resolveClosedAt(incident, allAuditLogs);
  incident.auditLogs = allAuditLogs.length > 0 ? [allAuditLogs[allAuditLogs.length - 1]] : [];

  const result = await sendIncidentNotification({ to: recipients, incident });
  res.json({
    ok: true,
    incidentId: id,
    recipients,
    mode: result.mode,
    message:
      result.mode === 'console'
        ? 'Correo simulado en consola del servidor (SMTP no configurado).'
        : `Notificación enviada a ${recipients.length} destinatario(s).`,
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  lookupVehicleByPlate,
  remove,
  sendEmail,
};

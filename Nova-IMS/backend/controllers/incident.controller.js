const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const socket = require('../realtime/socket');
const { sendIncidentNotification } = require('../services/email.service');
const {
  appendVehicleAuditDetails,
  vehiclesAuditFingerprint,
} = require('../utils/incidentVehicleAudit');
const { sessionDisplayName } = require('../utils/jwtUser');
const giIncidents = require('../db/gestionincidentes/incidents');
const giVehicles = require('../db/gestionincidentes/vehicles');
const giLogs = require('../db/gestionincidentes/logs');
const { getCsjDashboardMetrics } = require('../db/gestionincidentes/dashboardMetrics');
const giMedidas = require('../db/gestionincidentes/medidas');
const comunicacion = require('../db/gestionincidentes/comunicacion');
const { requireSessionAgency } = require('../utils/requestAgency');

function pickCoord(primary, fallback) {
  const p = primary != null && primary !== '' ? Number(primary) : Number.NaN;
  const f = fallback != null && fallback !== '' ? Number(fallback) : Number.NaN;
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
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray(value.changes)) {
      return value.changes;
    }
    return [];
  } catch {
    return [];
  }
}

async function loadIncidentAuditLogs(incidentId) {
  const auditRows = await giIncidents.loadAuditLogs(incidentId);
  return auditRows.map((r) => ({
    id: r.id,
    user:
      giLogs.parseAuditActorFromDetails(r.details_json) || r.user_id || 'Sistema',
    action: r.action,
    changes: r.changes || '',
    timestamp: r.timestamp,
    details: parseAuditDetailsJson(r.details_json),
  }));
}

const CLOSED_INCIDENT_STATUSES = ['Cerrado', 'Cancelado', 'Resuelto'];

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
    .sort((a, b) => a.localeCompare(b))
    .join(', ');
}

function isValidPlate(plate) {
  const normalized = String(plate || '')
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{5,8}$/.test(normalized);
}

function resolveEmailResponseMessage(mode, destinatarios) {
  if (mode === 'console') {
    return `Correo simulado en consola del servidor (SMTP no configurado). Enviado a: ${destinatarios}`;
  }
  return `Enviado a: ${destinatarios}`;
}

function pickBodyArray(bodyValue, fallback) {
  return Array.isArray(bodyValue) ? bodyValue : fallback;
}

function resolveUpdateAuditAction(statusChanged, newStatus, detailsCount) {
  if (statusChanged) return `Cambio de estado → ${newStatus}`;
  if (detailsCount > 0) return 'Actualización';
  return 'Guardado';
}

function resolveUpdateAuditChanges(statusChanged, beforeStatus, newStatus, detailsCount) {
  if (detailsCount > 0) return `${detailsCount} campo(s) modificado(s)`;
  if (statusChanged) return `Estado: ${beforeStatus} → ${newStatus}`;
  return 'Formulario guardado';
}

function resolveUpdateAuditDetails(details, statusChanged, beforeStatus, newStatus) {
  if (details.length > 0) return details;
  if (statusChanged) {
    return [{ field: 'Estado', old: fmtAuditValue(beforeStatus), new: fmtAuditValue(newStatus) }];
  }
  return [{ field: 'Registro', old: '—', new: 'Guardado sin cambios en campos principales' }];
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

const dashboardMetrics = asyncHandler(async (_req, res) => {
  res.json(await getCsjDashboardMetrics());
});

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

  const actorName = sessionDisplayName(req.user, b.operator || 'Sistema');

  const visibleId = await giIncidents.createIncident(
    {
      ...b,
      operator: actorName,
      locationPhoneNumber: fmtLocationPhoneVitacora(b.locationPhoneNumber),
    },
    req.user,
  );

  await giIncidents.writeAudit(pool, {
    incidentId: visibleId,
    user: req.user,
    action: 'Creación',
    changes: 'Incidente creado',
    actorDisplayName: actorName,
  });

  const inc = mapIncidentRow(await giIncidents.getIncident(visibleId));
  inc.operator = actorName;
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

  const afterForAuditBase = mapIncidentRow(await giIncidents.getIncident(id));
  if (!afterForAuditBase.id) throw new HttpError(404, 'Incidente no encontrado');

  const afterForAudit = {
    ...afterForAuditBase,
    phone: b.phone ?? afterForAuditBase.phone,
    location: b.location ?? afterForAuditBase.location,
    locationPhoneNumber: b.locationPhoneNumber ?? afterForAuditBase.locationPhoneNumber,
    involvedPeople: pickBodyArray(b.involvedPeople, afterForAuditBase.involvedPeople),
    involvedVehicles: pickBodyArray(b.involvedVehicles, afterForAuditBase.involvedVehicles),
  };
  const details = buildAuditDetails(before, afterForAudit);
  const statusChanged = before.status !== newStatus;
  const actorName = sessionDisplayName(req.user, 'Sistema');

  if (statusChanged || details.length > 0) {
    await giIncidents.writeAudit(pool, {
      incidentId: id,
      user: req.user,
      action: resolveUpdateAuditAction(statusChanged, newStatus, details.length),
      changes: resolveUpdateAuditChanges(
        statusChanged,
        before.status,
        newStatus,
        details.length,
      ),
      details: resolveUpdateAuditDetails(details, statusChanged, before.status, newStatus),
      actorDisplayName: actorName,
    });
  }

  const after = mapIncidentRow(await giIncidents.getIncident(id));
  after.operator = actorName;

  socket.emit('incident:updated', after);
  res.json(after);
});

const lookupVehicleByPlate = asyncHandler(async (req, res) => {
  const normalized = giVehicles.normalizePlate(req.params.plate);
  if (!normalized || normalized.length < 5) {
    throw new HttpError(400, 'Placa inválida (mínimo 5 caracteres)');
  }
  const row = await giVehicles.lookupByPlate(normalized);
  if (!row) throw new HttpError(404, 'Vehículo no encontrado');
  res.json({
    plate: row.plate || normalized,
    make: row.make || '',
    model: row.model || '',
    color: row.color || '',
  });
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
  incident.latestComment = await giIncidents.loadLatestComment(incRaw.internal_id);

  const gestion = await giMedidas.getGestionByIncidente(id);
  incident.gestion = gestion;
  incident.medidasSeguridad = gestion?.ID_gestion
    ? await giMedidas.getMedidasByGestion(gestion.ID_gestion)
    : [];

  const result = await sendIncidentNotification({ to: recipients, incident });

  const agencyCode = requireSessionAgency(req);
  await comunicacion.safeLog(() =>
    comunicacion.logIncidentEmailCommunications({
      incidentInternalId: incRaw.internal_id,
      sessionUser: req.user,
      agencyCode,
      recipientEmails: recipients,
    }),
  );

  const destinatarios = recipients.join(', ');
  res.json({
    ok: true,
    incidentId: id,
    recipients,
    mode: result.mode,
    message: resolveEmailResponseMessage(result.mode, destinatarios),
  });
});

module.exports = {
  dashboardMetrics,
  list,
  getOne,
  create,
  update,
  lookupVehicleByPlate,
  remove,
  sendEmail,
};

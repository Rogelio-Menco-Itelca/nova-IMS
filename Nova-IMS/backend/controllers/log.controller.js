const asyncHandler = require('../utils/asyncHandler');
const giLogs = require('../db/gestionincidentes/logs');

function parseAuditPayload(raw) {
  if (raw == null) return null;
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function parseAuditDetails(raw) {
  const payload = parseAuditPayload(raw);
  if (!payload) return Array.isArray(raw) ? raw : [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.changes)) return payload.changes;
  return [];
}

function mapAuditLogRow(r) {
  const actorName = giLogs.parseAuditActorFromDetails(r.details_json);
  return {
    id: r.id,
    incidentId: r.incidentId,
    user: actorName || r.user,
    action: r.action,
    changes: r.changes || '',
    details: parseAuditDetails(r.details_json),
    timestamp: r.timestamp,
  };
}

exports.adminLogs = asyncHandler(async (req, res) => {
  res.json(await giLogs.listAdminLogs());
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const { incidentId } = req.query;
  let rows = await giLogs.listAuditLogs();
  if (incidentId) {
    rows = rows.filter((r) => r.incidentId === incidentId);
  }
  res.json(rows.map(mapAuditLogRow));
});

exports.usersAuditSummary = asyncHandler(async (req, res) => {
  res.json(await giLogs.listUsersWithActivitySummary());
});

exports.userActions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  res.json(await giLogs.listActionsByUser(userId));
});

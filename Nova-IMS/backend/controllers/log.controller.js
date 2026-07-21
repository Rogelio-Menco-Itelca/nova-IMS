const asyncHandler = require('../utils/asyncHandler');
const giLogs = require('../db/gestionincidentes/logs');
const { requireSessionAgency } = require('../utils/requestAgency');

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
  const agencyCode = requireSessionAgency(req);
  res.json(await giLogs.listAdminLogs(agencyCode));
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  const { incidentId } = req.query;
  let rows = await giLogs.listAuditLogs(agencyCode);
  if (incidentId) {
    rows = rows.filter((r) => r.incidentId === incidentId);
  }
  res.json(rows.map(mapAuditLogRow));
});

exports.usersAuditSummary = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  res.json(await giLogs.listUsersWithActivitySummary(agencyCode));
});

exports.userActions = asyncHandler(async (req, res) => {
  const agencyCode = requireSessionAgency(req);
  const { userId } = req.params;
  res.json(await giLogs.listActionsByUser(userId, agencyCode));
});

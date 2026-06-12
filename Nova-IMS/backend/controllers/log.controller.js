const asyncHandler = require('../utils/asyncHandler');
const giLogs = require('../db/gestionincidentes/logs');

function parseAuditDetails(raw) {
  if (raw == null) return [];
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.changes)) {
    return value.changes;
  }
  return [];
}

function mapAuditLogRow(r) {
  return {
    id: r.id,
    incidentId: r.incidentId,
    user: r.user,
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

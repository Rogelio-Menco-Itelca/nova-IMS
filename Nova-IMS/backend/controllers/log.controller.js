const asyncHandler = require('../utils/asyncHandler');
const giLogs = require('../db/gestionincidentes/logs');

function parseAuditDetailsField(raw) {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

function mapAuditLogRow(r) {
  return {
    id: r.id,
    incidentId: r.incidentId,
    user: r.user,
    action: r.action,
    changes: r.changes || '',
    details: parseAuditDetailsField(r.details_json),
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

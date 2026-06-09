const asyncHandler = require('../utils/asyncHandler');
const giLogs = require('../db/gestionincidentes/logs');

exports.adminLogs = asyncHandler(async (req, res) => {
  res.json(await giLogs.listAdminLogs());
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const { incidentId } = req.query;
  let rows = await giLogs.listAuditLogs();
  if (incidentId) {
    rows = rows.filter((r) => r.incidentId === incidentId);
  }
  res.json(
    rows.map((r) => ({
      id: r.id,
      incidentId: r.incidentId,
      user: r.user,
      action: r.action,
      changes: r.changes || '',
      details: r.details_json
        ? typeof r.details_json === 'string'
          ? JSON.parse(r.details_json)
          : r.details_json
        : undefined,
      timestamp: r.timestamp,
    })),
  );
});

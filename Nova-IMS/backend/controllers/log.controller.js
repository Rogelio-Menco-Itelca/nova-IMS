const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin-logs
exports.adminLogs = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, user_name AS user, action, details, created_at AS timestamp
       FROM admin_logs ORDER BY created_at DESC LIMIT 500`);
  res.json(rows);
});

// GET /api/audit-logs  (todos)
// GET /api/audit-logs?incidentId=INC-001
exports.auditLogs = asyncHandler(async (req, res) => {
  const { incidentId } = req.query;
  const sql = `SELECT id, incident_id AS incidentId, user_name AS user, action,
                      changes, details_json, created_at AS timestamp
                 FROM audit_logs
                 ${incidentId ? 'WHERE incident_id = ?' : ''}
                ORDER BY created_at DESC LIMIT 500`;
  const [rows] = await pool.query(sql, incidentId ? [incidentId] : []);
  res.json(rows.map(r => ({
    id: r.id,
    incidentId: r.incidentId,
    user: r.user,
    action: r.action,
    changes: r.changes || '',
    details: r.details_json ? (typeof r.details_json === 'string' ? JSON.parse(r.details_json) : r.details_json) : undefined,
    timestamp: r.timestamp,
  })));
});

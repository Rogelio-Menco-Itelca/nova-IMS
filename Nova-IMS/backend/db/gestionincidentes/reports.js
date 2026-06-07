const { pool } = require("../../config/db");
const { mapStatusFromGi, mapPriorityFromGi } = require("./maps");

const INCIDENT_REPORT_FROM = `
  FROM incidentes i
  JOIN eventos e ON e.ID_evento = i.ID_evento
  JOIN prioridades pr ON pr.ID_prioridad = i.ID_prioridad
  JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
  JOIN origen o ON o.ID_Origen = i.ID_Origen`;

async function summary(filters = {}) {
  const { from, to, status, type, priority, operator } = filters;

  const [[kpisRaw]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(es.Nombre_estado IN ('Cerrado')) AS resolved,
      SUM(es.Nombre_estado = 'Cancelado') AS cancelled,
      SUM(es.Nombre_estado NOT IN ('Cerrado','Cancelado')) AS active,
      SUM(pr.Prioridad = 'Alta') AS critical,
      SUM(pr.Prioridad = 'Alta') AS high
    ${INCIDENT_REPORT_FROM}
  `);

  const [byType] = await pool.query(`
    SELECT COALESCE(e.TipoEvento, 'Sin tipo') AS label, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    GROUP BY e.TipoEvento ORDER BY value DESC
  `);

  const [byStatusRaw] = await pool.query(`
    SELECT es.Nombre_estado AS label_raw, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    GROUP BY es.Nombre_estado ORDER BY value DESC
  `);
  const byStatus = byStatusRaw.map((r) => ({
    label: mapStatusFromGi(r.label_raw),
    value: r.value,
  }));

  const [byPriorityRaw] = await pool.query(`
    SELECT pr.Prioridad AS label_raw, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    GROUP BY pr.Prioridad
    ORDER BY FIELD(pr.Prioridad,'Alta','Media','Baja')
  `);
  const byPriority = byPriorityRaw.map((r) => ({
    label: mapPriorityFromGi(r.label_raw),
    value: r.value,
  }));

  const [byOperator] = await pool.query(`
    SELECT COALESCE(u.ID_Usuario, 'Sin asignar') AS label, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    LEFT JOIN personas p ON p.ID_incidente = i.ID_incidente
    LEFT JOIN usuarios u ON u.ID_Usuario = p.ID_Usuario AND u.ID_Agencia = p.ID_Agencia
    GROUP BY u.ID_Usuario ORDER BY value DESC LIMIT 10
  `);

  const [daily] = await pool.query(`
    SELECT DATE(i.FechaHora) AS day, COUNT(*) AS total,
           SUM(pr.Prioridad = 'Alta') AS critical
    ${INCIDENT_REPORT_FROM}
    WHERE i.FechaHora >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(i.FechaHora) ORDER BY day ASC
  `);

  const conditions = [];
  const params = [];
  if (from) {
    conditions.push("DATE(i.FechaHora) >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("DATE(i.FechaHora) <= ?");
    params.push(to);
  }
  if (status) {
    conditions.push("es.Nombre_estado = ?");
    params.push(status);
  }
  if (type) {
    conditions.push("e.TipoEvento = ?");
    params.push(type);
  }
  if (priority) {
    conditions.push("pr.Prioridad = ?");
    params.push(priority);
  }
  if (operator) {
    conditions.push("u.ID_Usuario LIKE ?");
    params.push(`%${operator}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [historyRaw] = await pool.query(
    `
    SELECT i.ID_visible AS id, e.TipoEvento AS type, pr.Prioridad AS priority_raw,
           es.Nombre_estado AS status_raw, o.Nombre AS origin, i.ANI AS phone,
           i.Direccion AS location, u.ID_Usuario AS operator,
           i.FechaHora AS timestamp, i.FechaHora AS updatedAt
    ${INCIDENT_REPORT_FROM}
    LEFT JOIN personas p ON p.ID_incidente = i.ID_incidente
    LEFT JOIN usuarios u ON u.ID_Usuario = p.ID_Usuario AND u.ID_Agencia = p.ID_Agencia
    ${where}
    ORDER BY i.FechaHora DESC LIMIT 500
  `,
    params,
  );

  const history = historyRaw.map((r) => ({
    id: r.id,
    type: r.type,
    priority: mapPriorityFromGi(r.priority_raw),
    status: mapStatusFromGi(r.status_raw),
    origin: r.origin,
    phone: r.phone,
    location: r.location,
    operator: r.operator || "Sin asignar",
    timestamp: r.timestamp,
    updatedAt: r.updatedAt,
  }));

  const [operatorActivity] = await pool.query(`
    SELECT usuarios_id AS operator, COUNT(*) AS actions,
           SUM(accion = 'Creación') AS created,
           SUM(accion = 'Actualización') AS updated
    FROM auditoria_incidente
    GROUP BY usuarios_id ORDER BY actions DESC LIMIT 10
  `);

  return {
    kpis: {
      total: Number(kpisRaw.total),
      resolved: Number(kpisRaw.resolved),
      cancelled: Number(kpisRaw.cancelled),
      active: Number(kpisRaw.active),
      critical: Number(kpisRaw.critical),
      high: Number(kpisRaw.high),
    },
    byType,
    byStatus,
    byPriority,
    byOperator,
    daily,
    operatorActivity,
    history,
  };
}

module.exports = { summary };

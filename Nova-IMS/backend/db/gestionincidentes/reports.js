const { pool } = require('../../config/db');
const { mapStatusFromGi, mapPriorityFromGi, normalizeAgencyCode } = require('./maps');

const INCIDENT_REPORT_FROM = `
  FROM incidentes i
  JOIN eventos e ON e.ID_evento = i.ID_evento
  JOIN prioridades pr ON pr.ID_prioridad = i.ID_prioridad
  JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
  JOIN origen o ON o.ID_Origen = i.ID_Origen`;

const OPERATOR_DISPLAY_JOIN = `
  LEFT JOIN personas p ON p.ID_incidente = i.ID_incidente
  LEFT JOIN usuarios u ON u.ID_Usuario = p.ID_Usuario AND u.ID_Agencia = p.ID_Agencia`;

const OPERATOR_FULL_NAME_SQL = `TRIM(CONCAT_WS(' ', u.Primer_Nombre, u.Segundo_Nombre, u.Primer_Apellido, u.Segundo_Apellido))`;
const OPERATOR_DISPLAY_SQL = `COALESCE(NULLIF(${OPERATOR_FULL_NAME_SQL}, ''), u.ID_Usuario)`;
const OPERATOR_MATCH_SQL = `(u.ID_Usuario LIKE ? OR ${OPERATOR_FULL_NAME_SQL} LIKE ?)`;

function agencyWhere(agencyCode) {
  const agency = normalizeAgencyCode(agencyCode);
  return {
    clause: 'UPPER(i.IDAgencias) = ?',
    agency,
  };
}

function buildScope(filters, agencyClause, agency) {
  const { from, to, status, type, priority, operator } = filters;
  const conditions = [agencyClause];
  const params = [agency];
  if (from) {
    conditions.push('DATE(i.FechaHora) >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('DATE(i.FechaHora) <= ?');
    params.push(to);
  }
  if (status) {
    conditions.push('es.Nombre_estado = ?');
    params.push(status);
  }
  if (type) {
    conditions.push('e.TipoEvento = ?');
    params.push(type);
  }
  if (priority) {
    conditions.push('pr.Prioridad = ?');
    params.push(priority);
  }
  if (operator) {
    const like = `%${operator}%`;
    conditions.push(`EXISTS (
      SELECT 1
      FROM personas p
      INNER JOIN usuarios u ON u.ID_Usuario = p.ID_Usuario AND u.ID_Agencia = p.ID_Agencia
      WHERE p.ID_incidente = i.ID_incidente AND ${OPERATOR_MATCH_SQL}
    )`);
    params.push(like, like);
  }
  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

async function summary(filters = {}) {
  const { agencyCode } = filters;
  if (!agencyCode) {
    throw new Error('agencyCode es requerido para reportes');
  }
  const { clause: agencyClause, agency } = agencyWhere(agencyCode);
  const { where, params } = buildScope(filters, agencyClause, agency);
  const dailyWhere = filters.from
    ? where
    : `${where} AND i.FechaHora >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;

  const [[kpisRaw]] = await pool.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(es.Nombre_estado IN ('Cerrado','Resuelto')) AS resolved,
      SUM(es.Nombre_estado = 'Cancelado') AS cancelled,
      SUM(es.Nombre_estado NOT IN ('Cerrado','Resuelto','Cancelado')) AS active,
      SUM(pr.Prioridad = 'Crítica') AS critical,
      SUM(pr.Prioridad = 'Alta') AS high
    ${INCIDENT_REPORT_FROM}
    ${where}
  `,
    params,
  );

  const [byType] = await pool.query(
    `
    SELECT COALESCE(e.TipoEvento, 'Sin tipo') AS label, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    ${where}
    GROUP BY e.TipoEvento ORDER BY value DESC
  `,
    params,
  );

  const [byStatusRaw] = await pool.query(
    `
    SELECT es.Nombre_estado AS label_raw, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    ${where}
    GROUP BY es.Nombre_estado ORDER BY value DESC
  `,
    params,
  );
  const byStatus = byStatusRaw.map((r) => ({
    label: mapStatusFromGi(r.label_raw),
    value: r.value,
  }));

  const [byPriorityRaw] = await pool.query(
    `
    SELECT pr.Prioridad AS label_raw, COUNT(*) AS value
    ${INCIDENT_REPORT_FROM}
    ${where}
    GROUP BY pr.Prioridad
    ORDER BY FIELD(pr.Prioridad,'Crítica','Alta','Media','Baja')
  `,
    params,
  );
  const byPriority = byPriorityRaw.map((r) => ({
    label: mapPriorityFromGi(r.label_raw),
    value: r.value,
  }));

  const [byOperator] = await pool.query(
    `
    SELECT COALESCE(ANY_VALUE(${OPERATOR_DISPLAY_SQL}), 'Sin asignar') AS label,
           COUNT(DISTINCT i.ID_incidente) AS value
    ${INCIDENT_REPORT_FROM}
    ${OPERATOR_DISPLAY_JOIN}
    ${where}
    GROUP BY u.ID_Usuario ORDER BY value DESC LIMIT 10
  `,
    params,
  );

  const [daily] = await pool.query(
    `
    SELECT DATE(i.FechaHora) AS day, COUNT(*) AS total,
           SUM(pr.Prioridad = 'Crítica') AS critical
    ${INCIDENT_REPORT_FROM}
    ${dailyWhere}
    GROUP BY DATE(i.FechaHora) ORDER BY day ASC
  `,
    params,
  );

  const [historyRaw] = await pool.query(
    `
    SELECT ANY_VALUE(i.ID_visible) AS id,
           ANY_VALUE(e.TipoEvento) AS type,
           ANY_VALUE(pr.Prioridad) AS priority_raw,
           ANY_VALUE(es.Nombre_estado) AS status_raw,
           ANY_VALUE(o.Nombre) AS origin,
           ANY_VALUE(i.ANI) AS phone,
           ANY_VALUE(i.Direccion) AS location,
           ANY_VALUE(${OPERATOR_DISPLAY_SQL}) AS operator,
           ANY_VALUE(i.FechaHora) AS timestamp,
           ANY_VALUE(i.FechaHora) AS updatedAt
    ${INCIDENT_REPORT_FROM}
    ${OPERATOR_DISPLAY_JOIN}
    ${where}
    GROUP BY i.ID_incidente
    ORDER BY MAX(i.FechaHora) DESC
    LIMIT 500
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
    operator: r.operator || 'Sin asignar',
    timestamp: r.timestamp,
    updatedAt: r.updatedAt,
  }));

  const [operatorActivity] = await pool.query(
    `
    SELECT a.usuarios_id AS operator, COUNT(*) AS actions,
           SUM(a.accion = 'Creación') AS created,
           SUM(a.accion = 'Actualización') AS updated
    FROM auditoria_incidente a
    INNER JOIN incidentes i ON i.ID_incidente = a.incidentes_id
    JOIN eventos e ON e.ID_evento = i.ID_evento
    JOIN prioridades pr ON pr.ID_prioridad = i.ID_prioridad
    JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
    ${where}
    GROUP BY a.usuarios_id ORDER BY actions DESC LIMIT 10
  `,
    params,
  );

  return {
    kpis: {
      total: Number(kpisRaw.total) || 0,
      resolved: Number(kpisRaw.resolved) || 0,
      cancelled: Number(kpisRaw.cancelled) || 0,
      active: Number(kpisRaw.active) || 0,
      critical: Number(kpisRaw.critical) || 0,
      high: Number(kpisRaw.high) || 0,
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

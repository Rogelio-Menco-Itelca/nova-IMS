const { pool } = require('../../config/db');

const CSJ_AGENCY = 'CSJ';

const STATUS_TARGETS = {
  GESTION: 'En gestión OSEG',
  PROTECCION: 'Medidas asignadas',
};

const INCIDENT_SCOPE_SQL = `(i.ID_visible IS NULL OR i.ID_visible NOT LIKE 'CAT-PERS-%')`;

function formatDurationSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds)));
  if (!Number.isFinite(seconds)) return null;
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 48) {
    return remMinutes > 0 ? `${hours} h ${remMinutes} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} d ${remHours} h` : `${days} d`;
}

function buildTimeMetric(row) {
  const sampleCount = Number(row?.sample_count ?? 0);
  const avgSecondsRaw = row?.avg_seconds == null ? null : Number(row.avg_seconds);
  const avgSeconds =
    sampleCount > 0 && Number.isFinite(avgSecondsRaw) && avgSecondsRaw >= 0 ? avgSecondsRaw : null;

  return {
    avgSeconds,
    formatted: avgSeconds == null ? null : formatDurationSeconds(avgSeconds),
    sampleCount,
  };
}

function statusReachedSql(alias) {
  return `(
    ${alias}.accion LIKE ?
    OR ${alias}.Numero_de_Cambios LIKE ?
    OR JSON_UNQUOTE(JSON_EXTRACT(${alias}.detalles, '$.changes[0].new')) = ?
    OR JSON_SEARCH(${alias}.detalles, 'one', ?, NULL, '$.changes[*].new') IS NOT NULL
  )`;
}

async function queryAverageTimeToStatus(statusLabel) {
  const actionPattern = `%→ ${statusLabel}`;
  const changesPattern = `%→ ${statusLabel}%`;

  const [[row]] = await pool.query(
    `
    SELECT
      AVG(TIMESTAMPDIFF(SECOND, i.FechaHora, st.first_at)) AS avg_seconds,
      COUNT(*) AS sample_count
    FROM incidentes i
    INNER JOIN (
      SELECT ai.incidentes_id, MIN(ai.fecha) AS first_at
      FROM auditoria_incidente ai
      WHERE ai.accion LIKE 'Cambio de estado%'
        AND ${statusReachedSql('ai')}
      GROUP BY ai.incidentes_id
    ) st ON st.incidentes_id = i.ID_incidente
    WHERE ${INCIDENT_SCOPE_SQL}
      AND UPPER(i.IDAgencias) = ?
      AND st.first_at >= i.FechaHora
    `,
    [actionPattern, changesPattern, statusLabel, statusLabel, CSJ_AGENCY],
  );

  return buildTimeMetric(row);
}

async function queryAverageTimeToProtection() {
  const statusLabel = STATUS_TARGETS.PROTECCION;
  const actionPattern = `%→ ${statusLabel}`;
  const changesPattern = `%→ ${statusLabel}%`;

  const [[row]] = await pool.query(
    `
    SELECT
      AVG(TIMESTAMPDIFF(SECOND, i.FechaHora, pt.protection_at)) AS avg_seconds,
      COUNT(*) AS sample_count
    FROM incidentes i
    INNER JOIN (
      SELECT base.incidentes_id, MIN(base.protection_at) AS protection_at
      FROM (
        SELECT gm.ID_incidente AS incidentes_id, im.fecha_asignacion AS protection_at
        FROM gestion_medidas gm
        INNER JOIN incidente_medidas im
          ON im.ID_gestion = gm.ID_gestion
         AND im.asignado = 1
         AND im.fecha_asignacion IS NOT NULL

        UNION ALL

        SELECT ai.incidentes_id, ai.fecha AS protection_at
        FROM auditoria_incidente ai
        WHERE ai.accion LIKE 'Cambio de estado%'
          AND ${statusReachedSql('ai')}
      ) base
      GROUP BY base.incidentes_id
    ) pt ON pt.incidentes_id = i.ID_incidente
    WHERE ${INCIDENT_SCOPE_SQL}
      AND UPPER(i.IDAgencias) = ?
      AND pt.protection_at >= i.FechaHora
    `,
    [actionPattern, changesPattern, statusLabel, statusLabel, CSJ_AGENCY],
  );

  return buildTimeMetric(row);
}

async function getCsjDashboardMetrics() {
  const [gestion, proteccion] = await Promise.all([
    queryAverageTimeToStatus(STATUS_TARGETS.GESTION),
    queryAverageTimeToProtection(),
  ]);

  return {
    agency: CSJ_AGENCY,
    gestion,
    proteccion,
  };
}

module.exports = {
  CSJ_AGENCY,
  STATUS_TARGETS,
  formatDurationSeconds,
  getCsjDashboardMetrics,
};

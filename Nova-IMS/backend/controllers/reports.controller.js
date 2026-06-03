const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/reports/summary
 * Devuelve todos los datos que necesita el módulo de reportes del frontend:
 *  - KPIs generales
 *  - Incidentes por tipo
 *  - Incidentes por estado
 *  - Incidentes por prioridad
 *  - Incidentes por operador
 *  - Evolución diaria (últimos 30 días)
 *  - Historial completo con filtros opcionales
 *    ?from=YYYY-MM-DD &to=YYYY-MM-DD &status= &type= &priority= &operator=
 */
exports.summary = asyncHandler(async (req, res) => {
  const { from, to, status, type, priority, operator } = req.query;

  // ------------------------------------------------------------------
  // 1. KPIs generales
  // ------------------------------------------------------------------
  const [[kpis]] = await pool.query(`
    SELECT
      COUNT(*)                                              AS total,
      SUM(status IN ('Resuelto','Cerrado'))                 AS resolved,
      SUM(status = 'Cancelado')                            AS cancelled,
      SUM(status NOT IN ('Resuelto','Cerrado','Cancelado')) AS active,
      SUM(priority = 'Crítica')                            AS critical,
      SUM(priority = 'Alta')                               AS high
    FROM incidents
  `);

  // ------------------------------------------------------------------
  // 2. Por tipo de incidente
  // ------------------------------------------------------------------
  const [byType] = await pool.query(`
    SELECT
      COALESCE(type_name, 'Sin tipo') AS label,
      COUNT(*)                        AS value
    FROM incidents
    GROUP BY type_name
    ORDER BY value DESC
  `);

  // ------------------------------------------------------------------
  // 3. Por estado
  // ------------------------------------------------------------------
  const [byStatus] = await pool.query(`
    SELECT status AS label, COUNT(*) AS value
    FROM incidents
    GROUP BY status
    ORDER BY value DESC
  `);

  // ------------------------------------------------------------------
  // 4. Por prioridad
  // ------------------------------------------------------------------
  const [byPriority] = await pool.query(`
    SELECT priority AS label, COUNT(*) AS value
    FROM incidents
    GROUP BY priority
    ORDER BY FIELD(priority,'Crítica','Alta','Media','Baja')
  `);

  // ------------------------------------------------------------------
  // 5. Por operador
  // ------------------------------------------------------------------
  const [byOperator] = await pool.query(`
    SELECT
      COALESCE(operator_name, 'Sin asignar') AS label,
      COUNT(*)                               AS value
    FROM incidents
    GROUP BY operator_name
    ORDER BY value DESC
    LIMIT 10
  `);

  // ------------------------------------------------------------------
  // 6. Evolución diaria últimos 30 días
  // ------------------------------------------------------------------
  const [daily] = await pool.query(`
    SELECT
      DATE(created_at)    AS day,
      COUNT(*)            AS total,
      SUM(priority='Crítica') AS critical
    FROM incidents
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `);

  // ------------------------------------------------------------------
  // 7. Historial filtrado
  // ------------------------------------------------------------------
  const conditions = [];
  const params     = [];

  if (from)     { conditions.push('DATE(created_at) >= ?'); params.push(from); }
  if (to)       { conditions.push('DATE(created_at) <= ?'); params.push(to); }
  if (status)   { conditions.push('status = ?');            params.push(status); }
  if (type)     { conditions.push('type_name = ?');         params.push(type); }
  if (priority) { conditions.push('priority = ?');          params.push(priority); }
  if (operator) { conditions.push('operator_name LIKE ?');  params.push(`%${operator}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [history] = await pool.query(`
    SELECT
      i.id,
      i.type_name        AS type,
      i.priority,
      i.status,
      i.origin,
      i.phone,
      i.location,
      i.operator_name    AS operator,
      i.created_at       AS timestamp,
      i.updated_at       AS updatedAt
    FROM incidents i
    ${where}
    ORDER BY i.created_at DESC
    LIMIT 500
  `, params);

  // ------------------------------------------------------------------
  // 8. Actividad por operador (audit_logs)
  // ------------------------------------------------------------------
  const [operatorActivity] = await pool.query(`
    SELECT
      user_name AS operator,
      COUNT(*)  AS actions,
      SUM(action = 'Creación')      AS created,
      SUM(action = 'Actualización') AS updated
    FROM audit_logs
    GROUP BY user_name
    ORDER BY actions DESC
    LIMIT 10
  `);

  res.json({
    kpis: {
      total:     Number(kpis.total),
      resolved:  Number(kpis.resolved),
      cancelled: Number(kpis.cancelled),
      active:    Number(kpis.active),
      critical:  Number(kpis.critical),
      high:      Number(kpis.high),
    },
    byType,
    byStatus,
    byPriority,
    byOperator,
    daily,
    operatorActivity,
    history,
  });
});

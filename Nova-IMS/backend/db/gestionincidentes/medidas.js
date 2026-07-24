const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { WORKFLOW_RANK_CSJ } = require('./transitions');

function nullIfEmpty(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function pickText(bodyVal, prevVal) {
  const cleaned = nullIfEmpty(bodyVal);
  if (cleaned !== null) return cleaned;
  return nullIfEmpty(prevVal);
}

function pickInt(bodyVal, prevVal) {
  const raw = bodyVal !== undefined && bodyVal !== null && bodyVal !== '' ? bodyVal : null;
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  if (prevVal !== null && prevVal !== undefined && String(prevVal).trim() !== '') {
    const n = Number(prevVal);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function resolveServidorJudicial(incidenteId) {
  const [rows] = await pool.query(
    `SELECT p.Primer_Nombre, p.Segundo_Nombre, p.Primer_Apellido, p.Segundo_Apellido,
            p.Numero_documento AS cedula, rp.Nombre AS cargo
     FROM personas p
     LEFT JOIN rolpersonas rp ON rp.ID_RolP = p.ID_RolP
     WHERE p.ID_incidente = ?
     ORDER BY
       CASE
         WHEN UPPER(rp.Nombre) LIKE '%EXTRAORDINARIO%' THEN 0
         WHEN UPPER(rp.Nombre) LIKE '%VICTIMA%' OR UPPER(rp.Nombre) LIKE '%VÍCTIMA%' THEN 1
         ELSE 2
       END,
       p.ID_persona
     LIMIT 1`,
    [incidenteId],
  );
  if (!rows.length) return null;
  const p = rows[0];
  const servidor_judicial = [p.Primer_Nombre, p.Segundo_Nombre, p.Primer_Apellido, p.Segundo_Apellido]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!servidor_judicial) return null;
  return {
    servidor_judicial,
    cedula: p.cedula ?? null,
    cargo: p.cargo ?? null,
  };
}

function validateGestionForStatus(status, gestion) {
  const rank = WORKFLOW_RANK_CSJ[status];
  if (rank === undefined || status === 'Cancelado' || status === 'Cerrado') return null;

  if (rank >= WORKFLOW_RANK_CSJ['En gestión OSEG']) {
    if (!gestion) {
      return 'Complete la gestión OSEG en la pestaña Medidas antes de guardar este estado.';
    }
    if (!String(gestion.codigo_oficio || '').trim()) {
      return 'Falta el código de oficio trámite. Guarde la gestión en la pestaña Medidas.';
    }
    if (!String(gestion.tramite_destino || '').trim()) {
      return 'Complete «Trámite / destino» en la pestaña Medidas.';
    }
  }

  if (rank >= WORKFLOW_RANK_CSJ['En evaluación CERREM']) {
    if (!String(gestion?.resolucion_cerrem || '').trim()) {
      return 'Complete «Resolución CERREM» en la pestaña Medidas.';
    }
    if (!gestion?.ID_riesgo) {
      return 'Seleccione el «Nivel de riesgo» en la pestaña Medidas.';
    }
  }

  return null;
}

async function getTiposMedida(agency) {
  const [rows] = await pool.query(
    `SELECT ID_tipo_medida AS id, Nombre_medida AS nombre, Descripcion AS descripcion
     FROM tipos_medida_seguridad
     WHERE ID_Agencia = ? AND Activo = 1
       AND Nombre_medida NOT LIKE '%Esquema de protecci%'
     ORDER BY ID_tipo_medida`,
    [agency],
  );
  return rows;
}

async function getGestionByIncidente(visibleId) {
  const [rows] = await pool.query(
    `SELECT gm.*,
            r.Nombre_riesgo AS nivel_riesgo
     FROM gestion_medidas gm
     JOIN incidentes i ON i.ID_incidente = gm.ID_incidente
     LEFT JOIN riesgos r ON r.ID_riesgo = gm.ID_riesgo
     WHERE i.ID_visible = ?`,
    [visibleId],
  );
  return rows[0] || null;
}

async function getSolicitudFromPersonas(visibleId) {
  const [incRows] = await pool.query(
    `SELECT ID_incidente FROM incidentes WHERE ID_visible = ?`,
    [visibleId],
  );
  if (!incRows.length) return null;
  return resolveServidorJudicial(incRows[0].ID_incidente);
}

async function getMedidasByGestion(idGestion) {
  const [rows] = await pool.query(
    `SELECT im.ID_incidente_medida, im.ID_tipo_medida,
            tms.Nombre_medida AS nombre,
            im.asignado, im.cantidad,
            im.observacion_medida, im.fecha_asignacion
     FROM incidente_medidas im
     JOIN tipos_medida_seguridad tms ON tms.ID_tipo_medida = im.ID_tipo_medida
     WHERE im.ID_gestion = ? AND im.asignado = 1
     ORDER BY im.ID_tipo_medida`,
    [idGestion],
  );
  return rows;
}

async function syncIncidentTramiteFields(incidenteId, codigoOficio, tramiteDestino) {
  await pool.query(
    `UPDATE incidentes SET
       codigo_oficio_tramite = COALESCE(?, codigo_oficio_tramite),
       destino = COALESCE(?, destino)
     WHERE ID_incidente = ?`,
    [codigoOficio, tramiteDestino, incidenteId],
  );
}

async function upsertGestion(visibleId, body, user) {
  const agency = user?.agency_code || user?.agency;
  const userId = user?.sub;

  const [incRows] = await pool.query(
    `SELECT ID_incidente FROM incidentes WHERE ID_visible = ?`,
    [visibleId],
  );
  if (!incRows.length) throw new HttpError(404, 'Incidente no encontrado');
  const incidenteId = incRows[0].ID_incidente;
  const solicitud = await resolveServidorJudicial(incidenteId);

  const [existing] = await pool.query(
    `SELECT * FROM gestion_medidas WHERE ID_incidente = ?`,
    [incidenteId],
  );

  const prev = existing[0] || null;

  const osegBloqueada =
    Boolean(String(prev?.codigo_oficio || '').trim()) &&
    Boolean(String(prev?.tramite_destino || '').trim());

  let codigoOficio = pickText(body.codigo_oficio, prev?.codigo_oficio);
  if (osegBloqueada) {
    codigoOficio = prev.codigo_oficio;
  }

  const servidorJudicial =
    body.servidor_judicial ?? prev?.servidor_judicial ?? solicitud?.servidor_judicial ?? null;
  const cedula = body.cedula ?? prev?.cedula ?? solicitud?.cedula ?? null;
  const cargo = body.cargo ?? prev?.cargo ?? solicitud?.cargo ?? null;
  const tramiteDestino = osegBloqueada
    ? prev.tramite_destino
    : pickText(body.tramite_destino, prev?.tramite_destino);

  const fechaCerrem = pickText(body.fecha_cerrem, prev?.fecha_cerrem);
  const resolucionCerrem = pickText(body.resolucion_cerrem, prev?.resolucion_cerrem);
  const fechaResolucion = pickText(body.fecha_resolucion, prev?.fecha_resolucion);
  const idRiesgo = pickInt(body.ID_riesgo, prev?.ID_riesgo);
  const tipoEsquema = pickText(body.tipo_esquema, prev?.tipo_esquema);
  const compartidoCon = pickText(body.compartido_con, prev?.compartido_con);
  const observaciones = pickText(body.observaciones, prev?.observaciones);

  if (prev) {
    await pool.query(
      `UPDATE gestion_medidas SET
         servidor_judicial = ?, cedula = ?, cargo = ?,
         codigo_oficio = ?, tramite_destino = ?,
         fecha_cerrem = ?, resolucion_cerrem = ?, fecha_resolucion = ?,
         ID_riesgo = ?, tipo_esquema = ?, compartido_con = ?, observaciones = ?
       WHERE ID_gestion = ?`,
      [
        servidorJudicial,
        cedula,
        cargo,
        codigoOficio,
        tramiteDestino,
        fechaCerrem,
        resolucionCerrem,
        fechaResolucion,
        idRiesgo,
        tipoEsquema,
        compartidoCon,
        observaciones,
        prev.ID_gestion,
      ],
    );
    await syncIncidentTramiteFields(incidenteId, codigoOficio, tramiteDestino);
    return prev.ID_gestion;
  }

  const [result] = await pool.query(
    `INSERT INTO gestion_medidas
       (ID_incidente, ID_Agencia, servidor_judicial, cedula, cargo,
        codigo_oficio, tramite_destino, fecha_cerrem, resolucion_cerrem,
        fecha_resolucion, ID_riesgo, tipo_esquema, compartido_con,
        observaciones, ID_usuario_registro)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      incidenteId,
      agency,
      servidorJudicial,
      cedula,
      cargo,
      codigoOficio,
      tramiteDestino,
      fechaCerrem,
      resolucionCerrem,
      fechaResolucion,
      idRiesgo,
      tipoEsquema,
      compartidoCon,
      observaciones,
      userId,
    ],
  );
  await syncIncidentTramiteFields(incidenteId, codigoOficio, tramiteDestino);
  return result.insertId;
}

async function asignarMedidas(idGestion, medidas, user, meta = {}) {
  const agency = user?.agency_code || user?.agency;
  const userId = user?.sub;

  await pool.query(
    `UPDATE incidente_medidas SET asignado = 0, fecha_retiro = NOW()
     WHERE ID_gestion = ?`,
    [idGestion],
  );

  for (const m of medidas) {
    await pool.query(
      `INSERT INTO incidente_medidas
         (ID_gestion, ID_tipo_medida, asignado, cantidad,
          observacion_medida, ID_usuario_asigna, ID_Agencia)
       VALUES (?, ?, 1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         asignado = 1, cantidad = VALUES(cantidad),
         observacion_medida = VALUES(observacion_medida),
         fecha_asignacion = NOW(), fecha_retiro = NULL`,
      [
        idGestion,
        m.ID_tipo_medida,
        m.cantidad ?? 1,
        m.observacion_medida ?? null,
        userId,
        agency,
      ],
    );
  }

  if (
    meta.tipo_esquema !== undefined ||
    meta.compartido_con !== undefined ||
    meta.observaciones !== undefined
  ) {
    const [metaRows] = await pool.query(
      `SELECT tipo_esquema, compartido_con, observaciones
       FROM gestion_medidas WHERE ID_gestion = ?`,
      [idGestion],
    );
    const prev = metaRows[0] || {};
    const tipoEsquema =
      meta.tipo_esquema !== undefined ? nullIfEmpty(meta.tipo_esquema) : prev.tipo_esquema ?? null;
    const compartidoCon =
      meta.compartido_con !== undefined
        ? nullIfEmpty(meta.compartido_con)
        : prev.compartido_con ?? null;
    const observaciones =
      meta.observaciones !== undefined ? nullIfEmpty(meta.observaciones) : prev.observaciones ?? null;

    await pool.query(
      `UPDATE gestion_medidas SET
         tipo_esquema = ?, compartido_con = ?, observaciones = ?
       WHERE ID_gestion = ?`,
      [tipoEsquema, compartidoCon, observaciones, idGestion],
    );
  }
}

async function hasAssignedMedidas(visibleId) {
  const gestion = await getGestionByIncidente(visibleId);
  if (!gestion) return false;
  const medidas = await getMedidasByGestion(gestion.ID_gestion);
  return medidas.length > 0;
}

function normalizeGestionAuditValue(key, val) {
  if (val == null || val === '') return '(vacío)';
  if (key === 'fecha_cerrem' || key === 'fecha_resolucion') {
    const raw = val instanceof Date ? val : new Date(val);
    if (!Number.isNaN(raw.getTime())) {
      return raw.toISOString().slice(0, 10);
    }
  }
  return String(val);
}

function formatMedidaLine(m) {
  const name = String(m?.nombre || `Tipo ${m?.ID_tipo_medida ?? '?'}`).trim();
  const qty = Number(m?.cantidad ?? 1);
  const obs = String(m?.observacion_medida || '').trim();
  const base = `${name} x${Number.isFinite(qty) ? qty : 1}`;
  return obs ? `${base} (${obs})` : base;
}

function medidaAuditKey(m) {
  return Number(m?.ID_tipo_medida);
}

function buildMedidasAuditDetails(beforeList, afterList) {
  const before = Array.isArray(beforeList) ? beforeList : [];
  const after = Array.isArray(afterList) ? afterList : [];
  const beforeMap = new Map(before.map((m) => [medidaAuditKey(m), m]));
  const afterMap = new Map(after.map((m) => [medidaAuditKey(m), m]));
  const details = [];

  for (const [id, prev] of beforeMap) {
    if (afterMap.has(id)) continue;
    const prevName = String(prev.nombre || `Tipo ${id}`).trim();
    details.push({
      field: `Medida: ${prevName}`,
      old: formatMedidaLine(prev),
      new: '(retirada)',
    });
  }

  for (const [id, next] of afterMap) {
    const prev = beforeMap.get(id);
    const nextName = String(next.nombre || `Tipo ${id}`).trim();
    const label = `Medida: ${nextName}`;
    if (!prev) {
      details.push({
        field: label,
        old: '(ninguna)',
        new: formatMedidaLine(next),
      });
      continue;
    }
    const oldLine = formatMedidaLine(prev);
    const newLine = formatMedidaLine(next);
    if (oldLine !== newLine) {
      details.push({ field: label, old: oldLine, new: newLine });
    }
  }

  return details;
}

function buildMedidasMetaAuditDetails(before, after) {
  const fields = [
    ['tipo_esquema', 'Tipo de esquema'],
    ['compartido_con', 'Compartido con'],
    ['observaciones', 'Observaciones'],
  ];
  const details = [];
  for (const [key, label] of fields) {
    const oldVal = normalizeGestionAuditValue(key, before?.[key]);
    const newVal = normalizeGestionAuditValue(key, after?.[key]);
    if (oldVal !== newVal) {
      details.push({ field: label, old: oldVal, new: newVal });
    }
  }
  return details;
}

function buildGestionAuditDetails(before, after) {
  const fields = [
    ['tramite_destino', 'Trámite / destino (OSEG)'],
    ['codigo_oficio', 'Código de oficio'],
    ['resolucion_cerrem', 'Resolución CERREM'],
    ['nivel_riesgo', 'Nivel de riesgo'],
    ['fecha_cerrem', 'Fecha CERREM'],
    ['fecha_resolucion', 'Fecha resolución'],
  ];
  const details = [];
  for (const [key, label] of fields) {
    const oldVal = normalizeGestionAuditValue(key, before?.[key]);
    const newVal = normalizeGestionAuditValue(key, after?.[key]);
    if (oldVal !== newVal) {
      details.push({ field: label, old: oldVal, new: newVal });
    }
  }
  return details;
}

module.exports = {
  getTiposMedida,
  getGestionByIncidente,
  getMedidasByGestion,
  getSolicitudFromPersonas,
  upsertGestion,
  asignarMedidas,
  hasAssignedMedidas,
  validateGestionForStatus,
  buildMedidasAuditDetails,
  buildMedidasMetaAuditDetails,
  buildGestionAuditDetails,
};

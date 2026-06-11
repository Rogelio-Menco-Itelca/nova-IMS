const { pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');

async function getTiposMedida(agency) {
  const [rows] = await pool.query(
    `SELECT ID_tipo_medida AS id, Nombre_medida AS nombre, Descripcion AS descripcion
     FROM tipos_medida_seguridad
     WHERE ID_Agencia = ? AND Activo = 1
     ORDER BY ID_tipo_medida`,
    [agency],
  );
  return rows;
}

async function getGestionByIncidente(visibleId) {
  const [rows] = await pool.query(
    `SELECT gm.*, r.Nombre_riesgo AS nivel_riesgo
     FROM gestion_medidas gm
     JOIN incidentes i ON i.ID_incidente = gm.ID_incidente
     LEFT JOIN riesgos r ON r.ID_riesgo = gm.ID_riesgo
     WHERE i.ID_visible = ?`,
    [visibleId],
  );
  return rows[0] || null;
}

async function getMedidasByGestion(idGestion) {
  const [rows] = await pool.query(
    `SELECT im.ID_incidente_medida, im.ID_tipo_medida,
            tms.Nombre_medida AS nombre,
            im.asignado, im.cantidad, im.observacion_medida, im.fecha_asignacion
     FROM incidente_medidas im
     JOIN tipos_medida_seguridad tms ON tms.ID_tipo_medida = im.ID_tipo_medida
     WHERE im.ID_gestion = ? AND im.asignado = 1
     ORDER BY im.ID_tipo_medida`,
    [idGestion],
  );
  return rows;
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

  const [existing] = await pool.query(
    `SELECT ID_gestion FROM gestion_medidas WHERE ID_incidente = ?`,
    [incidenteId],
  );

  if (existing.length) {
    await pool.query(
      `UPDATE gestion_medidas SET
         servidor_judicial=?, cedula=?, cargo=?,
         codigo_oficio=?, tramite_destino=?,
         fecha_cerrem=?, resolucion_cerrem=?, fecha_resolucion=?,
         ID_riesgo=?, tipo_esquema=?, compartido_con=?, observaciones=?
       WHERE ID_gestion=?`,
      [
        body.servidor_judicial ?? null, body.cedula ?? null, body.cargo ?? null,
        body.codigo_oficio ?? null, body.tramite_destino ?? null,
        body.fecha_cerrem ?? null, body.resolucion_cerrem ?? null, body.fecha_resolucion ?? null,
        body.ID_riesgo ?? null, body.tipo_esquema ?? null,
        body.compartido_con ?? null, body.observaciones ?? null,
        existing[0].ID_gestion,
      ],
    );
    return existing[0].ID_gestion;
  } else {
    // Generar código de oficio automático
    const year = new Date().getFullYear();
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM gestion_medidas
       WHERE ID_Agencia = ? AND YEAR(Fecha_registro) = ?`,
      [agency, year],
    );
    const consecutivo = String(countRows[0].total + 1).padStart(4, '0');
    const codigoOficio = `OSEG-${agency}-${year}-${consecutivo}`;

    const [result] = await pool.query(
      `INSERT INTO gestion_medidas
         (ID_incidente, ID_Agencia, servidor_judicial, cedula, cargo,
          codigo_oficio, tramite_destino, fecha_cerrem, resolucion_cerrem,
          fecha_resolucion, ID_riesgo, tipo_esquema, compartido_con,
          observaciones, ID_usuario_registro)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        incidenteId, agency,
        body.servidor_judicial ?? null, body.cedula ?? null, body.cargo ?? null,
        codigoOficio, body.tramite_destino ?? null,
        body.fecha_cerrem ?? null, body.resolucion_cerrem ?? null, body.fecha_resolucion ?? null,
        body.ID_riesgo ?? null, body.tipo_esquema ?? null,
        body.compartido_con ?? null, body.observaciones ?? null,
        userId,
      ],
    );
    return { ID_gestion: result.insertId, codigo_oficio: codigoOficio };
  }
}

async function asignarMedidas(idGestion, medidas, user) {
  const agency = user?.agency_code || user?.agency;
  const userId = user?.sub;

  await pool.query(
    `UPDATE incidente_medidas SET asignado=0, fecha_retiro=NOW() WHERE ID_gestion=?`,
    [idGestion],
  );

  for (const m of medidas) {
    await pool.query(
      `INSERT INTO incidente_medidas
         (ID_gestion, ID_tipo_medida, asignado, cantidad, observacion_medida, ID_usuario_asigna, ID_Agencia)
       VALUES (?,?,1,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         asignado=1, cantidad=VALUES(cantidad),
         observacion_medida=VALUES(observacion_medida),
         fecha_asignacion=NOW(), fecha_retiro=NULL`,
      [idGestion, m.ID_tipo_medida, m.cantidad ?? 1, m.observacion_medida ?? null, userId, agency],
    );
  }
}

async function getSolicitudFromPersonas(_visibleId) {
  return null;
}

async function hasAssignedMedidas(visibleId) {
  const gestion = await getGestionByIncidente(visibleId);
  if (!gestion?.ID_gestion) return false;
  const medidas = await getMedidasByGestion(gestion.ID_gestion);
  return medidas.length > 0;
}

const WORKFLOW_RANK_CSJ = {
  'En gestión OSEG': 1,
  'Enviado a CERREM': 2,
  'En evaluación CERREM': 3,
  'Medidas asignadas': 4,
  Cerrado: 5,
};

function validateGestionForStatus(status, gestion) {
  const rank = WORKFLOW_RANK_CSJ[status];
  if (rank === undefined || status === 'Cancelado') return null;

  const hasOseg =
    Boolean(String(gestion?.codigo_oficio ?? '').trim()) &&
    Boolean(String(gestion?.tramite_destino ?? '').trim());
  const hasCerrem =
    Boolean(String(gestion?.resolucion_cerrem ?? '').trim()) && Boolean(gestion?.ID_riesgo);

  if (rank >= WORKFLOW_RANK_CSJ['En gestión OSEG'] && !hasOseg) {
    return 'Complete la gestión OSEG (oficio y trámite/destino) en la pestaña Medidas.';
  }
  if (rank >= WORKFLOW_RANK_CSJ['En evaluación CERREM'] && !hasCerrem) {
    return 'Complete la decisión CERREM (resolución y nivel de riesgo) en la pestaña Medidas.';
  }
  return null;
}

module.exports = {
  getTiposMedida,
  getGestionByIncidente,
  getMedidasByGestion,
  getSolicitudFromPersonas,
  hasAssignedMedidas,
  validateGestionForStatus,
  upsertGestion,
  asignarMedidas,
};
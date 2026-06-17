const { pool } = require('../../config/db');
const {
  mapStatusToGi,
  mapStatusFromGi,
  mapPriorityToGi,
  mapPriorityFromGi,
  normalizeAgencyCode,
  PERSON_ROLE_TO_GI,
  locationChannelToGi,
  locationChannelFromGi,
} = require('./maps');
const { resolveUserContext } = require('./users');
const { requireAgencyInput } = require('./agencyContext');
const { resolveDocumentTypeCode } = require('./documentTypes');
const { insertPersonComment } = require('./people');
const { insertVehicleComment, deleteVehicleCommentsForIncident } = require('./vehicles');
const { linkLocationToIncident } = require('./location');
const { isFinalState, requiresMedidas, isForwardStatusTransition } = require('./transitions');
const { hasAssignedMedidas, getGestionByIncidente, validateGestionForStatus } = require('./medidas');
const HttpError = require('../../utils/HttpError');

const USER_DISPLAY_NAME_SQL = `TRIM(CONCAT(
  u.Primer_Nombre, ' ',
  IFNULL(CONCAT(u.Segundo_Nombre, ' '), ''),
  u.Primer_Apellido, ' ',
  IFNULL(u.Segundo_Apellido, '')
))`;

const INCIDENT_OPERATOR_NAME_SQL = `
  COALESCE(
    (
      SELECT ${USER_DISPLAY_NAME_SQL}
      FROM auditoria_incidente ai
      JOIN usuarios u
        ON u.ID_Usuario = ai.usuarios_id
       AND UPPER(u.ID_Agencia) = UPPER(ai.Id_agencia)
      WHERE ai.incidentes_id = i.ID_incidente
      ORDER BY ai.fecha DESC, ai.id_transaccion_incidentes DESC
      LIMIT 1
    ),
    (
      SELECT NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ai.detalles, '$.actorDisplayName')), 'null')
      FROM auditoria_incidente ai
      WHERE ai.incidentes_id = i.ID_incidente
      ORDER BY ai.fecha DESC, ai.id_transaccion_incidentes DESC
      LIMIT 1
    )
  )`;

const INCIDENT_BASE_SELECT = `
  i.ID_incidente AS internal_id,
  i.ID_visible AS id,
  CAST(e.ID_evento AS CHAR) AS event_id,
  CONCAT('IT-', LPAD(e.ID_evento, 2, '0')) AS incident_type_id,
  e.TipoEvento AS type_name,
  pr.Prioridad AS priority,
  es.Nombre_estado AS status_raw,
  o.Nombre AS origin,
  i.ANI AS phone,
  i.ANI AS ani,
  i.Direccion AS location,
  i.id_departamento AS department_id,
  i.id_municipio AS municipality_id,
  d.nombre_departamento AS departmentName,
  m.nombre_municipio AS municipalityName,
  i.Latitud AS lat,
  i.Longitud AS lng,
  i.Comentario_estado AS details,
  i.IDAgencias AS agency_code,
  i.FechaHora AS created_at,
  i.FechaHora AS updated_at,
  (${INCIDENT_OPERATOR_NAME_SQL}) AS operator_name`;

const INCIDENT_JOINS = `
  JOIN eventos e ON e.ID_evento = i.ID_evento
  JOIN prioridades pr ON pr.ID_prioridad = i.ID_prioridad
  JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
  JOIN origen o ON o.ID_Origen = i.ID_Origen
  LEFT JOIN departamentos d ON d.id_departamento = i.id_departamento
  LEFT JOIN municipios m ON m.id_municipio = i.id_municipio`;

async function getInternalId(visibleId) {
  const [rows] = await pool.query(
    `SELECT ID_incidente FROM incidentes WHERE ID_visible = ? LIMIT 1`,
    [visibleId],
  );
  return rows[0]?.ID_incidente ?? null;
}

function formatCommentTimestamp(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Guarda solo el texto; quita encabezados [fecha] heredados del frontend. */
function plainCommentText(raw) {
  let text = String(raw ?? '').trim();
  while (/^\[[^\]]+\]\s*(\n|$)/.test(text)) {
    text = text.replace(/^\[[^\]]+\]\s*\n?/, '').trim();
  }
  text = text.replace(/^---\s*\n?/, '').trim();
  return text;
}

function pushToGroupedMap(map, key, item) {
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(item);
}

async function loadComments(internalId) {
  const [rows] = await pool.query(
    `SELECT Comentario, FechaHora FROM comentarios_incidentes
     WHERE ID_Incidente = ?
     ORDER BY FechaHora ASC, ID_Comentario ASC`,
    [internalId],
  );
  if (!rows.length) return '';
  return rows
    .map((r) => {
      const plain = plainCommentText(r.Comentario);
      if (!plain) return '';
      const ts = formatCommentTimestamp(r.FechaHora);
      return ts ? `[${ts}]\n${plain}` : plain;
    })
    .filter(Boolean)
    .join('\n---\n');
}

/** Último comentario del incidente (vitácora / correo). */
async function loadLatestComment(internalId) {
  const [rows] = await pool.query(
    `SELECT Comentario, FechaHora FROM comentarios_incidentes
     WHERE ID_Incidente = ?
     ORDER BY FechaHora DESC, ID_Comentario DESC
     LIMIT 1`,
    [internalId],
  );
  if (!rows.length) return null;
  const plain = plainCommentText(rows[0].Comentario);
  if (!plain) return null;
  return {
    timestamp: formatCommentTimestamp(rows[0].FechaHora) || null,
    text: plain,
  };
}

function mapIncidentRow(r, extras = {}) {
  return {
    ...r,
    status: mapStatusFromGi(r.status_raw),
    internal_id: r.internal_id,
    comments: extras.comments ?? r.comments ?? '',
    contact_info: extras.contact_info ?? null,
    location_phone_number: extras.location_phone ?? null,
    operator_id: extras.operator_id ?? null,
    operator_name: extras.operator_name ?? r.operator_name ?? '',
    received_lat: extras.received_lat ?? null,
    received_lng: extras.received_lng ?? null,
    received_at: extras.received_at ?? null,
    location_phone: extras.location_phone ?? null,
  };
}

async function resolveCatalogIds(
  agencyCode,
  { status, priority, origin, incidentTypeId, eventId },
) {
  const agency = normalizeAgencyCode(agencyCode);

  let eventoId = null;
  if (eventId && /^\d+$/.test(String(eventId))) {
    eventoId = Number(eventId);
  } else if (incidentTypeId) {
    const m = /(\d+)/.exec(String(incidentTypeId));
    if (m) eventoId = Number(m[1]);
  }
  if (!eventoId) {
    const [ev] = await pool.query(
      `SELECT ID_evento FROM eventos WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?)) ORDER BY ID_evento LIMIT 1`,
      [agency, agency],
    );
    eventoId = ev[0]?.ID_evento;
  }

  const statusName = mapStatusToGi(status || 'Nuevo');
  const [est] = await pool.query(
    `SELECT ID_estado FROM estadosincidentes
     WHERE Nombre_estado = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     LIMIT 1`,
    [statusName, agency, agency],
  );
  let estadoId = est[0]?.ID_estado;
  if (!estadoId) {
    const [fb] = await pool.query(
      `SELECT ID_estado FROM estadosincidentes
       WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?)) ORDER BY ID_estado LIMIT 1`,
      [agency, agency],
    );
    estadoId = fb[0]?.ID_estado;
  }

  const priorityName = mapPriorityToGi(priority || 'Media');
  const [pri] = await pool.query(
    `SELECT ID_prioridad FROM prioridades WHERE Prioridad = ? LIMIT 1`,
    [priorityName],
  );
  const prioridadId = pri[0]?.ID_prioridad || 2;

  const originName = String(origin || '').trim();
  let origenId = null;
  if (originName) {
    const [or] = await pool.query(
      `SELECT ID_Origen FROM origen
       WHERE Nombre = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       LIMIT 1`,
      [originName, agency, agency],
    );
    origenId = or[0]?.ID_Origen;
  }

  if (!eventoId) {
    throw new HttpError(400, `No hay tipos de evento configurados para la agencia ${agency}.`);
  }
  if (!estadoId) {
    throw new HttpError(
      400,
      `No hay estados de incidente configurados para la agencia ${agency}. Solicite al administrador cargar el catálogo en estadosincidentes.`,
    );
  }
  if (!origenId) {
    throw new HttpError(
      400,
      originName
        ? `Origen "${originName}" no existe para la agencia ${agency}. Seleccione un origen del catálogo.`
        : `Origen es requerido. Seleccione un valor del catálogo de la agencia ${agency}.`,
    );
  }

  return { eventoId, estadoId, prioridadId, origenId, agency };
}

/** ID_visible = INC- + ID_incidente con 7 dígitos (p. ej. INC-0000004). */
function formatVisibleId(internalId) {
  return `INC-${String(internalId).padStart(7, '0')}`;
}

async function fetchIncidentRows(whereSql, params, reader = pool) {
  const [rows] = await reader.query(
    `SELECT ${INCIDENT_BASE_SELECT}
     FROM incidentes i
     ${INCIDENT_JOINS}
     ${whereSql}`,
    params,
  );
  return rows;
}

async function latestLocationForIncident(internalId, visibleId, reader = pool) {
  const [rows] = await reader.query(
    `SELECT lat AS received_lat, \`long\` AS received_lng,
            FechaHora_recibido AS received_at, Numero_ubicacion AS location_phone
     FROM ubicacion
     WHERE ID_incidente = ?
     ORDER BY FechaHora_recibido DESC, ID_solicitud DESC
     LIMIT 1`,
    [internalId],
  );
  if (rows.length) return rows[0];
  const [byUrl] = await reader.query(
    `SELECT lat AS received_lat, \`long\` AS received_lng,
            FechaHora_recibido AS received_at, Numero_ubicacion AS location_phone
     FROM ubicacion
     WHERE ID_incidente IS NULL
     ORDER BY ID_solicitud DESC
     LIMIT 1`,
  );
  return byUrl[0] || null;
}

async function loadInvolvedPeople(internalIds, reader = pool) {
  if (!internalIds.length) return {};
  const ph = internalIds.map(() => '?').join(',');
  const [rows] = await reader.query(
    `SELECT p.ID_incidente AS internal_id,
            CONCAT('PER-', p.ID_persona) AS id,
            p.Primer_Nombre AS primer_nombre,
            p.Segundo_Nombre AS segundo_nombre,
            p.Primer_Apellido AS primer_apellido,
            p.Segundo_Apellido AS segundo_apellido,
            TRIM(CONCAT(p.Primer_Nombre, ' ', IFNULL(p.Segundo_Nombre, ''), ' ', p.Primer_Apellido, ' ', IFNULL(p.Segundo_Apellido, ''))) AS name,
            p.ID_RolP AS role_id,
            rp.Nombre AS role,
            p.Contacto AS contact,
            p.Contacto AS phone,
            p.Numero_documento AS documentId,
            p.Tipo_documento AS documentType,
            td.Descripcion AS documentTypeName,
            p.ID_genero AS gender_id,
            g.Descripcion_genero AS gender,
            COALESCE(
              (SELECT cp.Comentarios FROM comentariospersonas cp
               WHERE cp.ID_persona = p.ID_persona
               ORDER BY cp.FechaHora DESC LIMIT 1),
              p.Comentarios
            ) AS details
     FROM personas p
     LEFT JOIN rolpersonas rp ON rp.ID_RolP = p.ID_RolP
     LEFT JOIN genero g ON g.ID_genero = p.ID_genero
     LEFT JOIN tipodocumentos td ON td.Tipo_documento = p.Tipo_documento
     WHERE p.ID_incidente IN (${ph})`,
    internalIds,
  );
  const map = {};
  for (const r of rows) {
    pushToGroupedMap(map, r.internal_id, {
      id: r.id,
      name: r.name?.replaceAll(/\s+/g, ' ').trim(),
      primerNombre: r.primer_nombre,
      segundoNombre: r.segundo_nombre,
      primerApellido: r.primer_apellido,
      segundoApellido: r.segundo_apellido,
      role: r.role || 'Testigo',
      roleId: r.role_id,
      contact: r.contact,
      phone: r.phone,
      documentId: r.documentId,
      documentType: r.documentType,
      documentTypeName: r.documentTypeName,
      gender: r.gender,
      genderId: r.gender_id,
      comentarios: r.details,
      details: r.details,
    });
  }
  return map;
}

async function loadInvolvedVehicles(internalIds, reader = pool) {
  if (!internalIds.length) return {};
  const ph = internalIds.map(() => '?').join(',');
  const [rows] = await reader.query(
    `SELECT v.ID_incidente AS internal_id, v.ID_vehiculo AS vehicle_id,
            v.Placa AS plate, rv.Nombre AS role,
            v.Marca AS make, v.Modelo_linea AS model, v.Color AS color,
            v.FechaRegistro AS incidentDate,
            (SELECT cv.Comentarios FROM comentariosvehiculos cv
             WHERE cv.ID_vehiculo = v.ID_vehiculo
             ORDER BY cv.FechaHora DESC LIMIT 1) AS details
     FROM vehiculos v
     LEFT JOIN rolesvehiculo rv ON rv.ID_RolVehiculo = v.ID_RolV
     WHERE v.ID_incidente IN (${ph})`,
    internalIds,
  );
  const map = {};
  for (const r of rows) {
    pushToGroupedMap(map, r.internal_id, {
      plate: r.plate,
      role: r.role || 'Vehículo Involucrado',
      make: r.make,
      model: r.model,
      color: r.color,
      details: r.details,
      incidentDate: r.incidentDate,
    });
  }
  return map;
}

async function loadPlaceComments(lugarIds, reader = pool) {
  if (!lugarIds.length) return {};
  const ph = lugarIds.map(() => '?').join(',');
  const [rows] = await reader.query(
    `SELECT ID_lugar, Comentario_lugar, FechaHora, ID_Usuario
     FROM comentarios_lugar
     WHERE ID_lugar IN (${ph})
     ORDER BY FechaHora ASC`,
    lugarIds,
  );
  const map = {};
  for (const r of rows) {
    pushToGroupedMap(map, r.ID_lugar, {
      text: r.Comentario_lugar || '',
      at: r.FechaHora,
      user: r.ID_Usuario || '',
    });
  }
  return map;
}

async function loadInvolvedPlaces(internalIds, reader = pool) {
  if (!internalIds.length) return {};
  const ph = internalIds.map(() => '?').join(',');
  const [rows] = await reader.query(
    `SELECT l.ID_incidente AS internal_id,
            l.ID_lugar AS lugar_id,
            CONCAT('LUG-', l.ID_lugar) AS id,
            l.Nombre_lugar AS name,
            l.Direccion_lugar AS address,
            l.ID_departamento AS department_id,
            l.ID_municipio AS municipality_id,
            d.nombre_departamento AS department_name,
            m.nombre_municipio AS municipality_name,
            l.Contacto AS contact,
            l.ID_Rol_lugar AS role_id,
            rl.Rol_lugar AS role_name
     FROM lugares l
     LEFT JOIN departamentos d ON d.id_departamento = l.ID_departamento
     LEFT JOIN municipios m ON m.id_municipio = l.ID_municipio
     LEFT JOIN roles_lugar rl ON rl.ID_Rol_Lugar = l.ID_Rol_lugar
     WHERE l.ID_incidente IN (${ph})
     ORDER BY l.Fecha_registro ASC`,
    internalIds,
  );
  const lugarIds = rows.map((r) => r.lugar_id).filter(Boolean);
  const commentsMap = await loadPlaceComments(lugarIds, reader);
  const map = {};
  for (const r of rows) {
    const history = commentsMap[r.lugar_id] || [];
    const comments = history
      .map((c) => c.text)
      .filter(Boolean)
      .join('\n');
    pushToGroupedMap(map, r.internal_id, {
      id: r.id,
      name: r.name,
      address: r.address,
      departmentId: r.department_id,
      municipalityId: r.municipality_id,
      departmentName: r.department_name || '',
      municipalityName: r.municipality_name || '',
      contact: r.contact || '',
      roleId: r.role_id,
      roleName: r.role_name || '',
      comments,
      commentsHistory: history,
    });
  }
  return map;
}

async function hydrateIncidents(rows, reader = pool) {
  if (!rows.length) return [];
  const internalIds = rows.map((r) => r.internal_id);
  const [peopleMap, vehMap, placesMap] = await Promise.all([
    loadInvolvedPeople(internalIds, reader),
    loadInvolvedVehicles(internalIds, reader),
    loadInvolvedPlaces(internalIds, reader),
  ]);

  const out = [];
  for (const r of rows) {
    const comments = await loadComments(r.internal_id);
    const loc = await latestLocationForIncident(r.internal_id, r.id, reader);
    const incident = mapIncidentRow(r, {
      comments,
      ...loc,
      operator_name: r.operator_name || '',
    });
    incident.involvedPeople = peopleMap[r.internal_id] || [];
    incident.involvedPlaces = placesMap[r.internal_id] || [];
    incident.involvedVehicles = vehMap[r.internal_id] || [];
    out.push(incident);
  }
  return out;
}

async function listIncidents(limit = 100) {
  const rows = await fetchIncidentRows(
    `WHERE (i.ID_visible IS NULL OR i.ID_visible NOT LIKE 'CAT-PERS-%')
     ORDER BY i.FechaHora DESC LIMIT ?`,
    [limit],
  );
  return hydrateIncidents(rows);
}

async function getIncident(visibleId) {
  const rows = await fetchIncidentRows(`WHERE i.ID_visible = ?`, [visibleId]);
  if (!rows.length) return null;
  const [inc] = await hydrateIncidents(rows);
  return inc;
}

async function insertComment(conn, internalId, text, userCtx) {
  if (!String(text || '').trim()) return;
  await conn.query(
    `INSERT INTO comentarios_incidentes (ID_Incidente, Comentario, ID_Usuario, ID_Agencia)
     VALUES (?,?,?,?)`,
    [internalId, text, userCtx.userId, userCtx.agencyCode],
  );
}

async function replaceInvolvedPlaces(conn, internalId, places, userCtx, agencyCode) {
  await conn.query(
    `DELETE cl FROM comentarios_lugar cl
     INNER JOIN lugares l ON l.ID_lugar = cl.ID_lugar
     WHERE l.ID_incidente = ?`,
    [internalId],
  );
  await conn.query(`DELETE FROM lugares WHERE ID_incidente = ?`, [internalId]);

  for (const place of places || []) {
    const name = String(place.name || place.nombre || '').trim();
    const address = String(place.address || place.direccion || place.direccion_lugar || '').trim();
    if (!name || !address) continue;

    let roleId = place.roleId ?? place.role_id ?? null;
    if (!roleId && place.roleName) {
      const [roles] = await conn.query(
        `SELECT ID_Rol_Lugar FROM roles_lugar
         WHERE Rol_lugar = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
         LIMIT 1`,
        [place.roleName, agencyCode, agencyCode],
      );
      roleId = roles[0]?.ID_Rol_Lugar;
    }
    if (!roleId) {
      const [fb] = await conn.query(
        `SELECT ID_Rol_Lugar FROM roles_lugar
         WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
         ORDER BY ID_Rol_Lugar LIMIT 1`,
        [agencyCode, agencyCode],
      );
      roleId = fb[0]?.ID_Rol_Lugar || 1;
    }

    const [result] = await conn.query(
      `INSERT INTO lugares
        (Nombre_lugar, Direccion_lugar, ID_departamento, ID_municipio, Contacto, ID_Rol_lugar, ID_incidente)
       VALUES (?,?,?,?,?,?,?)`,
      [
        name.substring(0, 100),
        address.substring(0, 100),
        place.departmentId ?? place.department_id ?? null,
        place.municipalityId ?? place.municipality_id ?? null,
        place.contact || place.contacto || null,
        roleId,
        internalId,
      ],
    );

    const commentText = String(place.comments || place.comentario || '').trim();
    if (commentText && userCtx.userId) {
      await conn.query(
        `INSERT INTO comentarios_lugar (ID_lugar, ID_Usuario, ID_Agencia, Comentario_lugar)
         VALUES (?,?,?,?)`,
        [result.insertId, userCtx.userId, agencyCode, commentText.substring(0, 200)],
      );
    }
  }
}

async function clearInvolvedForIncident(conn, internalId) {
  await conn.query(
    `DELETE cp FROM comentariospersonas cp
     INNER JOIN personas p ON p.ID_persona = cp.ID_persona
     WHERE p.ID_incidente = ?`,
    [internalId],
  );
  await conn.query(`DELETE FROM personas WHERE ID_incidente = ? AND ID_incidente IS NOT NULL`, [
    internalId,
  ]);
  await deleteVehicleCommentsForIncident(conn, internalId);
  await conn.query(`DELETE FROM vehiculos WHERE ID_incidente = ?`, [internalId]);
}

function parseFullPersonName(fullName) {
  const names = String(fullName).trim().split(/\s+/);
  const primerNombre = names[0] || '';
  if (names.length > 3) {
    return {
      primerNombre,
      segundoNombre: names[1] ?? null,
      primerApellido: names.at(-2) ?? '',
      segundoApellido: names.at(-1) ?? null,
    };
  }
  if (names.length > 2) {
    return {
      primerNombre,
      segundoNombre: null,
      primerApellido: names.at(-2) ?? '',
      segundoApellido: names.at(-1) ?? null,
    };
  }
  return {
    primerNombre,
    segundoNombre: null,
    primerApellido: names[1] || '',
    segundoApellido: null,
  };
}

function pickPersonNameFields(person) {
  let primerNombre = String(person.primerNombre || person.primer_nombre || '').trim();
  let segundoNombre = String(person.segundoNombre || person.segundo_nombre || '').trim() || null;
  let primerApellido = String(person.primerApellido || person.primer_apellido || '').trim();
  let segundoApellido = String(person.segundoApellido || person.segundo_apellido || '').trim() || null;

  if (!primerNombre && String(person.name || '').trim()) {
    return parseFullPersonName(String(person.name));
  }
  return { primerNombre, segundoNombre, primerApellido, segundoApellido };
}

async function resolvePersonRoleId(conn, person, agencyCode) {
  let rolP = person.roleId ?? person.role_id ?? null;
  if (!rolP) {
    const [roles] = await conn.query(
      `SELECT ID_RolP FROM rolpersonas
       WHERE Nombre = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       LIMIT 1`,
      [PERSON_ROLE_TO_GI[person.role] || person.role || 'Testigo', agencyCode, agencyCode],
    );
    rolP = roles[0]?.ID_RolP;
  }
  if (!rolP) {
    const [fb] = await conn.query(`SELECT ID_RolP FROM rolpersonas ORDER BY ID_RolP LIMIT 1`);
    rolP = fb[0]?.ID_RolP || 1;
  }
  return rolP;
}

async function insertInvolvedPerson(conn, internalId, person, userCtx, agencyCode) {
  const { primerNombre, segundoNombre, primerApellido, segundoApellido } =
    pickPersonNameFields(person);
  if (!primerNombre || !primerApellido) return;

  const rolP = await resolvePersonRoleId(conn, person, agencyCode);
  const comentarios = person.comentarios ?? person.details ?? null;
  const genderId = person.genderId ?? person.gender_id ?? null;
  const tipoDocumento = await resolveDocumentTypeCode(
    person.documentType || person.tipo_documento,
    conn,
  );

  const [personResult] = await conn.query(
    `INSERT INTO personas
      (Primer_Nombre, Segundo_Nombre, Primer_Apellido, Segundo_Apellido, ID_RolP,
       Contacto, Tipo_documento, Numero_documento, Comentarios, ID_incidente,
       ID_Agencia, ID_Usuario, ID_genero)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      rolP,
      person.contact || person.phone || null,
      tipoDocumento,
      person.documentId || null,
      null,
      internalId,
      agencyCode,
      userCtx.userId,
      genderId,
    ],
  );

  const commentText = String(comentarios || '').trim();
  if (commentText && userCtx.userId && personResult.insertId) {
    await insertPersonComment(
      conn,
      personResult.insertId,
      commentText,
      userCtx.userId,
      agencyCode,
    );
  }
}

function vehicleHasCatalogData(vehicle) {
  return (
    !!String(vehicle.color || '').trim() ||
    !!String(vehicle.make || '').trim() ||
    !!String(vehicle.model || '').trim() ||
    !!String(vehicle.details || '').trim()
  );
}

async function resolveVehicleRoleId(conn, roleName, agencyCode) {
  if (roleName) {
    const [roles] = await conn.query(
      `SELECT ID_RolVehiculo FROM rolesvehiculo
       WHERE Nombre = ? AND UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
       LIMIT 1`,
      [roleName, agencyCode, agencyCode],
    );
    if (roles[0]?.ID_RolVehiculo) return roles[0].ID_RolVehiculo;
  }
  const [fb] = await conn.query(
    `SELECT ID_RolVehiculo FROM rolesvehiculo
     WHERE UPPER(ID_Agencia) IN (UPPER(?), LOWER(?))
     ORDER BY ID_RolVehiculo LIMIT 1`,
    [agencyCode, agencyCode],
  );
  return fb[0]?.ID_RolVehiculo || 1;
}

async function insertInvolvedVehicle(conn, internalId, vehicle, userCtx, agencyCode) {
  const plate = String(vehicle.plate || '').trim();
  const roleName = String(vehicle.role || '').trim();
  if (!roleName && !plate && !vehicleHasCatalogData(vehicle)) return;

  const rolV = await resolveVehicleRoleId(conn, roleName, agencyCode);
  const [types] = await conn.query(
    `SELECT ID_TipoVehi FROM tipovehiculo ORDER BY ID_TipoVehi LIMIT 1`,
  );
  const [vehResult] = await conn.query(
    `INSERT INTO vehiculos
      (ID_RolV, ID_TipoVehi, Placa, Color, Marca, Modelo_linea, ID_incidente, ID_Agencia, ID_Usuario)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      rolV,
      types[0]?.ID_TipoVehi || 1,
      plate ? plate.toUpperCase() : null,
      vehicle.color || null,
      vehicle.make || null,
      vehicle.model || null,
      internalId,
      agencyCode,
      userCtx.userId,
    ],
  );

  const commentText = String(vehicle.details || '').trim();
  if (commentText && vehResult.insertId && userCtx.userId) {
    await insertVehicleComment(conn, vehResult.insertId, commentText, userCtx.userId, agencyCode);
  }
}

async function replaceInvolved(conn, internalId, people, vehicles, places, userCtx, agencyCode) {
  await clearInvolvedForIncident(conn, internalId);
  await replaceInvolvedPlaces(conn, internalId, places, userCtx, agencyCode);

  for (const person of people || []) {
    await insertInvolvedPerson(conn, internalId, person, userCtx, agencyCode);
  }
  for (const vehicle of vehicles || []) {
    await insertInvolvedVehicle(conn, internalId, vehicle, userCtx, agencyCode);
  }
}

async function createIncident(body, user) {
  const agencyCode = requireAgencyInput(body.agency, user);
  const userCtx = await resolveUserContext(user?.sub, agencyCode);
  const cats = await resolveCatalogIds(agencyCode, body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO incidentes
        (FechaHora, ID_evento, ID_Origen, ANI, Direccion, Latitud, Longitud,
         IDAgencias, ID_visible, id_departamento, id_municipio, ID_estado, ID_prioridad)
       VALUES (NOW(),?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        cats.eventoId,
        cats.origenId,
        body.phone || body.ani || null,
        body.location || 'Sin dirección',
        body.lat ?? 0,
        body.lng ?? 0,
        cats.agency,
        null,
        body.departmentId ?? body.department_id ?? null,
        body.municipalityId ?? body.municipality_id ?? null,
        cats.estadoId,
        cats.prioridadId,
      ],
    );
    const internalId = result.insertId;
    const visibleId = formatVisibleId(internalId);
    await conn.query(`UPDATE incidentes SET ID_visible = ? WHERE ID_incidente = ?`, [
      visibleId,
      internalId,
    ]);
    if (body.comments) {
      const plain = plainCommentText(body.comments);
      if (plain) await insertComment(conn, internalId, plain, userCtx);
    }
    await replaceInvolved(
      conn,
      internalId,
      body.involvedPeople,
      body.involvedVehicles,
      body.involvedPlaces,
      userCtx,
      cats.agency,
    );
    await linkLocationToIncident(
      internalId,
      {
        requestId: body.locationRequestId ?? body.location_request_id,
        solicitudId: body.locationSolicitudId ?? body.location_solicitud_id,
        phone: body.locationPhoneNumber ?? body.phone ?? body.ani,
      },
      conn,
    );
    await conn.commit();
    return visibleId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function assertIncidentStatusChange(currentStatus, newStatus, agencyCode) {
  if (!newStatus || newStatus === currentStatus) return;
  if (isFinalState(currentStatus)) {
    throw new HttpError(
      409,
      `El incidente está en estado final "${currentStatus}" y no puede modificarse.`,
    );
  }
  if (!isForwardStatusTransition(currentStatus, newStatus, agencyCode)) {
    throw new HttpError(
      409,
      `No se puede retroceder el estado del incidente: «${currentStatus}» → «${newStatus}».`,
    );
  }
}

async function assertCsjGestionIfNeeded(agencyCode, newStatus, currentStatus, visibleId) {
  if (String(agencyCode).toUpperCase() !== 'CSJ' || newStatus === 'Cerrado') return;
  const statusToValidate = newStatus || currentStatus;
  const gestion = await getGestionByIncidente(visibleId);
  const gestionError = validateGestionForStatus(statusToValidate, gestion);
  if (gestionError) throw new HttpError(409, gestionError);
}

async function assertMedidasIfRequired(newStatus, visibleId) {
  if (!newStatus || newStatus === 'Cerrado' || !requiresMedidas(newStatus)) return;
  const tieneMedidas = await hasAssignedMedidas(visibleId);
  if (!tieneMedidas) {
    throw new HttpError(
      409,
      'Debe asignar al menos una medida de seguridad antes de guardar el estado «Medidas asignadas».',
    );
  }
}

async function persistIncidentUpdate(conn, internalId, body, userCtx, cats) {
  await conn.query(
    `UPDATE incidentes SET
       ID_evento = ?, ID_Origen = ?, ANI = ?, Direccion = ?,
       Latitud = ?, Longitud = ?, id_departamento = ?, id_municipio = ?,
       ID_estado = ?, ID_prioridad = ?
     WHERE ID_incidente = ?`,
    [
      cats.eventoId,
      cats.origenId,
      body.phone ?? body.ani ?? null,
      body.location ?? 'Sin dirección',
      body.lat ?? 0,
      body.lng ?? 0,
      body.departmentId ?? body.department_id ?? null,
      body.municipalityId ?? body.municipality_id ?? null,
      cats.estadoId,
      cats.prioridadId,
      internalId,
    ],
  );
  if (body.comments) {
    const prev = await loadComments(internalId);
    if (body.comments !== prev) {
      const added = body.comments.replace(prev, '').trim();
      const plain = plainCommentText(added);
      if (plain) await insertComment(conn, internalId, plain, userCtx);
    }
  }
  await replaceInvolved(
    conn,
    internalId,
    body.involvedPeople,
    body.involvedVehicles,
    body.involvedPlaces,
    userCtx,
    cats.agency,
  );
}

async function updateIncident(visibleId, body, user) {
  const internalId = await getInternalId(visibleId);
  if (!internalId) return null;
  const agencyCode = requireAgencyInput(null, user);
  const userCtx = await resolveUserContext(user?.sub, agencyCode);
  const cats = await resolveCatalogIds(agencyCode, body);

  const [currentRows] = await pool.query(
    `SELECT es.Nombre_estado FROM incidentes i
     JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
     WHERE i.ID_incidente = ?`,
    [internalId],
  );
  const currentStatusRaw = currentRows[0]?.Nombre_estado;
  const currentStatus = mapStatusFromGi(currentStatusRaw);
  const newStatus = body.status;

  assertIncidentStatusChange(currentStatus, newStatus, agencyCode);
  await assertCsjGestionIfNeeded(agencyCode, newStatus, currentStatus, visibleId);
  await assertMedidasIfRequired(newStatus, visibleId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await persistIncidentUpdate(conn, internalId, body, userCtx, cats);
    await conn.commit();
    return visibleId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteIncident(visibleId) {
  const internalId = await getInternalId(visibleId);
  if (!internalId) return 0;
  await pool.query(
    `DELETE cl FROM comentarios_lugar cl
     INNER JOIN lugares l ON l.ID_lugar = cl.ID_lugar
     WHERE l.ID_incidente = ?`,
    [internalId],
  );
  await pool.query(`DELETE FROM lugares WHERE ID_incidente = ?`, [internalId]);
  await pool.query(
    `DELETE cp FROM comentariospersonas cp
     INNER JOIN personas p ON p.ID_persona = cp.ID_persona
     WHERE p.ID_incidente = ?`,
    [internalId],
  );
  await pool.query(`DELETE FROM personas WHERE ID_incidente = ?`, [internalId]);
  await deleteVehicleCommentsForIncident(pool, internalId);
  await pool.query(`DELETE FROM vehiculos WHERE ID_incidente = ?`, [internalId]);
  await pool.query(`DELETE FROM comentarios_incidentes WHERE ID_Incidente = ?`, [internalId]);
  await pool.query(`DELETE FROM auditoria_incidente WHERE incidentes_id = ?`, [internalId]);
  const [r] = await pool.query(`DELETE FROM incidentes WHERE ID_incidente = ?`, [internalId]);
  return r.affectedRows;
}

function auditActorFields(actor, isCreation) {
  if (!String(actor || '').trim()) return {};
  if (isCreation) {
    return { actorDisplayName: actor, creatorDisplayName: actor };
  }
  return { actorDisplayName: actor };
}

function buildAuditDetailsPayload(details, actorDisplayName, { isCreation = false } = {}) {
  const actor = String(actorDisplayName || '').trim();
  const actorFields = auditActorFields(actor, isCreation);
  if (Array.isArray(details)) {
    return Object.keys(actorFields).length
      ? { ...actorFields, changes: details }
      : { changes: details };
  }
  if (details && typeof details === 'object') {
    return { ...actorFields, ...details };
  }
  return Object.keys(actorFields).length ? actorFields : null;
}

async function writeAudit(conn, { incidentId, user, action, changes, details, creatorDisplayName, actorDisplayName }) {
  const internalId = await getInternalId(incidentId);
  if (!internalId) return;
  const agencyCode = requireAgencyInput(null, user);
  const userCtx = await resolveUserContext(user?.sub, agencyCode);
  const id = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const resolvedActor = actorDisplayName ?? creatorDisplayName ?? user?.name ?? null;
  const isCreation = String(action || '')
    .toLowerCase()
    .startsWith('creaci');
  const detailsPayload = buildAuditDetailsPayload(details, resolvedActor, { isCreation });
  await conn.query(
    `INSERT INTO auditoria_incidente
      (id_transaccion_incidentes, incidentes_id, usuarios_id, Id_agencia, accion, Numero_de_Cambios, detalles)
     VALUES (?,?,?,?,?,?,?)`,
    [
      id,
      internalId,
      userCtx.userId,
      userCtx.agencyCode,
      action,
      changes || null,
      detailsPayload ? JSON.stringify(detailsPayload) : null,
    ],
  );
}

async function loadAuditLogs(visibleId) {
  const internalId = await getInternalId(visibleId);
  if (!internalId) return [];
  const [rows] = await pool.query(
    `SELECT id_transaccion_incidentes AS id, accion AS action,
            Numero_de_Cambios AS changes, detalles AS details_json, fecha AS timestamp,
            usuarios_id AS user_id
     FROM auditoria_incidente
     WHERE incidentes_id = ?
     ORDER BY fecha ASC, id_transaccion_incidentes ASC`,
    [internalId],
  );
  return rows;
}

async function emailAllowed(recipients) {
  const { ensureEmailStatusColumn } = require('./correosSchema');
  await ensureEmailStatusColumn();
  const ph = recipients.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT DISTINCT LOWER(Correo) AS email FROM correosincidentes
     WHERE LOWER(Correo) IN (${ph})
       AND COALESCE(NULLIF(estado, ''), 'Activo') = 'Activo'`,
    recipients.map((e) => e.toLowerCase()),
  );
  return new Set(rows.map((r) => r.email));
}

module.exports = {
  getInternalId,
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  writeAudit,
  loadAuditLogs,
  emailAllowed,
  mapIncidentRow,
  latestLocationForIncident,
  fetchIncidentRows,
  hydrateIncidents,
  loadComments,
  loadLatestComment,
  mapPriorityFromGi,
  mapStatusFromGi,
  locationChannelToGi,
  locationChannelFromGi,
};

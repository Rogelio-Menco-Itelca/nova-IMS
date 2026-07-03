/**
 * Registro central de auditoría por usuario.
 *
 * `recordAudit` es el ÚNICO punto de escritura hacia `auditoria_general`.
 * Captura toda acción del usuario (sesión, seguridad, incidentes,
 * administración, configuración, comunicación). Nunca lanza: si falla el
 * registro de auditoría, la operación principal del usuario no se ve afectada.
 *
 * @module utils/auditTrail
 */

const { pool } = require('../config/db');
const logger = require('./logger');
const socket = require('../realtime/socket');

/** Categorías válidas → controlan el badge "Origen" en la UI. */
const CATEGORIES = Object.freeze([
  'sesion',
  'seguridad',
  'incidente',
  'administracion',
  'configuracion',
  'comunicacion',
  'consulta',
]);

/** Módulos reales del sistema (tabla `modules`) + Autenticación para sesión. */
const MODULES = Object.freeze(['Dashboard', 'Incidentes', 'Reportes', 'Administración', 'Autenticación']);

function normalizeCategory(cat) {
  const c = String(cat || '').toLowerCase();
  return CATEGORIES.includes(c) ? c : 'administracion';
}

/**
 * Inserta una fila de auditoría. Best-effort: nunca lanza.
 *
 * @param {object} entry
 * @param {object} [entry.user]           req.user (JWT) del actor
 * @param {string} [entry.actorId]        ID_Usuario explícito (override de user.sub)
 * @param {string} [entry.actorName]      Nombre del usuario (override de user.name)
 * @param {string} [entry.agencyCode]
 * @param {string} [entry.categoria]      Una de CATEGORIES
 * @param {string} [entry.modulo]         Módulo real (Dashboard/Incidentes/Reportes/Administración/Autenticación)
 * @param {string} [entry.tablaAfectada]  Nombre real de la tabla afectada
 * @param {string}  entry.accion          Texto legible de la acción
 * @param {string} [entry.resultado]      exitoso | fallido | pendiente
 * @param {string} [entry.detalle]        Descripción legible de lo que se hizo
 * @param {object} [entry.req]            Request Express (IP y evitar doble auditoría)
 * @returns {Promise<number|null>} ID de auditoría o null si falló
 */
async function recordAudit(entry = {}) {
  try {
    const {
      user = null,
      actorId = null,
      actorName = null,
      agencyCode = null,
      categoria = 'administracion',
      modulo = null,
      tablaAfectada = null,
      accion,
      resultado = null,
      detalle = null,
      req = null,
    } = entry;

    if (!accion) {
      logger.warn('[auditTrail] recordAudit sin accion; se omite');
      return null;
    }

    // Marca la petición para que el middleware genérico no la duplique.
    if (req) req.skipAutoAudit = true;

    const idUsuario = actorId ?? user?.sub ?? null;
    const nombre = actorName ?? user?.name ?? null;
    const agencia = agencyCode ?? user?.agency_code ?? null;
    const cat = normalizeCategory(categoria);

    const [result] = await pool.query(
      `INSERT INTO auditoria_general
        (Tabla_Afectada, Modulo, Categoria, Accion, Resultado,
         Detalle, ID_Usuario, Nombre_Usuario, ID_Agencia)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        tablaAfectada ? String(tablaAfectada).slice(0, 64) : null,
        modulo ? String(modulo).slice(0, 50) : null,
        cat,
        String(accion).slice(0, 150),
        resultado,
        detalle,
        idUsuario ? String(idUsuario).slice(0, 100) : null,
        nombre ? String(nombre).slice(0, 150) : null,
        agencia ? String(agencia).slice(0, 10) : null,
      ],
    );

    const id = result?.insertId ?? null;
    socket.emit('audit:log', {
      id,
      user: nombre || idUsuario || 'Sistema',
      category: cat,
      module: modulo || null,
      action: accion,
      result: resultado,
      timestamp: new Date(),
    });

    return id;
  } catch (err) {
    logger.error('[auditTrail]', err.message);
    return null;
  }
}

module.exports = {
  recordAudit,
  CATEGORIES,
  MODULES,
};


const { pool } = require('../config/db');
const logger = require('./logger');
const socket = require('../realtime/socket');

const CATEGORIES = Object.freeze([
  'sesion',
  'seguridad',
  'incidente',
  'administracion',
  'configuracion',
  'comunicacion',
  'consulta',
]);

const MODULES = Object.freeze(['Dashboard', 'Incidentes', 'Reportes', 'Administración', 'Autenticación']);

function normalizeCategory(cat) {
  const c = String(cat || '').toLowerCase();
  return CATEGORIES.includes(c) ? c : 'administracion';
}

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

function formatAuditDetailsText(details) {
  if (!Array.isArray(details) || !details.length) return '';
  return details
    .map((entry) => {
      if (entry && typeof entry === 'object' && entry.field != null) {
        const oldVal = entry.old ?? '(vacío)';
        const newVal = entry.new ?? '(vacío)';
        return `${entry.field}: ${oldVal} → ${newVal}`;
      }
      return String(entry ?? '');
    })
    .filter(Boolean)
    .join('. ');
}

module.exports = {
  recordAudit,
  formatAuditDetailsText,
  CATEGORIES,
  MODULES,
};

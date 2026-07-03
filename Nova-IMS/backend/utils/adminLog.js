const socket = require('../realtime/socket');
const { recordAudit } = require('./auditTrail');

/**
 * Registra una acción administrativa (personas, operadores…).
 * Escribe en `auditoria_general` vía el registro central y emite el evento
 * `admin:log` para el panel de administración en tiempo real.
 *
 * @param {object} jwtUser  Actor (req.user)
 * @param {string} action   Acción legible
 * @param {string} details  Detalle legible
 * @param {object} [req]    Request Express (para IP y evitar doble auditoría)
 * @param {object} [meta]   { tablaAfectada, modulo }
 */
async function writeAdminLog(jwtUser, action, details, req = null, meta = {}) {
  const id = await recordAudit({
    user: jwtUser,
    req,
    categoria: 'administracion',
    modulo: meta.modulo || 'Administración',
    tablaAfectada: meta.tablaAfectada || null,
    accion: action,
    detalle: details,
    resultado: 'exitoso',
  });

  socket.emit('admin:log', {
    id,
    user: jwtUser?.name || 'Sistema',
    action,
    details,
    timestamp: new Date(),
  });
}

module.exports = { writeAdminLog };

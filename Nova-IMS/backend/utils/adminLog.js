const socket = require('../realtime/socket');
const { recordAudit } = require('./auditTrail');

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

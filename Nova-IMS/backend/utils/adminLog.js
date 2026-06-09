const socket = require('../realtime/socket');
const giLogs = require('../db/gestionincidentes/logs');

async function writeAdminLog(jwtUser, action, details) {
  const row = await giLogs.writeAdminLog(jwtUser, action, details);
  socket.emit('admin:log', {
    id: row.id,
    user: row.user,
    action: row.action,
    details: row.details,
    timestamp: row.timestamp,
  });
}

module.exports = { writeAdminLog };

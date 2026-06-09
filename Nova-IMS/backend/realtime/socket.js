let io = null;

function init(server, corsOrigin) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: corsOrigin || '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });

  return io;
}

function get() {
  if (!io) throw new Error('Socket.IO no ha sido inicializado');
  return io;
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

module.exports = { init, get, emit };

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const notificationsRoutes = require('./routes/notification.route');
const { pool, testConnection } = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const socket = require('./realtime/socket');

const app = express();
const server = http.createServer(app);

// ---------- Middlewares ----------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------- Health ----------
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ------ Ubicación pública (sin auth) ------
const locationRoutes = require('./routes/location.routes');
app.use('/location', locationRoutes);

// ---------- API ----------
app.use('/api', routes);

// ---------- Notificaciones ----------
app.use('/api/notifications', notificationsRoutes);

// ---------- Errores ----------
app.use((req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada' } }));
app.use(errorHandler);

// ---------- Socket.IO ----------
socket.init(server, process.env.CORS_ORIGIN || '*');

// ---------- Boot ----------
const PORT = Number(process.env.PORT || 3000);
const { getPublicUrlAsync } = require('./utils/publicUrl');

async function bootstrap() {
  try {
    await testConnection();
  } catch (err) {
    console.error('[DB] No se pudo conectar a MySQL:', err.message);
    console.error('     Revisa tus credenciales en el archivo .env y que MySQL esté corriendo.');
    process.exit(1);
  }

  const publicUrl = await getPublicUrlAsync();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`╔════════════════════════════════════════════════════╗`);
    console.log(`║  Backend IMS activo                                ║`);
    console.log(`║  HTTP  : http://localhost:${PORT}${' '.repeat(21)}║`);
    console.log(`║  Socket: ws://localhost:${PORT}/socket.io${' '.repeat(13)}║`);
    console.log(`║  CORS  : ${(process.env.CORS_ORIGIN || '*').padEnd(41)}║`);
    console.log(`║  PUBLIC: ${publicUrl.padEnd(41)}║`);
    if (publicUrl.includes('localhost')) {
      console.log('║  ⚠ WhatsApp: ejecute ngrok http 3000              ║');
    }
    console.log(`╚════════════════════════════════════════════════════╝`);
  });
}

bootstrap();

// Cierre gracioso
process.on('SIGTERM', () => {
  console.log('SIGTERM');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('SIGINT');
  server.close(() => process.exit(0));
});

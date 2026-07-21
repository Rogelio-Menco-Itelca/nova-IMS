require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('node:http');
const notificationsRoutes = require('./routes/notification.route');
const { testConnection } = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const socket = require('./realtime/socket');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

const locationRoutes = require('./routes/location.routes');
app.use('/location', locationRoutes);

app.use('/api', routes);

app.use('/api/notifications', notificationsRoutes);

app.use((req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada' } }));
app.use(errorHandler);

socket.init(server, process.env.CORS_ORIGIN || '*');

const PORT = Number(process.env.PORT || 3000);
const { getPublicUrlAsync } = require('./utils/publicUrl');

async function bootstrap() {
  try {
    await testConnection();
  } catch (err) {
    logger.error('[DB] No se pudo conectar a MySQL:', err.message);
    logger.error('     Revisa tus credenciales en el archivo .env y que MySQL esté corriendo.');
    process.exit(1);
  }

  const publicUrl = await getPublicUrlAsync();

  server.listen(PORT, '0.0.0.0', () => {
    logger.info('╔════════════════════════════════════════════════════╗');
    logger.info('║  Backend IMS activo                                ║');
    logger.info(`║  HTTP  : http://localhost:${PORT}${' '.repeat(21)}║`);
    logger.info(`║  Socket: ws://localhost:${PORT}/socket.io${' '.repeat(13)}║`);
    logger.info(`║  CORS  : ${(process.env.CORS_ORIGIN || '*').padEnd(41)}║`);
    logger.info(`║  PUBLIC: ${publicUrl.padEnd(41)}║`);
    if (publicUrl.includes('localhost')) {
      logger.info('║  ⚠ WhatsApp: ejecute ngrok http 3000              ║');
    }
    logger.info('╚════════════════════════════════════════════════════╝');
  });
}

bootstrap();

process.on('SIGTERM', () => {
  logger.info('SIGTERM');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  logger.info('SIGINT');
  server.close(() => process.exit(0));
});

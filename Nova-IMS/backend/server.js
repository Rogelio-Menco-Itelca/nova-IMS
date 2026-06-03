require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const notificationsRoutes = require("./routes/notification.route");
const { pool, testConnection } = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const socket = require("./realtime/socket");
const telephonyRoutes = require("./routes/telephony.routes");

const app = express();
const server = http.createServer(app);

// ---------- Middlewares ----------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ---------- Health ----------
app.get("/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));

// ------ Ubicación pública (sin auth) ------
const locationRoutes = require("./routes/location.routes");
app.use("/location", locationRoutes);

// ---------- API ----------
app.use("/api", routes);
// ---------- Telephony ----------
app.use("/api/telephony", telephonyRoutes);

// ---------- Notificaciones ----------
app.use("/api/notifications", notificationsRoutes);

// ---------- Errores ----------
app.use((req, res) =>
  res.status(404).json({ error: { message: "Ruta no encontrada" } }),
);
app.use(errorHandler);

// ---------- Socket.IO ----------
socket.init(server, process.env.CORS_ORIGIN || "*");

// ---------- Boot ----------
const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  try {
    await testConnection();
  } catch (err) {
    console.error("[DB] No se pudo conectar a MySQL:", err.message);
    console.error(
      "     Revisa tus credenciales en el archivo .env y que MySQL esté corriendo.",
    );
    process.exit(1);
  }

  // Auto-seed opcional de cuentas locales (ver sql/seed_users.js)
  if (process.env.AUTO_SEED_USERS === "true") {
    try {
      const [u] = await pool.query("SELECT COUNT(*) AS n FROM users");
      if (!u[0].n) {
        console.log(
          "[BOOT] No hay usuarios en la DB → ejecutando seed local opcional...",
        );
        const { seed } = require("./sql/seed_users");
        await seed();
      }
    } catch (err) {
      console.warn(
        "[BOOT] Aviso: no se pudo auto-sembrar usuarios:",
        err.message,
      );
    }
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`╔════════════════════════════════════════════════════╗`);
    console.log(`║  Backend IMS activo                                ║`);
    console.log(`║  HTTP  : http://localhost:${PORT}${" ".repeat(21)}║`);
    console.log(
      `║  Socket: ws://localhost:${PORT}/socket.io${" ".repeat(13)}║`,
    );
    console.log(`║  CORS  : ${(process.env.CORS_ORIGIN || "*").padEnd(41)}║`);
    console.log(`╚════════════════════════════════════════════════════╝`);
  });
}

bootstrap();

// Cierre gracioso
process.on("SIGTERM", () => {
  console.log("SIGTERM");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("SIGINT");
  server.close(() => process.exit(0));
});

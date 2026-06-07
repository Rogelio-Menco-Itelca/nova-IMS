/**
 * URL pública del backend (enlaces WhatsApp/SMS, location share).
 *
 * Prioridad:
 * 1. PUBLIC_URL si no es localhost
 * 2. NGROK_URL en .env
 * 3. Auto-detectar túnel ngrok local (http://127.0.0.1:4040/api/tunnels)
 * 4. PUBLIC_URL aunque sea localhost
 * 5. http://localhost:PORT
 */

const http = require("http");
const logger = require("./logger");

function isLoopbackHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1";
}

function isLoopbackUrl(url) {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeBaseUrl(raw) {
  return String(raw || "").trim().replace(/\/+$/, "");
}

let cachedResolvedPublicUrl = null;
let cachedNgrokDiscovery = { url: null, at: 0 };
const DISCOVERY_TTL_MS = 15_000;

function discoverNgrokPublicUrl() {
  const now = Date.now();
  if (
    cachedNgrokDiscovery.url &&
    now - cachedNgrokDiscovery.at < DISCOVERY_TTL_MS
  ) {
    return Promise.resolve(cachedNgrokDiscovery.url);
  }

  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:4040/api/tunnels", (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];
          const httpsTunnel = tunnels.find((t) =>
            String(t.public_url || "").startsWith("https://"),
          );
          const url = normalizeBaseUrl(httpsTunnel?.public_url || "");
          cachedNgrokDiscovery = { url: url || null, at: Date.now() };
          resolve(url || null);
        } catch {
          cachedNgrokDiscovery = { url: null, at: Date.now() };
          resolve(null);
        }
      });
    });
    req.on("error", () => {
      cachedNgrokDiscovery = { url: null, at: Date.now() };
      resolve(null);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      cachedNgrokDiscovery = { url: null, at: Date.now() };
      resolve(null);
    });
  });
}

async function resolvePublicUrl() {
  const publicUrl = normalizeBaseUrl(process.env.PUBLIC_URL);
  const ngrokUrl = normalizeBaseUrl(process.env.NGROK_URL);

  if (publicUrl && !isLoopbackUrl(publicUrl)) {
    cachedResolvedPublicUrl = publicUrl;
    return publicUrl;
  }
  if (ngrokUrl) {
    cachedResolvedPublicUrl = ngrokUrl;
    return ngrokUrl;
  }

  const discovered = await discoverNgrokPublicUrl();
  if (discovered) {
    cachedResolvedPublicUrl = discovered;
    logger.info(`[PUBLIC_URL] Túnel ngrok detectado: ${discovered}`);
    return discovered;
  }

  if (publicUrl) {
    cachedResolvedPublicUrl = publicUrl;
    return publicUrl;
  }

  const port = Number(process.env.PORT || 3000);
  const fallback = `http://localhost:${port}`;
  cachedResolvedPublicUrl = fallback;
  return fallback;
}

function getPublicUrl() {
  if (cachedResolvedPublicUrl) return cachedResolvedPublicUrl;
  const publicUrl = normalizeBaseUrl(process.env.PUBLIC_URL);
  const ngrokUrl = normalizeBaseUrl(process.env.NGROK_URL);
  if (publicUrl && !isLoopbackUrl(publicUrl)) return publicUrl;
  if (ngrokUrl) return ngrokUrl;
  if (publicUrl) return publicUrl;
  const port = Number(process.env.PORT || 3000);
  return `http://localhost:${port}`;
}

async function getPublicUrlAsync() {
  return resolvePublicUrl();
}

function isPublicUrlReachableFromMobile(url) {
  const value = url || getPublicUrl();
  return value.startsWith("https://") && !isLoopbackUrl(value);
}

function publicUrlSetupHint(url) {
  const value = url || getPublicUrl();
  if (isPublicUrlReachableFromMobile(value)) return null;
  return (
    "El enlace salió como localhost. Inicie ngrok (ngrok http 3000) o configure " +
    "NGROK_URL=https://su-tunel.ngrok-free.dev en backend/.env y reinicie el backend."
  );
}

async function buildLocationShareUrlAsync(requestId) {
  const base = await resolvePublicUrl();
  const id = encodeURIComponent(String(requestId));
  return `${base}/location/share?request_id=${id}`;
}

function buildLocationShareUrl(requestId) {
  const id = encodeURIComponent(String(requestId));
  return `${getPublicUrl()}/location/share?request_id=${id}`;
}

module.exports = {
  getPublicUrl,
  getPublicUrlAsync,
  buildLocationShareUrl,
  buildLocationShareUrlAsync,
  isPublicUrlReachableFromMobile,
  publicUrlSetupHint,
  isLoopbackUrl,
  discoverNgrokPublicUrl,
};

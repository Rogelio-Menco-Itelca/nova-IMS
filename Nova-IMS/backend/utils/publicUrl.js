
const http = require('node:http');
const logger = require('./logger');

function isLoopbackHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1';
}

function isLoopbackUrl(url) {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeBaseUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/+$/, '');
}

function isPlaceholderUrl(url) {
  const u = String(url || '')
    .trim()
    .toLowerCase();
  if (!u) return true;
  const patterns = ['tu-tunel', 'su-tunel', 'xxxx', 'ejemplo', 'example', 'cambia'];
  if (patterns.some((p) => u.includes(p))) return true;
  try {
    const { hostname } = new URL(u);
    if (!hostname || hostname.startsWith('.')) return true;
  } catch {
    return true;
  }
  return false;
}

function resolveConfiguredNgrokUrl() {
  const raw = normalizeBaseUrl(process.env.NGROK_URL);
  return isPlaceholderUrl(raw) ? '' : raw;
}

let cachedResolvedPublicUrl = null;
let cachedNgrokDiscovery = { url: null, at: 0 };
const DISCOVERY_TTL_MS = 15_000;

function pickHttpsNgrokUrl(tunnels) {
  for (const tunnel of tunnels) {
    const url = String(tunnel.public_url || '');
    if (url.startsWith('https://')) {
      return normalizeBaseUrl(url);
    }
  }
  return '';
}

function parseNgrokTunnelsResponse(body) {
  try {
    const data = JSON.parse(body);
    const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];
    return pickHttpsNgrokUrl(tunnels) || null;
  } catch {
    return null;
  }
}

function readHttpResponseBody(res) {
  return new Promise((resolve, reject) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => resolve(body));
    res.on('error', reject);
  });
}

function fetchNgrokTunnelsBody() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      readHttpResponseBody(res).then(resolve).catch(reject);
    });
    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('ngrok discovery timeout'));
    });
  });
}

function cacheNgrokDiscovery(url) {
  cachedNgrokDiscovery = { url: url || null, at: Date.now() };
  return url || null;
}

async function discoverNgrokPublicUrl() {
  const now = Date.now();
  if (cachedNgrokDiscovery.url && now - cachedNgrokDiscovery.at < DISCOVERY_TTL_MS) {
    return cachedNgrokDiscovery.url;
  }

  try {
    const body = await fetchNgrokTunnelsBody();
    return cacheNgrokDiscovery(parseNgrokTunnelsResponse(body));
  } catch {
    return cacheNgrokDiscovery(null);
  }
}

async function resolvePublicUrl() {
  const publicUrl = normalizeBaseUrl(process.env.PUBLIC_URL);
  const ngrokUrl = resolveConfiguredNgrokUrl();

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
  const ngrokUrl = resolveConfiguredNgrokUrl();
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
  return value.startsWith('https://') && !isLoopbackUrl(value);
}

function publicUrlSetupHint(url) {
  const value = url || getPublicUrl();
  if (isPublicUrlReachableFromMobile(value)) return null;
  return (
    'El enlace salió como localhost. Inicie ngrok (ngrok http 3000) o configure ' +
    'NGROK_URL=https://su-tunel.ngrok-free.dev en backend/.env y reinicie el backend.'
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

/**
 * Genera sql/03_seed_geo.sql desde fuente pública DIVIPOLA (JSON).
 * Uso: node scripts/generate-colombia-geo-seed.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json';
const OUT = path.join(__dirname, '..', 'sql', '03_seed_geo.sql');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchJson(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function padDaneDept(id) {
  return String(id).padStart(2, '0');
}

async function main() {
  console.log('[GEO] Descargando catálogo Colombia...');
  const raw = await fetchJson(SOURCE_URL);

  const lines = [
    '-- Seed departamentos y municipios (generado por scripts/generate-colombia-geo-seed.js)',
    'SET NAMES utf8mb4;',
    '',
    'INSERT IGNORE INTO departments (dane_code, name) VALUES',
  ];

  const deptRows = [];
  const muniRows = [];

  for (const dept of raw) {
    const daneCode = padDaneDept(dept.id);
    const name = String(dept.departamento || '').trim();
    if (!name) continue;
    deptRows.push(`('${esc(daneCode)}', '${esc(name)}')`);

    const cities = dept.ciudades || [];
    for (let i = 0; i < cities.length; i++) {
      const entry = cities[i];
      const muniName =
        typeof entry === 'string' ? entry.trim() : String(entry.ciudad || entry.name || '').trim();
      if (!muniName) continue;
      const muniCode =
        typeof entry === 'object' && entry.id != null
          ? String(entry.id).padStart(5, '0')
          : `${daneCode}${String(i + 1).padStart(3, '0')}`;
      muniRows.push({
        deptDane: daneCode,
        daneCode: muniCode,
        name: muniName,
      });
    }
  }

  lines.push(deptRows.join(',\n') + ';');
  lines.push('');
  lines.push('INSERT IGNORE INTO municipalities (department_id, dane_code, name)');
  lines.push('SELECT d.id, v.dane_code, v.name');
  lines.push('FROM (');
  const values = muniRows.map(
    (m) =>
      `  SELECT '${esc(m.deptDane)}' AS dept_dane, '${esc(m.daneCode)}' AS dane_code, '${esc(m.name)}' AS name`,
  );
  lines.push(values.join(' UNION ALL\n'));
  lines.push(') v');
  lines.push('JOIN departments d ON d.dane_code = v.dept_dane;');
  lines.push('');

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log(`[GEO] OK: ${deptRows.length} departamentos, ${muniRows.length} municipios → ${OUT}`);
}

main().catch((err) => {
  console.error('[GEO] ERROR:', err.message);
  process.exit(1);
});

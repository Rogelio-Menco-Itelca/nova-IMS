const nodemailer = require('nodemailer');
const {
  formatLatestNoteForEmail,
  formatLatestNoteHtml,
} = require('../utils/incidentNotes');

let transporter;

function init() {
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);

  if (transporter) return;

  if (!process.env.SMTP_HOST) {
    console.warn('[MAIL] modo consola (sin SMTP)');
    return;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendWelcomeEmail({ to, name, username, password }) {
  init();

  console.log('📧 Intentando enviar correo a:', to);

 const text = `
Estimado/a ${name},

Le informamos que su cuenta ha sido creada exitosamente en el sistema IMS NOVA.

Detalles de acceso:

Usuario: ${username}
Contraseña temporal: ${password}

IMPORTANTE:
Por motivos de seguridad, deberá cambiar su contraseña en su primer inicio de sesión.

Acceso al sistema:
${process.env.APP_URL}

Si usted no reconoce esta acción, comuníquese con el administrador.

Atentamente,
Equipo IMS NOVA
`;

  if (!transporter) {
    console.log('📧 EMAIL (modo consola)');
    console.log(text);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Credenciales IMS NOVA',
      text,
    });

    console.log('✅ Correo enviado a', to);

  } catch (err) {
    console.error('❌ Error enviando email:', err.message);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function dash(value) {
  const s = String(value ?? '').trim();
  return s || '—';
}

function formatDocument(person) {
  const type = String(person.documentType || '').trim();
  const id = String(person.documentId || '').trim();
  if (type && id) return `${type} — ${id}`;
  if (id) return id;
  if (type) return type;
  return '';
}

function formatPersonText(p, index) {
  const lines = [
    `  ${index}. ${dash(p.name)} (${dash(p.role)})`,
  ];
  const doc = formatDocument(p);
  if (doc) lines.push(`     Documento: ${doc}`);
  const gender = String(p.gender || '').trim();
  if (gender) lines.push(`     Género: ${gender}`);
  const phone = String(p.phone || p.contact || '').trim();
  if (phone) lines.push(`     Teléfono/Contacto: ${phone}`);
  if (p.address) lines.push(`     Dirección: ${p.address}`);
  if (p.details) lines.push(`     Detalles: ${p.details}`);
  return lines.join('\n');
}

function formatVehicleText(v, index) {
  const lines = [
    `  ${index}. Placa: ${dash(v.plate)} | Rol: ${dash(v.role)}`,
  ];
  const specs = [v.make, v.model, v.color].filter((x) => String(x || '').trim());
  if (specs.length) lines.push(`     Marca/Modelo/Color: ${specs.join(' | ')}`);
  if (v.incidentDate) {
    lines.push(`     Registrado en incidente: ${formatDateTime(v.incidentDate)}`);
  }
  if (v.details) lines.push(`     Detalles: ${v.details}`);
  return lines.join('\n');
}

function formatPersonHtml(p) {
  const doc = formatDocument(p);
  const phone = String(p.phone || p.contact || '').trim();
  const bits = [
    `<strong>${escapeHtml(dash(p.name))}</strong> (${escapeHtml(dash(p.role))})`,
  ];
  if (doc) bits.push(`Documento: ${escapeHtml(doc)}`);
  const gender = String(p.gender || '').trim();
  if (gender) bits.push(`Género: ${escapeHtml(gender)}`);
  if (phone) bits.push(`Teléfono/Contacto: ${escapeHtml(phone)}`);
  if (p.address) bits.push(`Dirección: ${escapeHtml(p.address)}`);
  if (p.details) bits.push(`Detalles: ${escapeHtml(p.details)}`);
  return `<li style="margin-bottom:8px;">${bits.join('<br>')}</li>`;
}

function formatVehicleHtml(v) {
  const specs = [v.make, v.model, v.color].filter((x) => String(x || '').trim());
  const bits = [
    `<strong>Placa ${escapeHtml(dash(v.plate))}</strong> — Rol: ${escapeHtml(dash(v.role))}`,
  ];
  if (specs.length) {
    bits.push(`Marca/Modelo/Color: ${escapeHtml(specs.join(' | '))}`);
  }
  if (v.incidentDate) {
    bits.push(`Registrado: ${escapeHtml(formatDateTime(v.incidentDate))}`);
  }
  if (v.details) bits.push(`Detalles: ${escapeHtml(v.details)}`);
  return `<li style="margin-bottom:8px;">${bits.join('<br>')}</li>`;
}

function parseAuditDetails(details) {
  if (!details) return [];
  if (Array.isArray(details)) return details;
  try {
    const parsed = JSON.parse(details);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatAuditText(logs) {
  if (!logs?.length) {
    return '  (sin registros en el historial)';
  }
  const body = logs
    .map((log) => {
      const lines = [
        `  ── Último registro ──`,
        `  [${formatDateTime(log.timestamp)}] ${dash(log.user)} — ${dash(log.action)}`,
      ];
      if (log.changes) lines.push(`  Resumen: ${log.changes}`);
      const details = parseAuditDetails(log.details);
      for (const d of details) {
        lines.push(
          `    • ${d.field}: "${d.old ?? '(vacío)'}" → "${d.new ?? '(vacío)'}"`,
        );
      }
      return lines.join('\n');
    })
    .join('\n\n');
  return body;
}

function formatAuditHtml(logs) {
  if (!logs?.length) {
    return '<p style="margin:0;color:#6b7280;">(sin registros en el historial)</p>';
  }
  const entries = logs
    .map((log) => {
      const details = parseAuditDetails(log.details);
      const detailHtml = details.length
        ? `<ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:#374151;">
            ${details
              .map(
                (d) =>
                  `<li><strong>${escapeHtml(d.field)}:</strong> ${escapeHtml(d.old ?? '(vacío)')} → ${escapeHtml(d.new ?? '(vacío)')}</li>`,
              )
              .join('')}
           </ul>`
        : '';
      return `
        <div style="margin-bottom:12px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:11px;font-weight:700;color:#6366f1;margin-bottom:6px;text-transform:uppercase;">Último registro</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${escapeHtml(formatDateTime(log.timestamp))} · ${escapeHtml(dash(log.user))}</div>
          <div style="font-weight:600;color:#111827;">${escapeHtml(dash(log.action))}</div>
          ${log.changes ? `<div style="font-size:13px;color:#374151;margin-top:4px;font-style:italic;">${escapeHtml(log.changes)}</div>` : ''}
          ${detailHtml}
        </div>`;
    })
    .join('');
  return entries;
}

function incidentSummaryRows(incident) {
  const ts = formatDateTime(incident.timestamp);
  const rows = [
    ['ID incidente', incident.id || '—'],
    ['ID evento', incident.event_id || '—'],
    ['Tipo de evento', incident.type || '—'],
    ['Prioridad', incident.priority || '—'],
    ['Estado', incident.status || '—'],
    ['Fecha/Hora registro', ts],
  ];

  if (incident.updatedAt) {
    const updated = formatDateTime(incident.updatedAt);
    if (updated !== ts) {
      rows.push(['Última actualización', updated]);
    }
  }

  // Fecha de cierre inferida del historial (futuro: columna closed_at en incidents)
  if (incident.status === 'Cerrado') {
    rows.push([
      'Fecha/Hora de cierre (estimada)',
      incident.closedAt ? formatDateTime(incident.closedAt) : '—',
    ]);
  }

  const locationPhone = (() => {
    const v = String(incident.locationPhoneNumber ?? '').trim();
    if (!v || v.toUpperCase() === 'N/A') return 'N/A';
    return v;
  })();

  rows.push(
    ['Operador', incident.operator || '—'],
    ['Origen', incident.origin || '—'],
    ['Teléfono llamada', incident.phone || '—'],
    ['ANI', incident.ani || '—'],
    ['Teléfono ubicación (SMS/WhatsApp)', locationPhone],
    ['Ubicación', incident.location || '—'],
    [
      'Departamento (Ubicación del Incidente)',
      incident.departmentName || '—',
    ],
    [
      'Municipio / ciudad (Ubicación del Incidente)',
      incident.municipalityName || '—',
    ],
    ['Coordenadas', `${incident.lat ?? '—'}, ${incident.lng ?? '—'}`],
  );

  return rows;
}

function formatIncidentBodyText(incident) {
  const peopleList = incident.involvedPeople || [];
  const vehicleList = incident.involvedVehicles || [];
  const people =
    peopleList.map((p, i) => formatPersonText(p, i + 1)).join('\n') ||
    '  (ninguna)';
  const vehicles =
    vehicleList.map((v, i) => formatVehicleText(v, i + 1)).join('\n') ||
    '  (ninguno)';
  const audit = formatAuditText(incident.auditLogs || []);

  const header = incidentSummaryRows(incident)
    .map(([label, value]) => `${label.padEnd(22)} ${value}`)
    .join('\n');

  return `
Notificación de incidente — IMS NOVA
Vitácora completa del caso

${header}

Comentario:
${formatLatestNoteForEmail(incident.comments)}

Personas involucradas:
${people}

Vehículos involucrados:
${vehicles}

Último cambio registrado:
${audit}

---
Mensaje generado automáticamente por IMS NOVA.
AVISO DE CONFIDENCIALIDAD Y LEGALIDAD:
Este correo contiene información confidencial de uso exclusivo para los destinatarios autorizados.
`.trim();
}

function formatIncidentBodyHtml(incident) {
  const ts = formatDateTime(incident.timestamp);
  const people =
    (incident.involvedPeople || []).map(formatPersonHtml).join('') ||
    '<li>(ninguna)</li>';
  const vehicles =
    (incident.involvedVehicles || []).map(formatVehicleHtml).join('') ||
    '<li>(ninguno)</li>';
  const auditHtml = formatAuditHtml(incident.auditLogs || []);

  const rows = incidentSummaryRows(incident);

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="width:220px;padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;">${escapeHtml(label)}:</td>
          <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `
<div style="background:#f9fafb;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.45;">
  <div style="max-width:900px;margin:0 auto;">
    <p style="margin:0 0 8px;font-size:15px;">Estimado especialista,</p>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;">Notificación de incidente ${escapeHtml(incident.id || '')}</h2>
    <p style="margin:0 0 14px;font-size:13px;color:#4b5563;">Vitácora completa · Registrado ${escapeHtml(ts)}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:16px;border:1px solid #e5e7eb;">
      ${tableRows}
      <tr>
        <td style="padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;vertical-align:top;">Comentario:</td>
        <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">${formatLatestNoteHtml(incident.comments)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;vertical-align:top;">Personas involucradas:</td>
        <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">
          <ul style="margin:0;padding-left:18px;">${people}</ul>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;vertical-align:top;">Vehículos involucrados:</td>
        <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">
          <ul style="margin:0;padding-left:18px;">${vehicles}</ul>
        </td>
      </tr>
    </table>

    <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#111827;">Último cambio registrado</h3>
    ${auditHtml}

    <p style="margin:16px 0 4px;color:#4b5563;font-size:12px;">Mensaje generado automáticamente por IMS NOVA.</p>
    <p style="margin:0;color:#6b7280;font-size:11px;">AVISO DE CONFIDENCIALIDAD Y LEGALIDAD: Este correo contiene información confidencial de uso exclusivo para los destinatarios autorizados.</p>
  </div>
</div>`.trim();
}

async function sendIncidentNotification({ to, incident }) {
  init();

  const recipients = Array.isArray(to) ? to : [to];
  const subject = `[IMS NOVA] Incidente ${incident.id} — ${incident.type || 'Sin tipo'}`;
  const text = formatIncidentBodyText(incident);
  const html = formatIncidentBodyHtml(incident);

  if (!transporter) {
    console.log('📧 EMAIL incidente (modo consola)');
    console.log('Para:', recipients.join(', '));
    console.log('Asunto:', subject);
    console.log(text);
    return { mode: 'console', recipients };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(', '),
    subject,
    text,
    html,
  });

  return { mode: 'smtp', recipients };
}


// ---------- 2FA: correo OTP ----------

async function sendOtpEmail({ to, name, code }) {
  init();

  const text = `Hola ${name},\n\nSu código de verificación es:\n\n  ${code}\n\nExpira en 10 minutos.\n\n— IMS NOVA`;

  const html = `
<div style="background:#f9fafb;padding:32px;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;">Verificación en dos pasos</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hola <strong>${escapeHtml(name)}</strong>, ingrese el siguiente código:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;letter-spacing:10px;font-size:36px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:16px 28px;border-radius:8px;font-family:monospace;">${escapeHtml(code)}</span>
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">Expira en <strong>10 minutos</strong>.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Si no lo solicitó, ignore este mensaje.</p>
  </div>
</div>`.trim();

  if (!transporter) {
    console.log('\n📧 OTP (modo consola) → Para:', to, '| Código:', code);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: '[IMS NOVA] Código de verificación',
    text,
    html,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendOtpEmail,
  sendIncidentNotification,
  formatIncidentBodyText,
  formatIncidentBodyHtml,
};

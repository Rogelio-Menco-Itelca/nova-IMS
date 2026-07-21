const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { latestIncidentNote } = require('../utils/incidentNotes');

const DEFAULT_MAIL_FROM = 'Itelca S.A.S <NOVA.IMS.CSJ@itelca.com.co>';

let transporter = null;

function isResendConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getMailProvider() {
  const requested = String(process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (requested === 'console') return 'console';
  if (requested === 'smtp') return isSmtpConfigured() ? 'smtp' : 'console';
  if (requested === 'resend') return isResendConfigured() ? 'resend' : 'console';
  if (isResendConfigured()) return 'resend';
  if (isSmtpConfigured()) return 'smtp';
  return 'console';
}

function isMailConfigured() {
  return getMailProvider() !== 'console';
}

function getMailFrom() {
  const from = String(process.env.MAIL_FROM || process.env.SMTP_FROM || '').trim();
  if (from) return from;
  const user = String(process.env.SMTP_USER || '').trim();
  if (user) return `Itelca S.A.S <${user}>`;
  return DEFAULT_MAIL_FROM;
}

function normalizeRecipients(to) {
  const list = Array.isArray(to) ? to : [to];
  return list.map((item) => String(item ?? '').trim()).filter(Boolean);
}

async function sendMailViaResend({ from, to, subject, text, html }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no configurada');
  }

  const recipients = normalizeRecipients(to);
  if (!recipients.length) {
    throw new Error('No hay destinatarios de correo');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || getMailFrom(),
      to: recipients,
      subject,
      text,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.error || response.statusText;
    if (/not authorized to send emails from/i.test(String(detail))) {
      throw new Error(
        `Resend: el dominio del remitente (${getMailFrom()}) no está verificado. ` +
          'Verifique itelca.com.co en resend.com/domains o use MAIL_FROM=onboarding@resend.dev para pruebas.',
      );
    }
    throw new Error(`Resend: ${detail}`);
  }

  return payload;
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      requireTLS: true,
      tls: {
        minVersion: 'TLSv1.2',
      },
    });
  }
  return transporter;
}

async function sendMailViaSmtp({ from, to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error('SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  return transport.sendMail({
    from: from || getMailFrom(),
    to: normalizeRecipients(to).join(', '),
    subject,
    text,
    html,
  });
}

async function sendMail({ from, to, subject, text, html }) {
  const provider = getMailProvider();
  if (provider === 'resend') {
    return sendMailViaResend({ from, to, subject, text, html });
  }
  if (provider === 'smtp') {
    return sendMailViaSmtp({ from, to, subject, text, html });
  }
  throw new Error('Correo en modo consola (configure RESEND_API_KEY o MAIL_PROVIDER=smtp)');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPersonName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function sendWelcomeEmail({
  to,
  name,
  username,
  password,
  agencyName,
  agencyCode,
  role,
  telefono,
}) {
  logger.info('📧 Intentando enviar correo de bienvenida');

  if (!isMailConfigured()) {
    logger.warn(`[MAIL] modo consola (${getMailProvider()})`);
    return;
  }

  const displayName = formatPersonName(name);
  const agencyLabel =
    agencyName && agencyCode ? `${agencyName} (${agencyCode})` : agencyName || agencyCode || '—';
  const appUrl = process.env.APP_URL || 'http://localhost:4200';
  const phoneLine = telefono ? `\nTeléfono registrado: ${telefono.trim()}` : '';

  const text = `
Estimado/a ${displayName},

Le informamos que su cuenta ha sido creada exitosamente en el sistema IMS NOVA.

Datos de su cuenta:
  Nombre: ${displayName}
  Correo: ${to}
  Agencia asignada: ${agencyLabel}
  Rol: ${role || '—'}${phoneLine}

Detalles de acceso al sistema:
  Usuario: ${username}
  Contraseña temporal: ${password}

Al iniciar sesión deberá seleccionar la agencia "${agencyCode || agencyName}" y el rol "${role || '—'}".

IMPORTANTE:
Por motivos de seguridad, deberá cambiar su contraseña en su primer inicio de sesión.

Acceso al sistema:
${appUrl}

Si usted no reconoce esta acción, comuníquese con el administrador.

Atentamente,
Equipo IMS NOVA
`.trim();

  const html = `
<div style="background:#f9fafb;padding:32px;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;">Bienvenido/a a IMS NOVA</h2>
    <p style="margin:0 0 20px;color:#6b7280;">Estimado/a <strong>${escapeHtml(displayName)}</strong>, su cuenta ha sido creada exitosamente.</p>

    <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.04em;">Datos de su cuenta</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Nombre</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(displayName)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Correo</td><td style="padding:8px 0;">${escapeHtml(to)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Agencia</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(agencyLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Rol</td><td style="padding:8px 0;">${escapeHtml(role || '—')}</td></tr>
      ${telefono ? `<tr><td style="padding:8px 0;color:#6b7280;">Teléfono</td><td style="padding:8px 0;">${escapeHtml(telefono.trim())}</td></tr>` : ''}
    </table>

    <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.04em;">Credenciales de acceso</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;background:#f8fafc;border-radius:8px;">
      <tr><td style="padding:10px 12px;color:#6b7280;width:140px;">Usuario</td><td style="padding:10px 12px;font-family:monospace;font-weight:700;">${escapeHtml(username)}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b7280;">Contraseña temporal</td><td style="padding:10px 12px;font-family:monospace;font-weight:700;">${escapeHtml(password)}</td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:13px;color:#4b5563;background:#eef2ff;border-left:4px solid #4f46e5;padding:12px 14px;border-radius:0 6px 6px 0;">
      Al iniciar sesión seleccione la agencia <strong>${escapeHtml(agencyCode || agencyName || '—')}</strong>
      y el rol <strong>${escapeHtml(role || '—')}</strong>.
    </p>

    <p style="margin:0 0 16px;font-size:13px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;padding:12px 14px;border-radius:6px;">
      <strong>Importante:</strong> por seguridad deberá cambiar su contraseña en el primer inicio de sesión.
    </p>

    <p style="margin:0 0 8px;font-size:14px;">Acceso al sistema:</p>
    <p style="margin:0 0 20px;"><a href="${escapeHtml(appUrl)}" style="color:#4f46e5;font-weight:600;">${escapeHtml(appUrl)}</a></p>

    <p style="margin:0;font-size:12px;color:#9ca3af;">Si no reconoce esta acción, contacte al administrador.<br>Equipo IMS NOVA</p>
  </div>
</div>`.trim();

  try {
    await sendMail({
      from: getMailFrom(),
      to,
      subject: 'Credenciales IMS NOVA — Cuenta creada',
      text,
      html,
    });
    logger.info('✅ Correo de bienvenida enviado');
  } catch (err) {
    logger.error('❌ Error enviando email:', err.message);
  }
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
  const lines = [`  ${index}. ${dash(p.name)} (${dash(p.role)})`];
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
  const lines = [`  ${index}. Placa: ${dash(v.plate)} | Rol: ${dash(v.role)}`];
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
  const bits = [`<strong>${escapeHtml(dash(p.name))}</strong> (${escapeHtml(dash(p.role))})`];
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
        lines.push(`    • ${d.field}: "${d.old ?? '(vacío)'}" → "${d.new ?? '(vacío)'}"`);
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

function hasOsegGestion(gestion) {
  return (
    Boolean(String(gestion?.codigo_oficio || '').trim()) &&
    Boolean(String(gestion?.tramite_destino || '').trim())
  );
}

function hasCerremGestion(gestion) {
  return (
    Boolean(String(gestion?.resolucion_cerrem || '').trim()) &&
    Boolean(gestion?.ID_riesgo)
  );
}

function resolveLatestCommentEntry(incident) {
  if (incident?.latestComment?.text) {
    return {
      timestamp: incident.latestComment.timestamp,
      text: incident.latestComment.text,
    };
  }
  return latestIncidentNote(incident?.comments);
}

function formatLatestCommentText(incident) {
  const e = resolveLatestCommentEntry(incident);
  if (!e?.text) return '(sin comentario)';
  const when = e.timestamp || 'Sin fecha';
  return `[${when}]\n${e.text}`;
}

function formatLatestCommentHtml(incident) {
  const e = resolveLatestCommentEntry(incident);
  if (!e?.text) {
    return '<p style="margin:0;color:#6b7280;">(sin comentario)</p>';
  }
  return `
        <div style="padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${escapeHtml(e.timestamp || 'Sin fecha')}</div>
          <div style="font-size:13px;color:#111827;white-space:pre-wrap;">${escapeHtml(e.text)}</div>
        </div>`;
}

function formatGestionOsegText(gestion) {
  if (!hasOsegGestion(gestion)) return '';
  const lines = [
    `Oficio trámite: ${dash(gestion.codigo_oficio)}`,
    `Trámite / destino: ${dash(gestion.tramite_destino)}`,
  ];
  const servidor = String(gestion.servidor_judicial || '').trim();
  if (servidor) {
    const extra = [gestion.cedula, gestion.cargo].filter((x) => String(x || '').trim());
    const suffix = extra.length ? ` (${extra.join(' — ')})` : '';
    lines.push(`Servidor judicial: ${servidor}${suffix}`);
  }
  return lines.join('\n');
}

function formatGestionCerremText(gestion) {
  if (!hasCerremGestion(gestion)) return '';
  const lines = [
    `Fecha CERREM: ${gestion.fecha_cerrem ? formatDateTime(gestion.fecha_cerrem) : '—'}`,
    `Resolución CERREM: ${dash(gestion.resolucion_cerrem)}`,
    `Fecha resolución: ${gestion.fecha_resolucion ? formatDateTime(gestion.fecha_resolucion) : '—'}`,
    `Nivel de riesgo: ${dash(gestion.nivel_riesgo)}`,
  ];
  if (gestion.tipo_esquema) {
    lines.push(`Tipo de esquema: ${gestion.tipo_esquema}`);
    if (gestion.tipo_esquema === 'Colectivo' && gestion.compartido_con) {
      lines.push(`Compartido con: ${gestion.compartido_con}`);
    }
  }
  if (gestion.observaciones) lines.push(`Observaciones: ${gestion.observaciones}`);
  return lines.join('\n');
}

function formatMedidasSeguridadText(medidas) {
  const list = (medidas || []).filter((m) => m.asignado !== 0);
  if (!list.length) return '';
  return list
    .map((m, i) => {
      const lines = [`  ${i + 1}. ${dash(m.nombre)} — Cantidad: ${m.cantidad ?? 1}`];
      if (m.observacion_medida) lines.push(`     Observación: ${m.observacion_medida}`);
      if (m.fecha_asignacion) {
        lines.push(`     Asignado: ${formatDateTime(m.fecha_asignacion)}`);
      }
      return lines.join('\n');
    })
    .join('\n');
}

function formatGestionOsegHtml(gestion) {
  const text = formatGestionOsegText(gestion);
  if (!text) return '';
  return `<div style="font-size:13px;color:#111827;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function formatGestionCerremHtml(gestion) {
  const text = formatGestionCerremText(gestion);
  if (!text) return '';
  return `<div style="font-size:13px;color:#111827;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function formatMedidasSeguridadHtml(medidas) {
  const list = (medidas || []).filter((m) => m.asignado !== 0);
  if (!list.length) return '';
  return `<ul style="margin:0;padding-left:18px;">
    ${list
      .map((m) => {
        const bits = [
          `<strong>${escapeHtml(dash(m.nombre))}</strong> — Cantidad: ${escapeHtml(String(m.cantidad ?? 1))}`,
        ];
        if (m.observacion_medida) {
          bits.push(`Observación: ${escapeHtml(m.observacion_medida)}`);
        }
        if (m.fecha_asignacion) {
          bits.push(`Asignado: ${escapeHtml(formatDateTime(m.fecha_asignacion))}`);
        }
        return `<li style="margin-bottom:8px;">${bits.join('<br>')}</li>`;
      })
      .join('')}
  </ul>`;
}

function gestionVitacoraRows(incident) {
  const gestion = incident.gestion;
  const rows = [];
  const oseg = formatGestionOsegText(gestion);
  if (oseg) rows.push(['Gestión OSEG', oseg]);
  const cerrem = formatGestionCerremText(gestion);
  if (cerrem) rows.push(['Decisión CERREM', cerrem]);
  const medidas = formatMedidasSeguridadText(incident.medidasSeguridad);
  if (medidas) rows.push(['Medidas de seguridad', medidas]);
  return rows;
}

function gestionVitacoraHtmlRows(incident) {
  const gestion = incident.gestion;
  const rows = [];
  const oseg = formatGestionOsegHtml(gestion);
  if (oseg) rows.push(['Gestión OSEG', oseg]);
  const cerrem = formatGestionCerremHtml(gestion);
  if (cerrem) rows.push(['Decisión CERREM', cerrem]);
  const medidas = formatMedidasSeguridadHtml(incident.medidasSeguridad);
  if (medidas) rows.push(['Medidas de seguridad', medidas]);
  return rows;
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

  if (['Cerrado', 'Cancelado', 'Resuelto'].includes(incident.status)) {
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
    ['ANI', incident.ani || incident.phone || '—'],
    ['Teléfono ubicación (SMS/WhatsApp)', locationPhone],
    ['Ubicación', incident.location || '—'],
    ['Departamento (Ubicación del Incidente)', incident.departmentName || '—'],
    ['Municipio / ciudad (Ubicación del Incidente)', incident.municipalityName || '—'],
    ['Coordenadas', `${incident.lat ?? '—'}, ${incident.lng ?? '—'}`],
  );

  return rows;
}

function formatIncidentBodyText(incident) {
  const peopleList = incident.involvedPeople || [];
  const vehicleList = incident.involvedVehicles || [];
  const people = peopleList.map((p, i) => formatPersonText(p, i + 1)).join('\n') || '  (ninguna)';
  const vehicles =
    vehicleList.map((v, i) => formatVehicleText(v, i + 1)).join('\n') || '  (ninguno)';
  const audit = formatAuditText(incident.auditLogs || []);

  const header = incidentSummaryRows(incident)
    .map(([label, value]) => `${label.padEnd(22)} ${value}`)
    .join('\n');
  const gestionRows = gestionVitacoraRows(incident)
    .map(([label, value]) => `\n${label}:\n${value}`)
    .join('');

  return `
Notificación de incidente — IMS NOVA
Vitácora completa del caso

${header}
${gestionRows}

Comentario (último registrado):
${formatLatestCommentText(incident)}

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
    (incident.involvedPeople || []).map(formatPersonHtml).join('') || '<li>(ninguna)</li>';
  const vehicles =
    (incident.involvedVehicles || []).map(formatVehicleHtml).join('') || '<li>(ninguno)</li>';
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

  const gestionTableRows = gestionVitacoraHtmlRows(incident)
    .map(
      ([label, valueHtml]) => `
        <tr>
          <td style="width:220px;padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(label)}:</td>
          <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">${valueHtml}</td>
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
      ${gestionTableRows}
      <tr>
        <td style="padding:10px 12px;background:#f8fafc;color:#111827;font-weight:600;border:1px solid #e5e7eb;vertical-align:top;">Comentario (último):</td>
        <td style="padding:10px 12px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;">${formatLatestCommentHtml(incident)}</td>
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
  if (!isMailConfigured()) {
    logger.info(`📧 EMAIL incidente (modo consola, provider=${getMailProvider()})`);
    return { mode: 'console', recipients: Array.isArray(to) ? to : [to] };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const subject = `[IMS NOVA] Incidente ${incident.id} — ${incident.type || 'Sin tipo'}`;
  const text = formatIncidentBodyText(incident);
  const html = formatIncidentBodyHtml(incident);

  await sendMail({
    from: getMailFrom(),
    to: recipients,
    subject,
    text,
    html,
  });

  return { mode: getMailProvider(), recipients };
}

async function sendOtpEmail({ to, name, code }) {
  if (!isMailConfigured()) {
    logger.info(`📧 OTP (modo consola, provider=${getMailProvider()}) código=${code}`);
    return;
  }

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

  await sendMail({
    from: getMailFrom(),
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
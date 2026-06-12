# 🚨 Incident Management System (IMS) — Nova-IMS

Sistema completo de gestión de incidentes de emergencia en tiempo real.
Incluye panel administrativo, dashboard con mapa, gestión de operadores, personas, protocolos, auditoría y solicitud de ubicación por WhatsApp/SMS.

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
| ---- | ---------- |
| **Frontend** | Angular 20, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express 4, Socket.IO 4 |
| **Base datos** | MySQL 8.x |
| **Auth** | JWT + bcryptjs + LDAP/Active Directory |
| **Tiempo real** | Socket.IO |
| **Package manager** | pnpm 11 |

---

## 📁 Estructura del monorepo

Nova-IMS/
├── backend/
│   ├── config/
│   ├── controllers/          # 11 controllers
│   ├── db/gestionincidentes/ # Queries MySQL
│   ├── middleware/           # JWT + errorHandler
│   ├── realtime/             # Socket.IO
│   ├── routes/
│   ├── services/             # auth, ldap, email, otp
│   ├── sql/                  # Schema + seed + scripts
│   ├── utils/
│   ├── views/                # location-share.html
│   ├── .env.example
│   ├── .npmrc                # Supply-chain policy pnpm 11
│   ├── eslint.config.js
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/       # login, admin, incidents, reports
│   │   ├── services/         # auth, incident, socket, location
│   │   ├── interceptors/     # JWT interceptor
│   │   └── models/
│   ├── proxy.conf.json
│   ├── angular.json
│   ├── eslint.config.js
│   ├── pnpm-lock.yaml
│   └── package.json
│
├── .github/
│   └── dependabot.yml
├── .gitignore
├── .prettierrc
├── .prettierignore
├── LICENSE
└── README.md

---

## 🚀 Inicio rápido

### Prerrequisitos

- **Node.js** 18 o superior
- **MySQL** 8.x
- **pnpm** 11 — `npm install -g pnpm@latest`
- **git**

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/Rogelio-Menco-Itelca/nova-IMS.git
cd nova-IMS/Nova-IMS
```

### 2️⃣ Backend

```bash
cd backend
cp .env.example .env        # edita con tus credenciales MySQL
pnpm install
pnpm run db:import          # esquema + catálogos base (datos operativos: dump del cliente)
pnpm dev                    # http://localhost:3000
```

### 3️⃣ Frontend (en otra terminal)

```bash
cd frontend
pnpm install
pnpm dev                    # http://localhost:4200
```

### 4️⃣ Iniciar sesión

Abre [http://localhost:4200](http://localhost:4200).

**Login con directorio:** agencia `CENTRAL`, usuario = `uid` de OpenLDAP/AD. Configura `LDAP_ENABLED=true` en `backend/.env`.

**Login local:** crea el operador desde el panel de Administración con contraseña en MySQL.

---

## 🌍 Variables de entorno — Backend (`.env`)

```env
PORT=3000
CORS_ORIGIN=http://localhost:4200

JWT_SECRET=cambia-esta-clave-en-produccion
JWT_EXPIRES_IN=8h

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=gestionincidentes

LDAP_ENABLED=false
LDAP_URL=ldap://localhost:389
LDAP_BIND_DN=cn=readonly,dc=ims,dc=local
LDAP_BIND_PASSWORD=...
LDAP_BASE_DN=dc=ims,dc=local
LDAP_USER_ATTRIBUTE=uid
LDAP_DEFAULT_ROLE_ID=RP-3
LDAP_DEFAULT_AGENCY_CODE=CENTRAL

SMTP_HOST=smtp.gmail.com
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_app_password
```

---

## 🔧 Scripts

### Backend

| Script | Descripción |
| ------ | ----------- |
| `pnpm dev` | Nodemon (hot reload) |
| `pnpm start` | Producción |
| `pnpm run db:import` | Esquema + catálogos base en MySQL |
| `pnpm run ldap:test` | Prueba login LDAP |
| `pnpm audit` | Verifica vulnerabilidades |
| `pnpm run lint` | ESLint |

### Frontend

| Script | Descripción |
| ------ | ----------- |
| `pnpm dev` | Dev server (puerto 4200) |
| `pnpm build` | Build producción |
| `pnpm run lint` | ESLint Angular |
| `pnpm audit` | Verifica vulnerabilidades |

---

## 🗺️ Arquitectura

┌──────────────────────────┐
       │       Navegador          │
       │  Angular 20 (puerto 4200)│
       └──────────┬───────────────┘
                  │
      ┌───────────┴────────────┐
      │                        │
  HTTP (REST)            WebSocket (Socket.IO)
  /api/**                /socket.io
      │                        │
      └───────────┬────────────┘
                  │
       ┌──────────┴─────────────┐
       │   Backend Node/Express │
       │       (puerto 3000)    │
       │  • JWT + bcryptjs      │
       │  • LDAP / AD           │
       │  • Controllers         │
       │  • Realtime events     │
       └──────────┬─────────────┘
                  │
               mysql2
                  │
       ┌──────────┴─────────────┐
       │     MySQL 8.x          │
       │  gestionincidentes     │
       └────────────────────────┘
### Proxy de desarrollo

Angular dev server redirige automáticamente `/api/**` y `/socket.io` al backend (puerto 3000) via `proxy.conf.json`, evitando problemas de CORS.

### Autenticación

- Login llama `POST /api/auth/login` → devuelve JWT
- JWT se guarda en `sessionStorage` (key `ims_token`)
- Interceptor `auth.interceptor.ts` agrega `Authorization: Bearer <token>` a todas las peticiones
- Timeout de inactividad configurable con cierre automático de sesión
- MFA por OTP en el flujo de autenticación

---

## ✨ Funcionalidades

- 🔐 **Autenticación** JWT + bcrypt + LDAP, 6 roles con matriz de permisos
- 🗺️ **Dashboard** con Google Maps mostrando incidentes activos en tiempo real
- 📋 **CRUD completo** de incidentes, personas, operadores, tipos, protocolos
- 📊 **Reportes** con filtros por fecha, estado y exportación
- 📜 **Auditoría automática** en cada cambio de estado o prioridad
- 🔴 **Tiempo real** vía Socket.IO sin necesidad de refrescar
- 📱 **Solicitud de ubicación** por WhatsApp/SMS con consentimiento del usuario
- 📧 **Notificaciones por email** al crear, reasignar o cerrar incidentes
- 🛡️ **Permisos granulares** por rol y módulo

---

## 🔌 API REST

Todas las rutas protegidas requieren:

```http
Authorization: Bearer <token>
```

### 🔓 Públicas

| Método | Ruta | Body |
| ------ | ---- | ---- |
| POST | `/api/auth/login` | `{ agencia, usuario, password }` |
| POST | `/api/auth/verify-otp` | `{ token, otp }` |
| GET | `/api/agencies` | — |
| GET | `/api/roles/list` | — |

### 🔒 Incidentes

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/incidents` | Lista todos |
| GET | `/api/incidents/:id` | Detalle completo |
| POST | `/api/incidents` | Crea (emite `incident:created`) |
| PUT | `/api/incidents/:id` | Actualiza (auditoría automática) |
| DELETE | `/api/incidents/:id` | Elimina |

### 🔒 Resto

- **Personas**: `GET/POST/PUT/DELETE /api/people[/:id]`, `GET /api/telephony/lookup/:phone`
- **Operadores**: `GET/POST/PUT/DELETE /api/operators[/:id]`
- **Tipos**: `GET/POST/PUT/DELETE /api/incident-types[/:id]`
- **Protocolos**: `GET/POST/PUT/DELETE /api/response-protocols[/:id]`
- **Emails**: `GET/POST/DELETE /api/notification-emails[/:email]`
- **Roles**: `GET/POST/PUT/DELETE /api/roles[/:id]`
- **Logs**: `GET /api/admin-logs`, `GET /api/audit-logs?incidentId=INC-1`
- **Ubicación**: `GET/POST /api/location-requests`, `POST /api/location-requests/:id/received`
- **Reportes**: `GET /api/reports`
- **Catálogos**: `GET /api/catalog/*`

---

## 📡 Eventos Socket.IO

| Evento | Payload | Cuándo |
| ------ | ------- | ------ |
| `incident:created` | `Incident` | Se crea un incidente |
| `incident:updated` | `Incident` | Se actualiza |
| `incident:deleted` | `{ id }` | Se elimina |
| `admin:log` | `AdminActionLog` | Acción administrativa |
| `location:received` | `{ id, lat, lng, phoneNumber }` | Llega ubicación |

---

## 🛡️ Calidad y Seguridad

| Herramienta | Scope | Estado |
| ----------- | ----- | ------ |
| ESLint + angular-eslint | Frontend | ✅ 0 errores |
| ESLint + security plugin | Backend | ✅ 0 errores |
| Prettier | Ambos | ✅ 65 archivos formateados |
| pnpm 11 supply-chain policy | Ambos | ✅ Implementado |
| pnpm audit | Ambos | ✅ 0 vulnerabilidades |
| Dependabot | Ambos | ✅ Monitoreo semanal |
| Semgrep OSS | CI/CD | 🔄 Pendiente |
| Playwright E2E | Frontend | 🔄 Pendiente |

### Supply-chain policy (`.npmrc`)

```ini
minimumReleaseAge=1440        # No instala paquetes publicados hace < 24h
trustPolicy=no-downgrade      # Rechaza drops en evidencia de procedencia
trustPolicyIgnoreAfter=43200  # Omite verificación para paquetes > 30 días
```

---

## 🔐 Checklist de producción

- [ ] Cambiar `JWT_SECRET` por string aleatorio de 64+ chars
- [ ] Cambiar contraseñas de usuarios demo
- [ ] Habilitar HTTPS (nginx como reverse proxy)
- [ ] Agregar `express-rate-limit` en `/api/auth/login`
- [ ] Agregar `helmet` para cabeceras de seguridad
- [ ] Activar `LDAP_ENABLED=true` con credenciales de producción
- [ ] Configurar backups automáticos de MySQL
- [ ] Revisar permisos `requireRole(...)` en rutas sensibles

---

## 🛠️ Troubleshooting

**`ECONNREFUSED 127.0.0.1:3000`** → El backend no está corriendo. Ejecuta `pnpm dev` en la carpeta `backend/`.

**`ER_ACCESS_DENIED_ERROR`** → Revisa `DB_USER` y `DB_PASSWORD` en `.env`.

**Login da 401** → Verifica `LDAP_ENABLED` y credenciales. Para login local revisa la cuenta en MySQL.

**CORS bloqueado** → Ajusta `CORS_ORIGIN` en `.env` al origen del frontend.

**Socket.IO no conecta** → Verifica `proxy.conf.json` y que el backend esté en puerto 3000.

**Página en blanco tras login** → Abre DevTools (F12). El importmap requiere internet para cargar Angular desde CDN.

**Cambiar contraseña manualmente:**

```bash
node -e "console.log(require('bcryptjs').hashSync('nuevaClave', 10))"
```

```sql
UPDATE users SET password_hash = '<hash>' WHERE username = 'admin';
```

---

## 📝 Licencia

MIT — ver [LICENSE](./LICENSE).

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m 'feat: agrega nueva feature'`
4. Push: `git push origin feature/mi-feature`
5. Abre un Pull Request


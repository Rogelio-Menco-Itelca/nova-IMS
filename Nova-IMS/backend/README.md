# Backend — Incident Management System

API REST + Socket.IO + MySQL para el sistema de gestión de incidentes.

---

## 📦 Stack

- **Node.js 18+** con Express 4
- **MySQL 8.x** con mysql2/promise
- **Socket.IO 4** para eventos en tiempo real
- **JWT** (jsonwebtoken) + **bcryptjs** para auth

---

## ⚡ Setup rápido

```bash
cp .env.example .env       # edita con tus credenciales MySQL
npm install
npm run dev                # http://localhost:3000
```

Importa la base **`gestionincidentes`** desde `backend/sql/` (extraído de `Dump20260607.sql`):

```bash
npm run db:import        # esquema + catálogos + geo
# o
npm run db:import:full   # dump completo
```

Ver `sql/README.md` para detalle de archivos.

---

## 🔧 Scripts npm

| Script              | Descripción                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Arranca con nodemon (hot reload) |
| `npm start`         | Arranca en modo producción       |
| `npm run ldap:test` | Prueba login contra LDAP         |

---

## 🌍 Variables de entorno (`.env`)

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
```

### Login híbrido (directorio + MySQL local)

| Usuario                                | Dónde valida contraseña | ¿Fila en `users`? |
| -------------------------------------- | ----------------------- | ----------------- |
| `uid` del directorio (p. ej. `rmenco`) | OpenLDAP / AD           | No obligatoria    |
| Cuenta local (panel Administración)    | bcrypt en MySQL         | Sí                |

Código: `services/auth.service.js` (lógica) · `services/ldap.service.js` (directorio) · `controllers/auth.controller.js` (rutas HTTP).

Diagnóstico: `GET /api/auth/ldap-health` · `npm run ldap:test -- rmenco pass123`

---

## 🗄️ Base de datos

El esquema y catálogos están en **`backend/sql/`** (origen: `Dump20260607.sql`).

```bash
npm run db:import
```

Ver `sql/README.md` para la política del proyecto respecto a MySQL.

---

## 🔌 API REST

Todas las rutas (excepto las públicas 🔓) requieren:

```http
Authorization: Bearer <token>
```

### 🔓 Auth (públicas)

| Método | Ruta              | Body                             |
| ------ | ----------------- | -------------------------------- |
| POST   | `/api/auth/login` | `{ agencia, usuario, password }` |
| GET    | `/api/agencies`   | —                                |
| GET    | `/api/roles/list` | —                                |

### 🔒 Incidentes

| Método | Ruta                 | Descripción                      |
| ------ | -------------------- | -------------------------------- |
| GET    | `/api/incidents`     | Lista todos                      |
| GET    | `/api/incidents/:id` | Detalle con personas y vehículos |
| POST   | `/api/incidents`     | Crea (emite `incident:created`)  |
| PUT    | `/api/incidents/:id` | Actualiza (auditoría automática) |
| DELETE | `/api/incidents/:id` | Elimina                          |

### 🔒 Resto

- **Personas**: `GET/POST/PUT/DELETE /api/people[/:id]`, `GET /api/telephony/lookup/:phone`
- **Operadores**: `GET/POST/PUT/DELETE /api/operators[/:id]`
- **Tipos**: `GET/POST/PUT/DELETE /api/incident-types[/:id]`
- **Protocolos**: `GET/POST/PUT/DELETE /api/response-protocols[/:id]`
- **Emails notif.**: `GET/POST/DELETE /api/notification-emails[/:email]`
- **Roles/permisos**: `GET/POST/PUT/DELETE /api/roles[/:id]`
- **Logs**: `GET /api/admin-logs`, `GET /api/audit-logs?incidentId=INC-1`
- **Ubicación**: `GET/POST /api/location-requests`, `POST /api/location-requests/:id/received`

---

## 📡 Eventos Socket.IO

Path `/socket.io`:

| Evento              | Payload                         | Cuándo                    |
| ------------------- | ------------------------------- | ------------------------- |
| `incident:created`  | `Incident`                      | Se crea un incidente      |
| `incident:updated`  | `Incident`                      | Se actualiza un incidente |
| `incident:deleted`  | `{ id }`                        | Se elimina                |
| `admin:log`         | `AdminActionLog`                | Acción administrativa     |
| `location:received` | `{ id, lat, lng, phoneNumber }` | Llega ubicación           |

---

## 📂 Estructura

```
backend/
├── config/
│   ├── db.js
│   └── ldap.js                        # Variables LDAP_*
├── controllers/
├── services/
│   ├── auth.service.js                # Login híbrido (directorio + local)
│   └── ldap.service.js                # Cliente OpenLDAP / AD
├── middleware/
│   ├── auth.js                        # JWT + requireRole
│   └── errorHandler.js
├── realtime/socket.js                 # Socket.IO singleton
├── routes/index.js                    # Cableado de rutas
├── sql/
│   ├── 01_schema.sql
│   ├── 02_seed_catalogs.sql
│   ├── 03_seed_geo.sql
│   ├── gestionincidentes_dump.sql
│   ├── import-db.js
│   └── README.md
├── utils/
│   ├── asyncHandler.js
│   ├── HttpError.js
│   └── ids.js
├── .env.example
├── package.json
└── server.js
```

---

## 🛡️ Seguridad

Para producción asegúrate de:

- Cambiar `JWT_SECRET` por un string largo y aleatorio (64+ chars)
- No usar contraseñas débiles en cuentas locales de MySQL
- Habilitar HTTPS (terminar TLS en un reverse proxy como nginx)
- Añadir **express-rate-limit** al endpoint `/api/auth/login`
- Añadir **helmet** para cabeceras de seguridad
- Considerar refresh tokens
- Activar permisos por rol con `requireRole('RP-1','RP-2')` en rutas sensibles (helper ya disponible en `middleware/auth.js`)

---

## 🛠️ Troubleshooting

**`ER_ACCESS_DENIED_ERROR`** → revisa `DB_USER` y `DB_PASSWORD` en `.env`.

**Login da 401** → verifica `LDAP_ENABLED`, credenciales del directorio (`npm run ldap:test -- uid clave`) o cuenta local en MySQL.

**CORS bloqueado** → ajusta `CORS_ORIGIN` en `.env` al origen del frontend.

**Quiero cambiar una contraseña manualmente**:

```bash
node -e "console.log(require('bcryptjs').hashSync('nuevaClave', 10))"
```

Luego en MySQL:

```sql
UPDATE users SET password_hash = '<hash>' WHERE username = 'admin';
```

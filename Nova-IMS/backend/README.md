# Backend — Incident Management System

API REST + Socket.IO + MySQL para el sistema de gestión de incidentes.

---

## 📦 Stack

- **Node.js 18+** con Express 4
- **MySQL 8.x** con mysql2/promise
- **Socket.IO 4** para eventos en tiempo real
- **JWT** (jsonwebtoken) + **bcryptjs** para auth
- **pnpm 11** como package manager

---

## ⚡ Setup rápido

```bash
cp .env.example .env       # edita con tus credenciales MySQL
pnpm install
pnpm dev                   # http://localhost:3000
```

Base **`gestionincidentes`**: en producción se usa el dump MySQL del cliente. Para solo esquema + catálogos base:

```bash
pnpm run db:import
```

Ver `sql/README.md` (geo, usuarios y operación no van en el repo).

---

## 🔧 Scripts pnpm

| Script               | Descripción                      |
| -------------------- | -------------------------------- |
| `pnpm dev`           | Arranca con nodemon (hot reload) |
| `pnpm start`         | Arranca en modo producción       |
| `pnpm run ldap:test` | Prueba login contra LDAP         |
| `pnpm audit`         | Verifica vulnerabilidades        |

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

Código: `services/auth.service.js` · `services/ldap.service.js` · `controllers/auth.controller.js`

Diagnóstico: `GET /api/auth/ldap-health` · `pnpm run ldap:test -- rmenco pass123`

---

## 🗄️ Base de datos

```bash
pnpm run db:import
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

| Evento              | Payload                         | Cuándo                    |
| ------------------- | ------------------------------- | ------------------------- |
| `incident:created`  | `Incident`                      | Se crea un incidente      |
| `incident:updated`  | `Incident`                      | Se actualiza un incidente |
| `incident:deleted`  | `{ id }`                        | Se elimina                |
| `admin:log`         | `AdminActionLog`                | Acción administrativa     |
| `location:received` | `{ id, lat, lng, phoneNumber }` | Llega ubicación           |

---

## 📂 Estructura

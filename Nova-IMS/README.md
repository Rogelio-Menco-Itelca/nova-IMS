# 🚨 Incident Management System (IMS)

Sistema completo de gestión de incidentes de emergencia en tiempo real.
Incluye panel administrativo, dashboard con mapa, gestión de operadores, personas, protocolos, auditoría y solicitud de ubicación por WhatsApp/SMS.

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🧱 Stack tecnológico

| Capa            | Tecnología                                    |
| --------------- | --------------------------------------------- |
| **Frontend**    | Angular 20, TypeScript, Tailwind CSS, Leaflet |
| **Backend**     | Node.js, Express 4, Socket.IO 4               |
| **Base datos**  | MySQL 8.x                                     |
| **Auth**        | JWT + bcryptjs                                |
| **Tiempo real** | Socket.IO                                     |

---

## 📁 Estructura del monorepo

```
incident-management-system/
├── backend/                  # API REST + Socket.IO + MySQL
│   ├── config/
│   ├── controllers/          # 11 controllers
│   ├── middleware/           # JWT + errorHandler
│   ├── realtime/             # Socket.IO
│   ├── routes/
│   ├── sql/                  # Schema + seed + init scripts
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/                 # Cliente Angular 20
│   ├── src/
│   │   ├── components/       # login, admin, incidents, reports, ...
│   │   ├── services/         # auth, incident, config, socket, ...
│   │   ├── interceptors/     # JWT interceptor
│   │   └── models/
│   ├── proxy.conf.json
│   ├── angular.json
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md                 # ← estás aquí
```

---

## 🚀 Inicio rápido

### Prerrequisitos

- **Node.js** 18 o superior
- **MySQL** 8.x (puedes usar MySQL Workbench para administrarlo)
- **npm** (viene con Node)
- **git**

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/incident-management-system.git
cd incident-management-system
```

### 2️⃣ Configurar y arrancar el backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL (DB_USER, DB_PASSWORD)

npm install
npm run db:init    # Crea base, tablas, catálogos y usuarios demo
npm run dev        # Arranca en http://localhost:3000
```

### 3️⃣ Arrancar el frontend (en otra terminal)

```bash
cd frontend
npm install
npm run dev        # Arranca en http://localhost:4200
```

### 4️⃣ Iniciar sesión

Abre [http://localhost:4200](http://localhost:4200).

**Login con directorio (recomendado):** agencia `CENTRAL`, usuario = `uid` de OpenLDAP (p. ej. `rmenco`, `admin`) y su contraseña del directorio. Configura `LDAP_ENABLED=true` en `backend/.env`.

**Login local (opcional):** solo si creaste el operador en Administración con contraseña en MySQL.

---

## 🗺️ Diagrama de arquitectura

```
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
           │  • JWT (bcryptjs)      │
           │  • Controllers         │
           │  • Realtime events     │
           └──────────┬─────────────┘
                      │
                   mysql2
                      │
           ┌──────────┴─────────────┐
           │     MySQL 8.x          │
           │  Database: ims_db      │
           │  (15 tablas normaliz.) │
           └────────────────────────┘
```

---

## ✨ Funcionalidades principales

- 🔐 **Autenticación** JWT con bcrypt, 6 roles predefinidos con matriz de permisos por módulo
- 🗺️ **Dashboard** con mapa Leaflet mostrando incidentes activos en tiempo real
- 📋 **CRUD completo** de incidentes, personas, operadores, tipos, protocolos, emails
- 📊 **Reportes** históricos con filtros por fecha, estado y texto
- 📜 **Auditoría automática** cada vez que cambia estado o prioridad de un incidente
- 🔴 **Tiempo real** vía Socket.IO: nuevos incidentes, actualizaciones y logs aparecen sin refrescar
- 📱 **Solicitud de ubicación** por WhatsApp y SMS, con lookup por número de teléfono
- 🛡️ **Permisos granulares** por rol y módulo (Dashboard, Incidentes, Reportes, Administración)

---

## 📡 API & Eventos

La documentación completa de endpoints REST y eventos Socket.IO está en [`backend/README.md`](./backend/README.md).

---

## 🔐 Nota de seguridad

Antes de desplegar a producción:

- Cambia `JWT_SECRET` por una clave aleatoria robusta
- Cambia las contraseñas de los usuarios demo
- Habilita HTTPS
- Añade rate-limiting a `/api/auth/login`
- Añade `helmet` al Express
- Revisa los permisos `requireRole(...)` en las rutas sensibles

---

## 📝 Licencia

MIT — ver [LICENSE](./LICENSE).

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea una rama para tu feature: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m 'feat: agrega nueva feature'`
4. Push: `git push origin feature/mi-feature`
5. Abre un Pull Request

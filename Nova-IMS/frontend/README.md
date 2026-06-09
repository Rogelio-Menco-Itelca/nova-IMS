## Incident Management System — Frontend

Cliente **Angular 20** conectado al backend Node.js + MySQL.

---

## ⚡ Inicio rápido

### 1. Asegúrate de que el backend ya esté corriendo

El backend debe estar activo en `http://localhost:3000`. Si aún no lo iniciaste:

```bash
cd ../backend
pnpm install
pnpm run db:init
pnpm dev
```

### 2. Instala el frontend

```bash
cd frontend
pnpm install
```

### 3. Arranca el dev server

```bash
pnpm dev
```

Abre [http://localhost:4200](http://localhost:4200) en tu navegador.

---

## 🔑 Inicio de sesión

Agencia **CENTRAL**. Usa un `uid` del directorio LDAP (Docker) o una cuenta local creada en Administración. Ver `backend/.env.example` (`LDAP_*`).

---

## 🏗️ Arquitectura

### Proxy de desarrollo

Angular dev server corre en **puerto 4200** y redirige automáticamente al backend (puerto 3000) las llamadas a `/api/**` y `/socket.io` gracias a `proxy.conf.json`. Así evitamos problemas de CORS en desarrollo.

### Autenticación

- El login (`login.component.ts`) llama a `POST /api/auth/login`.
- El backend devuelve un JWT, que se guarda en `sessionStorage` (key `ims_token`).
- El **interceptor** `src/interceptors/auth.interceptor.ts` añade automáticamente `Authorization: Bearer <token>` a todas las peticiones HTTP.
- Si el backend responde 401, el interceptor cierra la sesión automáticamente.

### Tiempo real

El servicio `src/services/socket.service.ts` se conecta a `ws://localhost:3000/socket.io` y escucha:

- `incident:created` / `incident:updated` / `incident:deleted`
- `admin:log`
- `location:received`

---

## 📂 Estructura principal
frontend/
├── index.html             ← Usa importmap + Tailwind CDN
├── index.tsx              ← Bootstrap con interceptor JWT
├── proxy.conf.json        ← Proxy dev /api y /socket.io → :3000
├── angular.json           ← Build/serve config (puerto 4200, proxy)
├── eslint.config.js       ← ESLint + Angular accessibility rules
├── pnpm-lock.yaml
├── pnpm-workspace.yaml    ← Builds aprobados (esbuild, parcel, lmdb)
├── package.json
├── tsconfig.json
└── src/
├── app.component.{ts,html}
├── models/{incident,user,admin}.model.ts
├── services/
│   ├── auth.service.ts
│   ├── configuration.service.ts
│   ├── incident.service.ts
│   ├── person.service.ts
│   ├── notification.service.ts
│   ├── socket.service.ts
│   └── location-request.service.ts
├── interceptors/
│   └── auth.interceptor.ts
└── components/
├── login/
├── admin/
├── incidents/
├── incident-list/
└── reports/

---

## 🛡️ Herramientas de calidad y seguridad

| Herramienta | Comando | Descripción |
| ----------- | ------- | ----------- |
| ESLint | `pnpm run lint` | Análisis estático Angular + TypeScript |
| Prettier | `prettier --write src/` | Formato de código |
| pnpm audit | `pnpm audit` | Vulnerabilidades en dependencias |
| Dependabot | Automático (GitHub) | Alertas semanales |

---

## 🛠️ Troubleshooting

**Error: `ECONNREFUSED 127.0.0.1:3000`** → El backend no está corriendo.

**Login no funciona / da 401** → Asegúrate de haber ejecutado `pnpm run db:init` en el backend para sembrar los usuarios demo.

**Socket.IO no conecta** → Revisa que el proxy esté activo (`proxy.conf.json`) y que el backend esté en el puerto 3000.

**Página en blanco después de login** → Abre DevTools (F12). El importmap de `index.html` requiere internet para cargar Angular desde CDN.

**Quiero cambiar la URL del backend** → Edita `proxy.conf.json` (cambia `target`) y `src/services/socket.service.ts` (cambia `SOCKET_URL`).

---

## 📄 Cambios respecto al proyecto original

1. **Se eliminaron los mocks** en `auth.service.ts` y `configuration.service.ts` — ahora todo viaja al backend.
2. **Se añadió el interceptor JWT** — no tienes que preocuparte por añadir tokens manualmente.
3. **Se eliminó `server.ts`** del frontend — el backend vive en una carpeta aparte.
4. **Se añadió `proxy.conf.json`** — el dev server redirige automáticamente al backend.
5. **Se eliminaron** los componentes muertos `operators/` y `history/`.
6. **Dev server ahora corre en 4200** (antes 3000, que colisionaba con el backend).
7. **Migrado a pnpm 11** con supply-chain policy.
8. **ESLint configurado** con reglas Angular + accesibilidad.

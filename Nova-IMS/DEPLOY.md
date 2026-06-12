# Despliegue IMS Nova

## Variables de entorno (backend)

Copia `backend/.env.example` → `backend/.env`.

| Variable      | Uso                                                                    |
| ------------- | ---------------------------------------------------------------------- |
| `PUBLIC_URL`  | URL pública del **backend**. Enlaces WhatsApp/SMS (`/location/share`). |
| `APP_URL`     | URL del **frontend**. Enlaces en correos de bienvenida.                |
| `CORS_ORIGIN` | Origen permitido del Angular (dev o dominio producción).               |
| `GOOGLE_MAPS_API_KEY` | Clave Maps (frontend vía `/api/config/public` + geocodificación backend). |
| `DB_*`        | MySQL `gestionincidentes` (sin cambios de esquema).                    |

### Desarrollo local + WhatsApp (ngrok)

1. Backend: `cd backend && pnpm dev`
2. Túnel: `ngrok http 3000`
3. En `backend/.env` (elige una):
   ```env
   NGROK_URL=https://TU-TUNEL.ngrok-free.dev
   ```
   o `PUBLIC_URL=https://TU-TUNEL.ngrok-free.dev`
4. Reinicia el backend. En consola debe verse `PUBLIC: https://...` (no localhost).
5. En `backend/.env`, define `GOOGLE_MAPS_API_KEY` (la clave **no** va en el frontend).
6. Frontend: `cd frontend && pnpm dev`

El mapa pide la clave al backend (`GET /api/config/public`). Si el mapa no carga, verifique que el backend esté activo y tenga esa variable.

Cuando ngrok cambie de URL, **solo actualiza `PUBLIC_URL`** y reinicia el backend. No hace falta tocar el frontend.

### Producción (mismo dominio con nginx)

Ejemplo: `https://ims.tudominio.gov.co`

```env
NODE_ENV=production
PUBLIC_URL=https://ims.tudominio.gov.co
APP_URL=https://ims.tudominio.gov.co
CORS_ORIGIN=https://ims.tudominio.gov.co
GOOGLE_MAPS_API_KEY=su_clave_restringida_por_dominio
```

Nginx debe proxyar al backend:

- `/api` → backend:3000
- `/socket.io` → backend:3000
- `/location` → backend:3000 (página pública de GPS)

El frontend estático se sirve desde `/` (carpeta `frontend/dist`).

## Frontend (build producción)

1. En `backend/.env` de producción, define `GOOGLE_MAPS_API_KEY` (restringir por HTTP referrer en Google Cloud).
2. En `environment.prod.ts`, deja `apiUrl` vacío `''` si nginx proxya `/api` en el mismo dominio.
3. Build:

   ```bash
   cd frontend
   pnpm build
   ```

4. Despliega el contenido de `frontend/dist/`.

## Flujo WhatsApp / SMS

```
Operador → POST /api/location-requests
         → backend genera URL con PUBLIC_URL
         → WhatsApp abre /location/share?request_id=...
         → víctima comparte GPS → POST /location/submit
         → Socket location:received → mapa en vivo
```

La URL del mensaje la construye **solo el backend** (`PUBLIC_URL`). El frontend ya no reemplaza ngrok a mano.

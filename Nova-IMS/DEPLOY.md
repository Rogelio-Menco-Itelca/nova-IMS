# Despliegue IMS Nova

## Variables de entorno (backend)

Copia `backend/.env.example` → `backend/.env`.

| Variable      | Uso                                                                    |
| ------------- | ---------------------------------------------------------------------- |
| `PUBLIC_URL`  | URL pública del **backend**. Enlaces WhatsApp/SMS (`/location/share`). |
| `APP_URL`     | URL del **frontend**. Enlaces en correos de bienvenida.                |
| `CORS_ORIGIN` | Origen permitido del Angular (dev o dominio producción).               |
| `DB_*`        | MySQL `gestionincidentes` (sin cambios de esquema).                    |

### Desarrollo local + WhatsApp (ngrok)

1. Backend: `cd backend && npm run dev`
2. Túnel: `ngrok http 3000`
3. En `backend/.env` (elige una):
   ```env
   NGROK_URL=https://TU-TUNEL.ngrok-free.dev
   ```
   o `PUBLIC_URL=https://TU-TUNEL.ngrok-free.dev`
4. Reinicia el backend. En consola debe verse `PUBLIC: https://...` (no localhost).
5. Frontend: `cd frontend && npm start`

Cuando ngrok cambie de URL, **solo actualiza `PUBLIC_URL`** y reinicia el backend. No hace falta tocar el frontend.

### Producción (mismo dominio con nginx)

Ejemplo: `https://ims.tudominio.gov.co`

```env
NODE_ENV=production
PUBLIC_URL=https://ims.tudominio.gov.co
APP_URL=https://ims.tudominio.gov.co
CORS_ORIGIN=https://ims.tudominio.gov.co
```

Nginx debe proxyar al backend:

- `/api` → backend:3000
- `/socket.io` → backend:3000
- `/location` → backend:3000 (página pública de GPS)

El frontend estático se sirve desde `/` (carpeta `frontend/dist`).

## Frontend (build producción)

1. Edita `frontend/src/environments/environment.prod.ts`:
   - `googleMapsApiKey`: clave de Google Maps (restringir por dominio en Google Cloud).
   - `apiUrl`: déjalo vacío `''` si nginx proxya `/api` en el mismo dominio.

2. Build:

   ```bash
   cd frontend
   npm run build
   ```

3. Despliega el contenido de `frontend/dist/`.

## Flujo WhatsApp / SMS

```
Operador → POST /api/location-requests
         → backend genera URL con PUBLIC_URL
         → WhatsApp abre /location/share?request_id=...
         → víctima comparte GPS → POST /location/submit
         → Socket location:received → mapa en vivo
```

La URL del mensaje la construye **solo el backend** (`PUBLIC_URL`). El frontend ya no reemplaza ngrok a mano.

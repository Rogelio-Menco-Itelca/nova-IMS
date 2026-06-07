# Base de datos `gestionincidentes`

Scripts extraídos del dump oficial **`Dump20260607.sql`**.

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `gestionincidentes_dump.sql` | Copia íntegra del dump (referencia / restore total) |
| `01_schema.sql` | `CREATE DATABASE` + 39 tablas (sin datos operativos) |
| `02_seed_catalogs.sql` | Catálogos: agencias, roles, eventos, prioridades, origen, estados, usuarios, etc. |
| `03_seed_geo.sql` | Departamentos y municipios (DIVIPOLA CSJ) |
| `import-db.js` | Script Node para importar |

## Importar en MySQL

### Opción A — Esquema + catálogos (recomendado dev)

Recrea tablas y carga catálogos. **Borra datos** de las tablas del esquema.

```bash
cd backend
npm run db:import
```

### Opción B — Dump completo

Restaura exactamente lo del dump (incluye auditoría, notificaciones, ubicaciones, etc.):

```bash
npm run db:import:full
```

### Opción C — MySQL Workbench

Ejecute en orden: `01_schema.sql` → `02_seed_catalogs.sql` → `03_seed_geo.sql`

## Configuración `.env`

```env
DB_NAME=gestionincidentes
```

## Catálogos pendientes para CSJ (según dump)

El dump trae catálogos completos para CSJ en geo, eventos, roles, etc., pero **faltan filas** para operar incidentes CSJ:

- `origen` — solo POL (`Llamada 123`)
- `estadosincidentes` — solo POL
- `rolesvehiculo` / `tipovehiculo` — solo POL

Esos registros deben cargarse en MySQL para la agencia CSJ antes de crear incidentes con usuario CSJ. La aplicación valida contra el catálogo de la agencia; no inventa valores.

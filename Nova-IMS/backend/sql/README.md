# Base de datos `gestionincidentes`

## Política del proyecto

| Qué | Dónde vive |
|-----|------------|
| Esquema de tablas | `01_schema.sql` (repo) |
| Catálogos base (agencias, roles, eventos CSJ, permisos…) | `02_seed_catalogs.sql` (repo) |
| Geo, usuarios, correos, incidentes | **MySQL del cliente** (dump oficial, p. ej. `Dump20260612.sql`) |
| Alta de operadores y correos en runtime | Módulo **Administración** (API) |

La aplicación **no** embebe DIVIPOLA ni datos operativos en código ni en seeds del repo.

## Archivos en este directorio

| Archivo | Uso |
|---------|-----|
| `01_schema.sql` | `CREATE DATABASE` + tablas |
| `02_seed_catalogs.sql` | Catálogos mínimos (sin usuarios, correos ni geo) |
| `import-db.js` | Ejecuta esquema + catálogos base |

## Instalación

### Entorno con BD del cliente (producción / CSJ)

Restaurar el dump MySQL del cliente en Workbench o CLI. No hace falta `db:import` si la BD ya está poblada.

### Entorno nuevo solo con catálogos base

```bash
cd backend
pnpm run db:import
```

Luego importar en MySQL el dump del cliente para geo y datos operativos.

### Manual (Workbench)

1. `01_schema.sql`
2. `02_seed_catalogs.sql`
3. Dump del cliente (departamentos, municipios, usuarios existentes, etc.)

## Configuración `.env`

```env
DB_NAME=gestionincidentes
```

## Catálogos CSJ pendientes en seed

El seed trae eventos y roles CSJ, pero **pueden faltar** filas para operar incidentes CSJ hasta alinear con el dump del cliente:

- `origen` — en seed solo hay fila POL
- `estadosincidentes` — en seed solo POL
- `rolesvehiculo` / `tipovehiculo` — en seed solo POL

La app valida contra el catálogo de la agencia en MySQL; no inventa valores.

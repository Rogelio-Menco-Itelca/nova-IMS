# Base de datos `gestionincidentes`

## Política del proyecto

| Qué | Dónde vive |
|-----|------------|
| Esquema de tablas | `01_schema.sql` (repo) |
| Catálogos base (agencias, estados, eventos, origen, roles, cargos, DIVIPOLA…) | `02_catalogos_referencia.sql` (repo, alineado a Dump20260903) |
| Usuarios, correos, incidentes | **MySQL del cliente** / módulo Administración |
| Alta de operadores y correos en runtime | Módulo **Administración** (API) |

El seed embebe DIVIPOLA CSJ (`departamentos` / `municipios`). No incluye datos operativos (usuarios, incidentes, correos).

## Archivos en este directorio

| Archivo | Uso |
|---------|-----|
| `01_schema.sql` | `CREATE DATABASE` + tablas |
| `02_catalogos_referencia.sql` | Catálogos de referencia + DIVIPOLA (sin usuarios, correos ni incidentes) |
| `import-db.js` | Ejecuta esquema + catálogos base |

## Instalación

### Entorno con BD del cliente (producción / CSJ)

Restaurar el dump MySQL del cliente en Workbench o CLI. No hace falta `db:import` si la BD ya está poblada.

### Entorno nuevo solo con catálogos base

```bash
cd backend
pnpm run db:import
```

Eso deja esquema, catálogos y DIVIPOLA. Los operadores se crean en Administración.

### Manual (Workbench)

1. `01_schema.sql`
2. `02_catalogos_referencia.sql`
3. (Opcional) Dump del cliente solo si hay que traer usuarios/incidentes ya existentes

## Configuración `.env`

```env
DB_NAME=gestionincidentes
```

## Catálogos en el seed

`02_catalogos_referencia.sql` trae las listas actuales del dump CSJ/POL, incluyendo `departamentos` (33) y `municipios` (1122).

Siguen fuera del seed: usuarios, correos, incidentes y auditoría. No ejecutes `db:import` contra una BD que ya tenga datos del dump.

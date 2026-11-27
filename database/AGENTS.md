# AGENTS.md — database/

Aplican también las reglas de `/AGENTS.md`. Este archivo añade las específicas de PostgreSQL.

## Archivos
- `LetsPlay.dbml`: modelo de referencia. Debe mantenerse sincronizado con `tables.sql`.
- `tables.sql`: enums, tablas, claves foráneas, checks y triggers.
- `roles.sql`: roles y usuarios de demostración.
- `permissions.sql`: vistas y privilegios.
- `seed.sql`: datos iniciales idempotentes del catálogo `Videogames`.
- Scripts `*.sh` para iniciar, detener y usar Postgres.

## Idioma y esquema
- Nombres de tablas, columnas y checks en inglés. Los checks van con nombre.
- Fechas en `timestamptz`. `updated_at` se actualiza con trigger.
- Integridad con CHECKs y triggers deferrables cuando aplique.
- Cambiar el formato de los datos guardados requiere aprobación.

## Orden de ejecución
- `roles.sql` → `CREATE DATABASE` → `tables.sql` → `permissions.sql` → `seed.sql`.
- Usa `ON_ERROR_STOP=1`.
- Los scripts de esquema no son idempotentes. Ejecútalos una sola vez sobre una base vacía.

## Particularidades de PostgreSQL
- `CREATE ROLE` no admite `IF NOT EXISTS`. Usa un bloque `DO`.
- `CREATE DATABASE` va fuera de una transacción.
- `GRANT` y `REVOKE` solo afectan objetos existentes. Por eso `tables.sql` va antes que `permissions.sql`.
- Las vistas filtran por `app.current_user_id`, que el backend fija con `SET LOCAL`.

## Docker
- Con la imagen oficial, usa `-e POSTGRES_DB=postgres` antes del nombre de la imagen y `-d` para ejecutar en segundo plano.
- No crees `database/init.sql`. No existe.

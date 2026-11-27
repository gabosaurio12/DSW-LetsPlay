# MEMORY.md — database

Memoria de PostgreSQL. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- 24 tablas con `FollowRequests` (2026-11-27) y `ActiveSessions` (token_hash, id_user, created_at, expires_at), ambas con FK a `User`.
- Fase social (2026-11-27, schema/migración sin aplicar a DB compartida): `User.is_private DEFAULT false`, `FollowRequests` con PK dirigida y `idx_follow_requests_followed_requested_at`; `Follows` indexada por seguido.
- `database/migrations/addPrivateAccountsAndFollowRequests.sql` mantiene cuentas existentes públicas y elimina follows únicamente entre cuentas previamente bloqueadas. Validada en DB PostgreSQL temporal; temporal eliminada.
- `gender` admite `UNDEFINED`, `MALE`, `FEMALE`, `NON_BINARY` y `OTHER` (2026-11-28). `username` admite letras, números y guion bajo.
- Base recreada con `init-db.sh` el 2026-11-28 (se aceptó perder datos de prueba). Semilla: 20 usuarios.
- `seed.sql` carga el catálogo `Videogames` de forma idempotente.
- Las vistas `letsplay_guest` no incluyen `CommunityVideogames` ni `CommunityMembers`.

## Decisiones (y por qué)
- Modelo y SQL en inglés, con checks nombrados. `LetsPlay.dbml` es la referencia.
- `Follows` contiene solo accepted; solicitudes pendientes viven en `FollowRequests`. Block elimina ambas direcciones en una transacción; unblock no las restaura.
- Fechas en `timestamptz`. `updated_at` se actualiza con trigger.
- Integridad: CHECKs y triggers deferrables (rating 1–5; FK `Post → CommunityVideogames`). Triggers para `Report`, `Conversation`, `Message` (CU-35).
- Tablas y campos para `is_spoiler`, `Poll*`, `GamerPreference` y `LfgPost`.
- Ocho vistas filtran por `app.current_user_id`, que el backend fija con `SET LOCAL`.

## Errores a evitar
- Las contraseñas de la semilla son placeholders, no bcrypt válido. Crear cuentas nuevas por el registro para probar.
- `CREATE ROLE` no admite `IF NOT EXISTS`. Usa un bloque `DO`.
- `CREATE DATABASE` va fuera de transacción.
- `GRANT` y `REVOKE` solo afectan objetos existentes: `tables.sql` debe ir antes que `permissions.sql`.
- Con Docker usa `-e POSTGRES_DB=postgres` antes de la imagen y `-d`. No existe `database/init.sql`.
- No usar `init-db.sh` para esta migración; respaldar y aplicar el archivo una vez como `letsplay_admin`.

## Próximos pasos
- Revisar índices de las FK.
- Revisar privilegios de escritura por tabla y columna.
- Exponer `CommunityVideogames` y `CommunityMembers` a `letsplay_guest`.

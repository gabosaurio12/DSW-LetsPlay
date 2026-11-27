# MEMORY.md — database

Memoria de PostgreSQL. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- 23 tablas (2026-11-28): se añadió `ActiveSessions` (token_hash, id_user, created_at, expires_at) con FK a `User` e índice por usuario.
- `gender` admite `UNDEFINED`, `MALE`, `FEMALE`, `NON_BINARY` y `OTHER` (2026-11-28). `username` admite letras, números y guion bajo.
- Base recreada con `init-db.sh` el 2026-11-28 (se aceptó perder datos de prueba). Semilla: 20 usuarios.
- `seed.sql` carga el catálogo `Videogames` de forma idempotente.
- Las vistas `letsplay_guest` no incluyen `CommunityVideogames` ni `CommunityMembers`.

## Decisiones (y por qué)
- Modelo y SQL en inglés, con checks nombrados. `LetsPlay.dbml` es la referencia.
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

## Próximos pasos
- Revisar índices de las FK.
- Revisar privilegios de escritura por tabla y columna.
- Exponer `CommunityVideogames` y `CommunityMembers` a `letsplay_guest`.

# MEMORY.md — database

Memoria de PostgreSQL. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Según la memoria anterior: 22 tablas, 14 enums, 42 FKs, 13 vistas y roles. Alineado con 1.2.4 y 1.2.5. Ejecutado correctamente en un cluster temporal. No re-verificado el 2026-11-27.
- `seed.sql` carga el catálogo `Videogames` de forma idempotente.
- Las vistas `letsplay_guest` no incluyen `CommunityVideogames` ni `CommunityMembers`.

## Decisiones (y por qué)
- Modelo y SQL en inglés, con checks nombrados. `LetsPlay.dbml` es la referencia.
- Fechas en `timestamptz`. `updated_at` se actualiza con trigger.
- Integridad: CHECKs y triggers deferrables (rating 1–5; FK `Post → CommunityVideogames`). Triggers para `Report`, `Conversation`, `Message` (CU-35).
- Tablas y campos para `is_spoiler`, `Poll*`, `GamerPreference` y `LfgPost`.
- Ocho vistas filtran por `app.current_user_id`, que el backend fija con `SET LOCAL`.

## Errores a evitar
- `CREATE ROLE` no admite `IF NOT EXISTS`. Usa un bloque `DO`.
- `CREATE DATABASE` va fuera de transacción.
- `GRANT` y `REVOKE` solo afectan objetos existentes: `tables.sql` debe ir antes que `permissions.sql`.
- Con Docker usa `-e POSTGRES_DB=postgres` antes de la imagen y `-d`. No existe `database/init.sql`.

## Próximos pasos
- Revisar índices de las FK.
- Revisar privilegios de escritura por tabla y columna.
- Exponer `CommunityVideogames` y `CommunityMembers` a `letsplay_guest`.

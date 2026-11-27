# MEMORY.md — apps/backend

Memoria del servidor. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Rutas: `commentsRouter`, `lfgRouter`, `reportsRouter`, `uploadsRouter`, `videogamesRouter`. Repositorios: `comment`, `lfg`, `report`, `videogame`.
- `src/app.js` y `src/server.js` presentes (antes figuraban como pendientes de otra rama).
- `npm test`: 89/89 en verde (2026-11-27). Requiere `npm install` previo: faltaba `pg` en `node_modules`.
- No hay endpoints de perfil ni de encuesta: el frontend los guarda en localStorage.
- Tests de `/uploads` validan el tipo de archivo por magic bytes.
- Puertos de desarrollo: backend `:3001`, frontend `:5173`, PostgreSQL contenedor `letsplay` en `:5439`.
- Postgres se usa con `letsplay_admin`, porque `permissions.sql` no expone aún `CommunityVideogames` ni `CommunityMembers` a `letsplay_guest`.

## Decisiones (y por qué)
- CommonJS (`require`, `module.exports`), verificado el 2026-11-27. No cambiar a ESM sin aprobación.
- Imágenes y assets en MongoDB. PostgreSQL no guarda binarios.
- Pruebas con `node:test`. El estándar v1.1 se adaptó a esto el 2026-11-27; no se añade Jest.
- Errores del servidor con `console.error`. No se añade logger (decisión 2026-11-27).

## Errores a evitar
- No asumir que los tests pasan. Ejecuta `npm test` antes de dar un cambio por bueno.
- No registrar `.env` en el repo; solo `.env.example`.

## Próximos pasos
- Migrar la foto de perfil a MongoDB; crear endpoints de perfil/encuesta si se decide dejar el localStorage.
- Pendientes de docs: #44 y #47 (`README.md`, `.env.example`).

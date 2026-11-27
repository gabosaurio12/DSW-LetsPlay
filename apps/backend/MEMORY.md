# MEMORY.md — apps/backend

Memoria del servidor. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Rutas en esta rama: `commentsRouter`, `reportsRouter`, `uploadsRouter`, `videogamesRouter`. Repositorios: `comment`, `report`, `videogame`.
- `npm test` falla hoy: 0/4 con `Cannot find module '../src/app'` (verificado el 2026-11-27).
- Faltan `src/app.js` y `src/server.js`. `package.json` ejecuta `node src/server.js`. Según el usuario, existen en otra rama con conflictos, pendiente de resolver.
- La memoria anterior hablaba de 89/89 tests, incluidos endpoints LFG, perfil y encuesta. Esos endpoints no están en esta rama.
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
- Resolver el conflicto de la otra rama para traer `src/app.js` y `src/server.js`. No crearlos localmente.
- Conectar los endpoints LFG y migrar la foto de perfil a MongoDB.
- Pendientes de docs: #44 y #47 (`README.md`, `.env.example`).

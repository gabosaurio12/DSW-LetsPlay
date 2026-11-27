# AGENTS.md — apps/backend

Aplican también las reglas de `/AGENTS.md`. Este archivo añade las específicas del servidor.

## Stack y módulos
- Express 5 y Prisma (`@prisma/client`, `prisma/schema.prisma`), con CommonJS (`require` y `module.exports`). No cambies a ESM sin aprobación.

## Capas
- `routes/`: solo HTTP. Valida la entrada, llama al repositorio y responde.
- `repositories/`: todas las consultas a la base, con Prisma Client API.
- `db/prisma.js`: la única conexión a PostgreSQL (`createPrismaClient`) y el helper `caseInsensitiveEquals`.

## Base de datos
- Consulta siempre con Prisma Client API (`findMany`, `create`, `upsert`, `$transaction`…). No escribas SQL.
- Excepción aprobada: `SELECT ... FOR UPDATE` con `tx.$queryRaw` en plantilla etiquetada (`userPairLock.js`, `updatePrivacy`). Nunca concatenes entrada del usuario en SQL crudo.
- Igualdad sin distinguir mayúsculas: usa `caseInsensitiveEquals`. Prisma la compila a `ILIKE`, donde `_` y `%` son comodines.
- Visibilidad y bloqueos: usa `visibilityFilters.js`, no repitas filtros.
- El esquema vive en `prisma/schema.prisma` y se genera con `db pull` desde la base de `database/`. No uses `prisma migrate`: las migraciones son de `database/`.
- Imágenes y assets van a MongoDB, no a PostgreSQL.

## Entrada y archivos
- Valida `body`, `params` y `query` antes de usarlos.
- `/uploads` valida el tipo de archivo por magic bytes. Mantén esa validación.

## Errores
- Las rutas `async` envuelven su lógica en try/catch y llaman a `next(error)`.
- Existe un único middleware de errores al final de la cadena. Responde con el código HTTP adecuado y un mensaje seguro.
- Nunca envíes `err.stack` ni detalles internos al cliente.
- Registra errores con `console.error`, sin datos sensibles.

## Configuración
- Las variables de entorno van en `.env` local, que no se versiona. Solo `.env.example` se versiona.
- La conexión se configura con `DATABASE_URL` (`postgresql://usuario:contraseña@host:puerto/base`).

## Pruebas
- `npm test` en `apps/backend/` (`node --test`, archivos en `tests/`).
- Todo endpoint nuevo o modificado necesita pruebas.
- Verifica el código de estado HTTP y la forma del cuerpo de la respuesta.

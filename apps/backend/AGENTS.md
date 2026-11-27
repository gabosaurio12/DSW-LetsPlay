# AGENTS.md — apps/backend

Aplican también las reglas de `/AGENTS.md`. Este archivo añade las específicas del servidor.

## Stack y módulos
- Express 5 y `pg`, con CommonJS (`require` y `module.exports`). No cambies a ESM sin aprobación.

## Capas
- `routes/`: solo HTTP. Valida la entrada, llama al repositorio y responde.
- `repositories/`: todas las consultas SQL.
- `db/pool.js`: la única conexión a PostgreSQL.

## Base de datos
- Consultas parametrizadas (`$1`, `$2`…). Nunca concatenes entrada del usuario en SQL.
- Las vistas que filtran por usuario requieren `SET LOCAL app.current_user_id` dentro de una transacción.
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

## Pruebas
- `npm test` en `apps/backend/` (`node --test`, archivos en `tests/`).
- Todo endpoint nuevo o modificado necesita pruebas.
- Verifica el código de estado HTTP y la forma del cuerpo de la respuesta.

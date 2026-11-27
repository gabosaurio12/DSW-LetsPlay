# MEMORY.md — apps/backend

Memoria del servidor. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Migración a Prisma completa (2026-11-28, commits en `refactor/quality-fixes`): los 10 repositorios usan Prisma Client. `pg` y `db/pool.js` se eliminaron. Suite: 203/203.
- Verificado contra la base real: 32 comprobaciones de repositorios (seguimientos, bloqueos y mensajes) y 39 peticiones HTTP comparadas con la versión anterior (`aac7806`), sin diferencias. Las cuentas y datos de prueba se borraron.
- Follows públicos: implementados en `bcc8e43`; APIs documentadas en código.
- Privacidad y bloqueos (2026-11-27, sin commit): `GET/PATCH /api/me/privacy`, `GET/PATCH /api/users/me/follow-requests`, block/unblock y lista propia de bloqueados. `FollowRequests` almacena pendientes; `Follows` aceptados.
- Backend social bloquea por filas `User` en orden dentro de transacciones. Privacy y Follows/Blocks serializan el mismo par.
- LFG: si la cuenta aún no tiene juegos en `UserVideogames`, mostrar candidatos filtrados por disponibilidad/plataforma/horario, calculando afinidad sin peso de juego; si ya tiene biblioteca, exigir juegos compartidos. Motivo: la encuesta no llena la biblioteca.
- Auth real (fase 2, 2026-11-28, sin commit): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`. Archivos: `routes/authRouter.js`, `repositories/authRepository.js`, `auth/*` (hash, tokens, cookie, validación, limitador, middleware, política de moderación).
- Preferencias por cuenta: `GET` y `PUT /api/me/gamer-preferences` con `routes/gamerPreferencesRouter.js` y `repositories/gamerPreferencesRepository.js`. Catálogo y mapeo en `gamerPreferenceCatalog.js`.
- Moderación: `GET /api/reports`, `PATCH /api/reports/:id` y `POST /api/reports/:id/remove-content` exigen sesión y permiso. Hoy ninguna cuenta tiene permiso (401 sin sesión, 403 con sesión).
- Dependencia nueva aprobada: `bcrypt` ^6.
- Mensajería (2026-11-28, sin commit): `GET /api/messages/conversations`, `GET /api/messages/users/:userId` (historial paginado, orden cronológico dentro de la página) y `POST /api/messages` (201; 403 si falta follow mutuo; 404 si el destinatario no es visible). Archivos: `routes/messagesRouter.js`, `repositories/messagesRepository.js`, `realtime/messageHub.js`.
- WebSocket `/ws/messages` (paquete `ws`): autentica con la cookie de sesión en el upgrade, exige `Origin` igual a `CORS_ORIGIN` y solo envía `message.created` a los dos participantes.

## Decisiones (y por qué)
- Prisma 6.19.3 y no 7.x: Prisma 7 genera TypeScript. Ejecutar la app en CommonJS exigiría un paso de `tsc`, que no fue aprobado. Migrar a 7 cuando haya build aprobado.
- Sin `prisma migrate`: el esquema se obtiene con `db pull` desde la base de `database/`, que sigue siendo la fuente de migraciones. Tras cambios en `database/`, repetir `db pull` y revisar el diff.
- Excepciones de SQL crudo aprobadas: solo `FOR UPDATE` (`userPairLock.js`, `updatePrivacy`). `SET LOCAL` no se usa en el backend.
- Las vistas `v_public_*` no se consultan: sus filtros (`status`, `type`) se replican en `where`. Así el rol `letsplay_guest`, que solo lee vistas, deja de funcionar. Se usa `letsplay_admin`.
- `listConversations` ordena por último mensaje en memoria, porque Prisma no ordena por agregados. Cargar todas las conversaciones visibles de una cuenta escala mal; si crece, aprobar una excepción de SQL crudo.
- `visibilityFilters.js` concentra visibilidad, bloqueos y `isBlockedBetween`. Sin viewer, los filtros devuelven la versión restrictiva (`undefined` en Prisma eliminaría el filtro).
- Contraseñas con `bcrypt`, 12 rondas. Máximo 72 bytes UTF-8: bcrypt ignora el resto, así que se rechaza en lugar de truncar.
- Sesión: token aleatorio de 32 bytes en cookie `letsplay_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 7 días). Solo se guarda su SHA-256 en `ActiveSessions`.
- Login con límite de 10 fallos por identificador en 15 minutos (en memoria). Cuentas inexistentes también pasan por bcrypt para no revelar cuáles existen.
- Escrituras de `/api/auth`, `/api/me` y `/api/users` rechazan el encabezado `Origin` distinto de `CORS_ORIGIN`.
- Follows públicos: actor desde la cookie, nunca del body. Sin esquema nuevo; se usan `Follows` y `Blocks`. Perfil, listas y conteos ocultan cuentas bloqueadas en ambos sentidos. Repetir alta o baja es idempotente; la baja solo borra la relación saliente. Errores `{ error }`, salvo auth (`{ errorKey }`).
- El `INSERT ... SELECT` de Follows necesita `$1::uuid` y `$2::uuid`: sin casts, PostgreSQL infiere `text` y falla con `operator does not exist: uuid = text` (encontrado y corregido en prueba real).
- Privacidad: `User.is_private DEFAULT false`; conserva cuentas históricas como públicas. Cuenta privada muestra perfil mínimo a quien no sigue; listas y conteos privados para solicitantes no aprobados. Mantener requests pendientes al cambiar a pública; rechazo elimina y permite reintentar.
- Block: borrar follows/requests entrantes y salientes atómicamente. Unblock elimina solo el bloqueo. No restaurar relaciones.
- Preferencias: los IDs de la encuesta se guardan como etiquetas de LFG (`GENRE_LABELS`, `PLATFORM_LABELS`, `AVAILABILITY_LABELS`). Si una lista no tiene ninguna etiqueta conocida, `GET` devuelve `null` y la encuesta se vuelve a mostrar.

## Errores a evitar
- Prisma compila `mode: "insensitive"` a `ILIKE`: `_` y `%` del usuario actúan como comodines. Usar `caseInsensitiveEquals` en igualdades. Las búsquedas `contains` conservan su comportamiento anterior.
- Un `update` o `delete` sin registro lanza `P2025`; el código de unicidad es `P2002` (no `23505`). `authRouter` usa `P2002`.
- `count()` devuelve número, no texto: `COUNT` de `pg` era string.
- `new Date(birthDate)` para `birth_date`; las rutas esperan `YYYY-MM-DD`, así que el repositorio lo convierte.
- `POST /api/videogames/:id/posts` toma `userId` del cuerpo y, sin él, escribe como el usuario demo. Es comportamiento previo; no lo cambies sin decidirlo.
- `.env` local usa `DATABASE_URL` con `letsplay_admin`. Con `letsplay_guest` no se puede leer `User` ni `ActiveSessions`. No versionar la contraseña.
- Ejecutar `npm test` tras cambios: la prueba de "Database connection lost" imprime un error a propósito.
- Un servidor de `:3001` iniciado antes de los cambios sigue con código viejo: reiniciarlo.

## Próximos pasos
- Pendiente de aplicar la migración `database/migrations/addPrivateAccountsAndFollowRequests.sql` a la DB de desarrollo tras respaldo y coordinación. Se probó en DB temporal.
- Notificaciones y cambios al feed siguen fuera del alcance. CU-31/32 (mute) también.
- `POST /api/reports` aún toma `reporterId` del cuerpo; debe usar la sesión.
- Mensajería: el hub vive en un solo proceso (sin Redis ni broker). Una sesión revocada mantiene el socket abierto hasta cerrarse. Los eventos emitidos mientras el cliente está desconectado no se reenvían; el cliente solo se entera al recargar la página o con el siguiente evento.
- Alinear las etiquetas de horario de la encuesta con las de LFG (`Afternoons (16:00-19:00)` y similares) antes de producción.
- Las cuentas de la semilla tienen un hash placeholder que no es bcrypt válido; no pueden iniciar sesión.
- Migrar la foto de perfil a MongoDB.

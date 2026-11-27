# MEMORY.md — apps/backend

Memoria del servidor. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Follows públicos: implementados en `bcc8e43`; APIs documentadas en código.
- Privacidad y bloqueos (2026-11-27, sin commit): `GET/PATCH /api/me/privacy`, `GET/PATCH /api/users/me/follow-requests`, block/unblock y lista propia de bloqueados. `FollowRequests` almacena pendientes; `Follows` aceptados.
- Suite backend: 165/165. Ciclo social y carrera approve-vs-block probados en PostgreSQL temporal. No aplicar migración a la DB compartida sin coordinación; el test local temporal ya se eliminó.
- Backend social bloquea por filas `User` en orden dentro de transacciones. Privacy y Follows/Blocks serializan el mismo par.
- LFG: si la cuenta aún no tiene juegos en `UserVideogames`, mostrar candidatos filtrados por disponibilidad/plataforma/horario, calculando afinidad sin peso de juego; si ya tiene biblioteca, exigir juegos compartidos. Motivo: la encuesta no llena la biblioteca.
- Auth real (fase 2, 2026-11-28, sin commit): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`. Archivos: `routes/authRouter.js`, `repositories/authRepository.js`, `auth/*` (hash, tokens, cookie, validación, limitador, middleware, política de moderación).
- Preferencias por cuenta: `GET` y `PUT /api/me/gamer-preferences` con `routes/gamerPreferencesRouter.js` y `repositories/gamerPreferencesRepository.js`. Catálogo y mapeo en `gamerPreferenceCatalog.js`.
- Moderación: `GET /api/reports`, `PATCH /api/reports/:id` y `POST /api/reports/:id/remove-content` exigen sesión y permiso. Hoy ninguna cuenta tiene permiso (401 sin sesión, 403 con sesión).
- `npm test`: 123/123 en verde (2026-11-28). Pruebas nuevas: `authRouter.test.js`, `gamerPreferencesRouter.test.js`.
- Dependencia nueva aprobada: `bcrypt` ^6.

## Decisiones (y por qué)
- Contraseñas con `bcrypt`, 12 rondas. Máximo 72 bytes UTF-8: bcrypt ignora el resto, así que se rechaza en lugar de truncar.
- Sesión: token aleatorio de 32 bytes en cookie `letsplay_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 7 días). Solo se guarda su SHA-256 en `ActiveSessions`.
- Login con límite de 10 fallos por identificador en 15 minutos (en memoria). Cuentas inexistentes también pasan por bcrypt para no revelar cuáles existen.
- Escrituras de `/api/auth`, `/api/me` y `/api/users` rechazan el encabezado `Origin` distinto de `CORS_ORIGIN`.
- Follows públicos: actor desde la cookie, nunca del body. Sin esquema nuevo; se usan `Follows` y `Blocks`. Perfil, listas y conteos ocultan cuentas bloqueadas en ambos sentidos. Repetir alta o baja es idempotente; la baja solo borra la relación saliente. Errores `{ error }`, salvo auth (`{ errorKey }`).
- El `INSERT ... SELECT` de Follows necesita `$1::uuid` y `$2::uuid`: sin casts, PostgreSQL infiere `text` y falla con `operator does not exist: uuid = text` (encontrado y corregido en prueba real).
- Privacidad: `User.is_private DEFAULT false`; conserva cuentas históricas como públicas. Cuenta privada muestra perfil mínimo a quien no sigue; listas y conteos privados para solicitantes no aprobados. Mantener requests pendientes al cambiar a pública; rechazo elimina y permite reintentar.
- Block: borrar follows/requests entrantes y salientes atómicamente. Unblock elimina solo el bloqueo. No restaurar relaciones.
- Preferencias: los IDs de la encuesta se guardan como etiquetas de LFG (`GENRE_LABELS`, `PLATFORM_LABELS`, `AVAILABILITY_LABELS`). Si una lista no tiene ninguna etiqueta conocida, `GET` devuelve `null` y la encuesta se vuelve a mostrar.
- Respuestas de error de auth: `{ errorKey }`. Resto de rutas: `{ error }`.

## Errores a evitar
- `.env` local con `PGUSER=letsplay_guest` no puede leer `User` ni `ActiveSessions`. Usar `letsplay_admin`, como indica `database/README.md`. No versionar la contraseña.
- Ejecutar `npm test` tras cambios: la prueba de "Database connection lost" imprime un error a propósito.
- Un servidor de `:3001` iniciado antes de los cambios sigue con código viejo: reiniciarlo.

## Próximos pasos
- Pendiente de aplicar la migración `database/migrations/addPrivateAccountsAndFollowRequests.sql` a la DB de desarrollo tras respaldo y coordinación. Se probó en DB temporal.
- Notificaciones y cambios al feed siguen fuera del alcance. CU-31/32 (mute) también.
- `POST /api/reports` aún toma `reporterId` del cuerpo; debe usar la sesión.
- Alinear las etiquetas de horario de la encuesta con las de LFG (`Afternoons (16:00-19:00)` y similares) antes de producción.
- Las cuentas de la semilla tienen un hash placeholder que no es bcrypt válido; no pueden iniciar sesión.
- Migrar la foto de perfil a MongoDB.

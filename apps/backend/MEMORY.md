# MEMORY.md — apps/backend

Memoria del servidor. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Auth real (fase 2, 2026-11-28, sin commit): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`. Archivos: `routes/authRouter.js`, `repositories/authRepository.js`, `auth/*` (hash, tokens, cookie, validación, limitador, middleware, política de moderación).
- Preferencias por cuenta: `GET` y `PUT /api/me/gamer-preferences` con `routes/gamerPreferencesRouter.js` y `repositories/gamerPreferencesRepository.js`. Catálogo y mapeo en `gamerPreferenceCatalog.js`.
- Moderación: `GET /api/reports`, `PATCH /api/reports/:id` y `POST /api/reports/:id/remove-content` exigen sesión y permiso. Hoy ninguna cuenta tiene permiso (401 sin sesión, 403 con sesión).
- `npm test`: 123/123 en verde (2026-11-28). Pruebas nuevas: `authRouter.test.js`, `gamerPreferencesRouter.test.js`.
- Dependencia nueva aprobada: `bcrypt` ^6.

## Decisiones (y por qué)
- Contraseñas con `bcrypt`, 12 rondas. Máximo 72 bytes UTF-8: bcrypt ignora el resto, así que se rechaza en lugar de truncar.
- Sesión: token aleatorio de 32 bytes en cookie `letsplay_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 7 días). Solo se guarda su SHA-256 en `ActiveSessions`.
- Login con límite de 10 fallos por identificador en 15 minutos (en memoria). Cuentas inexistentes también pasan por bcrypt para no revelar cuáles existen.
- Escrituras de `/api/auth` y `/api/me` rechazan el encabezado `Origin` distinto de `CORS_ORIGIN`.
- Preferencias: los IDs de la encuesta se guardan como etiquetas de LFG (`GENRE_LABELS`, `PLATFORM_LABELS`, `AVAILABILITY_LABELS`). Si una lista no tiene ninguna etiqueta conocida, `GET` devuelve `null` y la encuesta se vuelve a mostrar.
- Respuestas de error de auth: `{ errorKey }`. Resto de rutas: `{ error }`.

## Errores a evitar
- `.env` local con `PGUSER=letsplay_guest` no puede leer `User` ni `ActiveSessions`. Usar `letsplay_admin`, como indica `database/README.md`. No versionar la contraseña.
- Ejecutar `npm test` tras cambios: la prueba de "Database connection lost" imprime un error a propósito.
- Un servidor de `:3001` iniciado antes de los cambios sigue con código viejo: reiniciarlo.

## Próximos pasos
- `POST /api/reports` aún toma `reporterId` del cuerpo; debe usar la sesión.
- Alinear las etiquetas de horario de la encuesta con las de LFG (`Afternoons (16:00-19:00)` y similares) antes de producción.
- Las cuentas de la semilla tienen un hash placeholder que no es bcrypt válido; no pueden iniciar sesión.
- Migrar la foto de perfil a MongoDB.

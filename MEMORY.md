# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Rama `Li0`; merge de `main` resuelto el 2026-11-26 (conflictos en `App.jsx`, `App.css`, `i18n/es.js`, `i18n/en.js` y `MEMORY.md`; resueltos con `git add`, **sin commit**). Trabajo local sin push según lo solicitado.
- Frontend: Auth (`LoginForm`, `RegisterForm`, `RecoveryForm`, `AuthBrand`), `authService.js` (sesión + localStorage, seed `seth_play`), logout en header y `ProfileForm` (RF-88/89); Figma `#bb8484`, i18n es/en.
- `App.jsx` renderiza según sesión: sin sesión → auth; con sesión → `WelcomeSurvey` si no está completada (obligatoria), si no → `ProfileForm`. La encuesta llama a `onCompleted` tras guardar y se entra directo al home.
- Encuesta: wizard géneros → plataformas → disponibilidad → resumen; `welcomeSurveyData.js`, `welcomeSurveyService.js`, `WelcomeSurveyPanels`/`SurveyOptionChip`, `hooks/useTranslation`. NO documentada en RF; lo más cercano RF-88/89.
- Tareas Trello: #48 (registro/login/logout) completada en frontend.
- Backend Express con 89/89 tests (`/uploads` por magic bytes, `/reports*`, comentarios, vídeos, LFG `scheduledTime`); backend `:3001`, frontend `:5173`, Postgres contenedor `letsplay` `:5439` (con `letsplay_admin` porque `permissions.sql` no expone aún `CommunityVideogames`/`CommunityMembers` a `letsplay_guest`).
- `database/`: 22 tablas, 14 enums, 42 FKs, 13 vistas + roles; alineado a 1.2.4/1.2.5 y ejecutado OK en cluster PG temporal.
- `.tickets/`: 5 tickets (`001`–`005`, completados, sin commit/push): `seed.sql`, API backend, frontend (`/` sin moderación, `/admin` con `ModerationPanel`, drag&drop en `GameDetail`, `<input type="time">` en `LfgSearch`).
- Docs canónicos: 1.1.1, 1.1.2, 1.2.1..1.2.5 (trazabilidad 1.2.3 = CU-01..38), 1.3.1, 1.3.2; `1.5.1` plantilla, `1.5.3` secretos, no existe `1.5.2`.
- Prototipos Figma (`Let-s-Play`, `YJ7S6DSebM5cZkSKu7j7Ek`) en `.routing/STYLE_GUIDE.md` y `.routing/FIGMA_INVENTORY.md` (27 pantallas). `.opencode/` local ignorado por git; `grill-me` solo está en la rama survey.
- Pendientes Li0: #44/#47 (`README.md`, `.env.example`) y #34 (modelo de presentación).

## Decisiones (y por qué)
- Estructura `apps/frontend` + `apps/backend` definitiva (decisión 2026-11-06); AGENTS.md aún menciona src-client/src-server.
- Encuesta obligatoria tras el primer registro/inicio de sesión (decisión 2026-11-26); géneros/plataformas min 1 / max 5, disponibilidad min 1; guardado → home directo, sin pantalla de confirmación.
- i18n: mini-diccionario propio es/en sin librerías; localStorage con async/await + try/catch (null/false ante fallo).
- IDs canónicos RF-01..136, CU-01..51, RN-01..30; actores Visitante/Usuario/Moderador/Administrador.
- Recomendaciones deterministas; LFG 50% juegos / 30% plataformas / 20% horarios + toggle "Looking to play".
- DB: DBML/SQL en inglés con checks nombrados; scripts `init-db.sh` (postgres:16, BD recreada, orden roles → CREATE DATABASE → tables → permissions, `ON_ERROR_STOP=1`), `start-db.sh`, `psql-db.sh`, `stop-db.sh`. 8 vistas filtran por `app.current_user_id` (backend con `SET LOCAL`).
- Integridad: CHECKs + triggers deferrables (1–5, FK `Post → CommunityVideogames`); `Report`, `Conversation`, `Message` (trigger CU-35); `timestamptz` + `updated_at` por trigger; `is_spoiler`, `Poll*`, `GamerPreference`, `LfgPost`.
- Estilo: comillas dobles, punto y coma, llaves K&R, JSDoc; JSX con 2 espacios (CSS heredado de main con 4).

## Aprendizajes y errores a evitar
- Priorizar siempre los docs numerados; los sueltos antiguos están duplicados.
- Sin dependencias nuevas ni build steps sin aprobación explícita (Límites en AGENTS.md).
- Código: comillas dobles, punto y coma, 2 espacios, llaves K&R, componentes PascalCase — eslint del repo limpio y npm run build OK.
- No usar links absolutos file:/// en los docs.
- Bug detectado con Chrome DevTools (2026-11-26): `i18n/es.js` e `i18n/en.js` dejan `profile` dentro de `survey.errors` (falta cerrar `errors` y sobra una llave al final), así que la UI muestra claves como `profile.title` y el toggle ES/EN no cambia textos.
- Bug visual detectado con Chrome DevTools (2026-11-26): `index.css` define tema oscuro `--color-*` pero `App.css` fuerza fondo claro con `--lp-*`; `ProfileForm.css` usa `--color-*`, dejando títulos casi invisibles (contraste 1.08) y chips oscuros con texto oscuro (1.27). Lighthouse a11y 96.
- PostgreSQL no admite `IF NOT EXISTS` en `CREATE ROLE` (bloque `DO`); `CREATE DATABASE` fuera de transacción; GRANT/REVOKE solo afecta objetos existentes (`tables.sql` antes que `permissions.sql`).
- Docker con imagen oficial: `-e POSTGRES_DB=postgres` antes de la imagen y `-d` para detach; no existe `database/init.sql`.
- Commitear en cada tarea (el trabajo sin commit se pierde); no hacer push sin autorización; no fusionar `feat/gaming-survey` ni tocar código/localStorage/node_modules sin aprobación.
- Docs numerados = canónicos (los sueltos duplican); sin dependencias nuevas ni build steps sin aprobación; sin links `file:///`.
- No asumir IDs antiguos (RF<=97/CU<=19) ni tratar docs 1.5 vacíos como completados.

## Próximos pasos
- Documentar la encuesta en RF/formularios (RF-127) y definir su integración con ProfileForm.
- Conectar `welcomeSurveyService`, `profileService` y endpoints LFG al backend; migrar foto a MongoDB.
- Decidir migración a src-client/src-server; completar `1.5.1`, crear `1.5.2` y ampliar `1.5.3`.
- Revisar índices de FK y privilegios de escritura por tabla/columna.

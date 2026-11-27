# MEMORY.md — apps/frontend

Memoria del cliente. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Follows públicos (fase 3, 2026-11-27, sin commit): `UserProfile` desde LFG y desde las listas; botón de seguir en tarjetas LFG conectado a `/api/users`; `FollowListModal` reutilizado en perfil ajeno y en `ProfileForm`. `followService.js` centraliza las llamadas. Sin localStorage para relaciones. `npm run lint` y `npm run build` limpios; claves es/en pareadas (494).
- Auth (fase 2, 2026-11-28): `LoginForm`, `RegisterForm` y `AuthBrand` llaman a `/api/auth/*` con cookie de sesión. La sesión se consulta al arrancar (`fetchCurrentUser`). Recuperación de contraseña retirada hasta el flujo por correo.
- Preferencias por cuenta: `welcomeSurveyService` usa `/api/me/gamer-preferences`. `WelcomeSurvey` sirve para bienvenida (`mode="onboarding"`) y edición (`mode="edit"`), y `components/GamerPreferencesSection` la abre desde `ProfileForm`.
- Errores de la encuesta: `loadWelcomeSurvey` lanza error con `status`. 401 cierra sesión; otros fallos muestran reintento.
- `App.jsx` (merge resuelto 2026-11-27): sin sesión → auth. Con sesión sin encuesta → `WelcomeSurvey`. Con encuesta completa → shell con `ExploreGames` por defecto. `/admin` también exige sesión y encuesta. Logout en el header del shell y del admin.
- Encuesta: formulario único según Figma `128-926`, con `AuthBrand`, tarjeta de 490px y botón "Aceptar". Archivos: `welcomeSurveyData.js`, `welcomeSurveyService.js`, `WelcomeSurvey.jsx`, `WelcomeSurveyPanels` (`SurveyOptionGroup`), `SurveyOptionChip`.
- Páginas: `ExploreGames`, `GameDetail` (drag & drop), `LfgSearch`, `ModerationPanel` (`/admin`).
- Componentes nuevos: `PostComments`, `ReportModal`, `ProfileFormPanels`, `SelectableChip`.
- `videogameService` (incluye uploads), `commentService`, `reportService` y `lfgService` consumen `/api/*` por el proxy de Vite a `:3001`. `authService`, `profileService` y `welcomeSurveyService` siguen en localStorage.
- `npm run lint` limpio el 2026-11-27.

## Decisiones (y por qué)
- 2026-11-26: la encuesta es obligatoria tras el primer registro o inicio de sesión. Géneros y plataformas: mínimo 1 y máximo 5. Disponibilidad: mínimo 1. Al guardar va directo al home, sin pantalla de confirmación. Motivo no registrado.
- i18n con mini-diccionario propio en `es.js` y `en.js`, sin librerías.
- 2026-11-27: tema claro. `--lp-*` es canónico y no habrá tema oscuro. Color primario de Figma `#bb8484` como `--lp-primary`.
- localStorage con async/await y try/catch. Ante fallo devuelve `null` o `false`.
- 2026-11-27: `/admin` exige sesión y encuesta completa. Motivo: el panel de moderación no debe ser público.
- 2026-11-27: tras autenticarse vista por defecto `ExploreGames`, no `ProfileForm`.
- 2026-11-28: la encuesta pasó a formulario único (sin pasos ni resumen) según Figma `128-926`. Tercera pregunta: "¿A qué hora sueles jugar?". "Siempre estoy disponible" es excluyente. Se conservan los IDs guardados y se añadieron `weekdayMornings` y `weekendAfternoons`. Sigue en localStorage hasta la fase de persistencia por cuenta.
- Pendiente de decisión: el blanco sobre `#bb8484` y el texto `#bb8484` sobre blanco tienen ~3.1:1 de contraste (no cumplen AA). Figma lo define así; hay que decidir si se ajusta. Las etiquetas de Figma "Indies", "Simulacion" y "XBOX" se escribieron como "Indie", "Simulación" y "Xbox".

- 2026-11-28: la sesión vive en el servidor (cookie `HttpOnly`), no en localStorage. Las respuestas de la encuesta son por cuenta. Ya no se importan respuestas locales antiguas.
- 2026-11-28: el registro envía los valores del enum de género (`MALE`, `FEMALE`, `NON_BINARY`, `OTHER`).

## Bugs abiertos (verificados en código el 2026-11-27)
- Contraste: `ProfileForm.css` usa `--color-*` (tema oscuro de `index.css`), pero `App.css` fuerza fondo claro con `--lp-*`. Medido antes con DevTools: títulos 1.08 y chips 1.27. Lighthouse a11y 96. No re-medido.
- Indentación: varios JSX usan 2 espacios y el estándar exige 4. Se reformatearán más adelante, no antes.

## Errores a evitar
- El usuario de sesión de `/api/auth/session` expone `id`, no `id_user`. Los componentes que reciben `currentUserId` desde `App` usan `currentUser.id`.
- En merges de i18n, el auto-merge de git dejó `profile` anidado dentro de `survey.errors` y un `}}};` final. Tras resolver, comprobar que `en.js` y `es.js` tengan las mismas claves (script de paridad) y no solo que el archivo compile.

## Próximos pasos
- Siguiente iteración de follows: cuentas restringidas, solicitudes pendientes con aprobación/rechazo/cancelación, visibilidad de listas restringidas, notificaciones y cambios al feed.
- Conectar `profileService` (perfil, foto y biblioteca) al backend.
- Revisar `ModerationPanel`: sus endpoints responden 401/403 hasta definir permisos.
- Documentar la encuesta en RF y ajustar `ProfileForm` según esa decisión.

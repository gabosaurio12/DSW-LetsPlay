# MEMORY.md — apps/frontend

Memoria del cliente. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Follows públicos: commit `bcc8e43`. Privacidad y bloqueos (2026-11-27, sin commit): `AccountPrivacySection` en ProfileForm, solicitudes entrantes, toggler privado/público; `UserProfile` con bloquear/desbloquear junto a Follow. LFG, listas, perfil, posts y comentarios consultan estados remotos sin localStorage.
- Los autores de tarjetas de convocatoria LFG abren perfil con el mismo botón de accesibilidad que los compañeros compatibles.
- `npm run lint`, `npm run build` y paridad i18n limpios (518 claves por idioma).
- Auth (fase 2, 2026-11-28): `LoginForm`, `RegisterForm` y `AuthBrand` llaman a `/api/auth/*` con cookie de sesión. La sesión se consulta al arrancar (`fetchCurrentUser`). Recuperación de contraseña retirada hasta el flujo por correo.
- Preferencias por cuenta: `welcomeSurveyService` usa `/api/me/gamer-preferences`. `WelcomeSurvey` sirve para bienvenida (`mode="onboarding"`) y edición (`mode="edit"`), y `components/GamerPreferencesSection` la abre desde `ProfileForm`.
- Errores de la encuesta: `loadWelcomeSurvey` lanza error con `status`. 401 cierra sesión; otros fallos muestran reintento.
- `App.jsx` (merge resuelto 2026-11-27): sin sesión → auth. Con sesión sin encuesta → `WelcomeSurvey`. Con encuesta completa → shell con `ExploreGames` por defecto. `/admin` también exige sesión y encuesta. Logout en el header del shell y del admin.
- `useMessageSocket` reconecta cada 3 s tras un cierre inesperado. Si la sesión expiró, el intento se repite en bucle hasta que el usuario vuelva a entrar.
- Encuesta: formulario único según Figma `128-926`, con `AuthBrand`, tarjeta de 490px y botón "Aceptar". Archivos: `welcomeSurveyData.js`, `welcomeSurveyService.js`, `WelcomeSurvey.jsx`, `WelcomeSurveyPanels` (`SurveyOptionGroup`), `SurveyOptionChip`.
- Páginas: `ExploreGames`, `GameDetail` (drag & drop), `LfgSearch`, `ModerationPanel` (`/admin`).
- Componentes nuevos: `PostComments`, `ReportModal`, `ProfileFormPanels`, `SelectableChip`.
- `videogameService` (incluye uploads), `commentService`, `reportService` y `lfgService` consumen `/api/*` por el proxy de Vite a `:3001`. `authService`, `profileService` y `welcomeSurveyService` siguen en localStorage.
- `npm run lint` limpio el 2026-11-27.
- Mensajería (2026-11-28, sin commit): vista `Messages` desde la barra lateral y desde "Enviar mensaje" del perfil y de LFG. Archivos: `pages/Messages.jsx`, `components/ConversationList`, `components/MessageThread`, `components/MessageComposer`, `hooks/useMessaging.js`, `hooks/useMessageSocket.js`, `services/messageService.js`, `data/messageRules.js`. `vite.config.js` añade el proxy `/ws`.
- `npm run lint` y `npm run build` limpios; paridad i18n 540 claves por idioma.
- Mensajes (2026-11-28, sin commit, layout): `.messages-page` ocupa el ancho del workspace con tope de 1280px. Escritorio: `.messages-layout` mide `calc(100svh - 240px)` para que el bloque quepa sin scroll. Entre 720 y 960px la barra lateral se apila: alto `min(72vh, 680px)`. Móvil: alto auto.
- Scroll del hilo (2026-11-28, sin commit): abre en el último mensaje sin animación. Si llega un mensaje y estabas a menos de 80px del fondo, baja con animación. Si estabas arriba, muestra el botón "Nuevos mensajes". Tus propios mensajes siempre bajan. Cargar anteriores no mueve el scroll. Lógica en `MessageBubbleList.jsx`.
- Compositor: Enter envía y Shift+Enter salta línea. Táctil (`pointer: coarse`) no envía con Enter. Botón y Enter se bloquean con borrador vacío o con más de 300 palabras (`validateMessageDraft`). El contador se pone en `--over`.
- Cabecera del hilo con "Bloquear" (CU-29): confirmación en dos pasos y `blockUser` de `followService`. Tras bloquear, el hilo se cierra y la bandeja se recarga. `MessageThread` orquesta `MessageThreadHeader`, `MessageBubbleList` y `MessageComposer`.
- Pendiente: el color de error usa `--lp-primary-hover` porque no hay token de error. El usuario lo revisará.

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
- 2026-11-28: en Mensajes el atajo Enter no se activa en pantallas táctiles, porque los teclados virtuales no tienen Shift. Ahí el envío queda en el botón.

## Bugs abiertos (verificados en código el 2026-11-27)
- Contraste: `ProfileForm.css` usa `--color-*` (tema oscuro de `index.css`), pero `App.css` fuerza fondo claro con `--lp-*`. Medido antes con DevTools: títulos 1.08 y chips 1.27. Lighthouse a11y 96. No re-medido.
- Indentación: varios JSX usan 2 espacios y el estándar exige 4. Se reformatearán más adelante, no antes.

## Errores a evitar
- El usuario de sesión de `/api/auth/session` expone `id`, no `id_user`. Los componentes que reciben `currentUserId` desde `App` usan `currentUser.id`.
- `.app-body` se dimensiona por la barra lateral, no por la ventana. Con `flex: 1` el chat no llena la ventana; por eso Mensajes usa altura calculada. Si cambia el header, ajustar los 240px de `Messages.css`.
- En `MessageBubbleList` el efecto que hace scroll depende del id del último mensaje, no de la lista completa. Así cargar anteriores no mueve el scroll. No cambiarlo a "cualquier cambio de mensajes".
- La herramienta `fill` de DevTools corta textos de más de ~12 palabras. Para probar límites usar `type_text`.
- En merges de i18n, el auto-merge de git dejó `profile` anidado dentro de `survey.errors` y un `}}};` final. Tras resolver, comprobar que `en.js` y `es.js` tengan las mismas claves (script de paridad) y no solo que el archivo compile.

## Próximos pasos
- Notificaciones/cambios al feed y CU-31/32 (mute) siguen fuera de alcance. Alinear perfil/settings con Figma en una auditoría visual ejecutada.
- Conectar `profileService` (perfil, foto y biblioteca) al backend.
- Revisar `ModerationPanel`: sus endpoints responden 401/403 hasta definir permisos.
- Documentar la encuesta en RF y ajustar `ProfileForm` según esa decisión.

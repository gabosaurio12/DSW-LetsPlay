# MEMORY.md — Let's Play (raíz)

Memoria transversal entre sesiones. Máximo ~50 líneas. Memorias por carpeta: `apps/frontend/MEMORY.md`, `apps/backend/MEMORY.md`, `database/MEMORY.md`.

## Estado actual
- Migración del backend a Prisma 6 completa en `refactor/quality-fixes` (2026-11-28, commits por repositorio). Detalle en `apps/backend/MEMORY.md`. Sin push.
- Rama `feat/user-follows`; follows públicos están en `bcc8e43`. Fase actual de privacidad y bloqueos sin commit ni push.
- Fase privada en el árbol actual: backend + frontend + migración, 166 pruebas backend, lint/build frontend, 518 claves i18n iguales. La DB de desarrollo tiene `User.is_private` y `FollowRequests`.
- Nodos Figma `78:989`, `80:725` y `81:1051` inspeccionados con Chrome DevTools. No se auditó visualmente la implementación en ejecución.
- Mensajería privada (2026-11-28, sin commit): CU-33, CU-34 y CU-35 implementados en backend y frontend. Nodo Figma `75:639` (Mensajes / Conversaciones privadas) inspeccionado con Chrome DevTools. Pendiente la auditoría visual con `figma-parity` y la prueba en navegador con dos cuentas.
- Rama `main` al día con `origin/main` (2026-11-27). PR #11 (AGENTS/MEMORY por carpeta) y PR #12 (LFG) fusionados.
- Cambio sin commit el 2026-11-27: una línea nueva en `AGENTS.md` (Comentarios: priorizar no usar comentarios). Los commits los hace el usuario.
- Tarea Trello #48 (registro, login y logout) completada en frontend.
- Pendientes: #44 y #47 (`README.md`, `.env.example`) y #34 (modelo de presentación).
- Prototipos Figma: archivo `Let-s-Play` (`YJ7S6DSebM5cZkSKu7j7Ek`).
- Clave de Context7 rotada (2026-11-27). `opencode.json` ya no está en HEAD, pero sí quedó en el historial (commit `c55df8c`). No registrar claves en ningún archivo.
- `.routing/` y `.tickets/` no existen en el repo. Sus referencias se eliminaron de la memoria.
- `node_modules` y `dist` dejaron de estar versionados (2026-11-27, `git rm --cached`); ahora están en `.gitignore`.

## Decisiones (y por qué)
- 2026-11-06: estructura `apps/frontend` + `apps/backend` definitiva. Queda pendiente cerrar la nota de `src-client`/`src-server`.
- 2026-11-27: `docs/EstandarDeCodigo.md` (v1.1) es la fuente de verdad de estilo: 4 espacios, comillas dobles y punto y coma. Se adaptó al código: pruebas con `node:test`, errores con `console.error` (sin logger), sin Zod/Joi, carpetas de componente en PascalCase. El formato del código existente (2 espacios en varios JSX) se cambiará más adelante.
- 2026-11-27: AGENTS y MEMORY por carpeta, para no mezclar contexto de frontend, backend, docs y database.
- IDs canónicos RF-01…RF-136, CU-01…CU-51, RN-01…RN-30. Actores: Visitante, Usuario, Moderador, Administrador.
- Recomendaciones deterministas. LFG: 50% juegos, 30% plataformas, 20% horarios, más un toggle "Looking to play".
- Sin dependencias nuevas ni pasos de build sin aprobación explícita. Aprobada `ws` ^8 (2026-11-28) solo para el canal de mensajes.
- 2026-11-28: Prisma aprobado para todo el backend, versión 6.19.3 (estable más reciente en CommonJS sin build). Prisma 7 genera TypeScript y exigiría `tsc`. Dos excepciones de SQL crudo aprobadas: `FOR UPDATE`. `DATABASE_URL` reemplaza a las variables `PG*`.
- 2026-11-28: mensajería en tiempo real por WebSocket (`/ws/messages`), sin polling. Enviar requiere follow mutuo si una de las dos cuentas es privada; si ninguna lo es, no se pide follow. Bloqueo en cualquier dirección impide leer y enviar. Mensajes de máximo 300 palabras; historial sin límite de retención, paginado. Cuenta eliminada: su conversación desaparece. La conversación se crea con el primer mensaje.
- Instrucción del usuario (2026-11-28): para abrir nodos de Figma usar el MCP de Chrome DevTools (`new_page` con la URL del nodo). Pendiente de mover a `AGENTS.md` con confirmación.
- 2026-11-27: cuentas públicas por defecto para conservar visibilidad histórica. `Follows` guarda relaciones aceptadas; `FollowRequests`, pendientes. Rechazar permite solicitar de nuevo. Hacer pública una cuenta no aprueba solicitudes pendientes.
- 2026-11-27: bloquear elimina follows y solicitudes en ambos sentidos dentro de una transacción; operaciones del mismo par bloquean ambas filas `User` en orden. Desbloquear no restaura relaciones.
- 2026-11-27: CU-31/32 (silenciar) quedan fuera. La fase añade privacidad y solicitudes ligadas al seguimiento. La implementación de CU-29/30 queda pendiente de cierre.
- 2026-11-27: LFG no debe exigir juegos compartidos cuando la cuenta aún no tiene biblioteca; mostrar afinidad por plataforma/horario hasta que agregue juegos. Autores de convocatorias LFG navegan a su perfil.
- 2026-11-28: `AGENTS.md` acepta `feat/*` y `feature/*`. La rama `refactor/quality-fixes` cumple la regla de `refactor/*`.

## Errores a evitar
- Prioriza los docs numerados. Los sueltos antiguos duplican contenido.
- No uses links `file:///` en los docs.
- No asumas IDs antiguos ni tomes los docs 1.5 vacíos como completados.
- No fusiones `feat/gaming-survey` ni toques código, localStorage o `node_modules` sin aprobación.

## Próximos pasos
- Terminar CU-29 (bloquear usuario) y CU-30 (desbloquear usuario): revisar flujos end-to-end y paridad visual de los controles de bloqueo en el perfil.
- Fase 2 (2026-11-28, sin commit): autenticación con sesiones en `ActiveSessions`, preferencias por cuenta y edición desde perfil. Pendiente: `.env` local debe usar `PGUSER=letsplay_admin`; decidir el contraste de `#bb8484` (no cumple AA); alinear etiquetas de horario con LFG; `POST /api/reports` debe usar la sesión.
- Recuperación de contraseña retirada hasta definir el flujo por correo. Moderación bloqueada hasta definir permisos.
- Cerrar la pregunta `src-client`/`src-server` y registrar la decisión.
- Completar `1.5.1`, crear `1.5.2` y ampliar `1.5.3`.

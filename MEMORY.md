# MEMORY.md — Let's Play (raíz)

Memoria transversal entre sesiones. Máximo ~50 líneas. Memorias por carpeta: `apps/frontend/MEMORY.md`, `apps/backend/MEMORY.md`, `database/MEMORY.md`.

## Estado actual
- Rama `feat/user-follows`; follows públicos están en `bcc8e43`. Fase actual de privacidad y bloqueos sin commit ni push.
- Fase privada en el árbol actual: backend + frontend + migración, 165 pruebas backend, lint/build frontend, 518 claves i18n iguales. Migración y flujo social validados en bases PostgreSQL temporales; la DB de desarrollo no se modificó.
- Nodos Figma `78:989`, `80:725` y `81:1051` inspeccionados con Chrome DevTools. No se auditó visualmente la implementación en ejecución.
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
- Sin dependencias nuevas ni pasos de build sin aprobación explícita.
- 2026-11-27: cuentas públicas por defecto para conservar visibilidad histórica. `Follows` guarda relaciones aceptadas; `FollowRequests`, pendientes. Rechazar permite solicitar de nuevo. Hacer pública una cuenta no aprueba solicitudes pendientes.
- 2026-11-27: bloquear elimina follows y solicitudes en ambos sentidos dentro de una transacción; operaciones del mismo par bloquean ambas filas `User` en orden. Desbloquear no restaura relaciones.
- 2026-11-27: CU-31/32 (silenciar) quedan fuera. La fase cubre privacidad, CU-29/30 y solicitudes ligadas al seguimiento. No se añadieron notificaciones ni cambios al feed.
- 2026-11-27: LFG no debe exigir juegos compartidos cuando la cuenta aún no tiene biblioteca; mostrar afinidad por plataforma/horario hasta que agregue juegos. Autores de convocatorias LFG navegan a su perfil.
- Discrepancia sin resolver: la rama usa `feat/*` y `AGENTS.md` indica `feature/*`; `AGENTS.md` pide commitear cada tarea y esta memoria dice que el usuario commitea. No renombrar ni commitear sin confirmación.

## Errores a evitar
- Prioriza los docs numerados. Los sueltos antiguos duplican contenido.
- No uses links `file:///` en los docs.
- No asumas IDs antiguos ni tomes los docs 1.5 vacíos como completados.
- No fusiones `feat/gaming-survey` ni toques código, localStorage o `node_modules` sin aprobación.

## Próximos pasos
- Fase 2 (2026-11-28, sin commit): autenticación con sesiones en `ActiveSessions`, preferencias por cuenta y edición desde perfil. Pendiente: `.env` local debe usar `PGUSER=letsplay_admin`; decidir el contraste de `#bb8484` (no cumple AA); alinear etiquetas de horario con LFG; `POST /api/reports` debe usar la sesión.
- Recuperación de contraseña retirada hasta definir el flujo por correo. Moderación bloqueada hasta definir permisos.
- Cerrar la pregunta `src-client`/`src-server` y registrar la decisión.
- Completar `1.5.1`, crear `1.5.2` y ampliar `1.5.3`.

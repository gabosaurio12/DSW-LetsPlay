# MEMORY.md — Let's Play (raíz)

Memoria transversal entre sesiones. Máximo ~50 líneas. Memorias por carpeta: `apps/frontend/MEMORY.md`, `apps/backend/MEMORY.md`, `database/MEMORY.md`.

## Estado actual
- Rama observada el 2026-11-27: `refactor/agents-files-reorder`. La memoria anterior hablaba de `Li0`; confirmar cuál es la rama de trabajo.
- Cambios sin commit el 2026-11-27: reorganización de `AGENTS.md` y `MEMORY.md` por carpeta.
- Tarea Trello #48 (registro, login y logout) completada en frontend.
- Pendientes: #44 y #47 (`README.md`, `.env.example`) y #34 (modelo de presentación).
- Prototipos Figma: archivo `Let-s-Play` (`YJ7S6DSebM5cZkSKu7j7Ek`).
- Pendiente del usuario: rotar la clave de Context7 que está en `opencode.json`, que está versionado. No registrar la clave en ningún archivo.
- `.routing/` y `.tickets/` no existen en el repo. Sus referencias se eliminaron de la memoria.

## Decisiones (y por qué)
- 2026-11-06: estructura `apps/frontend` + `apps/backend` definitiva. Queda pendiente cerrar la nota de `src-client`/`src-server`.
- 2026-11-27: `docs/EstandarDeCodigo.md` (v1.1) es la fuente de verdad de estilo: 4 espacios, comillas dobles y punto y coma. Se adaptó al código: pruebas con `node:test`, errores con `console.error` (sin logger), sin Zod/Joi, carpetas de componente en PascalCase. El formato del código existente (2 espacios en varios JSX) se cambiará más adelante.
- 2026-11-27: AGENTS y MEMORY por carpeta, para no mezclar contexto de frontend, backend, docs y database.
- IDs canónicos RF-01…RF-136, CU-01…CU-51, RN-01…RN-30. Actores: Visitante, Usuario, Moderador, Administrador.
- Recomendaciones deterministas. LFG: 50% juegos, 30% plataformas, 20% horarios, más un toggle "Looking to play".
- Sin dependencias nuevas ni pasos de build sin aprobación explícita.

## Errores a evitar
- Prioriza los docs numerados. Los sueltos antiguos duplican contenido.
- No uses links `file:///` en los docs.
- No asumas IDs antiguos ni tomes los docs 1.5 vacíos como completados.
- No fusiones `feat/gaming-survey` ni toques código, localStorage o `node_modules` sin aprobación.

## Próximos pasos
- Documentar la encuesta en RF/formularios (RF-127) y definir su integración con `ProfileForm`.
- Cerrar la pregunta `src-client`/`src-server` y registrar la decisión.
- Completar `1.5.1`, crear `1.5.2` y ampliar `1.5.3`.

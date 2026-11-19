# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Fase de análisis y diseño completada en docs; hay código en apps/frontend (Vite + React 19) y apps/backend (Express stub sin rutas ni BD).
- Feature activa: **ProfileForm** (apps/frontend/src) — formulario de perfil según docs/Formularios de envío de información.md §3: nombre visible (req., máx 100), descripción personal (opc.), foto de perfil por URL (opc.) y biblioteca de 1–5 videojuegos aprobados (req., RF-88/89).
- Estructura del código: ProfileForm.jsx (estado/validación), components/{ProfileFormPanels,SelectableChip}.jsx, data/profileFormData.js, services/profileService.js, hooks/useTranslation.js, i18n/{i18n,es,en}.js, ProfileForm.css.
- Ojo: el trabajo anterior (WelcomeSurvey) NO estaba commiteado y se perdió en un reset al commit "feat: initial application structure"; todo lo nuevo debe commitearse pronto.
- Docs numerados completados: definición, plan, requisitos (RF-01..97), especificación, CU-01..19, arquitectura, WAE. Pendientes: 1.5.1, 1.5.2, 1.5.3.
- Esquema relacional en `database/LetsPlay.dbml` (DBML/PostgreSQL): 14 tablas + 8 enums + 26 refs, tomados de docs/Formularios de envío de información.md. Sin notas ni comentarios, todo en inglés (tablas, columnas, enums). Pendiente: reportes (form. 13-14) y mensajes privados (form. 15) no tienen tabla en el doc.

## Decisiones (y por qué)
- Estructura real: apps/frontend + apps/backend (decisión 2026-11-06); AGENTS.md conserva src-client/src-server como pendiente de migrar.
- i18n: mini-diccionario propio (es/en) sin dependencias; regla 🚫 de AGENTS.md prohíbe añadir librerías.
- Persistencia temporal en localStorage (clave "letsPlay.userProfile") con async/await + try/catch; el servicio valida la forma guardada y degrada a null si está corrupto.
- Catálogo de videojuegos aprobados simulado en profileFormData.js hasta que exista el endpoint del backend.
- Flujo UX: formulario → guardar → pantalla de confirmación con resumen → "Editar perfil" vuelve al formulario.
- DBML: todo en inglés (tablas, columnas, enums y valores) pese a que el doc está en español; enums de estado con valores provisionales del doc. Sin notas ni comentarios (decisión del usuario).

## Aprendizajes y errores a evitar
- Commitear en cada tarea: el trabajo sin commit se pierde con cualquier reset.
- Priorizar los docs numerados; los sueltos antiguos están duplicados.
- Sin dependencias nuevas ni build steps sin aprobación explícita.
- Código: comillas dobles, punto y coma, 2 espacios, llaves K&R, componentes PascalCase (eslint limpio, build OK).

## Próximos pasos
- Commitear ProfileForm (rama feature/, conventional commit).
- Decidir con el equipo: ¿migrar apps/* a src-client/src-server? y documentar el formulario de perfil en los RF.
- Conectar profileService al backend cuando exista el endpoint; migrar foto a MongoDB/Assets.
- Completar 1.5.1 (pruebas), 1.5.3 (seguridad/aceptación) y crear 1.5.2.

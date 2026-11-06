# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Fase de análisis y diseño completada en docs; YA HAY CÓDIGO: apps/frontend (Vite + React 19) y apps/backend (Express stub sin rutas ni BD).
- Primera feature: WelcomeSurvey en apps/frontend/src — wizard de encuesta de preferencias gaming: géneros → plataformas → disponibilidad → resumen → confirmación.
- Datos/estructura: welcomeSurveyData.js, welcomeSurveyService.js, components/SurveyOptionChip + WelcomeSurveyPanels, hooks/useTranslation, i18n/i18n.js con es/en.
- Docs numerados completados: definición, plan, requisitos (RF-01..97), especificación, CU-01..19, arquitectura, WAE. Pendientes: 1.5.1, 1.5.2, 1.5.3.
- La encuesta NO está documentada en los RF/formularios; lo más cercano es la biblioteca personal de 1–5 videojuegos (RF-88/89).
- Directorio vacío esperando contenido: .opencode/.

## Decisiones (y por qué)
- Estructura real: apps/frontend + apps/backend (decisión 2026-11-06 con el usuario); AGENTS.md conserva src-client/src-server como pendiente de migrar.
- Encuesta obligatoria, géneros y plataformas min 1 / max 5 (alineado con RF-88/89), disponibilidad min 1 sin máximo; validación en cliente con mensajes claros.
- i18n: mini-diccionario propio (src/i18n, es/en) sin librerías; el usuario pidió i18next primero pero aceptó el diccionario propio por la regla de no añadir dependencias.
- Persistencia temporal en localStorage con async/await + try/catch; retorna false/null ante fallos, UX: confirmación + botón "Editar respuestas".
- Componentes separados en components/ (SurveyOptionChip, WelcomeSurveyPanels) para respetar SRP y funciones cortas.

## Aprendizajes y errores a evitar
- Priorizar siempre los docs numerados; los sueltos antiguos están duplicados.
- Sin dependencias nuevas ni build steps sin aprobación explícita (Límites en AGENTS.md).
- Código: comillas dobles, punto y coma, 2 espacios, llaves K&R, componentes PascalCase — eslint del repo limpio y npm run build OK.
- No usar links absolutos file:/// en los docs.

## Próximos pasos
- Decidir con el equipo: ¿migrar apps/* a src-client/src-server?
- Documentar la encuesta en los formularios/RF antes de conectarla al backend.
- Completar 1.5.1 (pruebas), 1.5.3 (seguridad/aceptación) y crear 1.5.2.
- Conectar welcomeSurveyService al backend cuando exista el endpoint.

# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Repositorio activo y clonado en DSW-LetsPlay (rama main al día).
- Fase de análisis y diseño documental completada y en expansión.
- Documento 1.2.4 creado: publicaciones, comentarios, reacciones, encuestas y spoilers formalizados (RF-117..126, CU-19 actualizado, CU-39..45, RN-24..26 y DDL PostgreSQL).
- Docs canónicos existentes: 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.3.1, 1.3.2. Pendientes: 1.5.1, 1.5.2, 1.5.3.
- En feat/gaming-survey se avanzó el componente WelcomeSurvey (React 19 + i18n propio).
- Directorios base: apps/frontend, apps/backend; pendientes: .opencode/.

## Decisiones (y por qué)
- Stack: React + Express.js; PostgreSQL (BD relacional) + MongoDB (archivos/multimedia).
- Formato documental canónico: esquema numerado 1.X.* en docs/ (Markdown para Obsidian) sin enlaces absolutos file:///.
- Módulo de interacción: encuestas (2-5 opciones, 1 voto por usuario inmutable), spoilers (es_spoiler booleano, blur por defecto, revelación en cliente), reacciones (toggle me gusta).
- i18n obligatorio con diccionarios es/en para todos los textos de UI.

## Aprendizajes y errores a evitar
- Priorizar siempre los documentos numerados; no duplicar en los archivos sueltos antiguos.
- Trabajar directamente sobre el repo clonado (DSW-LetsPlay), no sobre carpetas zip descomprimidas.
- Sin dependencias externas nuevas ni alterar build steps sin aprobación expresa.
- Enlaces internos a documentación deben ser relativos al vault (docs/).

## Próximos pasos
- Integrar/alinear con el equipo la rama feat/gaming-survey a main si se aprueba.
- Redactar casos y planes de prueba (1.5.1, 1.5.2) y criterios de seguridad/aceptación (1.5.3).
- Comenzar implementación de endpoints de publicaciones, comentarios, encuestas y reacciones en apps/backend.

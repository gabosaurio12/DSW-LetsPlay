# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Fase de análisis y diseño; aún no hay código (el repo es solo docs/).
- Docs numerados completados: definición, planificación, requisitos (RF-01…RF-97), especificación funcional, casos de uso (CU-01…CU-19), arquitectura (por diagramas), modelo WAE.
- Pendientes: 1.5.1.Pruebas.md y 1.5.3.SeguridadAceptacion.md están vacíos; falta 1.5.2. Hoy el equipo termina de migrar los archivos viejos sueltos al esquema numerado (tras eso, los sueltos quedan obsoletos).
- Diagramas en docs/img/diagrams/; modelo EA en docs/artifacts/LetsPlay.eapx.
- Directorios vacíos esperando código: src-client/, src-server/, .opencode/, .agents/.

## Decisiones (y por qué)
- Stack: React (src-client/) + Express (src-server/); PostgreSQL (BD principal) + MongoDB (assets/imagenes).
- Primera versión solo escritorio; grupos públicos/privados ligados a 1–5 juegos, los privados requieren aprobación del admin.
- i18n mínimo: español e inglés.
- Nota: docs/1.1.1.Definicion.md menciona Next.js; se usa React + Express según AGENTS.md (a confirmar con el equipo).

## Aprendizajes y errores a evitar
- Priorizar siempre los docs numerados; los sueltos antiguos están duplicados.
- Sin dependencias nuevas ni build steps hasta que exista código (ver Límites en AGENTS.md).
- No usar links absolutos file:/// en los docs.

## Próximos pasos
- Estandarizar pendiente de compañeros (hoy) → luego ignorar/borrar los sueltos si procede.
- Completar 1.5.1 (pruebas) y 1.5.3 (seguridad/aceptación); crear 1.5.2.
- Iniciar src-client/ y src-server/ bajo el esquema de estructura en AGENTS.md.

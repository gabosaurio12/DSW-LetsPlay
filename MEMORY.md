# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Repo activo en DSW-LetsPlay (main al día). Docs canónicos: 1.1.1, 1.1.2, 1.2.1..1.2.5, 1.3.1, 1.3.2. Pendientes: 1.5.1, 1.5.2, 1.5.3.
- 1.2.4: publicaciones, comentarios, reacciones, encuestas y spoilers (RF-117..126, CU-39..45). 1.2.5: recomendaciones y búsqueda LFG (RF-127..136, CU-46..51, RN-27..30, con DDL).
- Feature activa: **ProfileForm** (apps/frontend/src) — nombre visible (req., máx 100), descripción, foto por URL y biblioteca de 1–5 juegos aprobados (RF-88/89).
- Estructura del código: ProfileForm.jsx, components/{ProfileFormPanels,SelectableChip}.jsx, data/profileFormData.js, services/profileService.js, hooks/useTranslation.js, i18n/{i18n,es,en}.js, ProfileForm.css.
- WelcomeSurvey: avanzado en feat/gaming-survey; en main se perdió con un reset → verificar antes de integrar.
- `database/` validado y ampliado: `LetsPlay.dbml` (17 tablas, 11 enums, 34 refs, checks), `tables.sql`, `roles.sql`, `permissions.sql` y `README.md`. Probado en un cluster PostgreSQL 14 temporal: sintaxis, FKs, checks, triggers y permisos OK.
- Directorios base: apps/frontend, apps/backend; pendiente: .opencode/.

## Decisiones (y por qué)
- Stack: React + Express.js; PostgreSQL (relacional) + MongoDB (archivos/multimedia). Estructura real apps/*; AGENTS.md conserva src-client/src-server como pendiente de migrar.
- Formato documental canónico: esquema numerado 1.X.* en docs/ (Markdown para Obsidian), sin enlaces absolutos file:///.
- i18n: mini-diccionario propio es/en sin dependencias (regla 🚫 de AGENTS.md). Persistencia temporal en localStorage ("letsPlay.userProfile") con validación y degradación a null.
- Catálogo de juegos simulado en profileFormData.js hasta existir el endpoint. Flujo UX: formulario → confirmación con resumen → "Editar perfil".
- Recomendaciones deterministas (biblioteca, catálogo, plataformas, horarios; sin IA opaca en v1). LFG con ponderación 50% juegos / 30% plataformas / 20% horarios y toggle "Looking to play".
- DBML y SQL: todo en inglés, sin notas; los `checks` llevan nombre para que DBML y SQL coincidan.
- Permisos: nadie lee tablas base; 8 vistas filtran por `app.current_user_id` (el backend debe hacer `SET LOCAL`). Evita exponer password_hash/email y filtra grupos privados sin RLS. Admin sí tiene acceso directo.
- Integridad en BD: CHECKs + triggers `DEFERRABLE INITIALLY DEFERRED` para el rango 1–5 (permiten reemplazar la lista en una transacción) + FK compuesta `Post → CommunityVideogames` (RN-14). Autoría (RN-11/RN-18) queda en backend.
- Tablas nuevas: `Report` (id polimórfico, sin FK), `Conversation` (participantes ordenados) y `Message` (trigger valida participantes y bloqueo, CU-35). Enums de reporte provisionales desde RC-01..05 y RF-97.
- Timestamps migrados a `timestamptz` con `DEFAULT now()`; `updated_at` se actualiza por trigger.

## Aprendizajes y errores a evitar
- PostgreSQL **no** admite `IF NOT EXISTS` en `CREATE ROLE`/`CREATE USER`; `roles.sql` usa un bloque `DO` sobre `pg_roles`.
- `CREATE DATABASE` no puede ir dentro de una transacción ni de un bloque `DO`: se documenta como paso aparte en README.md.
- GRANT/REVOKE sobre `ALL TABLES` solo afecta objetos existentes: `tables.sql` va antes que `permissions.sql`.
- Commitear en cada tarea: el trabajo sin commit se pierde con cualquier reset.
- Priorizar los docs numerados; los sueltos antiguos están duplicados. Sin dependencias ni build steps nuevos sin aprobación.
- Enlaces internos de docs relativos al vault. Código: comillas dobles, punto y coma, 2 espacios, llaves K&R.

## Próximos pasos
- Confirmar la resolución del conflicto de merge de este MEMORY.md y commitear.
- Commitear ProfileForm y el esquema `database/` (ramas feature/, conventional commits).
- Revisar si el DDL de 1.2.4/1.2.5 debe incorporarse a `database/`.
- Ceñir privilegios de escritura por tabla/columna; añadir índices en columnas FK; decidir enums provisionales de reportes.
- Integrar feat/gaming-survey si se aprueba; completar 1.5.1, 1.5.2 y 1.5.3.
- Conectar profileService y los endpoints LFG al backend; migrar foto a MongoDB.

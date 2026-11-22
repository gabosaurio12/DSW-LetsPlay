# MEMORY.md — Let's Play
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Rama activa `Li0` (creada desde `main` con base en commit `8e9aa4c`). Todo el trabajo propio se aísla aquí para evitar conflictos.
- Estructura: `apps/frontend` (React/Vite con ProfileForm e i18n) y `apps/backend` (Express base); `AGENTS.md` y `MEMORY.md` en raíz; `docs/` y `database/` canónicos.
- Tareas Trello: 35 terminadas, 7 en V&V, 3 en proceso, 19 en pendientes. De pendientes (Li0 y Todos), las de modelado WAE (#30, #31, #35) y seguridad (#42) ya están cubiertas en docs y SQL.
- Docs canónicos en `docs/`: 1.1.1, 1.1.2, 1.2.1..1.2.5, 1.3.1, 1.3.2, 1.5.1, 1.5.3 y complementarios.
- `database/`: 22 tablas, 14 enums, 42 FKs, 13 vistas y roles en `roles.sql`/`permissions.sql`.
- Pendientes inmediatos de Li0: #44/#47 (`README.md`, `.env.example`), #34 (modelo de presentación) y #48 (vistas auth en React).

## Decisiones (y por qué)
- Stack: React + Express.js; PostgreSQL (relacional) + MongoDB (archivos/multimedia). Estructura `apps/*` definitiva.
- IDs canónicos: RF-01..RF-136, CU-01..CU-51, RN-01..RN-30; actores Visitante, Usuario, Moderador, Administrador.
- i18n: mini-diccionario propio es/en sin dependencias. Persistencia temporal en localStorage ("letsPlay.userProfile") con validación y degradación a null.
- Recomendaciones deterministas (biblioteca, catálogo, plataformas, horarios). LFG: 50% juegos / 30% plataformas / 20% horarios y toggle "Looking to play".
- DBML y SQL en inglés, sin notas; los checks llevan nombre para que DBML y SQL coincidan.
- Scripts en `database/`: `init-db.sh` (imagen oficial `postgres:16`, contenedor `letsplay` sin `--rm`, BD `letsplay` que se **recrea** en cada ejecución; orden roles.sql → CREATE DATABASE → tables.sql → permissions.sql con `ON_ERROR_STOP=1`), `start-db.sh` (inicia y espera `pg_isready`), `psql-db.sh` (`docker exec -it ... psql -U postgres -d letsplay`) y `stop-db.sh`. Decisión confirmada por el usuario. No ejecutados contra Docker todavía; solo `bash -n`.
- Permisos: 8 vistas filtran por `app.current_user_id`; el backend debe hacer `SET LOCAL`. Admin tiene acceso directo a tablas base.
- Integridad: CHECKs + triggers `DEFERRABLE INITIALLY DEFERRED` para el rango 1–5 + FK compuesta `Post → CommunityVideogames`. Autoría y alta de administradores de grupo se validan en backend.
- Tablas nuevas: `Report` (id polimórfico), `Conversation` (participantes ordenados) y `Message` (trigger valida participantes y bloqueo, CU-35). Enums de reporte provisionales.
- Timestamps `timestamptz` con `DEFAULT now()`; `updated_at` se actualiza por trigger.
- Alineación 1.2.4/1.2.5: `is_spoiler` en Post/Comment y tablas `Poll`, `PollOption`, `PollVote`, `GamerPreference`, `LfgPost` (más vistas en `permissions.sql`). JSONB de preferencias sin default `[]` para que el CHECK exija 1-5; RN-10 (texto/imagen/encuesta) se valida en backend.
- Estilo de código: comillas dobles, punto y coma, 4 espacios, llaves K&R y JSDoc en funciones públicas.

## Aprendizajes y errores a evitar
- PostgreSQL no admite `IF NOT EXISTS` en `CREATE ROLE`/`CREATE USER`; `roles.sql` usa un bloque `DO`.
- `CREATE DATABASE` no puede ir en transacción ni en bloque `DO`: paso aparte en `database/README.md`.
- GRANT/REVOKE sobre `ALL TABLES` solo afecta objetos existentes: `tables.sql` va antes que `permissions.sql`.
- Commitear en cada tarea; el trabajo sin commit se pierde con resets. No hacer push sin autorización.
- Priorizar docs numerados; no crear duplicados sueltos. Enlaces internos relativos al vault; no editar `.obsidian/`.
- No asumir IDs antiguos RF<=97/CU<=19 ni tratar docs 1.5 vacíos como completados.
- Los comandos originales del usuario tenían `-e` después de la imagen y `-d postgres` como CMD; con la imagen oficial usar `-e POSTGRES_DB=postgres` y `-d` solo para detach. No existe `database/init.sql`.
- No fusionar `feat/gaming-survey` directamente ni tocar código, localStorage ni `node_modules` sin aprobación.

## Próximos pasos
- Completar `1.5.1` y definir con el equipo si se crea `1.5.2`; ampliar `1.5.3` más allá de secretos.
- Decidir la integración de WelcomeSurvey con ProfileForm siguiendo RF-88/89 y RF-127.
- Conectar `profileService` y endpoints LFG al backend; migrar foto a MongoDB.
- Revisar índices de FK y privilegios de escritura por tabla/columna.

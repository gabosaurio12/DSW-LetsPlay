# Base de datos — Let's Play

## Archivos

| Archivo | Contenido |
|---|---|
| `LetsPlay.dbml` | Modelo de referencia (DBML/PostgreSQL). Toda la estructura se refleja aquí. |
| `tables.sql` | Enums, tablas, claves foráneas, checks y triggers. |
| `roles.sql` | Roles de permisos y usuarios de demostración. |
| `permissions.sql` | Vistas de lectura y concesión de privilegios. |

## Orden de ejecución

Los scripts no son idempotentes (salvo `roles.sql`): crear la base de datos y ejecutarlos **una sola vez** sobre una BD vacía.

```sh
psql -U postgres -d postgres -f database/roles.sql
psql -U postgres -d postgres -c 'CREATE DATABASE letsplay;'
psql -U postgres -d letsplay -f database/tables.sql
psql -U postgres -d letsplay -f database/permissions.sql
```

`CREATE DATABASE` no puede ejecutarse dentro de una transacción, por eso vive fuera de los scripts y requiere conexión previa a `postgres`. PostgreSQL no admite `IF NOT EXISTS` en `CREATE ROLE`/`CREATE USER`, así que `roles.sql` usa un bloque `DO` que consulta `pg_roles` y puede repetirse sin error.

## Roles

| Rol / usuario | Permisos |
|---|---|
| `letsplay_readonly` | Solo `SELECT` sobre las vistas. |
| `letsplay_writeonly` | `INSERT` en todas las tablas. |
| `letsplay_updateonly` | `UPDATE` en todas las tablas. |
| `letsplay_deleteonly` | `DELETE` en todas las tablas. No se asigna a `letsplay_user`: el borrado es lógico (`UPDATE ... status = 'DELETED'`). |
| `letsplay_admin` | Hereda los cuatro roles y además tiene `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` directos sobre las tablas base. |
| `letsplay_guest` | Hereda `letsplay_readonly`: catálogo y comunidades públicas. |
| `letsplay_user` | Hereda lectura, escritura y actualización. |

Las contraseñas de `roles.sql` son de demostración; reemplazarlas antes de cualquier despliegue.

## Vistas de lectura

Ningún usuario lee tablas base directamente. Esto evita exponer `password_hash`, `email` y `birth_date`, y permite filtrar contenido privado sin RLS.

| Vista | Acceso | Filtro |
|---|---|---|
| `v_public_videogame` | guest, user | Catálogo con `status = 'ACTIVE'`. |
| `v_public_community` | guest, user | Comunidades `PUBLIC` y activas. |
| `v_user_profile` | user | Cuentas activas, sin bloqueo mutuo. Sin datos sensibles. |
| `v_user_post` | user | Activas; generales, de comunidad pública o de comunidad privada donde el usuario es miembro; sin bloqueo mutuo con el autor. |
| `v_user_comment` | user | Comentarios de posts visibles; sin bloqueo mutuo con el autor. |
| `v_user_conversation` | user | Conversaciones en las que participa. |
| `v_user_message` | user | Mensajes de esas conversaciones. |
| `v_user_report` | user | Solo los reportes creados por él; sin el comentario interno de revisión. |

Las vistas que dependen del usuario leen `app.current_user_id`. El backend debe fijarlo al inicio de cada transacción:

```sql
BEGIN;
SET LOCAL app.current_user_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM "v_user_post";
COMMIT;
```

Si no se fija, `current_setting(..., true)` devuelve `NULL` y esas vistas devuelven cero filas (falla cerrada). Los moderadores y el administrador consultan la tabla `Report` directamente.

## Integridad en base de datos

- **Checks:** formato alfanumérico de `username` (RN-01), ausencia de autorelaciones en `Follows`/`Blocks`/`Mutes`, publicaciones y comentarios no vacíos (RN-10), coherencia de estados en `VideogameRequests`, `CommunityJoinRequests` y `Report`, y mensajes no vacíos.
- **FK compuesta** `Post.(id_community, id_videogame) → CommunityVideogames`: impide publicar en un grupo con un juego no vinculado (RN-14). Los posts generales tienen `id_community = NULL` y no se comprueban.
- **Triggers deferrables** `trg_user_videogame_limit` y `trg_community_videogame_limit`: exigen entre 1 y 5 juegos (RN-06/RN-13). Al ser `INITIALLY DEFERRED`, reemplazar una lista completa en una transacción es válido siempre que el conteo final esté en rango.
- **`fn_set_updated_at`:** actualiza `updated_at` en `User`, `Post` y `Communities`.
- **`fn_validate_message`:** verifica que remitente y destinatario pertenezcan a la conversación y que no exista bloqueo entre ellos (CU-35).

## Decisiones y supuestos

- `report_reason` y `report_status` son valores provisionales tomados de RC-01 a RC-05 y RF-96/RF-97 (`ATTENDED` = atendido). Confirmar con el equipo antes de producción.
- `Report.id_reported_content` es polimórfico (`POST`, `COMMENT`, `USER`, `COMMUNITY`), por eso no tiene foreign key; la existencia del contenido se valida en el backend.
- `Conversation` guarda los dos participantes ordenados (`id_user_1 < id_user_2`) para evitar conversaciones duplicadas en ambos sentidos.
- La autoría de publicaciones/comentarios (RN-11) y el alta automática del creador como administrador del grupo (RN-18) se validan en el backend: la base de datos no conoce la identidad de la sesión.
- Los campos de fecha usan `timestamptz` con `DEFAULT now()`; `updated_at` se gestiona por trigger.
- El borrado es lógico mediante estados `DELETED`; las vistas ya filtran esos registros.

## Pendientes conocidos

- Los roles de escritura siguen concediendo `INSERT`/`UPDATE`/`DELETE` sobre **todas** las tablas; esta revisión se limitó a los permisos de lectura. Conviene ceñirlos por tabla y columna para que un usuario no pueda alterar el catálogo (RN-21) ni perfiles ajenos.
- No hay RLS: el filtrado depende de que el backend fije `app.current_user_id` en cada transacción.
- No hay índices en columnas de clave foránea (PostgreSQL no los crea automáticamente).
- No hay notificaciones al usuario que reporta ni sanciones automáticas, conforme a RN-23.

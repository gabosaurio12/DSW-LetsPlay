# Formularios de envío de información — Let's Play

> Documento inicial para definir los formularios de la plataforma.  
> Los campos marcados como **Por definir** pueden ser completados por el equipo.

> **Tipos propuestos:** Se usa `UUID` para identificar registros relacionados, `VARCHAR` para textos cortos, `TEXT` para textos largos, `DATE` para fechas, `ENUM` para opciones controladas y `FILE/URL` para imágenes. Si la base de datos utilizará identificadores enteros, `UUID` puede sustituirse por `INT`.

## 1. Formulario de registro de usuario

**Actor:** Usuario.  
**Objetivo:** Registrar un nuevo usuario en la plataforma.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre de usuario | `VARCHAR` | Sí | Debe ser único, tener máximo 12 caracteres y contener únicamente letras y números. |
| Correo electrónico | `VARCHAR` | Sí | Debe tener formato válido y ser único. |
| Fecha de nacimiento | `DATE` | Sí | Debe tener un formato de fecha válido. Restricción de edad mínima: **Por definir**. |
| Género | `ENUM` | Sí | Opciones disponibles: **Por definir**. |
| Contraseña | `VARCHAR` | Sí | Debe almacenarse como hash; reglas de seguridad: **Por definir**. |
| Confirmar contraseña | `VARCHAR` | Sí | Campo temporal; debe coincidir con la contraseña. |

**Acciones:** Registrarse, cancelar.  
**Resultado esperado:** Se crea la cuenta o se muestran los errores de validación.

## 2. Formulario de inicio de sesión

**Actor:** Usuario.  
**Objetivo:** Acceder a la plataforma.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Correo o nombre de usuario | `VARCHAR` | Sí | Debe corresponder a una cuenta registrada. |
| Contraseña | `VARCHAR` | Sí | Debe coincidir con la contraseña almacenada. |

**Acciones:** Iniciar sesión, recuperar contraseña.  
**Resultado esperado:** Se inicia la sesión o se informa que las credenciales no son válidas.

## 3. Formulario de perfil

**Actor:** Usuario.  
**Objetivo:** Consultar y actualizar la información del perfil.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre visible | `VARCHAR` | **Por definir** | Longitud máxima: **Por definir**. |
| Descripción personal | `TEXT` | No | Puede contener información pública del usuario. |
| Biblioteca personal de videojuegos | `UUID[]` / relación | Sí | El usuario deberá relacionar entre 1 y 5 videojuegos aprobados con su perfil. Estos representan sus videojuegos favoritos o de interés. |
| Fotografía de perfil | `FILE/URL` | No | Formatos y tamaño máximo: **Por definir**. |

**Acciones:** Guardar cambios, eliminar fotografía, eliminar cuenta.  
**Resultado esperado:** Se actualiza el perfil o se informa el error correspondiente.

### Regla para la biblioteca personal de videojuegos

El formulario deberá permitir que el usuario relacione entre **1 y 5 videojuegos** con su perfil. La selección deberá realizarse únicamente con videojuegos registrados y aprobados en la plataforma. Estos videojuegos conforman su biblioteca personal y pueden representar sus videojuegos favoritos o de interés.

### Confirmación de eliminación de cuenta

Antes de eliminar la cuenta, el sistema deberá mostrar una confirmación explícita. El texto de confirmación y el tratamiento de las publicaciones, comentarios y grupos del usuario quedan **por definir**.

## 4. Formulario de cambio de contraseña

**Actor:** Usuario.  
**Objetivo:** Cambiar la contraseña actual.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Contraseña actual | `VARCHAR` | Sí | Campo temporal; debe coincidir con la contraseña vigente. |
| Nueva contraseña | `VARCHAR` | Sí | Campo temporal; debe cumplir las reglas de seguridad definidas. |
| Confirmar nueva contraseña | `VARCHAR` | Sí | Campo temporal; debe coincidir con la nueva contraseña. |

**Acciones:** Cambiar contraseña, cancelar.  
**Resultado esperado:** Se actualiza la contraseña si la identidad y los datos son válidos.

## 5. Formulario de recuperación de contraseña

**Actor:** Usuario.  
**Objetivo:** Solicitar la recuperación de la contraseña.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Correo electrónico | `VARCHAR` | Sí | Debe estar asociado a una cuenta. |
| Código o enlace de recuperación | `VARCHAR` | Sí | Código temporal o token; mecanismo de recuperación: **Por definir**. |
| Nueva contraseña | `VARCHAR` | Sí | Campo temporal; debe cumplir las reglas de seguridad definidas. |
| Confirmar nueva contraseña | `VARCHAR` | Sí | Campo temporal; debe coincidir con la nueva contraseña. |

## 6. Formulario de publicación

**Actor:** Usuario.  
**Objetivo:** Crear una publicación relacionada con videojuegos.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Videojuego relacionado | `UUID` | Sí | En publicaciones dentro de un grupo debe pertenecer a los videojuegos relacionados con ese grupo. |
| Texto | `TEXT` | **Por definir** | Debe respetar la longitud máxima definida. |
| Imagen | `FILE/URL` | No | Formatos y tamaño máximo: **Por definir**. |
| Visibilidad / grupo | `UUID` nullable | No | Identificador del grupo; aplicable si la publicación pertenece a un grupo. |

**Acciones:** Publicar, cancelar.  
**Resultado esperado:** Se crea la publicación asociada al usuario, la fecha de envío y, cuando corresponda, al grupo y al videojuego seleccionado.

### Regla para publicaciones en grupos

Cuando el usuario publique dentro de un grupo, deberá seleccionar un videojuego relacionado con ese grupo. Esta regla es igual para todos los grupos, independientemente de su visibilidad pública o privada.

### Confirmación de eliminación de publicación

El usuario deberá confirmar antes de eliminar una publicación propia. El sistema no deberá permitir eliminar publicaciones creadas por otros usuarios.

## 7. Formulario de comentario

**Actor:** Usuario.  
**Objetivo:** Comentar una publicación.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Texto del comentario | `TEXT` | Sí | Longitud máxima: **Por definir**. |

**Acciones:** Comentar, cancelar.  
**Resultado esperado:** El comentario queda asociado al usuario, la publicación y la fecha de creación.

## 8. Formulario de solicitud de registro de videojuego

**Actor:** Jugador.  
**Objetivo:** Solicitar el registro de un videojuego nuevo.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre del videojuego | `VARCHAR` | Sí | Debe ser válido y no estar duplicado, según las reglas del sistema. |
| Descripción | `TEXT` | Sí | Información general del videojuego. |
| Género | `ENUM` / `VARCHAR` | **Por definir** | Catálogo de géneros: **Por definir**. |
| Plataforma | `ENUM` / `VARCHAR` | **Por definir** | Plataformas soportadas: **Por definir**. |
| Imagen o portada | `FILE/URL` | No | Formatos y tamaño máximo: **Por definir**. |
| Información adicional | `TEXT` | No | Campo opcional. |

**Acciones:** Enviar solicitud, cancelar.  
**Resultado esperado:** La solicitud queda registrada con estado **Pendiente**.

## 9. Formulario de revisión de videojuego

**Actor:** Administrador de la plataforma.  
**Objetivo:** Revisar una solicitud de registro de videojuego.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Solicitud | `UUID` | Sí | Identificador de la solicitud; sus datos se muestran en modo solo lectura. |
| Decisión | `ENUM('ACEPTAR', 'RECHAZAR')` | Sí | Opciones: **Aceptar** o **Rechazar**. |
| Motivo de rechazo | `TEXT` | Solo al rechazar | Recomendado para explicar la decisión. |

**Acciones:** Aceptar, rechazar, cancelar.  
**Resultado esperado:** La solicitud cambia de estado y, si se acepta, se habilita la página del videojuego.

## 10. Formulario de creación y edición de grupo

**Actor:** Usuario / Administrador del grupo.  
**Objetivo:** Crear o actualizar un grupo relacionado con uno o varios videojuegos.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre del grupo | `VARCHAR` | Sí | Debe ser único o cumplir la regla definida por el equipo. |
| Descripción | `TEXT` | Sí | Debe describir la finalidad del grupo. |
| Videojuegos relacionados | `UUID[]` / relación | Sí | Deben seleccionarse entre 1 y 5 videojuegos aprobados para el grupo. |
| Tipo de grupo | `ENUM('PUBLICO', 'PRIVADO')` | Sí | Opciones: **Público** o **Privado**. |
| Imagen del grupo | `FILE/URL` | No | Formatos y tamaño máximo: **Por definir**. |
| Reglas del grupo | `TEXT` | No | Recomendado para grupos públicos y privados. |

**Acciones:** Crear grupo, guardar cambios, agregar videojuego relacionado, eliminar videojuego relacionado, cancelar, eliminar grupo.  
**Resultado esperado:** Se crea o actualiza el grupo con su tipo y videojuegos relacionados.

### Reglas para videojuegos relacionados en grupos

- Al crear un grupo, el usuario deberá seleccionar entre **1 y 5 videojuegos** relacionados, sin importar si el grupo es público o privado.
- El administrador del grupo podrá agregar videojuegos relacionados posteriormente, sin superar el máximo de 5.
- El administrador del grupo podrá eliminar videojuegos relacionados, siempre que el grupo conserve al menos 1 videojuego relacionado.
- El administrador del grupo podrá editar la selección de videojuegos relacionados.
- Los videojuegos disponibles para seleccionar deberán ser videojuegos registrados y aprobados en la plataforma.

## 11. Formulario de solicitud de ingreso a grupo privado

**Actor:** Usuario.  
**Objetivo:** Solicitar pertenecer a un grupo privado.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Grupo seleccionado | `UUID` | Sí | Identificador del grupo privado; se muestra en modo solo lectura. |
| Mensaje de solicitud | `TEXT` | No | Uso: **Por definir**. |

**Acciones:** Enviar solicitud, cancelar.  
**Resultado esperado:** La solicitud queda pendiente para revisión del administrador del grupo.

## 12. Formulario de decisión sobre ingreso a grupo privado

**Actor:** Administrador del grupo.  
**Objetivo:** Aceptar o rechazar solicitudes de ingreso.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Solicitud de ingreso | `UUID` | Sí | Identificador de la solicitud; muestra el usuario solicitante y el grupo. |
| Decisión | `ENUM('ACEPTAR', 'RECHAZAR')` | Sí | Opciones: **Aceptar** o **Rechazar**. |
| Comentario | `TEXT` | No | Opcional. |

**Resultado esperado:** El usuario obtiene o no acceso al grupo privado según la decisión.

## 13. Formulario de reporte

**Actor:** Usuario.  
**Objetivo:** Reportar contenido o un perfil para que sea revisado por el administrador de la plataforma.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Tipo de contenido | `ENUM` | Sí | Opciones: publicación, comentario, perfil o grupo. |
| Contenido reportado | `UUID` | Sí | Identificador del contenido o perfil que se reporta. |
| Motivo | `ENUM` | Sí | Catálogo de motivos: **Por definir**. |
| Descripción | `TEXT` | Sí | Explicación del motivo del reporte. |
| Evidencia | `FILE/URL` | No | Evidencia opcional; formato y tamaño máximo: **Por definir**. |

**Acciones:** Enviar reporte, cancelar.  
**Resultado esperado:** El reporte queda registrado con estado **Pendiente**.

## 14. Formulario de revisión de reporte

**Actor:** Administrador de la plataforma.  
**Objetivo:** Revisar y actualizar el estado de un reporte sin aplicar sanciones.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Reporte | `UUID` | Sí | Identificador del reporte y datos asociados en solo lectura. |
| Estado | `ENUM` | Sí | Opciones: pendiente, en revisión o cerrado. |
| Comentario de revisión | `TEXT` | No | Observaciones del administrador. |

**Acciones:** Guardar revisión, cancelar.  
**Resultado esperado:** Se actualiza el estado del reporte y se registra la fecha de revisión.

## 15. Formulario de mensaje privado

**Actor:** Usuario.  
**Objetivo:** Enviar un mensaje privado a otro usuario.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Destinatario | `UUID` | Sí | Identificador de otro usuario. |
| Mensaje | `TEXT` | Sí | Longitud máxima: **Por definir**. |

**Acciones:** Enviar, cancelar.  
**Resultado esperado:** El mensaje se guarda con remitente, destinatario y fecha de envío.

## Consideraciones generales de los formularios

- El sistema deberá indicar qué campos son obligatorios.
- El sistema deberá mostrar mensajes claros cuando un dato sea inválido.
- El sistema deberá conservar los datos enviados únicamente después de una validación exitosa.
- Los formularios deberán mostrar una confirmación cuando la operación se complete correctamente.
- Las acciones disponibles deberán depender del tipo de usuario y de sus permisos.
- Las imágenes deberán validar formato, tamaño y dimensiones máximas, valores que quedan **por definir**.

---

## Usuario

Representa las cuentas registradas en la plataforma y la información asociada con su perfil. Se propone mantener los datos de autenticación y perfil en una misma entidad inicialmente, ya que el formulario de registro y el de perfil están relacionados directamente.

### Tabla: `User`

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_usuario | `UUID` | PK, NOT NULL | Identificador único del usuario. |
| nombre_usuario | `VARCHAR(12)` | UNIQUE, NOT NULL | Nombre de usuario. Solo permite caracteres alfanuméricos. |
| correo_electronico | `VARCHAR(255)` | UNIQUE, NOT NULL | Correo electrónico asociado con la cuenta. |
| fecha_nacimiento | `DATE` | NOT NULL | Fecha de nacimiento del usuario. |
| genero | `ENUM` | NOT NULL | Género seleccionado durante el registro. Las opciones quedan por definir. |
| password_hash | `VARCHAR(255)` | NOT NULL | Contraseña almacenada mediante un algoritmo seguro de hash. |
| nombre_visible | `VARCHAR(100)` | NULL | Nombre que se muestra públicamente en el perfil. |
| descripcion | `TEXT` | NULL | Descripción personal del usuario. |
| fotografia_perfil | `VARCHAR(500)` | NULL | URL o ruta de almacenamiento de la fotografía de perfil. |
| fecha_registro | `TIMESTAMP` | NOT NULL | Fecha y hora en que se creó la cuenta. |
| fecha_actualizacion | `TIMESTAMP` | NULL | Fecha de la última modificación del perfil. |
| estado_cuenta | `ENUM` | NOT NULL | Estado de la cuenta, por ejemplo: activa o eliminada. |

**Consideraciones:**
- `id_usuario` será la clave primaria y se utilizará para relacionar al usuario con sus publicaciones, comentarios, grupos y demás elementos.
- El nombre de usuario tendrá un máximo de 12 caracteres alfanuméricos.
- La contraseña nunca deberá almacenarse en texto plano; únicamente se almacenará su hash.
- La confirmación de contraseña no se almacenará, ya que es un campo temporal del formulario.
- El nombre visible y la descripción personal podrán modificarse desde el perfil.
- La fotografía deberá almacenarse como archivo externo; en la base de datos se conservará su URL o referencia.
- Las opciones del campo `genero` y los estados de cuenta deberán definirse antes de implementar la base de datos.

### Tabla: `UserVideogames`

Representa la biblioteca personal de videojuegos de cada usuario. Se utiliza una tabla intermedia porque un usuario puede tener varios videojuegos y un videojuego puede estar relacionado con varios usuarios.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_usuario | `UUID` | PK, FK → Usuario | Usuario propietario de la biblioteca. |
| id_videojuego | `UUID` | PK, FK → Videojuego | Videojuego relacionado con el perfil. |
| fecha_agregado | `TIMESTAMP` | NOT NULL | Fecha en que se agregó el videojuego a la biblioteca. |

**Consideraciones:**
- La combinación de `id_usuario` e `id_videojuego` será la clave primaria compuesta.
- Un usuario deberá tener entre 1 y 5 videojuegos relacionados con su perfil, de acuerdo con RF-88 y RF-89.
- Solo podrán agregarse videojuegos aprobados y disponibles en el catálogo.
- La validación del límite de videojuegos deberá realizarse en el servidor y, cuando sea necesario, mediante mecanismos de integridad de la base de datos.

### Tabla: `Follows`

Representa las relaciones mediante las cuales un usuario sigue a otro.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_seguidor | `UUID` | PK, FK → Usuario | Usuario que establece el seguimiento. |
| id_seguido | `UUID` | PK, FK → Usuario | Usuario que recibe el seguimiento. |
| fecha_seguimiento | `TIMESTAMP` | NOT NULL | Fecha en que se estableció la relación. |

**Consideraciones:**
- La combinación de `id_seguidor` e `id_seguido` será única.
- Un usuario no podrá seguirse a sí mismo.
- La relación deberá eliminarse cuando el usuario deje de seguir a otro.
- No deberá existir una relación de seguimiento entre dos usuarios cuando exista un bloqueo entre ellos.

### Tabla: `Bloqueos`

Almacena las relaciones de bloqueo establecidas entre usuarios.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_usuario_bloqueador | `UUID` | PK, FK → Usuario | Usuario que establece el bloqueo. |
| id_usuario_bloqueado | `UUID` | PK, FK → Usuario | Usuario que recibe el bloqueo. |
| fecha_bloqueo | `TIMESTAMP` | NOT NULL | Fecha en que se estableció el bloqueo. |

**Consideraciones:**
- La combinación de ambos identificadores será única.
- Un usuario no podrá bloquearse a sí mismo.
- Al establecer un bloqueo deberán eliminarse las relaciones de seguimiento existentes entre ambos usuarios.
- El bloqueo deberá impedir el acceso mutuo a perfiles y publicaciones, así como el seguimiento y la mensajería privada.
- Al desbloquear a un usuario se eliminará el registro correspondiente, pero no se restaurarán automáticamente las relaciones de seguimiento.

### Tabla: `Silenciamientos`

Almacena las relaciones mediante las cuales un usuario oculta las publicaciones y notificaciones de otro.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_usuario_silenciador | `UUID` | PK, FK → Usuario | Usuario que establece el silenciamiento. |
| id_usuario_silenciado | `UUID` | PK, FK → Usuario | Usuario cuyas publicaciones y notificaciones se ocultan. |
| fecha_silenciamiento | `TIMESTAMP` | NOT NULL | Fecha en que se estableció el silenciamiento. |

**Consideraciones:**
- La combinación de ambos identificadores será única.
- Un usuario no podrá silenciarse a sí mismo.
- El silenciamiento no deberá eliminar la relación de seguimiento.
- El usuario silenciado no deberá recibir una notificación por esta acción.
- Al dejar de silenciar se eliminará la relación, sin modificar las demás relaciones existentes.

---

## Publicación

Representa el contenido que un usuario comparte en la plataforma. Una publicación podrá contener texto, una imagen o ambos, según las reglas que finalmente se definan para el formulario.

### Tabla: `Publicacion`

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_publicacion | `UUID` | PK, NOT NULL | Identificador único de la publicación. |
| id_usuario | `UUID` | FK → Usuario, NOT NULL | Usuario que creó la publicación. |
| id_videojuego | `UUID` | FK → Videojuego, NOT NULL | Videojuego relacionado con la publicación. |
| id_grupo | `UUID` | FK → Comunidad, NULL | Grupo al que pertenece la publicación, si corresponde. |
| texto | `TEXT` | NULL | Contenido textual de la publicación. |
| imagen | `VARCHAR(500)` | NULL | URL o ruta de almacenamiento de la imagen. |
| fecha_creacion | `TIMESTAMP` | NOT NULL | Fecha y hora de creación. |
| fecha_actualizacion | `TIMESTAMP` | NULL | Fecha de la última modificación, si se permite editar publicaciones. |
| estado | `ENUM` | NOT NULL | Estado de la publicación, por ejemplo: activa o eliminada. |

**Consideraciones:**
- Cada publicación deberá estar asociada con un único usuario.
- Cada publicación deberá relacionarse con un videojuego.
- `id_grupo` será opcional, ya que una publicación puede realizarse fuera de una comunidad.
- Cuando una publicación pertenezca a un grupo, el videojuego seleccionado deberá estar relacionado con ese grupo.
- El sistema deberá impedir que un usuario elimine publicaciones de otros usuarios.
- El almacenamiento de imágenes se realizará externamente, conservando su referencia en la base de datos.
- La obligatoriedad del texto y la regla para permitir publicaciones únicamente con imágenes quedan por definir.

### Tabla: `Comentario`

Representa los comentarios que los usuarios realizan sobre las publicaciones.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_comentario | `UUID` | PK, NOT NULL | Identificador único del comentario. |
| id_publicacion | `UUID` | FK → Publicacion, NOT NULL | Publicación a la que pertenece el comentario. |
| id_usuario | `UUID` | FK → Usuario, NOT NULL | Usuario que realizó el comentario. |
| texto | `TEXT` | NOT NULL | Contenido del comentario. |
| fecha_creacion | `TIMESTAMP` | NOT NULL | Fecha y hora de creación del comentario. |

**Consideraciones:**
- Cada comentario estará asociado con una publicación y un usuario.
- El comentario deberá conservar su autoría y fecha de creación.
- La longitud máxima del texto queda por definir.
- El usuario solo podrá eliminar sus propios comentarios si esa funcionalidad se incorpora al alcance.

### Tabla: `Reaccion`

Representa las reacciones de tipo "Me gusta" realizadas por los usuarios sobre las publicaciones.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_usuario | `UUID` | PK, FK → Usuario | Usuario que realiza la reacción. |
| id_publicacion | `UUID` | PK, FK → Publicacion | Publicación que recibe la reacción. |
| fecha_reaccion | `TIMESTAMP` | NOT NULL | Fecha en que se realizó la reacción. |

**Consideraciones:**
- La combinación de `id_usuario` e `id_publicacion` será única.
- Un usuario podrá reaccionar una sola vez a una publicación.
- Al retirar la reacción se eliminará el registro correspondiente.
- La cantidad de reacciones podrá obtenerse mediante una consulta sobre esta tabla.

---

## Videojuego

Se propone separar los videojuegos aprobados de las solicitudes de registro. De esta manera, los usuarios únicamente podrán relacionar con sus perfiles, publicaciones y comunidades videojuegos que ya estén disponibles en el catálogo.

### Tabla: `Videojuegos`

Representa el catálogo de videojuegos aprobados y disponibles en la plataforma.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_videojuego | `UUID` | PK, NOT NULL | Identificador único del videojuego. |
| nombre | `VARCHAR(150)` | UNIQUE, NOT NULL | Nombre del videojuego. |
| descripcion | `TEXT` | NOT NULL | Descripción general del videojuego. |
| genero | `VARCHAR(100)` | NULL | Género del videojuego. |
| plataforma | `VARCHAR(100)` | NULL | Plataforma o plataformas en las que está disponible. |
| portada | `VARCHAR(500)` | NULL | URL o ruta de almacenamiento de la portada. |
| informacion_adicional | `TEXT` | NULL | Información complementaria. |
| fecha_registro | `TIMESTAMP` | NOT NULL | Fecha en que se incorporó al catálogo. |
| estado | `ENUM` | NOT NULL | Estado del videojuego, por ejemplo: activo o deshabilitado. |

**Consideraciones:**
- Solo los videojuegos aprobados deberán encontrarse disponibles para su selección en los formularios de publicaciones, perfiles y comunidades.
- El nombre del videojuego deberá validarse para evitar registros duplicados.
- El género y la plataforma podrán utilizar catálogos controlados si el equipo decide definirlos.
- La portada se almacenará externamente y se conservará su referencia.
- La administración de esta entidad corresponderá al administrador de la plataforma.

### Tabla: `SolicitudesVideojuegos`

Representa las solicitudes que realizan los jugadores para registrar nuevos videojuegos.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_solicitud | `UUID` | PK, NOT NULL | Identificador único de la solicitud. |
| id_usuario_solicitante | `UUID` | FK → Usuario, NOT NULL | Jugador que realiza la solicitud. |
| nombre | `VARCHAR(150)` | NOT NULL | Nombre del videojuego propuesto. |
| descripcion | `TEXT` | NOT NULL | Descripción del videojuego. |
| genero | `VARCHAR(100)` | NULL | Género propuesto. |
| plataforma | `VARCHAR(100)` | NULL | Plataforma o plataformas propuestas. |
| portada | `VARCHAR(500)` | NULL | URL o ruta de almacenamiento de la portada propuesta. |
| informacion_adicional | `TEXT` | NULL | Información complementaria. |
| estado | `ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA')` | NOT NULL | Estado actual de la solicitud. |
| id_administrador | `UUID` | FK → Usuario, NULL | Administrador que revisó la solicitud. |
| motivo_rechazo | `TEXT` | NULL | Explicación de la decisión cuando se rechaza. |
| fecha_solicitud | `TIMESTAMP` | NOT NULL | Fecha de envío de la solicitud. |
| fecha_revision | `TIMESTAMP` | NULL | Fecha en que se tomó una decisión. |
| id_videojuego_aprobado | `UUID` | FK → Videojuego, NULL | Videojuego creado en el catálogo cuando se acepta la solicitud. |

**Consideraciones:**
- Toda solicitud deberá estar asociada con el usuario que la realizó.
- El estado inicial será `PENDIENTE`.
- El administrador de la plataforma será responsable de aceptar o rechazar la solicitud.
- Cuando una solicitud sea aceptada, se deberá crear o habilitar el registro correspondiente en `Videojuego`.
- Cuando una solicitud sea rechazada, podrá almacenarse el motivo de rechazo.
- El campo `id_videojuego_aprobado` permitirá relacionar la solicitud con el videojuego resultante de su aprobación.

---

## Comunidad

Representa los grupos de usuarios de la plataforma. Cada comunidad estará relacionada con uno o varios videojuegos y podrá configurarse como pública o privada.

### Tabla: `Comunidades`

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_comunidad | `UUID` | PK, NOT NULL | Identificador único de la comunidad. |
| id_creador | `UUID` | FK → Usuario, NOT NULL | Usuario que creó la comunidad. |
| nombre | `VARCHAR(150)` | NOT NULL | Nombre de la comunidad. |
| descripcion | `TEXT` | NOT NULL | Descripción de la finalidad de la comunidad. |
| tipo | `ENUM('PUBLICO', 'PRIVADO')` | NOT NULL | Define la visibilidad y el acceso a la comunidad. |
| imagen | `VARCHAR(500)` | NULL | URL o ruta de almacenamiento de la imagen de la comunidad. |
| reglas | `TEXT` | NULL | Reglas establecidas para los integrantes. |
| fecha_creacion | `TIMESTAMP` | NOT NULL | Fecha en que se creó la comunidad. |
| fecha_actualizacion | `TIMESTAMP` | NULL | Fecha de la última modificación. |
| estado | `ENUM` | NOT NULL | Estado de la comunidad, por ejemplo: activa o eliminada. |

**Consideraciones:**
- Cada comunidad deberá tener un usuario creador.
- El creador será inicialmente el administrador de la comunidad.
- La comunidad deberá configurarse como pública o privada.
- Una comunidad deberá relacionarse con un mínimo de 1 y un máximo de 5 videojuegos aprobados.
- La imagen se almacenará externamente y se conservará su referencia.
- El administrador podrá actualizar la información y configuración de la comunidad.

### Tabla: `ComunidadesVideojuegos`

Representa la relación entre las comunidades y los videojuegos asociados.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_comunidad | `UUID` | PK, FK → Comunidad | Comunidad relacionada. |
| id_videojuego | `UUID` | PK, FK → Videojuego | Videojuego asociado. |
| fecha_asociacion | `TIMESTAMP` | NOT NULL | Fecha en que se relacionó el videojuego con la comunidad. |

**Consideraciones:**
- La combinación de `id_comunidad` e `id_videojuego` será la clave primaria compuesta.
- Una comunidad deberá tener entre 1 y 5 videojuegos relacionados.
- No se permitirá relacionar videojuegos que no estén aprobados.
- El administrador podrá agregar, eliminar o modificar los videojuegos relacionados.
- Al eliminar un videojuego relacionado, la comunidad deberá conservar al menos uno.

### Tabla: `IntegrantesComunidad`

Representa la pertenencia de los usuarios a las comunidades.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_comunidad | `UUID` | PK, FK → Comunidad | Comunidad a la que pertenece el usuario. |
| id_usuario | `UUID` | PK, FK → Usuario | Usuario integrante. |
| rol | `ENUM('ADMINISTRADOR', 'INTEGRANTE')` | NOT NULL | Rol del usuario dentro de la comunidad. |
| fecha_ingreso | `TIMESTAMP` | NOT NULL | Fecha en que el usuario ingresó a la comunidad. |

**Consideraciones:**
- La combinación de `id_comunidad` e `id_usuario` será única.
- El creador de la comunidad deberá registrarse como administrador.
- Los usuarios que ingresen a una comunidad tendrán inicialmente el rol de integrante, salvo que se les otorguen permisos de administración.
- Solo los administradores podrán gestionar las solicitudes de ingreso, modificar la configuración o eliminar integrantes.
- Los usuarios podrán pertenecer a varias comunidades.

### Tabla: `SolicitudesIngresoComunidad`

Representa las solicitudes de ingreso que realizan los usuarios a comunidades privadas.

| Campo | Tipo de dato | Restricciones | Descripción |
|---|---|---|---|
| id_solicitud | `UUID` | PK, NOT NULL | Identificador único de la solicitud. |
| id_comunidad | `UUID` | FK → Comunidad, NOT NULL | Comunidad privada a la que se desea ingresar. |
| id_usuario | `UUID` | FK → Usuario, NOT NULL | Usuario que realiza la solicitud. |
| mensaje | `TEXT` | NULL | Mensaje opcional del usuario. |
| estado | `ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA')` | NOT NULL | Estado de la solicitud. |
| fecha_solicitud | `TIMESTAMP` | NOT NULL | Fecha en que se realizó la solicitud. |
| fecha_respuesta | `TIMESTAMP` | NULL | Fecha en que el administrador respondió. |
| id_administrador_respuesta | `UUID` | FK → Usuario, NULL | Administrador que tomó la decisión. |
| comentario_respuesta | `TEXT` | NULL | Comentario opcional del administrador. |

**Consideraciones:**
- El estado inicial de una solicitud será `PENDIENTE`.
- Una solicitud aceptada deberá generar un registro en `IntegranteComunidad`.
- Una solicitud rechazada no deberá conceder acceso a la comunidad.
- No deberán existir solicitudes pendientes duplicadas del mismo usuario para una misma comunidad.
- Esta estructura se utilizará para comunidades privadas. Los usuarios podrán unirse directamente a comunidades públicas.

---

## 5. Relaciones principales

Las siguientes relaciones describen cómo se conectan las entidades propuestas:

| Entidad principal | Entidad relacionada | Relación | Descripción |
|---|---|---|---|
| Usuario | UsuarioVideojuego | 1:N | Un usuario puede tener entre 1 y 5 videojuegos en su biblioteca personal. |
| Videojuego | UsuarioVideojuego | 1:N | Un videojuego puede aparecer en las bibliotecas de varios usuarios. |
| Usuario | Publicacion | 1:N | Un usuario puede crear varias publicaciones. |
| Videojuego | Publicacion | 1:N | Un videojuego puede estar relacionado con varias publicaciones. |
| Comunidad | Publicacion | 1:N | Una comunidad puede contener varias publicaciones. |
| Usuario | Comentario | 1:N | Un usuario puede realizar varios comentarios. |
| Publicacion | Comentario | 1:N | Una publicación puede tener varios comentarios. |
| Usuario | Reaccion | 1:N | Un usuario puede reaccionar a varias publicaciones. |
| Publicacion | Reaccion | 1:N | Una publicación puede recibir varias reacciones. |
| Usuario | Comunidad | N:M | Los usuarios pueden pertenecer a varias comunidades y cada comunidad puede tener varios integrantes. |
| Comunidad | Videojuego | N:M | Una comunidad puede relacionarse con varios videojuegos y un videojuego puede estar relacionado con varias comunidades. |
| Usuario | Seguimiento | N:M | Los usuarios pueden seguir a otros usuarios. |
| Usuario | Bloqueo | N:M | Los usuarios pueden establecer bloqueos entre cuentas. |
| Usuario | Silenciamiento | N:M | Los usuarios pueden silenciar a otras cuentas. |
| Usuario | SolicitudVideojuego | 1:N | Un usuario puede realizar varias solicitudes de registro de videojuegos. |
| Usuario | SolicitudIngresoComunidad | 1:N | Un usuario puede solicitar ingresar a varias comunidades privadas. |
| Comunidad | SolicitudIngresoComunidad | 1:N | Una comunidad privada puede recibir varias solicitudes de ingreso. |

## 6. Reglas de integridad y validaciones generales

Las siguientes reglas deberán aplicarse para mantener la consistencia de la información:

1. **Identificadores:** todas las entidades principales deberán contar con una clave primaria única de tipo `UUID`.
2. **Relaciones:** las claves foráneas deberán garantizar que no existan referencias a usuarios, publicaciones, videojuegos o comunidades inexistentes.
3. **Usuarios:** el nombre de usuario y el correo electrónico deberán ser únicos.
4. **Contraseñas:** únicamente se almacenarán hashes de contraseñas, nunca contraseñas en texto plano.
5. **Biblioteca personal:** cada usuario deberá mantener entre 1 y 5 videojuegos aprobados relacionados con su perfil.
6. **Publicaciones:** cada publicación deberá pertenecer a un usuario y estar relacionada con un videojuego.
7. **Publicaciones en comunidades:** cuando una publicación pertenezca a una comunidad, el videojuego seleccionado deberá estar relacionado con ella.
8. **Comunidades:** cada comunidad deberá tener entre 1 y 5 videojuegos aprobados relacionados.
9. **Privacidad:** las comunidades privadas solo podrán ser consultadas por sus integrantes autorizados, de acuerdo con las reglas de acceso.
10. **Seguimiento:** no se permitirán relaciones de seguimiento duplicadas ni relaciones de un usuario consigo mismo.
11. **Bloqueo:** al bloquear a otro usuario deberán eliminarse las relaciones de seguimiento existentes entre ambas cuentas.
12. **Silenciamiento:** el silenciamiento no deberá modificar las relaciones de seguimiento.
13. **Solicitudes:** las solicitudes de ingreso a comunidades privadas y de registro de videojuegos deberán conservar su estado y fechas de resolución.
14. **Almacenamiento multimedia:** las imágenes deberán almacenarse en un servicio o sistema de archivos externo, conservando en la base de datos su URL o referencia.
15. **Eliminación:** las operaciones de eliminación deberán respetar las relaciones existentes y las reglas de conservación de información que defina el proyecto.

## 7. Decisiones pendientes de definición

| Elemento | Decisión pendiente |
|---|---|
| Género del usuario | Definir las opciones permitidas para el campo `genero`. |
| Edad mínima | Definir si existirá una restricción de edad para registrar una cuenta. |
| Nombre visible | Confirmar su longitud máxima y si será obligatorio. |
| Publicaciones | Definir si se permitirá publicar únicamente texto, únicamente imagen o si ambos serán obligatorios. |
| Imágenes | Definir formatos, dimensiones y tamaño máximo permitido. |
| Videojuegos | Definir los catálogos de géneros y plataformas. |
| Comunidades | Definir si el nombre deberá ser único globalmente o únicamente dentro de ciertos criterios. |
| Eliminación de cuentas | Definir qué sucederá con las publicaciones, comentarios y comunidades creadas por el usuario. |
| Eliminación de comunidades | Definir qué sucederá con las publicaciones y los integrantes cuando se elimine una comunidad. |
| Eliminación de videojuegos | Definir el tratamiento de las relaciones existentes cuando un videojuego sea deshabilitado. |


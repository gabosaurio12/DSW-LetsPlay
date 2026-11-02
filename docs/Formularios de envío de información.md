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

## 16. Consideraciones generales de los formularios

- El sistema deberá indicar qué campos son obligatorios.
- El sistema deberá mostrar mensajes claros cuando un dato sea inválido.
- El sistema deberá conservar los datos enviados únicamente después de una validación exitosa.
- Los formularios deberán mostrar una confirmación cuando la operación se complete correctamente.
- Las acciones disponibles deberán depender del tipo de usuario y de sus permisos.
- Las imágenes deberán validar formato, tamaño y dimensiones máximas, valores que quedan **por definir**.


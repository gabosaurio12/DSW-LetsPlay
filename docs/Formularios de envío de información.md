# Formularios de envío de información — Let's Play

> Documento inicial para definir los formularios de la plataforma.  
> Los campos marcados como **Por definir** pueden ser completados por el equipo.

## 1. Formulario de registro de usuario

**Actor:** Persona que desea crear una cuenta.  
**Objetivo:** Registrar un nuevo usuario en la plataforma.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre de usuario | Texto alfanumérico | Sí | Debe ser único, tener máximo 12 caracteres y contener únicamente letras y números. |
| Correo electrónico | Correo | Sí | Debe tener formato válido y ser único. |
| Fecha de nacimiento | Fecha | Sí | Debe tener un formato de fecha válido. Restricción de edad mínima: **Por definir**. |
| Género | Selección | Sí | Opciones disponibles: **Por definir**. |
| Contraseña | Contraseña | Sí | Reglas de seguridad: **Por definir**. |
| Confirmar contraseña | Contraseña | Sí | Debe coincidir con la contraseña. |

**Acciones:** Registrarse, cancelar.  
**Resultado esperado:** Se crea la cuenta o se muestran los errores de validación.

## 2. Formulario de inicio de sesión

**Actor:** Usuario registrado.  
**Objetivo:** Acceder a la plataforma.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Correo o nombre de usuario | Texto | Sí | Debe corresponder a una cuenta registrada. |
| Contraseña | Contraseña | Sí | Debe coincidir con la contraseña almacenada. |

**Acciones:** Iniciar sesión, recuperar contraseña.  
**Resultado esperado:** Se inicia la sesión o se informa que las credenciales no son válidas.

## 3. Formulario de perfil

**Actor:** Usuario registrado.  
**Objetivo:** Consultar y actualizar la información del perfil.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre visible | Texto | **Por definir** | Longitud máxima: **Por definir**. |
| Descripción personal | Texto largo | No | Puede contener información pública del usuario. |
| Biblioteca personal de videojuegos | Selección múltiple | Sí | El usuario deberá relacionar entre 1 y 5 videojuegos aprobados con su perfil. Estos representan sus videojuegos favoritos o de interés. |
| Fotografía de perfil | Imagen | No | Formatos y tamaño máximo: **Por definir**. |

**Acciones:** Guardar cambios, eliminar fotografía, eliminar cuenta.  
**Resultado esperado:** Se actualiza el perfil o se informa el error correspondiente.

### Regla para la biblioteca personal de videojuegos

El formulario deberá permitir que el usuario relacione entre **1 y 5 videojuegos** con su perfil. La selección deberá realizarse únicamente con videojuegos registrados y aprobados en la plataforma. Estos videojuegos conforman su biblioteca personal y pueden representar sus videojuegos favoritos o de interés.

### Confirmación de eliminación de cuenta

Antes de eliminar la cuenta, el sistema deberá mostrar una confirmación explícita. El texto de confirmación y el tratamiento de las publicaciones, comentarios y grupos del usuario quedan **por definir**.

## 4. Formulario de cambio de contraseña

**Actor:** Usuario autenticado.  
**Objetivo:** Cambiar la contraseña actual.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Contraseña actual | Contraseña | Sí | Debe coincidir con la contraseña vigente. |
| Nueva contraseña | Contraseña | Sí | Debe cumplir las reglas de seguridad definidas. |
| Confirmar nueva contraseña | Contraseña | Sí | Debe coincidir con la nueva contraseña. |

**Acciones:** Cambiar contraseña, cancelar.  
**Resultado esperado:** Se actualiza la contraseña si la identidad y los datos son válidos.

## 5. Formulario de recuperación de contraseña

**Actor:** Usuario que no puede acceder a su cuenta.  
**Objetivo:** Solicitar la recuperación de la contraseña.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Correo electrónico | Correo | Sí | Debe estar asociado a una cuenta. |
| Código o enlace de recuperación | Texto / enlace | Sí | Mecanismo de recuperación: **Por definir**. |
| Nueva contraseña | Contraseña | Sí | Debe cumplir las reglas de seguridad definidas. |
| Confirmar nueva contraseña | Contraseña | Sí | Debe coincidir con la nueva contraseña. |

## 6. Formulario de publicación

**Actor:** Usuario registrado.  
**Objetivo:** Crear una publicación relacionada con videojuegos.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Videojuego relacionado | Selección | Condicional | En publicaciones generales es obligatorio. En publicaciones dentro de cualquier grupo puede omitirse; si se selecciona, debe pertenecer a los videojuegos relacionados con el grupo. |
| Texto | Texto largo | **Por definir** | Debe respetar la longitud máxima definida. |
| Imagen | Imagen | No | Formatos y tamaño máximo: **Por definir**. |
| Visibilidad / grupo | Selección | No | Aplicable si la publicación pertenece a un grupo. |

**Acciones:** Publicar, cancelar.  
**Resultado esperado:** Se crea la publicación asociada al usuario, la fecha de envío y, cuando corresponda, al grupo y al videojuego seleccionado.

### Regla para publicaciones en grupos

Cuando el usuario publique dentro de un grupo, no será obligatorio seleccionar un videojuego específico. Si decide seleccionar uno, el sistema deberá mostrar únicamente los videojuegos relacionados con ese grupo y validar que el videojuego elegido pertenezca a dicha relación. Esta regla es igual para grupos públicos y privados.

### Confirmación de eliminación de publicación

El usuario deberá confirmar antes de eliminar una publicación propia. El sistema no deberá permitir eliminar publicaciones creadas por otros usuarios.

## 7. Formulario de comentario

**Actor:** Usuario registrado.  
**Objetivo:** Comentar una publicación.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Texto del comentario | Texto largo | Sí | Longitud máxima: **Por definir**. |

**Acciones:** Comentar, cancelar.  
**Resultado esperado:** El comentario queda asociado al usuario, la publicación y la fecha de creación.

## 8. Formulario de solicitud de registro de videojuego

**Actor:** Jugador registrado.  
**Objetivo:** Solicitar el registro de un videojuego nuevo.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre del videojuego | Texto | Sí | Debe ser válido y no estar duplicado, según las reglas del sistema. |
| Descripción | Texto largo | Sí | Información general del videojuego. |
| Género | Selección / texto | **Por definir** | Catálogo de géneros: **Por definir**. |
| Plataforma | Selección / texto | **Por definir** | Plataformas soportadas: **Por definir**. |
| Imagen o portada | Imagen | No | Formatos y tamaño máximo: **Por definir**. |
| Información adicional | Texto largo | No | Campo opcional. |

**Acciones:** Enviar solicitud, cancelar.  
**Resultado esperado:** La solicitud queda registrada con estado **Pendiente**.

## 9. Formulario de revisión de videojuego

**Actor:** Administrador de la plataforma.  
**Objetivo:** Revisar una solicitud de registro de videojuego.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Solicitud | Solo lectura | Sí | Muestra los datos enviados por el jugador. |
| Decisión | Selección | Sí | Opciones: **Aceptar** o **Rechazar**. |
| Motivo de rechazo | Texto largo | Solo al rechazar | Recomendado para explicar la decisión. |

**Acciones:** Aceptar, rechazar, cancelar.  
**Resultado esperado:** La solicitud cambia de estado y, si se acepta, se habilita la página del videojuego.

## 10. Formulario de creación y edición de grupo

**Actor:** Usuario registrado / administrador del grupo.  
**Objetivo:** Crear o actualizar un grupo relacionado con uno o varios videojuegos.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Nombre del grupo | Texto | Sí | Debe ser único o cumplir la regla definida por el equipo. |
| Descripción | Texto largo | Sí | Debe describir la finalidad del grupo. |
| Videojuegos relacionados | Selección múltiple | Sí | Deben seleccionarse entre 1 y 5 videojuegos aprobados, tanto para grupos públicos como privados. |
| Tipo de grupo | Selección | Sí | Opciones: **Público** o **Privado**. |
| Imagen del grupo | Imagen | No | Formatos y tamaño máximo: **Por definir**. |
| Reglas del grupo | Texto largo | No | Recomendado para grupos públicos y privados. |

**Acciones:** Crear grupo, guardar cambios, agregar videojuego relacionado, eliminar videojuego relacionado, cancelar, eliminar grupo.  
**Resultado esperado:** Se crea o actualiza el grupo con su tipo y videojuegos relacionados.

### Reglas para videojuegos relacionados en grupos

- Al crear un grupo, el usuario deberá seleccionar entre **1 y 5 videojuegos** relacionados, sin importar si el grupo es público o privado.
- El administrador del grupo podrá agregar videojuegos relacionados posteriormente, sin superar el máximo de 5.
- El administrador del grupo podrá eliminar videojuegos relacionados, siempre que el grupo conserve al menos 1 videojuego relacionado.
- El administrador del grupo podrá editar la selección de videojuegos relacionados.
- Los videojuegos disponibles para seleccionar deberán ser videojuegos registrados y aprobados en la plataforma.

## 11. Formulario de solicitud de ingreso a grupo privado

**Actor:** Usuario registrado.  
**Objetivo:** Solicitar pertenecer a un grupo privado.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Grupo seleccionado | Solo lectura | Sí | Debe corresponder a un grupo privado. |
| Mensaje de solicitud | Texto largo | No | Uso: **Por definir**. |

**Acciones:** Enviar solicitud, cancelar.  
**Resultado esperado:** La solicitud queda pendiente para revisión del administrador del grupo.

## 12. Formulario de decisión sobre ingreso a grupo privado

**Actor:** Administrador del grupo.  
**Objetivo:** Aceptar o rechazar solicitudes de ingreso.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Solicitud de ingreso | Solo lectura | Sí | Muestra el usuario solicitante y el grupo. |
| Decisión | Selección | Sí | Opciones: **Aceptar** o **Rechazar**. |
| Comentario | Texto largo | No | Opcional. |

**Resultado esperado:** El usuario obtiene o no acceso al grupo privado según la decisión.

## 13. Formulario de mensaje privado

**Actor:** Usuario registrado.  
**Objetivo:** Enviar un mensaje privado a otro usuario.

| Campo | Tipo | Obligatorio | Validaciones / observaciones |
|---|---|---:|---|
| Destinatario | Selección / búsqueda | Sí | Debe ser otro usuario registrado. |
| Mensaje | Texto largo | Sí | Longitud máxima: **Por definir**. |

**Acciones:** Enviar, cancelar.  
**Resultado esperado:** El mensaje se guarda con remitente, destinatario y fecha de envío.

## 14. Consideraciones generales de los formularios

- El sistema deberá indicar qué campos son obligatorios.
- El sistema deberá mostrar mensajes claros cuando un dato sea inválido.
- El sistema deberá conservar los datos enviados únicamente después de una validación exitosa.
- Los formularios deberán mostrar una confirmación cuando la operación se complete correctamente.
- Las acciones disponibles deberán depender del tipo de usuario y de sus permisos.
- Las imágenes deberán validar formato, tamaño y dimensiones máximas, valores que quedan **por definir**.


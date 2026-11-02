# Casos de uso — Let's Play

> Documento inicial elaborado a partir de los formularios y requisitos funcionales actuales.  
> Los casos relacionados con reportes se incluyen sin aplicar sanciones, ya que esa funcionalidad queda fuera de esta versión.

## Actores

- **Usuario:** persona que utiliza o desea utilizar la plataforma.
- **Jugador:** usuario que solicita videojuegos para el catálogo.
- **Administrador del grupo:** usuario encargado de administrar un grupo.
- **Administrador de la plataforma:** usuario que revisa videojuegos y reportes.

## CU-01 — Registrar usuario

**Actor principal:** Usuario  
**Objetivo:** Crear una cuenta en Let's Play.

**Precondiciones:** La persona no debe tener una cuenta registrada con el mismo correo o nombre de usuario.

**Flujo principal:**

1. La persona abre el formulario de registro.
2. El sistema solicita nombre de usuario, correo electrónico, fecha de nacimiento, género, contraseña y confirmación de contraseña.
3. La persona captura la información.
4. El sistema valida que todos los datos cumplan las reglas definidas: nombre de usuario de máximo 12 caracteres alfanuméricos, correo válido y no registrado, y contraseñas coincidentes y seguras.
5. El sistema crea la cuenta.
6. El sistema informa que el registro fue exitoso.

**Flujos alternos:**

- **4.1.** Si falta un campo obligatorio, el sistema solicita completarlo.
- **4.2.** Si el nombre de usuario o correo ya existe, el sistema informa el conflicto.
- **4.3.** Si algún dato no es válido, el sistema muestra el error correspondiente y no crea la cuenta.

**Postcondición:** La cuenta queda almacenada y disponible para iniciar sesión.

## CU-02 — Iniciar sesión

**Actor principal:** Usuario  
**Objetivo:** Acceder a las funciones de la plataforma.

**Flujo principal:**

1. El usuario abre el formulario de inicio de sesión.
2. El usuario proporciona su correo o nombre de usuario y contraseña.
3. El sistema valida las credenciales.
4. El sistema inicia la sesión.
5. El sistema muestra el contenido disponible para el usuario.

**Flujos alternos:**

- **3.1.** Si las credenciales son incorrectas, el sistema informa que no son válidas.
- **3.2.** Si la cuenta no existe o está inactiva, el sistema impide el acceso.

**Postcondición:** El usuario tiene una sesión válida.

## CU-03 — Cerrar sesión

**Actor principal:** Usuario  
**Objetivo:** Finalizar la sesión activa.

**Flujo principal:**

1. El usuario selecciona la opción de cerrar sesión.
2. El sistema invalida la sesión.
3. El sistema redirige al usuario a la pantalla de acceso.

**Postcondición:** Las funciones privadas requieren iniciar sesión nuevamente.

## CU-04 — Cambiar contraseña

**Actor principal:** Usuario  
**Objetivo:** Sustituir la contraseña actual.

**Precondiciones:** El usuario debe tener una sesión activa.

**Flujo principal:**

1. El usuario abre el formulario de cambio de contraseña.
2. El usuario captura la contraseña actual, la nueva contraseña y su confirmación.
3. El sistema valida la contraseña actual.
4. El sistema valida las reglas de la nueva contraseña.
5. El sistema verifica que las nuevas contraseñas coincidan.
6. El sistema guarda la nueva contraseña.
7. El sistema informa que el cambio fue exitoso.

**Flujos alternos:**

- **3.1.** Si la contraseña actual es incorrecta, el sistema rechaza la operación.
- **5.1.** Si las nuevas contraseñas no coinciden, el sistema solicita corregirlas.

## CU-05 — Recuperar contraseña

**Actor principal:** Usuario  
**Objetivo:** Restablecer el acceso a la cuenta.

**Flujo principal:**

1. El usuario selecciona “Recuperar contraseña”.
2. El usuario proporciona su correo electrónico.
3. El sistema verifica que el correo esté asociado a una cuenta.
4. El sistema genera o envía un código o enlace de recuperación.
5. El usuario proporciona el código o utiliza el enlace.
6. El usuario captura y confirma una nueva contraseña.
7. El sistema valida la identidad y actualiza la contraseña.
8. El sistema informa que la recuperación fue exitosa.

**Flujos alternos:**

- **3.1.** Si el correo no está registrado, el sistema informa que no puede iniciar la recuperación.
- **5.1.** Si el código o enlace no es válido o expiró, el sistema solicita iniciar nuevamente el proceso.

## CU-06 — Consultar y actualizar perfil

**Actor principal:** Usuario  
**Objetivo:** Consultar y actualizar la información del perfil.

**Flujo principal:**

1. El usuario abre su perfil.
2. El sistema muestra su información actual.
3. El usuario modifica los datos permitidos.
4. El usuario selecciona entre 1 y 5 videojuegos aprobados para su biblioteca personal.
5. El usuario guarda los cambios.
6. El sistema valida y almacena la información.
7. El sistema muestra el perfil actualizado.

**Flujos alternos:**

- **4.1.** Si se seleccionan más de 5 videojuegos, el sistema impide guardar los cambios.
- **4.2.** Si se elimina la selección mínima permitida, el sistema solicita conservar al menos un videojuego relacionado.
- **6.1.** Si la imagen no cumple las reglas de formato o tamaño, el sistema rechaza la imagen.

## CU-07 — Eliminar cuenta

**Actor principal:** Usuario  
**Objetivo:** Eliminar la cuenta propia.

**Flujo principal:**

1. El usuario abre su perfil.
2. El usuario selecciona “Eliminar cuenta”.
3. El sistema muestra una advertencia y solicita confirmación.
4. El usuario confirma la eliminación.
5. El sistema elimina o desactiva la cuenta según la regla definida por el proyecto.
6. El sistema cierra la sesión.

**Flujos alternos:**

- **4.1.** Si el usuario cancela la confirmación, la cuenta permanece activa.

**Pendiente:** Definir qué sucede con sus publicaciones, comentarios, grupos y mensajes.

## CU-08 — Crear grupo

**Actor principal:** Usuario  
**Objetivo:** Crear una comunidad pública o privada relacionada con videojuegos.

**Flujo principal:**

1. El usuario abre el formulario de creación de grupo.
2. El usuario captura el nombre, la descripción y la imagen opcional del grupo.
3. El usuario elige explícitamente si el grupo será público o privado.
4. El usuario selecciona entre 1 y 5 videojuegos aprobados relacionados con el grupo.
5. El sistema valida la información.
6. El sistema crea el grupo y asigna al creador como administrador del grupo.
7. El sistema muestra el grupo creado.

**Flujos alternos:**

- **5.1.** Si el grupo no tiene entre 1 y 5 videojuegos, el sistema no permite crearlo.
- **5.2.** Si falta información obligatoria, el sistema solicita completarla.

## CU-09 — Editar grupo y videojuegos relacionados

**Actor principal:** Administrador del grupo  
**Objetivo:** Actualizar la información del grupo y sus videojuegos relacionados.

**Precondiciones:** El administrador debe tener permisos sobre el grupo.

**Flujo principal:**

1. El administrador abre la configuración del grupo.
2. El administrador modifica la información del grupo o la selección de videojuegos.
3. El sistema valida los cambios.
4. El sistema guarda la configuración actualizada.
5. El sistema muestra los cambios.

**Reglas:**

- En cualquier grupo, público o privado, deben mantenerse entre 1 y 5 videojuegos relacionados.
- El administrador puede agregar, eliminar o cambiar videojuegos relacionados.
- Solo pueden seleccionarse videojuegos aprobados.
- El administrador del grupo no puede modificar la página del videojuego.

## CU-10 — Unirse a un grupo público

**Actor principal:** Usuario  
**Objetivo:** Convertirse en integrante de un grupo público.

**Flujo principal:**

1. El usuario consulta los grupos públicos.
2. El usuario selecciona un grupo.
3. El usuario elige “Unirse”.
4. El sistema registra la membresía.
5. El sistema permite al usuario acceder al contenido autorizado del grupo.

## CU-11 — Solicitar ingreso a grupo privado

**Actor principal:** Usuario  
**Objetivo:** Solicitar acceso a un grupo privado.

**Flujo principal:**

1. El usuario consulta un grupo privado.
2. El usuario selecciona “Solicitar ingreso”.
3. El usuario agrega un mensaje opcional.
4. El sistema registra la solicitud con estado pendiente.
5. El sistema notifica o muestra la solicitud al administrador del grupo.

## CU-12 — Resolver solicitud de ingreso a grupo privado

**Actor principal:** Administrador del grupo  
**Objetivo:** Aceptar o rechazar la solicitud de ingreso.

**Flujo principal:**

1. El administrador consulta las solicitudes pendientes.
2. El administrador revisa los datos del solicitante.
3. El administrador selecciona aceptar o rechazar.
4. El sistema actualiza el estado de la solicitud.
5. El sistema informa el resultado al usuario.

**Flujos alternos:**

- **3.1.** Si el administrador acepta la solicitud, el sistema registra al usuario como integrante del grupo.
- **3.2.** Si el administrador rechaza la solicitud, el usuario no obtiene acceso al grupo.

## CU-13 — Abandonar o eliminar integrantes de un grupo

**Actor principal:** Usuario / Administrador del grupo  
**Objetivo:** Gestionar la membresía del grupo.

**Flujos:**

1. El usuario o administrador abre la gestión de integrantes del grupo.
2. El usuario selecciona “Abandonar grupo” o el administrador selecciona “Eliminar integrante”.
3. El sistema solicita confirmación.
4. El sistema actualiza la membresía.

**Flujos alternos:**

- **3.1.** Si el usuario cancela la confirmación, la membresía permanece sin cambios.

## CU-14 — Solicitar registro de videojuego

**Actor principal:** Jugador  
**Objetivo:** Solicitar que un videojuego sea incorporado al catálogo.

**Flujo principal:**

1. El jugador abre el formulario de solicitud.
2. El jugador captura nombre, descripción, género, plataforma, portada e información adicional.
3. El sistema valida la información y posibles duplicados.
4. El sistema registra la solicitud con estado pendiente.
5. El sistema muestra la confirmación del envío.

## CU-15 — Revisar solicitud de videojuego

**Actor principal:** Administrador de la plataforma  
**Objetivo:** Aceptar o rechazar una solicitud de videojuego.

**Flujo principal:**

1. El administrador consulta las solicitudes pendientes.
2. El administrador revisa la información enviada.
3. El administrador selecciona aceptar o rechazar.
4. El sistema actualiza el estado y registra la fecha de decisión.
5. El sistema informa el resultado al jugador.

**Flujos alternos:**

- **3.1.** Si el administrador rechaza la solicitud, registra un motivo opcional o requerido según la regla definida.
- **3.2.** Si el administrador acepta la solicitud, el sistema crea o habilita la página del videojuego.

## CU-16 — Administrar página de videojuego

**Actor principal:** Administrador de la plataforma  
**Objetivo:** Mantener actualizada la información del catálogo.

**Flujo principal:**

1. El administrador consulta una página de videojuego aceptada.
2. El administrador selecciona editar, actualizar o deshabilitar.
3. El sistema valida los cambios.
4. El sistema guarda el cambio.
5. El sistema muestra la página actualizada.

**Flujos alternos:**

- **2.1.** Si el administrador selecciona deshabilitar, el sistema solicita confirmación.
- **2.2.** Si el administrador confirma la deshabilitación, el sistema deja de mostrar la página.
- **2.3.** Si el administrador cancela la deshabilitación, la página permanece activa.

**Regla:** Los usuarios registrados no pueden administrar directamente estas páginas.

## CU-17 — Reportar contenido o usuario

**Actor principal:** Usuario  
**Objetivo:** Informar al administrador sobre contenido o comportamiento que deba revisarse.

**Flujo principal:**

1. El usuario selecciona la opción “Reportar” en una publicación, comentario, perfil o grupo.
2. El sistema muestra el formulario de reporte.
3. El usuario selecciona el tipo de contenido, el motivo y agrega una descripción.
4. El usuario adjunta evidencia opcional.
5. El usuario envía el reporte.
6. El sistema valida y registra el reporte con estado pendiente.
7. El sistema confirma el envío al usuario.

**Datos por definir:** Motivos disponibles, formatos y tamaño máximo de evidencias.

## CU-18 — Revisar reporte

**Actor principal:** Administrador de la plataforma  
**Objetivo:** Consultar y dar seguimiento a los reportes recibidos, sin aplicar sanciones.

**Flujo principal:**

1. El administrador consulta los reportes pendientes.
2. El administrador revisa el contenido reportado y la información del reporte.
3. El administrador actualiza el estado del reporte, por ejemplo: pendiente, en revisión o cerrado.
4. El sistema registra la revisión y la fecha correspondiente.

**Alcance excluido:** Este caso de uso no contempla suspensiones, bloqueos, eliminación de cuentas ni ninguna otra sanción.

**Datos por definir:** Estados finales permitidos, comentarios del administrador y notificación al usuario que realizó el reporte.

## CU-19 — Crear publicación

**Actor principal:** Usuario  
**Objetivo:** Crear una publicación general o una publicación dentro de un grupo.

**Flujo principal:**

1. El usuario abre el formulario de publicación.
2. El usuario captura el texto y agrega una imagen opcional.
3. El usuario selecciona un videojuego relacionado.
4. Si la publicación pertenece a un grupo, el sistema muestra únicamente los videojuegos relacionados con ese grupo.
5. El usuario envía la publicación.
6. El sistema valida la información.
7. El sistema guarda la publicación asociada al usuario, al videojuego y, si corresponde, al grupo.
8. El sistema muestra la publicación.

**Flujos alternos:**

- **3.1.** Si el usuario no selecciona un videojuego, el sistema no permite publicar.
- **4.1.** Si el videojuego no pertenece al grupo seleccionado, el sistema rechaza la publicación.
- **6.1.** Si falta información obligatoria, el sistema solicita completarla.


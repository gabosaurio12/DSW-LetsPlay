# Objetivos del proyecto — Let's Play

> **Proyecto:** Let's Play — Plataforma web para la comunidad de videojuegos  
> **Equipo:** Tres estudiantes de Ingeniería de Software (7.° semestre)  
> **Duración estimada:** 2 meses  
> **Responsable:** Leo  
> **Documento complementario:** Alcance del proyecto, Requisitos funcionales y Casos de uso

---

## 1. Objetivo general

Desarrollar una aplicación web orientada a la comunidad de videojuegos (*Let's Play*), accesible desde navegadores de escritorio e implementada mediante tecnologías web modernas (Next.js, React, Node.js) y una base de datos relacional persistente, que permita a los entusiastas de los videojuegos interactuar en una red social especializada a través de la publicación de contenido multimedia, la creación y participación en comunidades públicas y privadas vinculadas a títulos específicos, la gestión de bibliotecas personales de videojuegos y la moderación colaborativa de un catálogo comunitario, durante un periodo de dos meses por un equipo de tres estudiantes de Ingeniería de Software.

---

## 2. Objetivos específicos

Los objetivos específicos se estructuran conforme al ciclo de vida de desarrollo de software y a los módulos funcionales prioritarios identificados en el proyecto:

### 2.1. Análisis y gestión de requisitos
* **OE-1:** Identificar, levantar y documentar de manera formal los requisitos funcionales (**RF-01 a RF-97**) y no funcionales del sistema, abarcando los procesos de autenticación, gestión de perfiles, publicaciones, comunidades, catálogo de videojuegos y atención de reportes.
* **OE-2:** Modelar los actores del sistema (Visitante, Usuario, Moderador y Administrador) y especificar los casos de uso principales (**CU-01 a CU-19**) con sus flujos primarios, flujos alternos y reglas de negocio.

### 2.2. Diseño de software y modelado de datos
* **OE-3:** Diseñar la arquitectura conceptual de la aplicación web utilizando el modelo WAE (*Web Application Extension*), estructurando las relaciones entre páginas cliente, páginas servidor, formularios HTML y objetos persistentes.
* **OE-4:** Diseñar el modelo relacional de la base de datos (diagrama entidad-relación y diccionario de datos) que garantice la integridad referencial y persistencia de cuentas, perfiles, publicaciones, comentarios, reacciones, membresías de grupos, solicitudes y catálogo de videojuegos.
* **OE-5:** Diseñar prototipos de interfaz de usuario (UI/UX) intuitivos y adaptados a entornos de escritorio, contemplando las pantallas principales: autenticación, feed de publicaciones, perfil de usuario, páginas de grupos y paneles de administración.

### 2.3. Desarrollo e implementación modular
* **OE-6 (Módulo de autenticación y perfiles):** Implementar el sistema seguro de registro de usuarios, autenticación mediante sesiones, recuperación y cambio de contraseñas, así como la gestión de perfiles públicos y bibliotecas personales delimitadas obligatoriamente a entre 1 y 5 videojuegos aprobados.
* **OE-7 (Módulo de publicaciones e interacciones):** Desarrollar el feed principal de noticias y las funcionalidades de creación, visualización y eliminación de publicaciones con soporte de texto e imagen, integrando interacciones sociales (reacciones de "me gusta", comentarios y mensajería privada entre usuarios).
* **OE-8 (Módulo de comunidades y grupos):** Implementar la creación y administración de grupos públicos y privados vinculados a entre 1 y 5 videojuegos, integrando el flujo de solicitudes de admisión para grupos privados, control de integrantes y restricción de contenido según membresía.
* **OE-9 (Módulo de catálogo y administración):** Construir el flujo de solicitud de registro de videojuegos por parte de jugadores y los paneles administrativos exclusivos para que el Administrador de la plataforma revise, apruebe o rechace títulos, gestione páginas oficiales de videojuegos y consulte la bandeja de reportes de la comunidad.

### 2.4. Calidad, verificación y entrega
* **OE-10:** Diseñar y ejecutar un plan de pruebas funcionales y de integración que valide el cumplimiento de los casos de uso, las restricciones de integridad en base de datos y la seguridad en el control de acceso por roles.
* **OE-11:** Elaborar la documentación técnica del proyecto, incluyendo el repositorio de código fuente con manual de instalación/despliegue y el manual de usuario final para la operación de las funcionalidades principales.

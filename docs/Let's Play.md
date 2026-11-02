## Objetivo general (Leo)

Desarrollar una aplicación web orientada a la comunidad de videojuegos (*Let's Play*), accesible desde navegadores de escritorio e implementada mediante tecnologías web modernas (Next.js, React, Node.js) y una base de datos relacional persistente, que permita a los entusiastas de los videojuegos interactuar en una red social especializada a través de la publicación de contenido multimedia, la creación y participación en comunidades públicas y privadas vinculadas a títulos específicos, la gestión de bibliotecas personales de videojuegos y la moderación colaborativa de un catálogo comunitario, durante un periodo de dos meses por un equipo de tres estudiantes de Ingeniería de Software.

*(Para el desglose detallado con trazabilidad de requisitos, consultar [Objetivos del proyecto.md](file:///c:/Users/L30N4RD/Downloads/DSW-LetsPlay/docs/Objetivos%20del%20proyecto.md)).*

### Objetivos específicos

- **Análisis y requisitos:** Identificar, documentar y formalizar los requisitos funcionales (RF-01 a RF-97), no funcionales, casos de uso (CU-01 a CU-19) y actores del sistema (Visitante, Usuario, Moderador y Administrador).
- **Diseño y arquitectura:** Diseñar la arquitectura conceptual mediante el modelo WAE, prototipos de interfaz de usuario de escritorio y el modelo relacional de la base de datos que garantice la consistencia e integridad de datos.
- **Módulo de autenticación y perfiles:** Implementar el registro, inicio de sesión seguro, recuperación de contraseña y perfiles con biblioteca personal de 1 a 5 videojuegos aprobados.
- **Módulo de publicaciones e interacciones:** Desarrollar el feed principal, publicación de texto e imágenes asociadas a videojuegos, reacciones ("me gusta"), comentarios y mensajería privada.
- **Módulo de comunidades y grupos:** Construir la gestión de grupos públicos y privados vinculados a 1-5 videojuegos con flujos de aprobación y control de miembros.
- **Módulo de catálogo y administración:** Crear el subsistema de solicitud de videojuegos por parte de jugadores y los paneles administrativos para su aprobación, rechazo, edición y consulta de reportes.
- **Pruebas y calidad:** Diseñar y ejecutar pruebas funcionales y de integración para validar los flujos de casos de uso y asegurar la ausencia de errores críticos.
- **Documentación y entrega:** Elaborar la documentación técnica del proyecto, el código fuente versionado con guía de despliegue y el manual de usuario final.

## Alcance (Seth)

### Límites de la primera versión

## Interesados (Gabo)

**Let's Play** está dirigida a una comunidad de videojuegos integrada por los siguientes grupos de usuarios:

- **Jugadores:** personas interesadas en encontrar compañeros de juego, participar en comunidades y compartir sus intereses relacionados con los videojuegos
- **Desarrolladores de videojuegos:** personas interesadas en dar visibilidad a sus proyectos, compartir avances y presentar sus creaciones a la comunidad
- **Creadores de contenido:** personas interesadas en compartir contenido relacionado con videojuegos y conectar con usuarios que tengan intereses similares

### Usuarios objetivo

Los usuarios objetivo de la plataforma son:

- *Jugadores*
- *Desarrolladores*
- *Creadores de contenido*

## Etapas de desarrollo (Leo)

El proyecto se desarrolla durante un periodo de 2 meses (8 semanas) mediante un enfoque iterativo e incremental organizado en 5 etapas secuenciales:

1. **Etapa 1: Análisis de Requisitos y Planificación (Semanas 1-2):** Levantamiento de requisitos (RF-01 a RF-97), definición de casos de uso (CU-01 a CU-19), formularios y actores del sistema.  
   *Entregable:* Documento de requisitos, alcance y casos de uso.
2. **Etapa 2: Diseño de Software y Arquitectura (Semanas 2-3):** Modelado WAE, diseño del esquema relacional de base de datos (ER) y prototipos de interfaz (UI/UX).  
   *Entregable:* Modelo WAE, diagrama ER y wireframes de interfaces.
3. **Etapa 3: Desarrollo e Implementación (Semanas 3-6):** Codificación modular en Next.js, React y Node.js por fases priorizadas: persistencia y arquitectura base, autenticación y perfiles, publicaciones y feed, grupos públicos/privados, y catálogo con panel administrativo.  
   *Entregable:* Módulos funcionales de la aplicación integrados con base de datos.
4. **Etapa 4: Pruebas y Aseguramiento de Calidad (Semana 7):** Ejecución de pruebas funcionales de casos de uso, verificación de reglas de negocio e integridad de datos, y resolución de errores críticos.  
   *Entregable:* Informe de pruebas y corrección de incidencias.
5. **Etapa 5: Cierre, Documentación y Entrega (Semana 8):** Consolidación de la versión final, manual de instalación/despliegue, manual de usuario y entrega en plataforma Eminus.  
   *Entregable:* Aplicación funcional, código fuente versionado y manual de usuario.

*(Para el desglose completo con cronograma, desglose de sprints y matriz RACI, consultar [Etapas de desarrollo.md](file:///c:/Users/L30N4RD/Downloads/DSW-LetsPlay/docs/Etapas%20de%20desarrollo.md)).*

## Recursos disponibles (Gabo)

Se describen los recursos humanos y técnicos disponibles para el desarrollo de *Let's Play*.

### Recursos humanos

- **Tres** estudiantes de *Ingeniería de Software* de séptimo semestre
	- Serán responsables de actividades de análisis, diseño, desarrollo y documentación del proyecto

### Recursos técnicos

**Herramientas de desarrollo:**

- Visual Studio Code
- OpenCode
	- Como agente de desarrollo

**Tecnologías de desarrollo web:**

- Node.js
- Next.js
- React

**Herramientas de inteligencia artificial:**

- ChatGPT
- Calude
- Gemini Flash

La selección y uso de las tecnologías y herramientas mencionadas estará sujeta a las necesidades del proyecto y a las decisiones acordadas por el equipo de desarrollo. 

## Riesgos y restricciones (Leo)

Se identifican los riesgos que podrían afectar el cumplimiento de los objetivos y las restricciones bajo las cuales debe ejecutarse el proyecto *Let's Play*.

### Riesgos del proyecto

| ID | Riesgo identificado | Probabilidad | Impacto | Estrategia de mitigación |
|---|---|:---:|:---:|---|
| **R-01** | **Desviación del alcance por funcionalidades complejas:** Intentar implementar características avanzadas (recomendaciones por IA, transmisiones en vivo o aplicaciones móviles nativas) en lugar de las funciones prioritarias. | Media | Alto | Apego estricto a las prioridades del proyecto (Prioridades 1 a 6) y postergar características secundarias al backlog de versiones futuras. |
| **R-02** | **Disponibilidad de tiempo y carga académica simultánea:** Retrasos en los entregables debido a la carga de materias del séptimo semestre de los integrantes. | Alta | Alto | Planificación semanal basada en sprints cortos, seguimiento continuo mediante el tablero Trello y redistribución de tareas ante contingencias. |
| **R-03** | **Curva de integración tecnológica (Next.js / Node.js / Base de datos):** Dificultades técnicas en la estructuración de componentes cliente-servidor o en la persistencia relacional. | Media | Medio | Construcción temprana del prototipo arquitectónico base (Fase 3.1) y soporte colaborativo con herramientas de IA y documentación técnica oficial. |
| **R-04** | **Inconsistencia en la integridad de datos:** Errores al manejar relaciones complejas (límites estrictos de 1 a 5 videojuegos por perfil/grupo y aislamiento de grupos privados). | Media | Alto | Doble validación obligatoria: en frontend mediante validadores de formulario y en backend mediante transacciones y restricciones de integridad en base de datos. |
| **R-05** | **Conflictos en el control de versiones (Git):** Pérdida de código o colisiones durante la integración de ramas de trabajo de los tres desarrolladores. | Media | Medio | Definición de una política de ramas (rama `main` protegida, ramas por funcionalidad) y revisión de cambios antes de realizar *merges*. |
| **R-06** | **Riesgos de seguridad en autenticación y almacenamiento:** Vulnerabilidades por almacenamiento inseguro de contraseñas o subida descontrolada de archivos de imagen. | Baja | Alto | Implementación de funciones hash seguras (bcrypt/argon2), sanitización estricta de entradas y validación de tipos MIME y tamaño máximo en imágenes. |

### Restricciones del proyecto

1. **Restricción temporal:** El proyecto debe ser completado en un periodo improrrogable de **dos meses (8 semanas)**, ajustado al calendario y fechas de entrega del periodo escolar.
2. **Restricción de equipo humano:** El equipo de desarrollo está conformado exclusivamente por **tres estudiantes** de Ingeniería de Software, quienes asumen la totalidad de los roles de análisis, diseño, frontend, backend, pruebas y documentación.
3. **Restricción de plataforma y entorno:** La aplicación está acotada a una **interfaz web accesible desde computadoras de escritorio**; no incluye desarrollo de aplicaciones nativas para dispositivos móviles (Android/iOS) en esta versión.
4. **Restricción económica y de infraestructura:** El proyecto no dispone de presupuesto financiero asignado; su ejecución, pruebas y almacenamiento se realizarán en entornos locales y servicios con niveles de uso gratuitos (*free tiers*).
5. **Restricciones tecnológicas acordadas:** El stack técnico principal se limita al ecosistema definido por el equipo: Node.js, Next.js y React, con una base de datos relacional y modelado arquitectónico basado en el estándar WAE.
6. **Restricción institucional y académica:** Toda la documentación, especificación de casos de uso y entregables deben sujetarse a los lineamientos y rúbricas establecidos para la plataforma educativa institucional Eminus.

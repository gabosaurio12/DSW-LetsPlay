# AGENTS.md — Let's Play

## Proyecto
- Let's Play es una red social web para gamers: compartir publicaciones, crear comunidades y encontrar personas para jugar.
- Stack: React + Vite (frontend), Express.js 5 (backend), PostgreSQL (base de datos principal), MongoDB (imágenes y assets).

## Estructura
- `apps/frontend/`: cliente React con Vite. Lee `apps/frontend/AGENTS.md` antes de trabajar aquí.
- `apps/backend/`: servidor Express. Lee `apps/backend/AGENTS.md` antes de trabajar aquí.
- `database/`: modelo y scripts de PostgreSQL. Lee `database/AGENTS.md` antes de trabajar aquí.
- `docs/`: documentación canónica (vault Obsidian, en español). Lee `docs/AGENTS.md` antes de trabajar aquí.
- `.agents/`: skills de los agentes de IA.
- `.opencode/`: comandos locales de OpenCode. No se versiona.
- Decisión 2026-11-06: la estructura `apps/frontend` + `apps/backend` es la definitiva.

## Fuente de verdad
- `docs/EstandarDeCodigo.md` (versión 1.1) es la fuente de verdad para estilo, nombrado, prácticas, excepciones, comentarios, pruebas y control de versiones.
- El resumen de este archivo no sustituye al estándar. Si hay diferencias, sigue el estándar y avisa.

## Idioma
- El código, nombres, comentarios y mensajes de commit van en inglés.
- La interfaz debe soportar internacionalización (i18n) para al menos español e inglés.

## Estilo
- Indentación con 4 espacios. Nunca tabs.
- Comillas dobles para cadenas, y punto y coma al final de cada sentencia.
- Llaves K&R: la llave de apertura va en la misma línea. `else` y `else if` van en la misma línea que la llave de cierre anterior.
- Máximo 100 caracteres por línea. Espacios alrededor de operadores y después de comas.
- En llamadas largas, un argumento por línea y el paréntesis de cierre alineado con el inicio de la declaración.
- Ternarios de dos valores, sin anidar. `if`, `while` y `for` siempre con llaves (excepto funciones flecha de expresión simple).

## Nombrado
- camelCase para variables, parámetros, funciones, métodos y campos.
- UPPER_SNAKE_CASE solo para constantes de configuración o de dominio. Un `const` local sigue camelCase.
- PascalCase para clases y componentes de React.
- Hooks personalizados con prefijo `use`.
- Archivos de componente con el nombre del componente (`ProfileForm.jsx`). Hooks en `useNombre.js`. El resto en camelCase (`authService.js`).
- Carpetas en camelCase o kebab-case. Las carpetas que agrupan un componente con sus archivos auxiliares van en PascalCase (`components/ReportModal/`).
- Abreviaturas solo si son de reglas de negocio o del diccionario del estándar (DTO, DB, API, UI, UX, Req, Res, Auth, Max, Min).
- Nombres descriptivos. Una sola letra solo en contadores de `for` o en callbacks cortos donde el tipo es evidente (`(p) => p.isOnline`).

## Prácticas
- `const` por defecto. `let` solo si la variable se reasigna. `var` está prohibido.
- `async`/`await` en toda operación asíncrona. No encadenes `.then()`.
- Funciones flecha para callbacks cortos. Usa funciones tradicionales cuando necesites su propio `this`.
- Desestructuración y spread. No mutes objetos que recibes.
- Métodos funcionales de arreglos (`map`, `filter`, `reduce`) antes que bucles manuales.
- Funciones de unas 30 líneas como máximo, con 3 parámetros como máximo (si hay más, un objeto de opciones) y complejidad ciclomática de 10 como máximo.
- Sin números mágicos: extrae valores a constantes con nombre.
- Sin código muerto ni código comentado "por si acaso".
- Valida toda entrada del cliente (body, params, query) antes de usarla.
- No añadas dependencias, frameworks ni pasos de build sin aprobación.

## Excepciones
- `try`/`catch` solo alrededor del código que puede lanzar un error. Usa `error` o `err` como nombre de variable.
- Captura errores específicos y conocidos. Captura `Error` genérico solo en el middleware global de errores.
- Propaga los errores de capas inferiores y captúralos donde sepas qué responder.
- Registra errores con `console.error`. Usa `console.log` solo para depuración temporal.

## Comentarios
- Comenta solo el porqué de una decisión, y el cómo cuando no sea obvio. Nunca expliques qué hace el código.
- Comentarios de una línea con `//`, en la línea anterior al código.
- Comentarios de bloque `/* */` solo para soluciones poco comunes. Explica por qué no se usó la solución estándar.
- Documenta con JSDoc los servicios públicos, utilidades compartidas y hooks, con `@param`, `@returns`, `@throws` y `@example` cuando apliquen.

## Control de versiones
- Usa Conventional Commits: `feat:`, `fix:`, `refactor:`, `conflicts:`, `config:`, `docs:`, `test:`, seguido de un mensaje breve en inglés.
- Commitea cada tarea terminada. El trabajo sin commit se puede perder.
- No hagas push sin autorización explícita.
- Ramas: `feature/*`, `fix/*`, `refactor/*`, `exp/*`, `hotfix/*`. No modifiques `main` directamente; los cambios entran por Pull Request.
- No fusiones ramas ni toques código de ramas ajenas sin aprobación.
- Resuelve los conflictos revisando manualmente cada diferencia y verifica con las pruebas antes de hacer merge.
- No subas `node_modules`, builds, ni archivos `.env`. Solo `.env.example`.

## Verificación
- Backend: `npm test` en `apps/backend/`.
- Frontend: `npm run lint` y `npm run build` en `apps/frontend/`.
- Las pruebas del backend usan `node:test` y `node:assert/strict`. No añadas frameworks de pruebas sin aprobación.
- Nombra las pruebas como "should [comportamiento] when [escenario]".

## Forma de trabajar
- Haz solo lo que se pide. Cambios pequeños y enfocados. No reescribas lo que ya funciona.
- Si no sabes qué hacer, pregunta antes de asumir.
- Pregunta antes de: crear archivos nuevos, cambiar el formato de datos guardados, tomar decisiones de diseño o arquitectura, o añadir dependencias.
- Al terminar, resume los cambios y las decisiones que el usuario debe revisar.
- Nunca guardes datos sensibles (claves, tokens, datos personales) en código, docs ni memoria.

## Memoria
- Al empezar, lee `MEMORY.md` de la raíz y el de la carpeta en la que trabajas.
- Al iniciar trabajo en una tarea/rama, verifica si ya existe un `.MEMORY.md` en la carpeta correspondiente (la del AGENTS.md más específico bajo el que estás trabajando):
  - Si existe, retómalo como contexto de una sesión anterior inconclusa antes de continuar.
  - Si no existe, créalo como MEMORY temporal de esta tarea.
- Usa `.MEMORY.md` para notas de trabajo en progreso (decisiones intermedias, intentos fallidos, pendientes). Este archivo está en `.gitignore` y nunca debe commitearse.
- Al finalizar la tarea, en este orden:
  1. Revisa `.MEMORY.md` y extrae únicamente lo que deba persistir más allá de esta tarea (ej. una decisión de arquitectura tomada, una convención nueva adoptada, deuda técnica identificada — NO pasos intermedios ni intentos descartados).
  2. Agrega esas notas a `MEMORY.md` de la carpeta que tocaste, con formato: estado, decisiones con su porqué, y errores a evitar. Máximo ~50 líneas.
  3. Solo después de confirmar que `MEMORY.md` quedó actualizado correctamente, elimina `.MEMORY.md`.
- Si algo se vuelve una regla permanente, muévelo a `AGENTS.md` y pide confirmación.
# AGENTS.md — apps/frontend

Aplican también las reglas de `/AGENTS.md`. Este archivo añade las específicas del cliente.

## Stack
- React 19 con Vite 8 y ESLint (JSX).
- No añadas librerías de i18n, estado, UI, routing o animación sin aprobación. La i18n actual es un mini-diccionario propio.

## Estilo
- Indentación de 4 espacios también en JSX y CSS. Hay archivos con 2 espacios; no los reformatees de paso.
- Comillas dobles en JS y en atributos JSX. Punto y coma al final de cada sentencia.

## Estructura
- `components/`: componentes reutilizables. Cada componente con su CSS junto a él.
- `pages/`: pantallas completas.
- `services/`: acceso a datos, API y localStorage.
- `hooks/`: hooks personalizados (`useNombre.js`).
- `data/`: constantes de dominio.
- `i18n/`: `es.js`, `en.js` e `i18n.js`.

## Textos e i18n
- Todo texto visible va en `src/i18n/es.js` y `src/i18n/en.js`, con las mismas claves en ambos archivos.
- Usa el hook `useTranslation`. No escribas texto fijo en JSX.
- Antes de dar por cerrado un cambio de i18n, verifica que ambos idiomas tengan la misma estructura de claves.

## Estado y almacenamiento
- Para localStorage usa async/await con try/catch. Si falla, devuelve `null` o `false`.

## Estilos y diseño
- El tema es claro. Las variables `--lp-*` (`App.css`) son las canónicas. No habrá tema oscuro.
- Usa solo `--lp-*` en componentes nuevos. Las variables `--color-*` (`index.css`) pertenecen al tema oscuro que no se usará.
- Los diseños deben coincidir con el prototipo de Figma `Let-s-Play`. Usa la skill `figma-parity` antes de cerrar un ticket de UI.

## Componentes y JSDoc
- Componentes en PascalCase con el mismo nombre que su archivo.
- Documenta con JSDoc los hooks y servicios públicos.

## Verificación
- `npm run lint` y `npm run build` en `apps/frontend/`, sin errores.

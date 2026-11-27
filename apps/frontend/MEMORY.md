# MEMORY.md — apps/frontend

Memoria del cliente. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Auth: `LoginForm`, `RegisterForm`, `RecoveryForm`, `AuthBrand` con `authService.js` (sesión en localStorage, seed `seth_play`). Logout en header y en `ProfileForm` (RF-88/89).
- `App.jsx` (merge resuelto 2026-11-27): sin sesión → auth. Con sesión sin encuesta → `WelcomeSurvey`. Con encuesta completa → shell con `ExploreGames` por defecto. `/admin` también exige sesión y encuesta. Logout en el header del shell y del admin.
- Encuesta: wizard géneros → plataformas → disponibilidad → resumen. Archivos: `welcomeSurveyData.js`, `welcomeSurveyService.js`, `WelcomeSurveyPanels`, `SurveyOptionChip`, `hooks/useTranslation`.
- Páginas: `ExploreGames`, `GameDetail` (drag & drop), `LfgSearch`, `ModerationPanel` (`/admin`).
- Componentes nuevos: `PostComments`, `ReportModal`, `ProfileFormPanels`, `SelectableChip`.
- `videogameService` (incluye uploads), `commentService`, `reportService` y `lfgService` consumen `/api/*` por el proxy de Vite a `:3001`. `authService`, `profileService` y `welcomeSurveyService` siguen en localStorage.
- `npm run lint` limpio el 2026-11-27.

## Decisiones (y por qué)
- 2026-11-26: la encuesta es obligatoria tras el primer registro o inicio de sesión. Géneros y plataformas: mínimo 1 y máximo 5. Disponibilidad: mínimo 1. Al guardar va directo al home, sin pantalla de confirmación. Motivo no registrado.
- i18n con mini-diccionario propio en `es.js` y `en.js`, sin librerías.
- 2026-11-27: tema claro. `--lp-*` es canónico y no habrá tema oscuro. Color primario de Figma `#bb8484` como `--lp-primary`.
- localStorage con async/await y try/catch. Ante fallo devuelve `null` o `false`.
- 2026-11-27: `/admin` exige sesión y encuesta completa. Motivo: el panel de moderación no debe ser público.
- 2026-11-27: tras autenticarse vista por defecto `ExploreGames`, no `ProfileForm`.

## Bugs abiertos (verificados en código el 2026-11-27)
- Contraste: `ProfileForm.css` usa `--color-*` (tema oscuro de `index.css`), pero `App.css` fuerza fondo claro con `--lp-*`. Medido antes con DevTools: títulos 1.08 y chips 1.27. Lighthouse a11y 96. No re-medido.
- Indentación: varios JSX usan 2 espacios y el estándar exige 4. Se reformatearán más adelante, no antes.

## Errores a evitar
- En merges de i18n, el auto-merge de git dejó `profile` anidado dentro de `survey.errors` y un `}}};` final. Tras resolver, comprobar que `en.js` y `es.js` tengan las mismas claves (script de paridad) y no solo que el archivo compile.

## Próximos pasos
- Conectar `welcomeSurveyService` y `profileService` al backend.
- Documentar la encuesta en RF y ajustar `ProfileForm` según esa decisión.

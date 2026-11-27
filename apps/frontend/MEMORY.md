# MEMORY.md — apps/frontend

Memoria del cliente. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Auth: `LoginForm`, `RegisterForm`, `RecoveryForm`, `AuthBrand` con `authService.js` (sesión en localStorage, seed `seth_play`). Logout en header y en `ProfileForm` (RF-88/89).
- `App.jsx`: sin sesión → auth. Con sesión → `WelcomeSurvey` si no está completada; si está completada → `ProfileForm`.
- Encuesta: wizard géneros → plataformas → disponibilidad → resumen. Archivos: `welcomeSurveyData.js`, `welcomeSurveyService.js`, `WelcomeSurveyPanels`, `SurveyOptionChip`, `hooks/useTranslation`.
- Páginas: `ExploreGames`, `GameDetail` (drag & drop), `ModerationPanel` (`/admin`).
- `npm run lint` limpio el 2026-11-27.

## Decisiones (y por qué)
- 2026-11-26: la encuesta es obligatoria tras el primer registro o inicio de sesión. Géneros y plataformas: mínimo 1 y máximo 5. Disponibilidad: mínimo 1. Al guardar va directo al home, sin pantalla de confirmación. Motivo no registrado.
- i18n con mini-diccionario propio en `es.js` y `en.js`, sin librerías.
- 2026-11-27: tema claro. `--lp-*` es canónico y no habrá tema oscuro. Color primario de Figma `#bb8484` como `--lp-primary`.
- localStorage con async/await y try/catch. Ante fallo devuelve `null` o `false`.

## Bugs abiertos (verificados en código el 2026-11-27)
- i18n: en `es.js` y `en.js`, el bloque `profile` queda dentro de `survey.errors` porque `errors` no se cierra antes. Resultado: no existe `profile` en el nivel superior y la UI muestra claves como `profile.title`. Corrección: cerrar `errors` antes de `profile`. No verificado en navegador tras el merge.
- Contraste: `ProfileForm.css` usa `--color-*` (tema oscuro de `index.css`), pero `App.css` fuerza fondo claro con `--lp-*`. Medido antes con DevTools: títulos 1.08 y chips 1.27. Lighthouse a11y 96. No re-medido.
- Indentación: varios JSX usan 2 espacios y el estándar exige 4. Se reformatearán más adelante, no antes.

## Próximos pasos
- Conectar `welcomeSurveyService` y `profileService` al backend.
- Documentar la encuesta en RF y ajustar `ProfileForm` según esa decisión.

---
name: figma-parity
description: Verifica que una pantalla o componente implementado en apps/frontend/ coincida estructural y visualmente con su prototipo exacto en Figma (Let-s-Play) antes de aprobar un ticket UI.
---

# Figma Parity — Let's Play

Skill de verificación visual y estructural para asegurar que las páginas implementadas en `apps/frontend/` coincidan con los prototipos de Figma (`YJ7S6DSebM5cZkSKu7j7Ek`).

## Cuándo aplicarla
Siempre que `router` (o un subagente revisor) evalúe un ticket de `apps/frontend/` correspondiente a una pantalla o modal de `.routing/FIGMA_INVENTORY.md`.

## Pasos obligatorios
1. **Localizar el prototipo:** Buscar el `node-id` de la pantalla en `.routing/FIGMA_INVENTORY.md` y revisar `.routing/STYLE_GUIDE.md`.
2. **Consultar Figma MCP:** Leer `figma-design-to-code` si no se ha cargado en la sesión y llamar a `get_design_context` (y `get_screenshot` si falta vista) sobre el `node-id` exacto.
3. **Auditar 6 dimensiones (Figma vs Código):**
   - **Shell:** ¿Respeta `Top Header` (`76px`, marca, buscador pill, acciones) y `Sidebar` (`250px`, `EXPLORAR`, `COMUNIDADES`, `TUS JUEGOS`) si la vista pertenece al shell principal?
   - **Estructura / Columnas:** ¿Coinciden `Workspace`, `Main Column`, `Right Rail` (`288–368px`) y número de columnas del grid?
   - **Controles de interacción:** ¿Los filtros, tabs y selectores usan el mismo patrón que Figma (ej. pills horizontales en lugar de `<select>`, tabs con barra inferior `2px #BB8484`)?
   - **Anatomía de tarjetas y botones:** ¿Están todos los elementos de la tarjeta en el mismo orden, con `Game Pill` (`#EEF3FF` / `#1D4ED8`), avatar/portada y los mismos botones de acción en el footer?
   - **Tokens visuales:** ¿Se usan `#BB8484`, `#F7EEEE`, `#FCFAFA`, `#F9F7F7`, `#E8DADA`, `Sora` + `Inter`, `border-radius: 16px` (cards) y `999px` (pills/avatares)?
   - **Assets e i18n:** ¿Cero URLs temporales `figma.com/api/mcp/asset/...` en código? ¿Todo texto visible pasa por `es.js` / `en.js`? ¿Los módulos aún no implementados muestran estado honesto sin inventar datos falsos?
4. **Emitir dictamen:**
   - Si hay diferencias → reportar cada una con `[Falta]`, `[Diferente]` o `[Extra]` y devolver el ticket al worker en `in-progress`.
   - Si todo coincide → registrar `Figma parity: OK (<node-id>)`.

# AGENTS.md — Let's Play
El proyecto es una implementación web de una red social para Gamers con el objetivo de compartir publicaciones, crear comunidades, encontrar personas para jugar.

## Stack y estructura
- React para el frontend.
- Express.js para el backend.
- Base de datos principal PostgreSQL.
- Base de datos para imágenes o assets MongoDB.
- /agents contiene los archivos para agentes de IA como AGENTS.md, MEMORY.md y cualquier otro que se genere.
- .opencode/ guardará los comandos de opencode.
- .agents/ guardará skills de los agentes de IA.
- src-client/ tendrá el proyecto del lado del cliente (react).
- src-server/ tendrá el proyecto del lado del servidor (express.js).

## Convenciones
- El texto de la interfaz debe soportar internacionalización (i18n) para al menos español e inglés.
- Código simple, nombres descriptivos, camelCase para funciones y variables.
- Los comentarios deben utilizarse únicamente para explicar el por qué de una implementación y si es necesario el cómo funciona.
- El código debe ser lo más legible posible, con las llaves abriendo en la misma línea:

```javascript
if () {
    ...
} else {
    ...
}

function getUser() {
    ...
}
```

- Utiliza bloques try-catch atrapando las excepciones que se pueden lanzar realmente, no utilices `catch (Exception)` como medida de prevención, solo puedes utilizar `catch (Exception)` cuando realmente sea una excepción que se puede lanzar.
- El código que se genere deberá ser en inglés.

## Documentación (docs/)
- Repo aún sin código; la documentación vive en docs/ (vault Obsidian, en español).
- Esquema numerado canónico: 1.1.* definición/plan, 1.2.* requisitos/especificación/casos de uso, 1.3.* arquitectura/modelo WAE, 1.5.* pruebas/seguridad. Añadir nuevos docs siguiendo este esquema.
- Los archivos sueltos antiguos (Requisitos funcionales.md, Casos de uso.md, etc.) duplican contenido; los numerados son los canónicos — edita esos y no crees duplicados.
- Mantén consistentes los IDs entre docs: RF-01…RF-97, CU-01…CU-19; actores: Visitante, Usuario, Moderador, Administrador.
- No uses links absolutos tipo file:///c:/Users/... (existen de otra máquina); usa links relativos al vault.
- No commitear ni editar .obsidian/.

## Reglas de dominio / trampas conocidas 
- Cuando tengas preguntas porque no sepas qué hacer pregúntame.

## Forma de trabajar
- Haz solo lo que se pide: no añadas funcionalidades por tu cuenta.
- Cambios pequeños y enfocados; no reescribas lo que ya funciona.
- Al terminar, resume qué has cambiado y cualquier decisión que deba revisar.

## Límites 
- ✅ Siempre: respeta el estilo de código.
- ⚠️ Pregunta antes: crear archivos nuevos, cambiar el formato de los datos guardados, tomar decisiones de diseño o arquitectura.
- 🚫 Nunca: añadir dependencias, frameworks o un paso de build.

## Verificación 
- Aún no hay tests.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, muévelo a `AGENTS.md` en lugar de dejarlo en la memoria (solicita confirmación).
- No guardes nunca datos sensibles (claves, tokens, datos personales).
# AGENTS.md — docs/

Aplican también las reglas de `/AGENTS.md`. Este archivo añade las específicas de la documentación.

## Idioma y formato
- `docs/` es un vault de Obsidian escrito en español.
- Usa links relativos al vault. Nunca links absolutos `file:///`.
- No commitees ni edites `.obsidian/`.

## Esquema numerado (canónico)
- `1.1.*`: definición y planificación.
- `1.2.*`: requisitos, especificación y casos de uso.
- `1.3.*`: arquitectura y modelo WAE.
- `1.5.*`: pruebas y seguridad.
- Añade documentos nuevos siguiendo este esquema.
- Los archivos sueltos antiguos (`Requisitos funcionales.md`, `Casos de uso.md`, etc.) duplican contenido. Edita solo los numerados y no crees duplicados.

## IDs y actores
- Mantén consistentes los IDs entre documentos: RF-01…RF-136, CU-01…CU-51, RN-01…RN-30.
- Actores: Visitante, Usuario, Moderador, Administrador.
- No asumas IDs antiguos (RF ≤ 97, CU ≤ 19).
- No trates como completados los documentos 1.5 que estén vacíos.

## Estándar de código
- `docs/EstandarDeCodigo.md` es la fuente de verdad del código. Si lo cambias, avisa para actualizar los `AGENTS.md` de `apps/` y la raíz.

## Commits
- Usa el prefijo `docs:` en los commits de documentación.

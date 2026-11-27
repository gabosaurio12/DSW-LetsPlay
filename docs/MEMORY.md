# MEMORY.md — docs

Memoria de la documentación. Reglas en `AGENTS.md` de esta carpeta. Máximo ~50 líneas.

## Estado actual
- Docs canónicos numerados: 1.1.1, 1.1.2, 1.2.1 a 1.2.5, 1.3.1, 1.3.2, 1.5.1 y 1.5.3.
- `1.5.1` es una plantilla. `1.5.3` cubre el manejo de secretos. No existe `1.5.2`.
- Sueltos antiguos (`Requisitos funcionales.md`, `Casos de uso.md`, etc.) duplican el contenido de los numerados. No los edites.
- `EstandarDeCodigo.md` está en versión 1.1 (2026-11-27), adaptado al código actual.

## Decisiones (y por qué)
- IDs canónicos RF-01…RF-136, CU-01…CU-51, RN-01…RN-30. Actores: Visitante, Usuario, Moderador, Administrador.
- Links relativos al vault. No usar `file:///` porque rompen en otra máquina.
- `.obsidian/` no se commitea ni se edita.

## Errores a evitar
- No asumir IDs antiguos (RF ≤ 97, CU ≤ 19).
- No tratar `1.5.1` ni `1.5.3` como completados.

## Próximos pasos
- Documentar la encuesta en RF/formularios (RF-127).
- Completar `1.5.1` y crear `1.5.2`.
- Ampliar `1.5.3`.

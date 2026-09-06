# Créditos y licencias

## Ilustraciones de las posturas
- **Fuente:** colección «Yoga Poses» de **SVG Repo** (svgrepo.com) — 64 dibujos de figura, un solo estilo, formato SVG.
- **Licencia:** libre / CC0 (uso comercial permitido; atribución no obligatoria pero se incluye aquí).
- **Cambios:** se quitó el círculo crema del fondo de cada dibujo. Sin otras modificaciones.
- Los 64 dibujos quedan disponibles dentro de la app: en cada tarjeta, «Cambiar dibujo» permite a Andrea
  asignar o corregir el dibujo de cualquier postura (su elección se guarda en el navegador).
- Procesado reproducible: `node _pipeline/process-svgrepo.mjs` (lee `_pipeline/svgrepo-raw/` y `svgrepo-map.mjs`).

Antes se usó el set «Nina-Mel» (Wikimedia Commons, CC BY 3.0). Se reemplazó por el de SVG Repo para que
todo el glosario tenga un único estilo. El script `_pipeline/fetch-img.mjs` sigue ahí por si se quiere recuperar.

## Datos de las posturas
- **yoga-api** — https://github.com/alexcumplido/yoga-api
  - Código bajo licencia MIT. Textos de posturas (nombres EN, sánscrito, traducción, descripción, beneficios) de dominio público.
  - Se usan como base para 48 posturas; traducidos y resumidos al español.
- **Contenido propio del proyecto** (revisar con criterio de maestra):
  - Cues en español (`entrada`).
  - Etiquetas de `zona`, `dinámica`, `tema` y `nivel`.
  - `precaución` de cada postura.
  - Las ~23 posturas marcadas con fuente `propia` (no están en yoga-api): nombres, cues y beneficios redactados para esta app.

## Referencias de consulta (no incorporadas como datos)
- Tummee (tummee.com) — modelo de biblioteca de posturas y secuenciador.
- Wikipedia, «List of asanas» — para el bloque extendido futuro.

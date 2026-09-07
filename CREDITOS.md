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

## Ilustraciones y textos del mazo de cartas (posturas marcadas «mazo»)
- Algunas fichas (`_pipeline/mazo.mjs`) usan la ilustración y el contenido de un **mazo de cartas de yoga
  impreso, propiedad de la usuaria (Andrea)**, que compró.
- **Uso:** estrictamente personal y **no comercial** — es el mismo mazo que ella ya usa para dar clase,
  en otro formato (su cuaderno digital). La app no se vende ni se ofrece como producto.
- **Qué se tomó:** la ilustración de figura de cada carta (con su texto de indicaciones en inglés, intacto),
  recortada y enderezada de fotos del mazo. El resto del texto del reverso (nivel, beneficios, «para salir»,
  contraindicaciones, respiración) se **reescribió a mano** porque en la foto se ve borroso.
- Procesado de imagen: `_pipeline/crop_card.py` (detecta la carta, corrige perspectiva, limpia).
- Si el titular de los derechos del mazo lo pide, se retiran estas ilustraciones y quedan los dibujos CC0.

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

## Verificaciones hechas sobre el contenido
- `node _pipeline/verify-names.mjs` — compara los nombres en sánscrito contra la lista de asanas de
  Wikipedia. Resultado: 0 nombres inventados (las no reconocidas son asanas reales que esa lista concreta
  no incluye).
- `node _pipeline/audit.mjs` — busca contradicciones entre las cues y las etiquetas (tipo/dinámica/nivel),
  duplicados y campos flojos.
- `node _pipeline/match-svgs.mjs` — los dibujos de SVG Repo y los de yoga-api son **el mismo set de arte**;
  el script los empareja comparando los datos de path, lo que da la identidad REAL de cada dibujo sin
  depender de identificarlos a ojo. 13 posturas quedaron verificadas así.

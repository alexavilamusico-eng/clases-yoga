# App para las clases de yoga de Andrea

## Qué es
App local (se abre con doble clic en `index.html`, funciona sin internet) para preparar clases de yoga.
Dos mitades previstas:
1. **Glosario de posturas** tipo flash cards — *implementado (Fase A)*.
2. **Constructor de clases** desde una semilla (tema / parte del cuerpo / dinámica) + **banco de clases** (el "cuaderno" digital de Andrea) — *pendiente*.

Referencia de producto: Tummee.

## Stack
- HTML + CSS + JS sin framework, sin build. Nada de `fetch` de archivos locales: los datos se cargan como
  `data/poses.js` (`window.POSES`) y `data/meta.js` (`window.META`) vía `<script src>`.
- Fuentes: Fraunces (títulos) + Nunito Sans (texto). Paleta morada, tarjetas redondeadas, volteo lento.
  Soporta modo claro/oscuro por tokens CSS y `prefers-reduced-motion`.

## Datos del glosario
- Se generan: `node _pipeline/build.mjs` → valida y escribe `data/poses.js` + `data/meta.js`.
- Contenido curado a mano en `_pipeline/curado.mjs` (español, etiquetas, correcciones, posturas añadidas).
- Base en inglés desde `_pipeline/yoga-api.db` (copia de la BD sqlite de yoga-api).
- Vocabularios controlados de `tipo` / `zona` / `dinámica` / `tema` definidos en `build.mjs`; el build falla si
  una etiqueta se sale del vocabulario, si hay slug repetido o si falta un campo obligatorio.
- Imágenes: `node _pipeline/fetch-img.mjs` descarga las ilustraciones Nina Mel (CC BY 3.0) a `img/poses/<slug>.jpg`.
  Idempotente. Wikimedia responde 429 desde algunos entornos → usa el proxy images.weserv.nl y reintentos.

## Al modificar datos
- Editar SIEMPRE `_pipeline/curado.mjs`, nunca `data/poses.js` (está generado).
- Tras editar: correr `build.mjs` (valida) y `_pipeline/verify.mjs` (chequea imágenes en disco, duplicados, campos).
- Si una postura nueva trae imagen, añadir el nombre de archivo Commons en `curado.mjs` y correr `fetch-img.mjs`.

## Publicación
- El usuario hace commit y push directamente. Antes de dar algo por terminado: build + verify sin errores y,
  si el cambio es visible, probarlo en el navegador.

## Estado / pendientes
- Fase A: glosario con 198 posturas. 41 con dibujo por defecto (SVG Repo); el resto placeholder.
  Selector "Cambiar dibujo" en cada tarjeta (64 dibujos disponibles, elección en localStorage).
  Nombres verificados contra Wikipedia (`node _pipeline/verify-names.mjs`): 0 inventados.
- Fase B: constructor de clases + banco (`assets/clases.js`). Pestañas Glosario / Clases.
  - Clase = { nombre, estilo, objetivo(min), semilla{tipo,valor}, bloques[{titulo,items[]}], notas, fechas[] }.
  - item postura = { slug, lado, dur, durUnit(resp|min), nota };  item texto = { texto, min }.
  - Todo en `localStorage['glosario.clases']`. Respaldo = export/import JSON.
  - "Sugerir" por bloque: puntúa POSES por la semilla + rol del bloque. "Ver plan" abre ventana imprimible.
- Pendiente Fase B: reordenar por arrastre (hoy con flechas ↑↓), slideshow con timer, PDF nativo,
  más precisión en el mapa de dibujos, revisar las ~120 fichas breves.

// Empaqueta el glosario en un solo HTML autónomo (CSS + JS + datos + imágenes en base64).
// Sirve para publicarlo como página o para pasarlo por correo/USB.
// Uso:  node _pipeline/bundle.mjs   ->  dist/glosario.html
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const svgDataUri = (abs) => "data:image/svg+xml;base64," + readFileSync(abs).toString("base64");
const jpgDataUri = (abs) => "data:image/jpeg;base64," + readFileSync(abs).toString("base64");

let posesJs = read("data/poses.js");

// "img/poses/slug.svg" -> data URI (dibujo por defecto de cada postura)
posesJs = posesJs.replace(/"img\/poses\/([a-z0-9-]+)\.svg"/g, (m, slug) => {
  const p = join(ROOT, "img", "poses", slug + ".svg");
  return existsSync(p) ? `"${svgDataUri(p)}"` : "null";
});
// "img/mazo/slug.jpg" -> data URI (ilustración del mazo)
posesJs = posesJs.replace(/"img\/mazo\/([a-z0-9-]+)\.jpg"/g, (m, slug) => {
  const p = join(ROOT, "img", "mazo", slug + ".jpg");
  return existsSync(p) ? `"${jpgDataUri(p)}"` : "null";
});

// window.SVGREPO_IMG = { 0: "data:...", ... }  (para el selector de dibujo)
const setDir = join(ROOT, "img", "svgrepo");
const svgMap = {};
for (const f of readdirSync(setDir)) {
  const m = f.match(/^(\d+)\.svg$/);
  if (m) svgMap[+m[1]] = svgDataUri(join(setDir, f));
}
const svgMapJs = "window.SVGREPO_IMG = " + JSON.stringify(svgMap) + ";";

const css = read("assets/styles.css");
const metaJs = read("data/meta.js");
const appJs = read("assets/app.js");
const clasesJs = read("assets/clases.js");

// tomar solo el <body>...</body> del index.html y el <dialog>
const html = read("index.html");
const bodyInner = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"))
  .replace(/<script src="[^"]+"><\/script>/g, "")
  .trim();

const out = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glosario de posturas · Yoga con Andrea</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,400&family=Nunito+Sans:wght@400;600;700&display=swap">
<style>
${css}
</style>

${bodyInner}

<script>
${metaJs}
</script>
<script>
${svgMapJs}
</script>
<script>
${posesJs}
</script>
<script>
${appJs}
</script>
<script>
${clasesJs}
</script>
`;

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/glosario.html"), out);
console.log(`dist/glosario.html  ·  ${(out.length / 1024 / 1024).toFixed(2)} MB`);

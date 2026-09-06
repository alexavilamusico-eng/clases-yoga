// Empaqueta el glosario en un solo HTML autónomo (CSS + JS + datos + imágenes en base64).
// Sirve para publicarlo como página o para pasarlo por correo/USB.
// Uso:  node _pipeline/bundle.mjs   ->  dist/glosario.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let posesJs = read("data/poses.js");

// convertir "img/poses/slug.jpg" -> data URI base64
posesJs = posesJs.replace(/"img\/poses\/([a-z0-9-]+)\.jpg"/g, (m, slug) => {
  const p = join(ROOT, "img", "poses", slug + ".jpg");
  if (!existsSync(p)) return "null";
  const b64 = readFileSync(p).toString("base64");
  return `"data:image/jpeg;base64,${b64}"`;
});

const css = read("assets/styles.css");
const metaJs = read("data/meta.js");
const appJs = read("assets/app.js");

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
${posesJs}
</script>
<script>
${appJs}
</script>
`;

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/glosario.html"), out);
console.log(`dist/glosario.html  ·  ${(out.length / 1024 / 1024).toFixed(2)} MB`);

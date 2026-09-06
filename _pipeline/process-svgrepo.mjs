// Procesa los SVG crudos de _pipeline/svgrepo-raw/:
//  - les quita el círculo crema de fondo
//  - guarda LOS 64 en img/svgrepo/<n>.svg  (para el selector de dibujo dentro de la app)
//  - además copia el dibujo por defecto de cada postura a partir de svgrepo-map.mjs
// Uso:  node _pipeline/process-svgrepo.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SVGREPO } from "./svgrepo-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW = join(__dirname, "svgrepo-raw");
const SET = join(ROOT, "img", "svgrepo");
const POSES = join(ROOT, "img", "poses");
mkdirSync(SET, { recursive: true });
mkdirSync(POSES, { recursive: true });

const rawFile = (i) => (i === 0 ? "yoga-svgrepo-com.svg" : `yoga-svgrepo-com (${i}).svg`);
const strip = (svg) => svg
  .replace(/<\?xml[^>]*\?>\s*/i, "")
  .replace(/<!--[\s\S]*?-->\s*/g, "")
  .replace(/<path[^>]*fill:\s*#FFEFD6[^>]*\/>\s*/i, "")
  .replace(/\s{2,}/g, " ")
  .trim();

// limpia salidas viejas
for (const d of [SET, POSES]) for (const f of readdirSync(d)) if (/\.(svg|jpg)$/.test(f)) rmSync(join(d, f));

const available = new Set(readdirSync(RAW));
let n = 0, maxIdx = -1;
for (let i = 0; i <= 63; i++) {
  const fn = rawFile(i);
  if (!available.has(fn)) continue;
  writeFileSync(join(SET, i + ".svg"), strip(readFileSync(join(RAW, fn), "utf8")));
  n++; maxIdx = Math.max(maxIdx, i);
}

let defaults = 0;
for (const [slug, idx] of Object.entries(SVGREPO)) {
  const src = join(SET, idx + ".svg");
  if (!existsSync(src)) { console.log(`  aviso: ${slug} -> índice ${idx} no existe`); continue; }
  writeFileSync(join(POSES, slug + ".svg"), readFileSync(src));
  defaults++;
}

writeFileSync(join(__dirname, "svgrepo-count.json"), JSON.stringify({ count: maxIdx + 1 }));
console.log(`${n} SVG -> img/svgrepo/ (0..${maxIdx})  ·  ${defaults} dibujos por defecto -> img/poses/`);

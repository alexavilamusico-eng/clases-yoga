// Empareja los 64 SVG de SVG Repo con los dibujos ETIQUETADOS de yoga-api.
// Son el mismo set de arte (mismo path de círculo), así que se comparan los
// datos de path: emparejamiento exacto, sin adivinar a ojo.
// Uso:  node _pipeline/match-svgs.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { get } from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
const CACHE = join(__dirname, "yoga-api-svg");
mkdirSync(CACHE, { recursive: true });

const fetchText = (u) => new Promise((res) => {
  get(u, { headers: { "User-Agent": "yoga-match/1.0" } }, (r) => {
    if ([301, 302, 307, 308].includes(r.statusCode)) { r.resume(); return res(fetchText(r.headers.location)); }
    let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(d));
  }).on("error", () => res(""));
});

// huella: todos los path d= normalizados y ordenados (ignora el círculo de fondo)
function huella(svg) {
  const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter((d) => !d.startsWith("M0,248.1"));
  return ds.sort().join("|");
}
// huella tolerante: redondea las coordenadas a enteros (absorbe diferencias de exportación)
function huellaCorta(svg) {
  const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])
    .filter((d) => !d.replace(/\s/g, "").startsWith("M0,248.1"))
    .map((d) => d.replace(/-?\d+(\.\d+)?/g, (n) => String(Math.round(+n))).replace(/[\s,]/g, ""));
  return ds.sort().join("|");
}
// huella estructural: colores de relleno + tamaño de cada path (último recurso)
function huellaEstr(svg) {
  const fills = [...svg.matchAll(/fill:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => m[1].toUpperCase());
  const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s/g, ""))
    .filter((d) => !d.startsWith("M0,248.1")).map((d) => d.length);
  return fills.sort().join(",") + "//" + ds.sort((a, b) => a - b).join(",");
}

const SQL = await initSqlJs();
const db = new SQL.Database(readFileSync(join(__dirname, "yoga-api.db")));
const rows = db.exec("SELECT id, english_name, sanskrit_name_adapted, url_svg FROM poses ORDER BY id")[0].values;

console.log(`Descargando ${rows.length} dibujos etiquetados de yoga-api…`);
const ref = [];
for (const [id, en, san, url] of rows) {
  const f = join(CACHE, id + ".svg");
  let svg;
  if (existsSync(f)) svg = readFileSync(f, "utf8");
  else { svg = await fetchText(url); if (svg && svg.includes("<svg")) writeFileSync(f, svg); await new Promise((r) => setTimeout(r, 120)); }
  if (svg && svg.includes("<svg")) ref.push({ id, en, san, h: huella(svg), hc: huellaCorta(svg), he: huellaEstr(svg) });
}
console.log(`  ${ref.length} descargados\n`);

const SET = join(ROOT, "img", "svgrepo");
const mios = readdirSync(SET).filter((f) => /^\d+\.svg$/.test(f))
  .map((f) => ({ n: +f.replace(".svg", ""), svg: readFileSync(join(SET, f), "utf8") }))
  .map((x) => ({ n: x.n, h: huella(x.svg), hc: huellaCorta(x.svg), he: huellaEstr(x.svg) }))
  .sort((a, b) => a.n - b.n);

const exactos = [], parciales = [], sin = [];
const usados = new Set();
mios.forEach((m) => {
  let r = ref.find((x) => x.h === m.h);
  if (r) { exactos.push({ n: m.n, r }); usados.add(r.id); return; }
  r = ref.find((x) => x.hc === m.hc);
  if (r) { parciales.push({ n: m.n, r, via: "coords" }); usados.add(r.id); return; }
  r = ref.find((x) => x.he === m.he);
  if (r) { parciales.push({ n: m.n, r, via: "estructura" }); usados.add(r.id); return; }
  sin.push(m.n);
});

let out = "";
out += `EMPAREJAMIENTO EXACTO (${exactos.length}):\n`;
exactos.forEach((e) => { out += `  #${String(e.n).padStart(2)} = ${e.r.san}  (${e.r.en})\n`; });
out += `\nEMPAREJAMIENTO PARCIAL (${parciales.length}):\n`;
parciales.forEach((e) => { out += `  #${String(e.n).padStart(2)} ~ ${e.r.san}  (${e.r.en})\n`; });
out += `\nSIN EMPAREJAR (${sin.length}): ${sin.join(", ")}\n`;
out += `\nDibujos de yoga-api no encontrados en el set: ${ref.filter((r) => !usados.has(r.id)).map((r) => r.en).join(", ")}\n`;
writeFileSync(join(__dirname, "match-svgs.txt"), out);
console.log(out);

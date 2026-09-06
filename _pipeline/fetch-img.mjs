// Descarga las ilustraciones Nina-Mel de Wikimedia Commons a img/poses/<slug>.jpg
// Licencia: CC BY 3.0 — dibujos: Nina Mel (Yoga Teacher); subidas por el usuario Kennguru.
// La atribución vive en CREDITOS.md y en la pantalla de créditos de la app.
//
// Las imágenes se piden vía images.weserv.nl (proxy que redimensiona) porque el
// host upload.wikimedia.org devuelve 429 desde este entorno. Idempotente: re-ejecútalo
// para completar las que falten.
//
// Uso:  node _pipeline/fetch-img.mjs
import { get } from "node:https";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { curado } from "./curado.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "img", "poses");
mkdirSync(OUT, { recursive: true });

const UA = "YogaApp-Andrea/1.0 (proyecto personal; construccion de glosario)";
const WIDTH = 520;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchBuf(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "User-Agent": UA, Accept: "image/*,application/json" } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        if (redirects > 5) return reject(new Error("demasiados redirects"));
        res.resume();
        return resolve(fetchBuf(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(Object.assign(new Error("HTTP " + res.statusCode), { code: res.statusCode })); }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { return await fn(); }
    catch (e) {
      if ((e.code === 429 || e.code === 503) && attempt < 5) {
        const w = 1500 * attempt;
        console.log(`    ${e.code} en ${label}, reintento en ${w}ms`);
        await sleep(w); continue;
      }
      throw e;
    }
  }
}

// URL original de la imagen en upload.wikimedia.org (la API de Commons no está throttleada)
async function originalUrl(filename) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent("File:" + filename)}`;
  const data = JSON.parse((await fetchBuf(api)).toString());
  const pages = data.query.pages;
  const page = pages[Object.keys(pages)[0]];
  return page.imageinfo[0].url; // https://upload.wikimedia.org/...
}

const targets = curado.filter((c) => c.img);
console.log(`Descargando ${targets.length} ilustraciones (faltan las que no existan)...`);
let ok = 0, fail = 0;
const fallidas = [];

for (const c of targets) {
  const dest = join(OUT, c.slug + ".jpg");
  if (existsSync(dest)) { ok++; continue; }
  try {
    const orig = await withRetry(() => originalUrl(c.img), c.slug + " (api)");
    const noProto = orig.replace(/^https?:\/\//, "");
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(noProto)}&w=${WIDTH}&output=jpg`;
    await sleep(300);
    const buf = await withRetry(() => fetchBuf(proxied), c.slug + " (img)");
    if (buf.length < 1200) throw new Error("respuesta demasiado pequeña (" + buf.length + " b)");
    writeFileSync(dest, buf);
    ok++;
    console.log(`  ✓ ${c.slug}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    fail++; fallidas.push(c.slug);
    console.log(`  ✗ ${c.slug}  ${e.message}`);
  }
  await sleep(700);
}
console.log(`\nListo: ${ok} ok, ${fail} fallidas.`);
if (fallidas.length) console.log("Reintenta luego para: " + fallidas.join(", "));

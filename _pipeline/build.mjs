// Une la capa curada (curado.mjs) con los datos en inglés de yoga-api (yoga-api.db)
// y genera data/poses.js  ->  window.POSES = [...]
//
// Uso:  node _pipeline/build.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { curado, beneficiosES } from "./curado.mjs";
import { SVGREPO } from "./svgrepo-map.mjs";
import { MAZO } from "./mazo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");

const VOCAB = {
  tipo: ["de pie", "sentada", "arrodillada", "supina", "prona", "invertida", "equilibrio", "equilibrio de brazos", "restaurativa"],
  zona: ["caderas", "isquiotibiales", "cuádriceps", "ingles", "psoas", "columna", "zona lumbar", "hombros", "pecho", "cuello", "core", "muñecas", "tobillos y pies", "glúteos"],
  dinamica: ["extensión de columna", "flexión hacia adelante", "flexión lateral", "torsión", "apertura de cadera", "equilibrio", "inversión", "fuerza", "quietud"],
  tema: ["enraizar", "soltar", "expansión", "calma", "energía", "confianza", "foco", "corazón", "transición"],
};

const SQL = await initSqlJs();
const db = new SQL.Database(readFileSync(join(__dirname, "yoga-api.db")));

function apiRow(id) {
  const r = db.exec(`SELECT english_name, pose_description, pose_benefits FROM poses WHERE id=${id}`);
  if (!r.length) return null;
  const [en, desc, ben] = r[0].values[0];
  return { en, desc: desc.replace(/\s+/g, " ").trim(), ben: ben.replace(/\s+/g, " ").trim() };
}

// beneficios en inglés -> lista
const splitBen = (s) => s ? s.split(/\.\s+/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean) : [];

const errors = [];
const seen = new Set();

const poses = curado.map((c, i) => {
  if (seen.has(c.slug)) errors.push(`slug duplicado: ${c.slug}`);
  seen.add(c.slug);

  for (const key of ["tipo", "zona", "dinamica", "tema"]) {
    for (const v of c[key] || []) {
      if (!VOCAB[key].includes(v)) errors.push(`${c.slug}: valor no permitido en ${key}: "${v}"`);
    }
  }
  for (const req of ["es", "en", "san", "nivel"]) {
    if (!c[req]) errors.push(`${c.slug}: falta campo "${req}"`);
  }
  if (!["principiante", "intermedio", "avanzado"].includes(c.nivel)) errors.push(`${c.slug}: nivel inválido "${c.nivel}"`);
  if (!Array.isArray(c.entrada) || c.entrada.length < 2) errors.push(`${c.slug}: "entrada" necesita al menos 2 indicaciones`);

  const api = c.apiId ? apiRow(c.apiId) : null;
  const m = MAZO[c.slug] || null;                 // ficha reconstruida del mazo, si existe
  if (m && !existsSync(join(ROOT, "img/mazo", c.slug + ".jpg"))) {
    errors.push(`${c.slug}: en mazo.mjs pero falta img/mazo/${c.slug}.jpg`);
  }
  const beneficios = m?.beneficios || c.beneficios || beneficiosES[c.slug] || splitBen(api?.ben) || [];
  if (!beneficios.length) errors.push(`${c.slug}: sin beneficios`);
  // aviso si quedaron beneficios en inglés (heurística)
  if (!m && !c.beneficios && !beneficiosES[c.slug] && api?.ben) errors.push(`${c.slug}: beneficios sin traducir (falta en beneficiosES)`);
  const cleanEn = (s) => (s || "").replace(/\b[\w-]+\.html\b/g, "").replace(/\s{2,}/g, " ").trim();

  return {
    id: i + 1,
    slug: c.slug,
    nombre: c.es,
    nombre_en: c.en,
    sanscrito: c.san,
    traduccion: c.trad || "",
    nivel: c.nivel,
    tipo: c.tipo || [],
    zona: c.zona || [],
    dinamica: c.dinamica || [],
    tema: c.tema || [],
    entrada: m?.entrada || c.entrada,
    entrada_en: m?.entrada_en || cleanEn(api?.desc),
    beneficios,
    beneficios_en: m?.beneficios_en || splitBen(api?.ben),
    precaucion: m?.precaucion || c.precaucion || [],
    liberar: m?.liberar || "",
    liberar_en: m?.liberar_en || "",
    respiracion: m?.respiracion || "",
    respiracion_en: m?.respiracion_en || "",
    img: m ? `img/mazo/${c.slug}.jpg` : ((c.slug in SVGREPO) ? `img/poses/${c.slug}.svg` : null),
    fuente: m ? "mazo" : c.fuente,
  };
});

if (errors.length) {
  console.error("ERRORES DE VALIDACIÓN:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

// meta: vocabularios presentes + conteos
const count = (key) => {
  const m = {};
  poses.forEach((p) => {
    const val = p[key];
    (Array.isArray(val) ? val : [val]).forEach((v) => (m[v] = (m[v] || 0) + 1));
  });
  return m;
};
let svgCount = 0;
try { svgCount = JSON.parse(readFileSync(join(__dirname, "svgrepo-count.json"), "utf8")).count; } catch (e) {}

const meta = {
  total: poses.length,
  con_imagen: poses.filter((p) => p.img).length,
  svgCount,
  vocab: VOCAB,
  conteos: { tipo: count("tipo"), zona: count("zona"), dinamica: count("dinamica"), tema: count("tema"), nivel: count("nivel") },
  fuentes: count("fuente"),
};

const banner = `// GENERADO por _pipeline/build.mjs — no editar a mano. ${new Date().toISOString().slice(0, 10)}\n`;
writeFileSync(join(ROOT, "data/poses.js"), banner + "window.POSES = " + JSON.stringify(poses, null, 1) + ";\n");
writeFileSync(join(ROOT, "data/meta.js"), banner + "window.META = " + JSON.stringify(meta, null, 1) + ";\n");

console.log(`OK  ${poses.length} posturas  ·  ${meta.con_imagen} con ilustración  ·  ${poses.length - meta.con_imagen} con placeholder`);
console.log("nivel:", meta.conteos.nivel);
console.log("tipo :", meta.conteos.tipo);

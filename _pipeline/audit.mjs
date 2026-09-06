// Auditoría de coherencia del glosario: busca contradicciones entre lo que dice la
// ficha (cues) y sus etiquetas, duplicados, niveles raros y campos flojos.
// Uso:  node _pipeline/audit.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(ROOT, "data/poses.js"), "utf8").replace(/^\/\/.*$/m, "").trim();
const poses = JSON.parse(raw.slice(raw.indexOf("=") + 1).replace(/;\s*$/, ""));

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// las cues suelen empezar describiendo DE DÓNDE se entra ("Desde perro boca abajo, …").
// eso no dice nada de la posición de ESTA postura: se recorta antes de analizar.
const sinEntrada = (s) => norm(s)
  .replace(/^desde[^,.;]*[,.;]\s*/i, "")
  .replace(/\bdesde (la |el |una |un )?[a-zñáéíóú\- ]{3,40}?(,|\.|;)/gi, " ")
  .replace(/\bcomo en (la |el )?[a-zñáéíóú\- ]{3,30}?(,|\.|;)/gi, " ");
const cues = (p) => p.entrada.map(sinEntrada).join(" · ");

const issues = [];
const add = (sev, slug, msg) => issues.push({ sev, slug, msg });

// --- 1. postura vs. tipo declarado -------------------------------------------
// pistas de posición en las cues -> tipo esperado
const PISTAS = [
  { re: /\bboca arriba\b|\btumbada de espaldas\b|\bde espaldas\b/, tipo: ["supina", "invertida", "restaurativa"], nom: "boca arriba" },
  { re: /\bboca abajo\b/, tipo: ["prona", "equilibrio de brazos", "restaurativa", "arrodillada"], nom: "boca abajo" },
  { re: /\bde rodillas\b|\ben cuadrupedia\b|\bsobre los talones\b/, tipo: ["arrodillada", "invertida", "equilibrio de brazos", "restaurativa", "prona"], nom: "de rodillas / cuadrupedia" },
  { re: /\bsentada\b/, tipo: ["sentada", "restaurativa", "equilibrio de brazos", "equilibrio", "invertida", "arrodillada"], nom: "sentada" },
  { re: /\bde pie\b|\bpies separados\b|\bzancada\b/, tipo: ["de pie", "equilibrio", "arrodillada", "invertida"], nom: "de pie" },
];
poses.forEach((p) => {
  const c = cues(p);
  PISTAS.forEach((h) => {
    if (h.re.test(c) && !h.tipo.some((t) => p.tipo.includes(t))) {
      add("alta", p.slug, `las cues dicen «${h.nom}» pero tipo = [${p.tipo.join(", ")}]`);
    }
  });
});

// --- 2. dinámica vs tipo ------------------------------------------------------
poses.forEach((p) => {
  if (p.dinamica.includes("inversión") && !p.tipo.includes("invertida"))
    add("media", p.slug, `dinámica «inversión» pero tipo sin «invertida» [${p.tipo.join(", ")}]`);
  if (p.tipo.includes("invertida") && !p.dinamica.includes("inversión"))
    add("baja", p.slug, `tipo «invertida» pero dinámica sin «inversión» [${p.dinamica.join(", ")}]`);
  if (p.tipo.includes("restaurativa") && !p.dinamica.includes("quietud") && !p.dinamica.includes("flexión hacia adelante") && !p.dinamica.includes("apertura de cadera") && !p.dinamica.includes("extensión de columna") && !p.dinamica.includes("inversión") && !p.dinamica.includes("torsión"))
    add("baja", p.slug, `restaurativa con dinámica poco típica [${p.dinamica.join(", ")}]`);
});

// --- 3. nivel vs pistas de dificultad ----------------------------------------
const DURO = /(requiere|solo con|no intentar|calentamiento largo|riesgo alto|muy avanzad|supervisi[oó]n|preparaci[oó]n avanzada|no para principiantes)/;
poses.forEach((p) => {
  const txt = cues(p) + " " + norm((p.precaucion || []).join(" "));
  if (DURO.test(txt) && p.nivel !== "avanzado")
    add("media", p.slug, `el texto advierte dificultad alta pero nivel = ${p.nivel}`);
});

// --- 4. duplicados ------------------------------------------------------------
const porNombre = {}, porSan = {};
const skel = (s) => norm(s).replace(/sh/g, "s").replace(/[^a-z]/g, "").replace(/[aeiou]/g, "");
poses.forEach((p) => {
  const n = norm(p.nombre);
  (porNombre[n] = porNombre[n] || []).push(p.slug);
  const s = skel(p.sanscrito);
  (porSan[s] = porSan[s] || []).push(p.slug);
});
Object.entries(porNombre).forEach(([k, v]) => { if (v.length > 1) add("alta", v.join(" / "), `mismo nombre en español: «${k}»`); });
Object.entries(porSan).forEach(([k, v]) => { if (v.length > 1) add("media", v.join(" / "), `mismo sánscrito (esqueleto): ${v.length} posturas`); });

// --- 5. campos flojos ---------------------------------------------------------
poses.forEach((p) => {
  if (!p.traduccion) add("baja", p.slug, "sin traducción del sánscrito");
  if (!p.precaucion || !p.precaucion.length) add("baja", p.slug, "sin precaución");
  if (p.entrada.some((e) => e.length < 25)) add("baja", p.slug, "alguna indicación de «cómo entrar» es muy corta");
  if (!p.tema.length) add("baja", p.slug, "sin tema");
});

// --- 6. lado: posturas asimétricas sin marca ---------------------------------
const ASIM = /(un pie|una pierna|una rodilla|del otro lado|repite|una mano|un brazo|el otro lado)/;
poses.forEach((p) => {
  if (ASIM.test(cues(p)) && !/eka|ardha|parivrtta|janu|marichy|utthita hasta|vasisth|gomukh/i.test(p.sanscrito) && !/lado|pierna|brazo/i.test(p.nombre)) {
    // solo informativo
  }
});

// --- salida -------------------------------------------------------------------
const orden = { alta: 0, media: 1, baja: 2 };
issues.sort((a, b) => orden[a.sev] - orden[b.sev] || a.slug.localeCompare(b.slug));
const porSev = { alta: 0, media: 0, baja: 0 };
issues.forEach((i) => porSev[i.sev]++);

let out = `Auditoría del glosario — ${poses.length} posturas\n`;
out += `alta: ${porSev.alta}   media: ${porSev.media}   baja: ${porSev.baja}\n\n`;
issues.forEach((i) => { out += `[${i.sev}] ${i.slug}\n        ${i.msg}\n`; });
writeFileSync(join(ROOT, "_pipeline/audit.txt"), out);
console.log(out.split("\n").slice(0, 3).join("\n"));
console.log("\n--- ALTAS ---");
issues.filter((i) => i.sev === "alta").forEach((i) => console.log(`${i.slug}\n   ${i.msg}`));
console.log("\n--- MEDIAS ---");
issues.filter((i) => i.sev === "media").forEach((i) => console.log(`${i.slug}\n   ${i.msg}`));
console.log(`\n(bajas: ${porSev.baja} — ver _pipeline/audit.txt)`);

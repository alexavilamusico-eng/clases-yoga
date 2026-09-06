// Verificación post-build. Uso: node _pipeline/verify.mjs   (correr después de build.mjs)
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(ROOT, "data/poses.js"), "utf8").replace(/^\/\/.*$/m, "").trim();
const src = raw.slice(raw.indexOf("=") + 1).replace(/;\s*$/, "");
const poses = JSON.parse(src);

const problems = [];
const ids = new Set(), slugs = new Set();

for (const p of poses) {
  if (ids.has(p.id)) problems.push(`id duplicado: ${p.id}`); ids.add(p.id);
  if (slugs.has(p.slug)) problems.push(`slug duplicado: ${p.slug}`); slugs.add(p.slug);

  for (const f of ["nombre", "nombre_en", "sanscrito", "nivel"]) {
    if (!p[f] || !String(p[f]).trim()) problems.push(`${p.slug}: campo vacío "${f}"`);
  }
  if (!Array.isArray(p.entrada) || p.entrada.length < 2) problems.push(`${p.slug}: entrada < 2`);
  if (!Array.isArray(p.beneficios) || p.beneficios.length < 1) problems.push(`${p.slug}: sin beneficios`);
  if (!["principiante", "intermedio", "avanzado"].includes(p.nivel)) problems.push(`${p.slug}: nivel raro "${p.nivel}"`);
  if (!p.tipo.length) problems.push(`${p.slug}: sin tipo`);
  if (!p.zona.length) problems.push(`${p.slug}: sin zona`);
  if (!p.dinamica.length) problems.push(`${p.slug}: sin dinámica`);

  if (p.img) {
    const abs = join(ROOT, p.img);
    if (!existsSync(abs)) problems.push(`${p.slug}: imagen declarada pero no existe en disco (${p.img})`);
    else if (statSync(abs).size < 1200) problems.push(`${p.slug}: imagen sospechosamente pequeña (${statSync(abs).size} b)`);
  }
}

// campos de texto sin traducir obvios (heurística ligera)
const sinAcentos = poses.filter((p) => /\b(the|with|from|pose)\b/i.test(p.entrada.join(" ")));
if (sinAcentos.length) problems.push(`posible texto en inglés en 'entrada': ${sinAcentos.map((p) => p.slug).join(", ")}`);

const conImg = poses.filter((p) => p.img).length;
console.log(`Posturas: ${poses.length}  ·  con imagen: ${conImg}  ·  placeholder: ${poses.length - conImg}`);
console.log(`Fuentes: ` + JSON.stringify(poses.reduce((m, p) => ((m[p.fuente] = (m[p.fuente] || 0) + 1), m), {})));

if (problems.length) {
  console.error("\nPROBLEMAS:\n" + problems.map((x) => "  - " + x).join("\n"));
  process.exit(1);
}
console.log("\n✓ verificación OK");

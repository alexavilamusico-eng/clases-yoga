// Corrobora que los nombres en sánscrito de las 198 posturas correspondan a asanas reales,
// comparándolos con la lista de asanas de Wikipedia (fuente de verdad externa).
// Usa "esqueleto de consonantes" para tolerar transliteraciones (sh/s, vriksha/vrksa, etc.).
// Uso:  node _pipeline/verify-names.mjs   (necesita internet)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { get } from "node:https";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fetchText(u) {
  return new Promise((res, rej) => {
    get(u, { headers: { "User-Agent": "yoga-app-verify/1.0" } }, (r) => {
      let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(d));
    }).on("error", rej);
  });
}

// esqueleto: minúsculas, sin acentos, sh->s ch->c, quita no-letras y vocales
function skel(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/sh/g, "s").replace(/ch/g, "c").replace(/ph/g, "p").replace(/th/g, "t")
    .replace(/[^a-z]/g, "")
    .replace(/[aeiou]/g, "");
}
// última palabra que termina en asana (o la última)
function coreWord(san) {
  const w = (san || "").split(/\s+/).filter(Boolean);
  const a = w.filter((x) => /asana$/i.test(x));
  return (a[a.length - 1] || w[w.length - 1] || "");
}

const wikitext = JSON.parse(await fetchText(
  "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_asanas&prop=wikitext&format=json&formatversion=2"
)).parse.wikitext;
const wikiNames = [...new Set(
  [...wikitext.matchAll(/\[\[([^\]|#]*asana[^\]|#]*)(?:\|[^\]]*)?\]\]/gi)].map((m) => m[1].trim())
)];
const wikiSkel = new Set();
wikiNames.forEach((n) => n.split(/\s+/).forEach((w) => { if (/asana$/i.test(w)) wikiSkel.add(skel(w)); }));
// añade también algunos nombres alternativos comunes que Wikipedia no lista como [[link]]
["balasana","marjaryasana","bitilasana","phalakasana","savasana","sukhasana","tadasana","utkatasana",
 "vrksasana","vajrasana","dandasana","malasana","garudasana","natarajasana","halasana","matsyasana",
 "salabhasana","bhujangasana","dhanurasana","ustrasana","navasana","kurmasana","mayurasana","bakasana",
 "simhasana","padmasana","gomukhasana","hanumanasana","parighasana","anantasana","makarasana","skandasana",
 "chaturanga dandasana","urdhva hastasana","hasta uttanasana","adho mukha svanasana","urdhva mukha svanasana"
].forEach((n) => n.split(/\s+/).forEach((w) => wikiSkel.add(skel(w))));

const raw = readFileSync(join(ROOT, "data/poses.js"), "utf8").replace(/^\/\/.*$/m, "").trim();
const poses = JSON.parse(raw.slice(raw.indexOf("=") + 1).replace(/;\s*$/, ""));

const found = [], missing = [];
for (const p of poses) {
  const core = coreWord(p.sanscrito);
  const sk = skel(core);
  const ok = sk && (wikiSkel.has(sk) || [...wikiSkel].some((w) => w.length > 3 && (w.includes(sk) || sk.includes(w))));
  (ok ? found : missing).push(`${p.slug}  ·  ${p.sanscrito}  (${p.nombre_en})`);
}

console.log(`Verificación de nombres contra Wikipedia (List of asanas, ${wikiNames.length} asanas)`);
console.log(`\n✓ Reconocidas: ${found.length} / ${poses.length}`);
console.log(`\n⚠ No reconocidas (revisar nombre en sánscrito, puede ser variante válida o error): ${missing.length}`);
missing.forEach((m) => console.log("   - " + m));
writeFileSync(join(ROOT, "_pipeline/verify-names.txt"),
  `Reconocidas ${found.length}/${poses.length}\n\nNO RECONOCIDAS:\n` + missing.join("\n") + "\n\nRECONOCIDAS:\n" + found.join("\n"));

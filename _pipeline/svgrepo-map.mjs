// Mapa: slug de postura -> índice del archivo de SVG Repo (colección "Yoga Poses", CC0).
// Índice 0 = "yoga-svgrepo-com.svg"; N = "yoga-svgrepo-com (N).svg".
//
// ⚠ Cómo se decidió cada uno:
//  [ok]  verificado contra los dibujos ETIQUETADOS de yoga-api — son el mismo set de arte y
//        se emparejaron comparando los datos de path (ver _pipeline/match-svgs.mjs).
//        Esto es certeza, no apreciación.
//  [ojo] identificado a ojo, silueta inconfundible. Puede fallar.
//
// Todo lo demás se dejó SIN dibujo a propósito: identificar a ojo estas figuras resultó
// poco fiable (varias asignaciones anteriores estaban mal). Andrea las asigna desde la
// app con "Cambiar dibujo", que es más rápido y más fiable que adivinar aquí.
export const SVGREPO = {
  // --- [ok] verificados contra yoga-api ---
  "balasana": 4,                    // Balasana
  "setu-bandha-sarvangasana": 6,    // Setu Bandha Sarvangasana
  "salamba-sarvangasana": 8,        // Salamba Sarvangasana
  "hanumanasana": 10,               // Hanumanasana
  "vasisthasana": 12,               // Vasisthasana
  "dhanurasana": 14,                // Dhanurasana
  "camatkarasana": 17,              // Camatkarasana
  "virabhadrasana-i": 18,           // Virabhadrasana I
  "alanasana": 25,                  // Alanasana (zancada alta / luna creciente)
  "phalakasana": 28,                // Phalakasana
  "adho-mukha-svanasana": 30,       // Adho Mukha Svanasana
  "adho-mukha-vrksasana": 32,       // Adho Mukha Vrksasana
  "upavistha-konasana": 34,         // Upavistha Konasana

  // --- [ojo] silueta inconfundible ---
  "vrksasana": 1,                   // de pie, pie al muslo interno, brazos abiertos
  "sukhasana": 3,                   // sentada con piernas cruzadas
  "marjaryasana": 5,                // cuadrupedia
  "natarajasana": 16,               // de pie sujetando el pie por detrás, arqueada
  "salabhasana": 19,                // boca abajo, pecho y piernas elevados
  "parivrtta-utkatasana": 22,       // cuclillas con torsión, manos al pecho
  "uttanasana": 31,                 // pinza de pie
  "prasarita-padottanasana": 53,    // piernas separadas, cabeza abajo
  "salamba-bhujangasana": 56,       // esfinge: boca abajo sobre antebrazos
  "malasana": 57,                   // sentadilla profunda
  "makarasana": 58,                 // boca abajo en reposo
};

// Digitalización del mazo de cartas de yoga de Andrea (uso personal — ver CREDITOS.md).
// Una entrada por carta, con la clave = slug de la postura en el glosario.
// build.mjs, si encuentra MAZO[slug]:
//   - reemplaza entrada / entrada_en / beneficios / beneficios_en / precaucion
//   - añade liberar / liberar_en ("para salir") y respiracion / respiracion_en
//   - usa img/mazo/<slug>.jpg como ilustración (falla el build si el archivo no existe)
//
// Texto reconstruido a mano del reverso de cada carta (en la foto se ve borroso);
// el texto EN de la ILUSTRACIÓN queda tal cual dentro de la imagen.

export const MAZO = {
  navasana: {
    num: 31,
    entrada:    ["Pecho abierto", "Brazos paralelos al piso", "Piernas juntas", "Hombros abajo y atrás"],
    entrada_en: ["Chest open", "Arms parallel to the floor", "Legs together", "Shoulders down and back"],
    beneficios:    ["Fortalece los abdominales", "Mejora el equilibrio", "Aumenta la confianza"],
    beneficios_en: ["Strengthens the abdominal muscles", "Improves balance", "Improves confidence"],
    liberar:    "Exhala y dobla las rodillas, bajando los pies al piso.",
    liberar_en: "Exhale and bend the knees, lowering the feet back to the floor.",
    precaucion: ["Lesión reciente o crónica en abdomen, rodillas, caderas, brazos u hombros."],
    respiracion:    "Aguanta de 2 a 6 respiraciones.",
    respiracion_en: "Breathe and hold for 2–6 breaths.",
  },
};

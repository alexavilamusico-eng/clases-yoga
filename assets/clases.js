/* Constructor de clases + banco de clases (el "cuaderno digital"). Español. Sin dependencias. */
(function () {
  "use strict";
  var POSES = window.POSES || [];
  var META = window.META || { vocab: {}, conteos: {} };
  var bySlug = {};
  POSES.forEach(function (p) { bySlug[p.slug] = p; });

  var LS = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem("glosario." + k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("glosario." + k, JSON.stringify(v)); } catch (e) {} }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function uid(pfx) { return (pfx || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowISO() { return new Date().toISOString(); }
  function fechaCorta(iso) { try { return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }

  var BLOQUES_DEF = ["Llegada · centramiento", "Calentamiento", "Desarrollo", "Enfriamiento", "Cierre · Savasana"];
  var ESTILOS = ["", "Hatha", "Vinyasa", "Hatha-Vinyasa", "Ashtanga", "Yin", "Restaurativo", "Suave / terapéutico"];
  var SEMILLA_TIPOS = { "": "—", tema: "Tema", zona: "Parte del cuerpo", dinamica: "Dinámica de movimiento" };

  /* ---------- almacenamiento ---------- */
  // normaliza una clase por si viene de un respaldo viejo o incompleto:
  // sin esto, una clase sin "semilla" o sin "bloques" rompía el banco entero.
  function normalizarClase(c) {
    if (!c || typeof c !== "object") return null;
    c.id = c.id || uid("c");
    c.nombre = typeof c.nombre === "string" ? c.nombre : "";
    c.estilo = typeof c.estilo === "string" ? c.estilo : "";
    c.objetivo = +c.objetivo || 60;
    if (!c.semilla || typeof c.semilla !== "object") c.semilla = { tipo: "", valor: "" };
    c.semilla.tipo = c.semilla.tipo || "";
    c.semilla.valor = c.semilla.valor || "";
    if (!Array.isArray(c.bloques)) c.bloques = [];
    c.bloques = c.bloques.filter(Boolean).map(function (b) {
      return { id: b.id || uid("b"), titulo: typeof b.titulo === "string" ? b.titulo : "Bloque",
        objetivo: +b.objetivo || 0,
        items: Array.isArray(b.items) ? b.items.filter(Boolean) : [] };
    });
    c.notas = typeof c.notas === "string" ? c.notas : "";
    c.fechas = Array.isArray(c.fechas) ? c.fechas : [];
    c.creada = c.creada || nowISO();
    c.modificada = c.modificada || c.creada;
    return c;
  }
  function loadClases() {
    var arr = LS.get("clases", []);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizarClase).filter(Boolean);
  }
  function saveClases(arr) { LS.set("clases", arr); }
  function claseNueva() {
    return {
      id: uid("c"), nombre: "", estilo: "", objetivo: 60,
      semilla: { tipo: "", valor: "" },
      bloques: BLOQUES_DEF.map(function (t) { return { id: uid("b"), titulo: t, objetivo: 0, items: [] }; }),
      notas: "", fechas: [], creada: nowISO(), modificada: nowISO()
    };
  }

  /* ---------- duración ---------- */
  function minItem(it) {
    if (it.tipo === "texto") return +it.min || 0;
    var d = +it.dur || 0;
    var mult = it.lado === "izq" || it.lado === "der" || it.lado === "" ? 1 : (it.lado === "ambos" ? 2 : 1);
    if (it.durUnit === "min") return d * mult;
    return (d * 5 / 60) * mult; // ~5 s por respiración
  }
  function minClase(c) {
    var t = 0;
    c.bloques.forEach(function (b) { b.items.forEach(function (it) { t += minItem(it); }); });
    return Math.round(t);
  }
  function nPosturas(c) {
    var n = 0;
    c.bloques.forEach(function (b) { b.items.forEach(function (it) { if (it.tipo === "postura") n++; }); });
    return n;
  }
  function txtPosturas(c) { var n = nPosturas(c); return n + (n === 1 ? " postura" : " posturas"); }

  /* ---------- sugerencias ---------- */
  function semillaMatch(p, sem) {
    if (!sem || !sem.tipo || !sem.valor) return false;
    if (sem.tipo === "tema") return p.tema.indexOf(sem.valor) > -1;
    if (sem.tipo === "zona") return p.zona.indexOf(sem.valor) > -1;
    if (sem.tipo === "dinamica") return p.dinamica.indexOf(sem.valor) > -1;
    return false;
  }
  function sugerir(c, bloqueIdx) {
    var sem = c.semilla, n = c.bloques.length;
    var pool = POSES.slice();
    var yaHay = {};
    c.bloques.forEach(function (b) { b.items.forEach(function (it) { if (it.slug) yaHay[it.slug] = 1; }); });
    pool = pool.filter(function (p) { return !yaHay[p.slug]; });
    var scored = pool.map(function (p) {
      var s = 0;
      if (semillaMatch(p, sem)) s += 5;
      if (bloqueIdx === 0) { if (p.tipo.indexOf("sentada") > -1 || p.tipo.indexOf("de pie") > -1) s += 1; if (p.nivel === "principiante") s += 1; if (p.dinamica.indexOf("quietud") > -1) s += 1; }
      else if (bloqueIdx === 1) { if (p.nivel === "principiante") s += 1; if (p.dinamica.indexOf("fuerza") > -1 || p.tipo.indexOf("de pie") > -1) s += 1; }
      else if (bloqueIdx === n - 1) { if (p.tipo.indexOf("restaurativa") > -1 || p.tipo.indexOf("supina") > -1) s += 2; if (p.dinamica.indexOf("quietud") > -1) s += 2; if (p.slug === "savasana") s += 3; }
      else if (bloqueIdx === n - 2) { if (p.dinamica.indexOf("flexión hacia adelante") > -1 || p.dinamica.indexOf("torsión") > -1) s += 1; if (p.tipo.indexOf("supina") > -1) s += 1; }
      else { if (semillaMatch(p, sem)) s += 3; if (p.nivel === "avanzado") s -= 1; }
      return { p: p, s: s + Math.random() * 0.5 };
    }).filter(function (x) { return x.s > 0.6; });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 6).map(function (x) { return x.p; });
  }

  /* ---------- plantillas de bloque ---------- */
  function loadPlantillas() { return LS.get("plantillas", []); }
  function savePlantillas(a) { LS.set("plantillas", a); }

  /* ---------- arrastrar y soltar ---------- */
  var dnd = null; // { type:'item', bi, ii }  |  { type:'block', bi }
  function moverItem(c, fromBi, fromIi, toBi, toIi) {
    var it = c.bloques[fromBi].items.splice(fromIi, 1)[0];
    if (fromBi === toBi && fromIi < toIi) toIi--;
    c.bloques[toBi].items.splice(Math.max(0, toIi), 0, it);
  }
  function hookDrag(node, handle, payload) {
    handle.addEventListener("mousedown", function () { node.draggable = true; });
    handle.addEventListener("touchstart", function () { node.draggable = true; }, { passive: true });
    node.addEventListener("dragend", function (e) {
      if (e.target !== node) return;
      node.draggable = false; node.classList.remove("dragging"); clearDropMarks(); dnd = null;
    });
    node.addEventListener("dragstart", function (e) {
      // el bloque también es arrastrable y contiene a los items: sin esto, el dragstart
      // de una postura burbujea hasta el bloque y se pierde qué se está arrastrando.
      if (e.target !== node) return;
      e.stopPropagation();
      dnd = payload; node.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", "x"); } catch (x) {}
      }
    });
  }
  function clearDropMarks() { document.querySelectorAll(".drop-before,.drop-into").forEach(function (n) { n.classList.remove("drop-before", "drop-into"); }); }
  function hookDropItem(c, row, bi, ii) {
    row.addEventListener("dragover", function (e) {
      if (!dnd || dnd.type !== "item") return;
      e.preventDefault(); clearDropMarks(); row.classList.add("drop-before");
    });
    row.addEventListener("drop", function (e) {
      if (!dnd || dnd.type !== "item") return;
      e.preventDefault(); e.stopPropagation();
      moverItem(c, dnd.bi, dnd.ii, bi, ii); dnd = null; renderBuilder();
    });
  }
  function hookDropBlock(c, box, bi) {
    box.addEventListener("dragover", function (e) {
      if (!dnd) return;
      e.preventDefault();
      // si el cursor está sobre una fila, esa fila ya marcó dónde caería: no la pisemos
      if (dnd.type === "item" && !(e.target.closest && e.target.closest(".b-item"))) {
        clearDropMarks(); box.classList.add("drop-into");
      }
    });
    box.addEventListener("drop", function (e) {
      if (!dnd) return;
      e.preventDefault();
      if (dnd.type === "item") { moverItem(c, dnd.bi, dnd.ii, bi, c.bloques[bi].items.length); dnd = null; renderBuilder(); }
    });
    var head = box.querySelector(".b-bloque-head");
    head.addEventListener("dragover", function (e) {
      if (!dnd || dnd.type !== "block") return;
      e.preventDefault(); clearDropMarks(); box.classList.add("drop-before");
    });
    head.addEventListener("drop", function (e) {
      if (!dnd || dnd.type !== "block") return;
      e.preventDefault(); e.stopPropagation();
      var from = dnd.bi, to = bi;
      var blk = c.bloques.splice(from, 1)[0];
      if (from < to) to--;
      c.bloques.splice(to, 0, blk); dnd = null; renderBuilder();
    });
  }

  /* ---------- estado de vista ---------- */
  var state = { editando: null }; // clase en edición (copia)

  function go(view) {
    $("#view-glosario").hidden = view !== "glosario";
    $("#view-clases").hidden = view !== "clases";
    document.querySelectorAll("#tabs button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.view === view ? "true" : "false"); });
    var title = $("#pageTitle"), cnt = $("#count");
    if (view === "clases") { if (title) title.textContent = "Banco de clases"; if (cnt) cnt.hidden = true; renderBanco(); }
    else { if (title) title.textContent = "Glosario de posturas"; if (cnt) cnt.hidden = false; }
    try { localStorage.setItem("glosario.view", view); } catch (e) {}
  }

  /* ---------- banco ---------- */
  function renderBanco() {
    var host = $("#banco");
    host.textContent = "";
    var clases = loadClases().sort(function (a, b) { return (b.modificada || "").localeCompare(a.modificada || ""); });
    var q = ($("#claseQ").value || "").toLowerCase();
    if (q) clases = clases.filter(function (c) {
      var hay = (c.nombre + " " + c.estilo + " " + (c.semilla.valor || "") + " " + c.notas + " " +
        c.bloques.map(function (b) { return b.items.map(function (i) { return i.slug ? (bySlug[i.slug] ? bySlug[i.slug].nombre : "") : (i.texto || ""); }).join(" "); }).join(" ")).toLowerCase();
      return hay.indexOf(q) > -1;
    });
    $("#claseCount").textContent = clases.length + (clases.length === 1 ? " clase" : " clases");
    if (!clases.length) { host.appendChild(el("p", "empty", q ? "Ninguna clase coincide." : "Aún no hay clases guardadas. Crea la primera.")); return; }
    clases.forEach(function (c) {
      var card = el("article", "clase-card");
      var h = el("button", "clase-open");
      h.type = "button";
      h.appendChild(el("h3", null, c.nombre || "(sin nombre)"));
      var meta = el("p", "clase-meta");
      var bits = [];
      if (c.estilo) bits.push(c.estilo);
      if (c.semilla.valor) bits.push(SEMILLA_TIPOS[c.semilla.tipo] + ": " + c.semilla.valor);
      bits.push(txtPosturas(c));
      bits.push("~" + minClase(c) + " min");
      meta.textContent = bits.join("  ·  ");
      h.appendChild(meta);
      if (c.fechas && c.fechas.length) h.appendChild(el("p", "clase-fecha", "Dada: " + c.fechas.map(fechaCorta).join(", ")));
      h.addEventListener("click", function () { abrirBuilder(JSON.parse(JSON.stringify(c))); });
      card.appendChild(h);
      var acc = el("div", "clase-acc");
      var play = el("button", "mini play", "▶ Dar clase"); play.type = "button";
      play.addEventListener("click", function () { abrirPlayer(c); });
      acc.appendChild(play);
      var dup = el("button", "mini", "Duplicar"); dup.type = "button";
      dup.addEventListener("click", function () {
        var copy = JSON.parse(JSON.stringify(c));
        copy.id = uid("c"); copy.nombre = (c.nombre || "Clase") + " (copia)"; copy.fechas = []; copy.creada = copy.modificada = nowISO();
        var arr = loadClases(); arr.push(copy); saveClases(arr); renderBanco();
      });
      var del = el("button", "mini danger", "Borrar"); del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("¿Borrar «" + (c.nombre || "sin nombre") + "»? No se puede deshacer.")) return;
        saveClases(loadClases().filter(function (x) { return x.id !== c.id; })); renderBanco();
      });
      acc.appendChild(dup); acc.appendChild(del);
      card.appendChild(acc);
      host.appendChild(card);
    });
  }

  /* ---------- builder ---------- */
  function abrirBuilder(clase) {
    state.editando = clase;
    var b = $("#builder");
    b.hidden = false;
    document.body.style.overflow = "hidden";
    renderBuilder();
    b.querySelector(".b-nombre").focus();
  }
  function cerrarBuilder() {
    state.editando = null;
    $("#builder").hidden = true;
    document.body.style.overflow = "";
    renderBanco();
  }
  function guardar(volver) {
    var c = state.editando;
    c.modificada = nowISO();
    if (!c.nombre.trim()) c.nombre = "Clase " + fechaCorta(nowISO());
    var arr = loadClases();
    var i = arr.findIndex(function (x) { return x.id === c.id; });
    if (i > -1) arr[i] = c; else arr.push(c);
    saveClases(arr);
    if (volver) cerrarBuilder();
    else { flash("Guardada"); renderBuilder(); }
  }
  function flash(msg) {
    var f = $("#builder .b-flash"); f.textContent = msg; f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 1400);
  }

  function valoresSemilla(tipo) {
    if (tipo === "tema") return META.vocab.tema || [];
    if (tipo === "zona") return META.vocab.zona || [];
    if (tipo === "dinamica") return META.vocab.dinamica || [];
    return [];
  }

  function renderBuilder() {
    var c = state.editando;
    var root = $("#builder .b-body");
    root.textContent = "";

    // cabecera
    var head = $("#builder .b-head");
    head.querySelector(".b-nombre").value = c.nombre;
    pintaCabecera();

    // semilla + estilo + objetivo
    var setup = el("div", "b-setup");
    var semTipo = selectEl(Object.keys(SEMILLA_TIPOS), c.semilla.tipo, function (v) { c.semilla.tipo = v; c.semilla.valor = ""; renderBuilder(); }, function (k) { return SEMILLA_TIPOS[k]; });
    var semVal = selectEl([""].concat(valoresSemilla(c.semilla.tipo)), c.semilla.valor, function (v) { c.semilla.valor = v; });
    semVal.disabled = !c.semilla.tipo;
    setup.appendChild(field("Semilla de la clase", wrapTwo(semTipo, semVal)));
    setup.appendChild(field("Estilo", selectEl(ESTILOS, c.estilo, function (v) { c.estilo = v; })));
    var objIn = el("input", "b-num"); objIn.type = "number"; objIn.min = "10"; objIn.step = "5"; objIn.value = c.objetivo;
    // repinta solo el total: re-renderizar aquí hacía perder el foco al escribir
    objIn.addEventListener("input", function () { c.objetivo = +objIn.value || 0; pintaCabecera(); });
    setup.appendChild(field("Duración objetivo (min)", objIn));
    root.appendChild(setup);

    // bloques, con un insertador discreto en cada hueco entre secciones
    c.bloques.forEach(function (bl, bi) {
      if (bi > 0) root.appendChild(insertarBloqueEl(c, bi));
      root.appendChild(bloqueEl(c, bl, bi));
    });

    var blkBar = el("div", "b-blkbar");
    var addBl = el("button", "b-addblock", "+ Sección");
    addBl.type = "button";
    addBl.addEventListener("click", function () { nuevoBloqueEn(c, c.bloques.length); });
    blkBar.appendChild(addBl);
    var plantillas = loadPlantillas();
    if (plantillas.length) {
      var sel = el("select", "b-select b-tplsel");
      sel.appendChild(el("option", null, "Insertar plantilla…")).value = "";
      plantillas.forEach(function (t, i) { var o = el("option", null, t.nombre); o.value = i; sel.appendChild(o); });
      sel.addEventListener("change", function () {
        if (sel.value === "") return;
        nuevoBloqueEn(c, c.bloques.length, plantillas[+sel.value]);
      });
      blkBar.appendChild(sel);
    }
    root.appendChild(blkBar);

    // notas generales + fechas
    var nt = el("textarea", "b-notas");
    nt.placeholder = "Notas de la clase (qué funcionó, ajustes para la próxima…)";
    nt.value = c.notas;
    nt.addEventListener("input", function () { c.notas = nt.value; });
    root.appendChild(field("Notas", nt));

    var fechasWrap = el("div", "b-fechas");
    (c.fechas || []).forEach(function (f, i) {
      var chip = el("span", "b-fecha-chip", fechaCorta(f));
      var x = el("button", null, "×"); x.type = "button";
      x.addEventListener("click", function () { c.fechas.splice(i, 1); renderBuilder(); });
      chip.appendChild(x); fechasWrap.appendChild(chip);
    });
    var addF = el("button", "mini", "Marcar como dada hoy"); addF.type = "button";
    addF.addEventListener("click", function () { (c.fechas = c.fechas || []).push(nowISO()); renderBuilder(); });
    fechasWrap.appendChild(addF);
    root.appendChild(field("Veces que la diste", fechasWrap));
  }

  // repinta el total de la clase en la barra de arriba sin re-renderizar todo
  // (re-renderizar mientras se escribe en un campo hace perder el foco)
  function pintaCabecera() {
    var c = state.editando; if (!c) return;
    var totEl = $("#builder .b-total"); if (!totEl) return;
    var tot = minClase(c), obj = +c.objetivo || 0;
    totEl.textContent = "~" + tot + " / " + obj + " min  ·  " + txtPosturas(c);
    totEl.className = "b-total" + (obj && Math.abs(tot - obj) > obj * 0.15 ? " off" : "");
  }

  function nuevoBloqueEn(c, i, plantilla) {
    var bl = plantilla
      ? { id: uid("b"), titulo: plantilla.titulo, objetivo: +plantilla.objetivo || 0, items: JSON.parse(JSON.stringify(plantilla.items)) }
      : { id: uid("b"), titulo: "Nueva sección", objetivo: 0, items: [] };
    c.bloques.splice(i, 0, bl);
    renderBuilder();
    // deja el nombre listo para escribir
    var cajas = document.querySelectorAll("#builder .b-bloque-ti");
    if (cajas[i]) { cajas[i].focus(); cajas[i].select(); }
  }

  // separador discreto con un "+" para meter una sección justo ahí
  function insertarBloqueEl(c, i) {
    var w = el("div", "b-insert");
    var b = el("button", null, "+");
    b.type = "button";
    b.title = "Añadir una sección aquí";
    b.setAttribute("aria-label", "Añadir una sección aquí");
    b.addEventListener("click", function () { nuevoBloqueEn(c, i); });
    w.appendChild(b);
    return w;
  }

  function bloqueEl(c, bl, bi) {
    var box = el("section", "b-bloque");
    var bh = el("div", "b-bloque-head");
    var grip = el("span", "b-grip", "⠿"); grip.title = "Arrastra para reordenar el bloque";
    bh.appendChild(grip);
    var ti = el("input", "b-bloque-ti"); ti.value = bl.titulo;
    ti.addEventListener("input", function () { bl.titulo = ti.value; });
    bh.appendChild(ti);

    // tiempo de la sección: lo que suman las posturas  /  lo que quiere que dure
    var tiempo = el("div", "b-bloque-time");
    var mins = el("span", "b-bloque-min");
    var objIn = el("input", "b-bloque-obj");
    objIn.type = "number"; objIn.min = "0"; objIn.step = "5";
    objIn.value = bl.objetivo || "";
    objIn.placeholder = "—";
    objIn.title = "Cuánto quieres que dure esta sección (min)";
    objIn.setAttribute("aria-label", "Duración objetivo de la sección en minutos");
    function pintaMin() {
      var real = Math.round(bl.items.reduce(function (a, it) { return a + minItem(it); }, 0));
      var o = +bl.objetivo || 0;
      mins.textContent = "~" + real;
      tiempo.className = "b-bloque-time" + (o && Math.abs(real - o) > Math.max(2, o * 0.2) ? " off" : "");
    }
    objIn.addEventListener("input", function () { bl.objetivo = +objIn.value || 0; pintaMin(); });
    tiempo.appendChild(mins);
    tiempo.appendChild(el("span", "b-bloque-sep", "/"));
    tiempo.appendChild(objIn);
    tiempo.appendChild(el("span", "b-bloque-unit", "min"));
    pintaMin();
    bh.appendChild(tiempo);
    var ctl = el("div", "b-move");
    var up = el("button", null, "↑"); up.type = "button"; up.title = "Subir"; up.addEventListener("click", function () { swap(c.bloques, bi, bi - 1); renderBuilder(); });
    var dn = el("button", null, "↓"); dn.type = "button"; dn.title = "Bajar"; dn.addEventListener("click", function () { swap(c.bloques, bi, bi + 1); renderBuilder(); });
    var dup = el("button", null, "⎘"); dup.type = "button"; dup.title = "Duplicar bloque";
    dup.addEventListener("click", function () { c.bloques.splice(bi + 1, 0, { id: uid("b"), titulo: bl.titulo + " (copia)", objetivo: bl.objetivo || 0, items: JSON.parse(JSON.stringify(bl.items)) }); renderBuilder(); });
    var tpl = el("button", null, "★"); tpl.type = "button"; tpl.title = "Guardar como plantilla";
    tpl.addEventListener("click", function () {
      var nombre = prompt("Nombre de la plantilla:", bl.titulo);
      if (!nombre) return;
      var arr = loadPlantillas(); arr.push({ nombre: nombre, titulo: bl.titulo, objetivo: bl.objetivo || 0, items: JSON.parse(JSON.stringify(bl.items)) }); savePlantillas(arr);
      flash("Plantilla guardada");
    });
    var del = el("button", "danger", "×"); del.type = "button"; del.title = "Quitar bloque";
    del.addEventListener("click", function () { if (confirm("¿Quitar el bloque «" + bl.titulo + "» y sus posturas?")) { c.bloques.splice(bi, 1); renderBuilder(); } });
    [up, dn, dup, tpl, del].forEach(function (b) { ctl.appendChild(b); });
    bh.appendChild(ctl);
    box.appendChild(bh);
    hookDrag(box, grip, { type: "block", bi: bi });
    hookDropBlock(c, box, bi);

    bl.items.forEach(function (it, ii) { box.appendChild(itemEl(c, bl, it, ii, bi)); });

    var bar = el("div", "b-bloque-bar");
    var addP = el("button", "b-add", "+ Postura"); addP.type = "button";
    addP.addEventListener("click", function () { togglePicker(box, c, bl); });
    var addT = el("button", "b-add", "+ Texto"); addT.type = "button";
    addT.addEventListener("click", function () { bl.items.push({ tipo: "texto", texto: "", min: 0 }); renderBuilder(); });
    var sug = el("button", "b-add ghost", "Sugerir"); sug.type = "button";
    sug.addEventListener("click", function () { toggleSug(box, c, bl, bi); });
    bar.appendChild(addP); bar.appendChild(addT); bar.appendChild(sug);
    box.appendChild(bar);
    return box;
  }

  function itemEl(c, bl, it, ii, bi) {
    var row = el("div", "b-item" + (it.tipo === "texto" ? " txt" : ""));
    var grip = el("span", "b-grip", "⠿"); grip.title = "Arrastra para reordenar";
    row.appendChild(grip);
    hookDrag(row, grip, { type: "item", bi: bi, ii: ii });
    hookDropItem(c, row, bi, ii);
    if (it.tipo === "texto") {
      var ta = el("textarea", "b-item-txt");
      ta.placeholder = "Lectura, pranayama, intención, indicación de transición…";
      ta.value = it.texto;
      ta.addEventListener("input", function () { it.texto = ta.value; });
      row.appendChild(ta);
      var mn = el("input", "b-min"); mn.type = "number"; mn.min = "0"; mn.step = "1"; mn.value = it.min || 0; mn.title = "minutos";
      mn.addEventListener("input", function () { it.min = +mn.value || 0; renderBuilder(); });
      row.appendChild(wrapLabel("min", mn));
    } else {
      var p = bySlug[it.slug];
      var info = el("div", "b-item-info");
      info.appendChild(el("span", "b-item-name", p ? p.nombre : it.slug));
      if (p) info.appendChild(el("span", "b-item-san", p.sanscrito));
      row.appendChild(info);
      row.appendChild(segEl(["", "izq", "der", "ambos"], it.lado || "", ["—", "Izq", "Der", "Ambos"], function (v) { it.lado = v; renderBuilder(); }));
      var dur = el("input", "b-dur"); dur.type = "number"; dur.min = "0"; dur.step = "1"; dur.value = it.dur || 0;
      dur.addEventListener("input", function () { it.dur = +dur.value || 0; renderBuilder(); });
      row.appendChild(dur);
      row.appendChild(segEl(["resp", "min"], it.durUnit || "resp", ["resp", "min"], function (v) { it.durUnit = v; renderBuilder(); }));
      var nota = el("input", "b-nota"); nota.placeholder = "nota…"; nota.value = it.nota || "";
      nota.addEventListener("input", function () { it.nota = nota.value; });
      row.appendChild(nota);
    }
    row.appendChild(moveBtns(
      function () { swap(bl.items, ii, ii - 1); renderBuilder(); },
      function () { swap(bl.items, ii, ii + 1); renderBuilder(); },
      function () { bl.items.splice(ii, 1); renderBuilder(); }
    ));
    return row;
  }

  /* ---------- picker de posturas ---------- */
  function togglePicker(box, c, bl) {
    var ex = box.querySelector(".b-picker");
    if (ex) { ex.remove(); return; }
    var pk = el("div", "b-picker");
    var qi = el("input", "b-picker-q"); qi.type = "search"; qi.placeholder = "Buscar postura…";
    var list = el("div", "b-picker-list");
    var soloSemilla = el("label", "b-picker-chk");
    var chk = el("input"); chk.type = "checkbox"; chk.checked = !!(c.semilla.tipo && c.semilla.valor);
    soloSemilla.appendChild(chk);
    soloSemilla.appendChild(document.createTextNode(" solo la semilla" + (c.semilla.valor ? " (" + c.semilla.valor + ")" : "")));
    function fill() {
      var q = (qi.value || "").toLowerCase();
      list.textContent = "";
      POSES.filter(function (p) {
        if (chk.checked && !semillaMatch(p, c.semilla)) return false;
        if (q) return (p.nombre + " " + p.nombre_en + " " + p.sanscrito).toLowerCase().indexOf(q) > -1;
        return true;
      }).slice(0, 60).forEach(function (p) {
        var b = el("button", "b-picker-item"); b.type = "button";
        b.appendChild(el("span", "b-item-name", p.nombre));
        b.appendChild(el("span", "b-item-san", p.sanscrito));
        b.addEventListener("click", function () {
          bl.items.push({ tipo: "postura", slug: p.slug, lado: "", dur: p.tipo.indexOf("restaurativa") > -1 ? 2 : 5, durUnit: p.tipo.indexOf("restaurativa") > -1 ? "min" : "resp", nota: "" });
          renderBuilder();
        });
        list.appendChild(b);
      });
    }
    qi.addEventListener("input", fill);
    chk.addEventListener("change", fill);
    pk.appendChild(qi); pk.appendChild(soloSemilla); pk.appendChild(list);
    box.querySelector(".b-bloque-bar").before(pk);
    fill(); qi.focus();
  }

  function toggleSug(box, c, bl, bi) {
    var ex = box.querySelector(".b-sug");
    if (ex) { ex.remove(); return; }
    var wrap = el("div", "b-sug");
    wrap.appendChild(el("p", "b-sug-lbl", "Sugerencias de la app" + (c.semilla.valor ? " para «" + c.semilla.valor + "»" : "") + " — toca para añadir:"));
    var chips = el("div", "b-sug-chips");
    sugerir(c, bi).forEach(function (p) {
      var b = el("button", "b-sug-chip", p.nombre); b.type = "button";
      b.addEventListener("click", function () {
        bl.items.push({ tipo: "postura", slug: p.slug, lado: "", dur: 5, durUnit: "resp", nota: "" });
        renderBuilder();
      });
      chips.appendChild(b);
    });
    if (!chips.children.length) chips.appendChild(el("span", "b-sug-none", "Define una semilla arriba para mejores sugerencias."));
    wrap.appendChild(chips);
    box.querySelector(".b-bloque-bar").before(wrap);
  }

  /* ---------- widgets ---------- */
  function field(label, node) { var f = el("label", "b-field"); f.appendChild(el("span", "b-field-lbl", label)); f.appendChild(node); return f; }
  function wrapTwo(a, b) { var w = el("div", "b-two"); w.appendChild(a); w.appendChild(b); return w; }
  function wrapLabel(lbl, node) { var w = el("span", "b-inline"); w.appendChild(node); w.appendChild(el("span", "b-inline-lbl", lbl)); return w; }
  function selectEl(opts, val, onChange, labelFn) {
    var s = el("select", "b-select");
    opts.forEach(function (o) { var op = el("option", null, labelFn ? labelFn(o) : (o || "—")); op.value = o; if (o === val) op.selected = true; s.appendChild(op); });
    s.addEventListener("change", function () { onChange(s.value); });
    return s;
  }
  function segEl(vals, cur, labels, onChange) {
    var w = el("div", "b-seg");
    vals.forEach(function (v, i) {
      var b = el("button", null, labels[i]); b.type = "button";
      b.setAttribute("aria-pressed", v === cur ? "true" : "false");
      b.addEventListener("click", function () { onChange(v); });
      w.appendChild(b);
    });
    return w;
  }
  function moveBtns(up, down, del) {
    var w = el("div", "b-move");
    var u = el("button", null, "↑"); u.type = "button"; u.title = "Subir"; u.addEventListener("click", up);
    var d = el("button", null, "↓"); d.type = "button"; d.title = "Bajar"; d.addEventListener("click", down);
    var x = el("button", "danger", "×"); x.type = "button"; x.title = "Quitar"; x.addEventListener("click", del);
    w.appendChild(u); w.appendChild(d); w.appendChild(x);
    return w;
  }
  function swap(arr, i, j) { if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

  /* ---------- ver plan (imprimible) ---------- */
  function verPlan() {
    var c = state.editando;
    var w = window.open("", "_blank");
    if (!w) { alert("Permite las ventanas emergentes para ver el plan."); return; }
    var lineas = [];
    c.bloques.forEach(function (bl) {
      if (!bl.items.length) return;
      lineas.push("<h2>" + esc(bl.titulo) + (bl.objetivo ? "<span class=m>" + bl.objetivo + " min</span>" : "") + "</h2><ul>");
      bl.items.forEach(function (it) {
        if (it.tipo === "texto") { lineas.push("<li class=t>" + esc(it.texto || "").replace(/\n/g, "<br>") + "</li>"); return; }
        var p = bySlug[it.slug];
        var d = it.dur ? " — " + it.dur + " " + (it.durUnit === "min" ? "min" : "resp") + (it.lado === "ambos" ? " ×2" : it.lado ? " (" + it.lado + ")" : "") : "";
        lineas.push("<li><b>" + esc(p ? p.nombre : it.slug) + "</b> <i>" + esc(p ? p.sanscrito : "") + "</i>" + d +
          (it.nota ? "<br><span class=n>" + esc(it.nota) + "</span>" : "") +
          (p && p.entrada && p.entrada.length ? "<br><span class=c>" + esc(p.entrada.join(" · ")) + "</span>" : "") + "</li>");
      });
      lineas.push("</ul>");
    });
    w.document.write('<meta charset=utf-8><title>' + esc(c.nombre || "Clase") + '</title><style>' +
      'body{font:14px/1.5 Georgia,serif;max-width:640px;margin:32px auto;padding:0 16px;color:#2b2340}' +
      'h1{font-size:24px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#7b62b3;margin:22px 0 6px}' +
      'h2 .m{float:right;font-weight:400;letter-spacing:0;text-transform:none;color:#a08fc0}' +
      'ul{list-style:none;padding:0}li{margin:0 0 10px;padding-left:12px;border-left:2px solid #e0d3ee}' +
      'li.t{font-style:italic;border-color:#e7d2e3}.n{color:#6a5;}.c{color:#888;font-size:12px}.n,.c{font-family:system-ui}' +
      '@media print{body{margin:0}}</style>' +
      '<h1>' + esc(c.nombre || "Clase") + '</h1><p>' +
      [c.estilo, c.semilla.valor ? SEMILLA_TIPOS[c.semilla.tipo] + ": " + c.semilla.valor : "", "~" + minClase(c) + " min", txtPosturas(c)].filter(Boolean).join(" · ") +
      '</p>' + lineas.join("") +
      (c.notas ? "<h2>Notas</h2><p>" + esc(c.notas).replace(/\n/g, "<br>") + "</p>" : "") +
      '<p style="margin-top:28px"><button onclick="print()">Imprimir</button></p>');
    w.document.close();
  }
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]; }); }

  /* ---------- modo clase (slideshow con timer) ---------- */
  var PL = { pasos: [], i: 0, restante: 0, playing: false, auto: LS.get("plAuto", true), timer: null, wake: null };

  function imgForP(p) {
    var ov = LS.get("img." + p.slug, null);
    if (ov === "none") return null;
    if (typeof ov === "number") return (window.SVGREPO_IMG && window.SVGREPO_IMG[ov]) || ("img/svgrepo/" + ov + ".svg");
    return p.img || null;
  }
  function segundos(it) {
    if (it.tipo === "texto") return (+it.min || 0) * 60;
    var d = +it.dur || 0;
    return it.durUnit === "min" ? d * 60 : d * 5;
  }
  function construirPasos(c) {
    var pasos = [];
    c.bloques.forEach(function (bl) {
      var ob = +bl.objetivo || 0;
      bl.items.forEach(function (it) {
        if (it.tipo === "texto") {
          if ((it.texto || "").trim()) pasos.push({ tipo: "texto", texto: it.texto, bloque: bl.titulo, bloqueObj: ob, seg: segundos(it) });
          return;
        }
        var p = bySlug[it.slug]; if (!p) return;
        if (it.lado === "ambos") {
          pasos.push({ tipo: "postura", p: p, bloque: bl.titulo, bloqueObj: ob, lado: "Lado izquierdo", nota: it.nota, seg: segundos(it) });
          pasos.push({ tipo: "postura", p: p, bloque: bl.titulo, bloqueObj: ob, lado: "Lado derecho", nota: it.nota, seg: segundos(it) });
        } else {
          pasos.push({ tipo: "postura", p: p, bloque: bl.titulo, bloqueObj: ob, lado: it.lado === "izq" ? "Lado izquierdo" : it.lado === "der" ? "Lado derecho" : "", nota: it.nota, seg: segundos(it) });
        }
      });
    });
    return pasos;
  }
  function abrirPlayer(c) {
    PL.pasos = construirPasos(c);
    if (!PL.pasos.length) { alert("Esta clase todavía no tiene posturas ni textos."); return; }
    PL.i = 0; PL.playing = false;
    $("#player").hidden = false; document.body.style.overflow = "hidden";
    $("#player .pl-auto-chk").checked = PL.auto;
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (w) { PL.wake = w; }, function () {});
    cargarPaso(0);
  }
  function cerrarPlayer() {
    pausar();
    if (PL.wake) { try { PL.wake.release(); } catch (e) {} PL.wake = null; }
    $("#player").hidden = true; document.body.style.overflow = "";
  }
  function cargarPaso(i) {
    PL.i = Math.max(0, Math.min(i, PL.pasos.length - 1));
    PL.restante = PL.pasos[PL.i].seg || 0;
    renderPaso();
    actualizarTimer();
    if (PL.playing) arrancar();
  }
  function renderPaso() {
    var s = PL.pasos[PL.i], st = $("#player .pl-stage");
    st.textContent = "";
    if (s.tipo === "texto") {
      var tx = el("div", "pl-texto", s.texto);
      st.appendChild(tx);
    } else {
      var fig = el("div", "pl-figure");
      var src = imgForP(s.p);
      if (src) { var im = el("img"); im.src = src; im.alt = ""; fig.appendChild(im); }
      else { fig.classList.add("ph"); fig.appendChild(el("span", "pl-ph-san", s.p.sanscrito)); }
      st.appendChild(fig);
      var txt = el("div", "pl-txt");
      txt.appendChild(el("h2", "pl-name", s.p.nombre));
      txt.appendChild(el("p", "pl-san", s.p.sanscrito + (s.lado ? "  ·  " + s.lado : "")));
      if (s.nota) txt.appendChild(el("p", "pl-nota", s.nota));
      if (s.p.entrada && s.p.entrada.length) {
        var ul = el("ul", "pl-cues");
        s.p.entrada.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        txt.appendChild(ul);
      }
      st.appendChild(txt);
    }
    var t = el("div", "pl-time"); t.id = "plTime";
    st.appendChild(t);
    $("#player .pl-pos").textContent = s.bloque + (s.bloqueObj ? "  ·  " + s.bloqueObj + " min" : "") +
      "  ·  " + (PL.i + 1) + " / " + PL.pasos.length;
  }
  function actualizarTimer() {
    var s = PL.pasos[PL.i], t = document.getElementById("plTime");
    if (t) {
      t.classList.toggle("done", s.seg > 0 && PL.restante <= 0);
      if (!s.seg) t.textContent = "";
      else { var m = Math.floor(PL.restante / 60), sec = PL.restante % 60; t.textContent = m + ":" + (sec < 10 ? "0" : "") + sec; }
    }
    var bar = $("#player .pl-progress i");
    if (bar) bar.style.width = (s.seg ? 100 * (1 - PL.restante / s.seg) : (PL.i + 1) / PL.pasos.length * 100) + "%";
  }
  function tick() {
    if (PL.restante > 0) PL.restante--;
    actualizarTimer();
    if (PL.restante <= 0) {
      clearInterval(PL.timer);
      if (PL.auto && PL.i < PL.pasos.length - 1) setTimeout(function () { if (PL.playing) siguiente(); }, 1000);
      else pausar();
    }
  }
  function arrancar() { clearInterval(PL.timer); if (PL.pasos[PL.i].seg) PL.timer = setInterval(tick, 1000); }
  function reproducir() { PL.playing = true; $("#player .pl-play").textContent = "⏸"; arrancar(); }
  function pausar() { PL.playing = false; clearInterval(PL.timer); var b = $("#player .pl-play"); if (b) b.textContent = "▶"; }
  function siguiente() { if (PL.i < PL.pasos.length - 1) cargarPaso(PL.i + 1); else pausar(); }
  function anterior() { cargarPaso(PL.i - 1); }

  /* ---------- respaldo ---------- */
  function exportar() {
    var data = JSON.stringify({ app: "yoga-clases", v: 1, clases: loadClases() }, null, 1);
    var dl = false;
    try {
      var a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(data);
      a.download = "clases-yoga-" + nowISO().slice(0, 10) + ".json";
      a.click(); dl = true;
    } catch (e) {}
    function done() { alert("Respaldo copiado al portapapeles" + (dl ? " y descargado" : "") + ".\nGuárdalo pegándolo en una nota o archivo de texto; sirve para restaurar tus clases o pasarlas a otro dispositivo."); }
    if (navigator.clipboard) navigator.clipboard.writeText(data).then(done, function () { window.prompt("Copia este respaldo y guárdalo:", data); });
    else window.prompt("Copia este respaldo y guárdalo:", data);
  }
  function importar() {
    var txt = prompt("Pega aquí el contenido del archivo de respaldo:");
    if (!txt) return;
    try {
      var obj = JSON.parse(txt);
      var nuevas = obj.clases || obj;
      if (!Array.isArray(nuevas)) throw 0;
      var arr = loadClases();
      var ids = {}; arr.forEach(function (c) { ids[c.id] = 1; });
      var add = 0;
      nuevas.forEach(function (c) { var n = normalizarClase(c); if (n && !ids[n.id]) { arr.push(n); add++; } });
      saveClases(arr); renderBanco();
      alert("Importadas " + add + " clases nuevas.");
    } catch (e) { alert("No se pudo leer el respaldo."); }
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.addEventListener("click", function () { go(b.dataset.view); });
    });
    $("#nuevaClase").addEventListener("click", function () { abrirBuilder(claseNueva()); });
    $("#claseQ").addEventListener("input", renderBanco);
    $("#exportarClases").addEventListener("click", exportar);
    $("#importarClases").addEventListener("click", importar);

    var bh = $("#builder .b-head");
    bh.querySelector(".b-nombre").addEventListener("input", function (e) { if (state.editando) { state.editando.nombre = e.target.value; } });
    bh.querySelector(".b-back").addEventListener("click", function () {
      if (confirm("¿Salir sin guardar los cambios?")) cerrarBuilder();
    });
    bh.querySelector(".b-save").addEventListener("click", function () { guardar(false); });
    bh.querySelector(".b-save-exit").addEventListener("click", function () { guardar(true); });
    bh.querySelector(".b-plan").addEventListener("click", verPlan);
    bh.querySelector(".b-play").addEventListener("click", function () { if (state.editando) abrirPlayer(state.editando); });

    // controles del modo clase
    var pl = $("#player");
    pl.querySelector(".pl-prev").addEventListener("click", anterior);
    pl.querySelector(".pl-next").addEventListener("click", siguiente);
    pl.querySelector(".pl-play").addEventListener("click", function () { PL.playing ? pausar() : reproducir(); });
    pl.querySelector(".pl-reset").addEventListener("click", function () { PL.restante = PL.pasos[PL.i].seg || 0; actualizarTimer(); });
    pl.querySelector(".pl-exit").addEventListener("click", cerrarPlayer);
    pl.querySelector(".pl-auto-chk").addEventListener("change", function (e) { PL.auto = e.target.checked; LS.set("plAuto", PL.auto); });
    document.addEventListener("keydown", function (e) {
      if ($("#player").hidden) return;
      if (e.key === "ArrowLeft") anterior();
      else if (e.key === "ArrowRight") siguiente();
      else if (e.key === " ") { e.preventDefault(); PL.playing ? pausar() : reproducir(); }
      else if (e.key === "Escape") cerrarPlayer();
    });

    var v = "glosario";
    try { v = localStorage.getItem("glosario.view") || "glosario"; } catch (e) {}
    go(v === "clases" ? "clases" : "glosario");
  });
})();

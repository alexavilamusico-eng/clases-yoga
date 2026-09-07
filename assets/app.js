/* Glosario de posturas — galería (sin dependencias, funciona con file://) */
(function () {
  "use strict";
  var POSES = window.POSES || [];
  var META = window.META || { vocab: {}, conteos: {} };

  var LS = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem("glosario." + k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("glosario." + k, JSON.stringify(v)); } catch (e) {} }
  };

  var state = {
    lang: LS.get("lang", "es"),
    q: "",
    open: false,
    soloFav: false,
    fav: (function () { var f = LS.get("fav", []); return Array.isArray(f) ? f : []; })(),
    facets: LS.get("facets", { nivel: [], tipo: [], zona: [], dinamica: [] })
  };
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function isFav(slug) { return state.fav.indexOf(slug) > -1; }
  function toggleFav(slug) {
    var i = state.fav.indexOf(slug);
    if (i > -1) state.fav.splice(i, 1); else state.fav.push(slug);
    LS.set("fav", state.fav);
  }
  // posturas relacionadas: comparten >=2 etiquetas de zona/dinámica
  var OPUESTAS = {
    "extensión de columna": "flexión hacia adelante", "flexión hacia adelante": "extensión de columna",
    "torsión": "flexión hacia adelante", "inversión": "quietud", "fuerza": "quietud"
  };
  function relacionadas(p) {
    var setP = {};
    p.zona.concat(p.dinamica).forEach(function (x) { setP[x] = 1; });
    var op = null; p.dinamica.forEach(function (d) { if (OPUESTAS[d]) op = OPUESTAS[d]; });
    return POSES.map(function (q) {
      if (q.slug === p.slug) return null;
      var comun = q.zona.concat(q.dinamica).filter(function (x) { return setP[x]; }).length;
      var contra = op && q.dinamica.indexOf(op) > -1;
      var s = comun + (contra ? 2.5 : 0) + (q.nivel === p.nivel ? 0.3 : 0);
      return s >= 2 ? { q: q, s: s } : null;
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 6).map(function (x) { return x.q; });
  }

  var T = {
    es: {
      entrada: "Cómo entrar", beneficios: "Beneficios", precaucion: "Precaución", etiquetas: "Etiquetas", relacionadas: "Relacionadas",
      buscar: "Buscar postura o sánscrito…", nada: "Ninguna postura coincide.", filtros: "Filtros",
      limpiar: "Quitar filtros", de: "de", posturas: "posturas",
      nivelL: "Nivel", tipoL: "Tipo", zonaL: "Zona del cuerpo", dinL: "Dinámica",
      propia: "Ficha redactada para esta app.", breve: "Ficha breve — por completar.", api: "Datos base: yoga-api.",
      cambiarDibujo: "Cambiar dibujo", sinDibujo: "Sin dibujo",
      subirImg: "Subir una foto", cambiarImg: "Cambiar la foto", quitarImg: "Quitar",
      imgError: "No se pudo leer esa imagen. Prueba con un JPG o PNG.",
      imgGrande: "No hay espacio para esa imagen. Prueba con una más pequeña."
    },
    en: {
      entrada: "How to enter", beneficios: "Benefits", precaucion: "Caution", etiquetas: "Tags", relacionadas: "Related",
      buscar: "Search pose or Sanskrit…", nada: "No pose matches.", filtros: "Filters",
      limpiar: "Clear filters", de: "of", posturas: "poses",
      nivelL: "Level", tipoL: "Type", zonaL: "Body zone", dinL: "Dynamic",
      propia: "Entry written for this app.", breve: "Short entry — to be completed.", api: "Base data: yoga-api.",
      cambiarDibujo: "Change drawing", sinDibujo: "No drawing",
      subirImg: "Upload a photo", cambiarImg: "Change photo", quitarImg: "Remove",
      imgError: "Couldn't read that image. Try a JPG or PNG.",
      imgGrande: "Not enough space for that image. Try a smaller one."
    }
  };
  function t(k) { return (T[state.lang] || T.es)[k]; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var SVG_COUNT = META.svgCount || 0;
  // en el archivo empaquetado los dibujos vienen embebidos en window.SVGREPO_IMG
  function svgUrl(i) { return (window.SVGREPO_IMG && window.SVGREPO_IMG[i]) || ("img/svgrepo/" + i + ".svg"); }
  // dibujo efectivo de una postura: override elegido por Andrea > dibujo por defecto
  function imgFor(p) {
    var ov = LS.get("img." + p.slug, null);
    if (ov === "none") return null;
    if (typeof ov === "number") return svgUrl(ov);
    if (typeof ov === "string" && ov.indexOf("data:") === 0) return ov; // foto subida por Andrea
    return p.img || null;
  }
  function esFoto(src) { return typeof src === "string" && src.indexOf("data:") === 0; }

  // Reduce la foto a máx 640 px y la aplana sobre blanco: sin esto una foto de
  // celular (varios MB) no cabe en localStorage.
  function comprimirImagen(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 640, w = im.naturalWidth || 1, h = im.naturalHeight || 1;
        if (w > max || h > max) { var r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        var cv = el("canvas"); cv.width = w; cv.height = h;
        var cx = cv.getContext("2d");
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h);
        cx.drawImage(im, 0, 0, w, h);
        var out; try { out = cv.toDataURL("image/jpeg", 0.82); } catch (e) { out = null; }
        cb(out);
      };
      im.onerror = function () { cb(null); };
      im.src = fr.result;
    };
    fr.onerror = function () { cb(null); };
    fr.readAsDataURL(file);
  }

  function nActive() {
    var f = state.facets;
    return f.nivel.length + f.tipo.length + f.zona.length + f.dinamica.length;
  }

  /* ---------- panel de filtros ---------- */
  function buildPanel() {
    var host = $("#panel .panel-inner");
    host.innerHTML = "";
    var groups = [
      ["nivel", t("nivelL"), Object.keys(META.conteos.nivel || {})],
      ["tipo", t("tipoL"), (META.vocab.tipo || []).filter(function (v) { return META.conteos.tipo[v]; })],
      ["dinamica", t("dinL"), (META.vocab.dinamica || []).filter(function (v) { return META.conteos.dinamica[v]; })],
      ["zona", t("zonaL"), (META.vocab.zona || []).filter(function (v) { return META.conteos.zona[v]; })]
    ];
    groups.forEach(function (g) {
      var wrap = el("div", "facet-group");
      wrap.appendChild(el("span", "facet-label", g[1]));
      g[2].forEach(function (v) {
        var b = el("button", "tag", v);
        b.type = "button";
        b.setAttribute("aria-pressed", state.facets[g[0]].indexOf(v) > -1 ? "true" : "false");
        b.addEventListener("click", function () {
          var arr = state.facets[g[0]], i = arr.indexOf(v);
          if (i > -1) arr.splice(i, 1); else arr.push(v);
          b.setAttribute("aria-pressed", i > -1 ? "false" : "true");
          LS.set("facets", state.facets);
          render();
        });
        wrap.appendChild(b);
      });
      host.appendChild(wrap);
    });
    var clr = el("button", "clear", t("limpiar"));
    clr.id = "clearBtn"; clr.type = "button";
    clr.addEventListener("click", function () {
      state.facets = { nivel: [], tipo: [], zona: [], dinamica: [] };
      LS.set("facets", state.facets);
      buildPanel(); render();
    });
    host.appendChild(clr);
  }

  function match(p) {
    var f = state.facets;
    if (state.soloFav && !isFav(p.slug)) return false;
    if (f.nivel.length && f.nivel.indexOf(p.nivel) < 0) return false;
    if (f.tipo.length && !f.tipo.some(function (v) { return p.tipo.indexOf(v) > -1; })) return false;
    if (f.zona.length && !f.zona.some(function (v) { return p.zona.indexOf(v) > -1; })) return false;
    if (f.dinamica.length && !f.dinamica.some(function (v) { return p.dinamica.indexOf(v) > -1; })) return false;
    if (state.q) {
      var hay = norm(p.nombre + " " + p.nombre_en + " " + p.sanscrito + " " + p.traduccion + " " +
        p.nivel + " " + p.tipo.join(" ") + " " + p.zona.join(" ") + " " + p.dinamica.join(" ") + " " + p.tema.join(" "));
      if (hay.indexOf(norm(state.q)) < 0) return false;
    }
    return true;
  }

  /* ---------- tarjeta ---------- */
  function phInner(p) {
    var d = document.createDocumentFragment();
    d.appendChild(el("span", "ph-san", p.sanscrito));
    d.appendChild(el("span", "ph-es", state.lang === "en" ? p.nombre_en : p.nombre));
    return d;
  }

  function details(titleKey, buildBody) {
    var d = el("details");
    var s = el("summary", null, t(titleKey));
    d.appendChild(s);
    var body = el("div", "body");
    buildBody(body);
    d.appendChild(body);
    return d;
  }

  function card(p) {
    var name = state.lang === "en" ? p.nombre_en : p.nombre;
    var c = el("button", "card");
    c.type = "button";
    c.setAttribute("aria-label", name);
    var inner = el("div", "card-inner");

    // frente
    var front = el("div", "face front");
    var thumb = el("div", "thumb");
    function paintThumb() {
      thumb.textContent = "";
      thumb.classList.remove("ph");
      var src = imgFor(p);
      if (src) {
        var img = el("img", esFoto(src) ? "user-img" : null);
        img.src = src; img.alt = name; img.loading = "lazy";
        img.addEventListener("error", function () { thumb.classList.add("ph"); thumb.textContent = ""; thumb.appendChild(phInner(p)); });
        thumb.appendChild(img);
      } else {
        thumb.classList.add("ph");
        thumb.appendChild(phInner(p));
      }
    }
    paintThumb();
    front.appendChild(thumb);
    var star = el("span", "fav" + (isFav(p.slug) ? " on" : ""), "★");
    star.setAttribute("role", "button");
    star.setAttribute("tabindex", "0");
    star.setAttribute("aria-label", "Favorita");
    star.setAttribute("aria-pressed", isFav(p.slug) ? "true" : "false");
    function flipFav(e) {
      e.stopPropagation();
      toggleFav(p.slug);
      star.classList.toggle("on");
      star.setAttribute("aria-pressed", isFav(p.slug) ? "true" : "false");
      if (state.soloFav) render();
    }
    star.addEventListener("click", flipFav);
    star.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipFav(e); } });
    front.appendChild(star);
    var fm = el("div", "front-meta");
    fm.appendChild(el("p", "name", name));
    fm.appendChild(el("p", "san", p.sanscrito));
    front.appendChild(fm);

    // reverso
    var back = el("div", "face back");
    var sc = el("div", "scroll");
    sc.appendChild(el("p", "name", name));
    sc.appendChild(el("p", "san", p.sanscrito + (p.traduccion ? " · " + p.traduccion : "")));

    sc.appendChild(el("h4", null, t("entrada")));
    if (state.lang === "en" && p.entrada_en) {
      var pe = el("p", null, p.entrada_en); pe.style.fontSize = "12px"; pe.style.lineHeight = "1.55"; pe.style.margin = "0";
      sc.appendChild(pe);
    } else {
      var ul = el("ul");
      p.entrada.forEach(function (x) { ul.appendChild(el("li", null, x)); });
      sc.appendChild(ul);
    }

    var bens = (state.lang === "en" && p.beneficios_en && p.beneficios_en.length) ? p.beneficios_en : p.beneficios;
    if (bens && bens.length) {
      sc.appendChild(details("beneficios", function (body) {
        var u = el("ul");
        bens.forEach(function (x) { u.appendChild(el("li", null, x)); });
        body.appendChild(u);
      }));
    }
    if (p.precaucion && p.precaucion.length) {
      sc.appendChild(details("precaucion", function (body) {
        var u = el("ul", "caution");
        p.precaucion.forEach(function (x) { u.appendChild(el("li", null, x)); });
        body.appendChild(u);
      }));
    }
    sc.appendChild(details("etiquetas", function (body) {
      var tr = el("div", "tag-row");
      [p.nivel].concat(p.tipo, p.zona, p.dinamica, p.tema).forEach(function (x) { tr.appendChild(el("span", null, x)); });
      body.appendChild(tr);
    }));

    var rel = relacionadas(p);
    if (rel.length) {
      sc.appendChild(details("relacionadas", function (body) {
        var r = el("div", "rel-row");
        rel.forEach(function (q) {
          var b = el("button", "rel-chip", state.lang === "en" ? q.nombre_en : q.nombre);
          b.type = "button";
          b.addEventListener("click", function (e) {
            e.stopPropagation();
            state.q = q.nombre; var qi = $("#q"); if (qi) qi.value = q.nombre;
            render(); var g = $("#grid"); if (g) g.scrollIntoView({ block: "start" });
          });
          r.appendChild(b);
        });
        body.appendChild(r);
      }));
    }

    if (SVG_COUNT) {
      sc.appendChild(details("cambiarDibujo", function (body) {
        function pintarPicker() {
          body.textContent = "";
          var cur = LS.get("img." + p.slug, null);
          var foto = esFoto(cur);

          // --- subir / cambiar / quitar una foto propia ---
          var up = el("div", "pick-upload");
          var fi = el("input"); fi.type = "file"; fi.accept = "image/*"; fi.hidden = true;
          if (foto) { var pv = el("img", "pick-up-prev"); pv.src = cur; pv.alt = ""; up.appendChild(pv); }
          var btn = el("button", "pick-up-btn", t(foto ? "cambiarImg" : "subirImg"));
          btn.type = "button";
          btn.addEventListener("click", function () { fi.click(); });
          fi.addEventListener("change", function () {
            var f = fi.files && fi.files[0]; if (!f) return;
            btn.disabled = true; btn.textContent = "…";
            comprimirImagen(f, function (uri) {
              btn.disabled = false;
              if (!uri) { btn.textContent = t(foto ? "cambiarImg" : "subirImg"); alert(t("imgError")); return; }
              try { LS.set("img." + p.slug, uri); }
              catch (e) { btn.textContent = t(foto ? "cambiarImg" : "subirImg"); alert(t("imgGrande")); return; }
              paintThumb(); pintarPicker();
            });
          });
          up.appendChild(btn); up.appendChild(fi);
          if (foto) {
            var q = el("button", "pick-up-clear", t("quitarImg")); q.type = "button";
            q.addEventListener("click", function () { LS.set("img." + p.slug, null); paintThumb(); pintarPicker(); });
            up.appendChild(q);
          }
          body.appendChild(up);

          // --- dibujos de la colección ---
          var grid = el("div", "pick");
          function tile(cls, kind, val) {
            var b = el("button", "pick-tile" + (cls ? " " + cls : ""));
            b.type = "button";
            if (kind === "svg") { var im = el("img"); im.src = svgUrl(val); im.loading = "lazy"; im.alt = ""; b.appendChild(im); }
            else { b.appendChild(el("span", "pick-none", t("sinDibujo"))); }
            b.addEventListener("click", function () {
              LS.set("img." + p.slug, kind === "svg" ? val : "none");
              paintThumb(); pintarPicker();
            });
            return b;
          }
          var none = tile("wide", "none");
          if (cur === "none") none.classList.add("on");
          grid.appendChild(none);
          for (var i = 0; i < SVG_COUNT; i++) {
            var tl = tile("", "svg", i);
            if (cur === i) tl.classList.add("on");
            grid.appendChild(tl);
          }
          body.appendChild(grid);
        }
        pintarPicker();
      }));
    }

    var srcKey = p.fuente === "propia-breve" ? "breve" : (p.fuente === "propia" ? "propia" : "api");
    sc.appendChild(el("p", "src", t(srcKey)));
    back.appendChild(sc);

    inner.appendChild(front);
    inner.appendChild(back);
    c.appendChild(inner);
    c.addEventListener("click", function (e) {
      // dejar que los <details>, la estrella y los chips funcionen sin voltear la tarjeta
      if (e.target.closest("details") || e.target.closest(".fav")) return;
      c.classList.toggle("flipped");
    });
    return c;
  }

  /* ---------- render ---------- */
  function render() {
    var list = POSES.filter(match);
    var grid = $("#grid");
    grid.textContent = "";
    if (!list.length) {
      grid.appendChild(el("p", "empty", t("nada")));
    } else {
      var frag = document.createDocumentFragment();
      list.forEach(function (p) { frag.appendChild(card(p)); });
      grid.appendChild(frag);
    }
    $("#count").textContent = list.length + " " + t("de") + " " + POSES.length + " " + t("posturas");
    var n = nActive();
    var badge = $("#fBadge");
    badge.textContent = n ? String(n) : "";
    badge.hidden = !n;
    var cb = $("#clearBtn"); if (cb) cb.disabled = !n;
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.lang = state.lang;

    var q = $("#q");
    q.placeholder = t("buscar");
    q.addEventListener("input", function (e) { state.q = e.target.value; render(); });

    var ft = $("#filtersToggle"), panel = $("#panel");
    ft.querySelector(".label").textContent = t("filtros");
    ft.addEventListener("click", function () {
      state.open = !state.open;
      ft.setAttribute("aria-expanded", state.open ? "true" : "false");
      panel.hidden = !state.open;
    });

    document.querySelectorAll("#langSeg button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === state.lang ? "true" : "false");
      b.addEventListener("click", function () {
        state.lang = b.dataset.lang;
        LS.set("lang", state.lang);
        document.documentElement.lang = state.lang;
        document.querySelectorAll("#langSeg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        q.placeholder = t("buscar");
        ft.querySelector(".label").textContent = t("filtros");
        buildPanel(); render();
      });
    });

    var cr = $("#creditsLink"), dlg = $("#credits");
    if (cr && dlg) {
      cr.addEventListener("click", function () { dlg.showModal(); });
      $("#credits .dlg-close").addEventListener("click", function () { dlg.close(); });
    }

    var favT = $("#favToggle");
    if (favT) favT.addEventListener("click", function () {
      state.soloFav = !state.soloFav;
      favT.setAttribute("aria-pressed", state.soloFav ? "true" : "false");
      favT.classList.toggle("on", state.soloFav);
      render();
    });

    var help = $("#help"), helpBtn = $("#helpBtn");
    if (help && helpBtn) {
      helpBtn.addEventListener("click", function () { help.showModal(); });
      $("#help .dlg-close").addEventListener("click", function () { help.close(); });
      if (!LS.get("seen", false)) { try { help.showModal(); } catch (e) {} LS.set("seen", true); }
    }

    buildPanel();
    render();
  });
})();

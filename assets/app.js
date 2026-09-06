/* Glosario de posturas — lógica de la galería (sin dependencias, funciona con file://) */
(function () {
  "use strict";
  var POSES = window.POSES || [];
  var META = window.META || { vocab: {}, conteos: {} };

  var LS = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem("glosario." + k)) ?? d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("glosario." + k, JSON.stringify(v)); } catch (e) {} }
  };

  var state = {
    lang: LS.get("lang", "es"),
    q: "",
    facets: LS.get("facets", { nivel: [], tipo: [], zona: [], dinamica: [] })
  };

  var T = {
    es: { entrada: "Cómo entrar", beneficios: "Beneficios", precaucion: "Precaución", flip: "girar",
          buscar: "Buscar postura, sánscrito, traducción…", nada: "Ninguna postura coincide con los filtros.",
          limpiar: "Limpiar filtros", de: "de", posturas: "posturas", nivelL: "Nivel", tipoL: "Tipo", zonaL: "Zona", dinL: "Dinámica",
          fuentePropia: "Ficha redactada para esta app — revísala con tu criterio.",
          fuenteApi: "Datos base: yoga-api (dominio público).", sinIlu: "sin ilustración" },
    en: { entrada: "How to enter", beneficios: "Benefits", precaucion: "Caution", flip: "flip",
          buscar: "Search pose, Sanskrit, translation…", nada: "No pose matches the filters.",
          limpiar: "Clear filters", de: "of", posturas: "poses", nivelL: "Level", tipoL: "Type", zonaL: "Zone", dinL: "Dynamic",
          fuentePropia: "Entry written for this app — review with your judgment.",
          fuenteApi: "Base data: yoga-api (public domain).", sinIlu: "no illustration" }
  };
  function t(k) { return (T[state.lang] || T.es)[k]; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---------- filtros ---------- */
  function buildFacets() {
    var host = $("#facets");
    host.innerHTML = "";
    var groups = [
      ["nivel", t("nivelL"), Object.keys(META.conteos.nivel || {})],
      ["tipo", t("tipoL"), (META.vocab.tipo || []).filter(function (v) { return META.conteos.tipo[v]; })],
      ["zona", t("zonaL"), (META.vocab.zona || []).filter(function (v) { return META.conteos.zona[v]; })],
      ["dinamica", t("dinL"), (META.vocab.dinamica || []).filter(function (v) { return META.conteos.dinamica[v]; })]
    ];
    groups.forEach(function (g) {
      var key = g[0], label = g[1], vals = g[2];
      var wrap = el("div", "facet-group");
      wrap.appendChild(el("span", "facet-label", label));
      vals.forEach(function (v) {
        var b = el("button", "tag", v);
        b.type = "button";
        b.setAttribute("aria-pressed", state.facets[key].indexOf(v) > -1 ? "true" : "false");
        b.addEventListener("click", function () {
          var arr = state.facets[key];
          var i = arr.indexOf(v);
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
    clr.id = "clearBtn";
    clr.type = "button";
    clr.addEventListener("click", function () {
      state.q = ""; $("#q").value = "";
      state.facets = { nivel: [], tipo: [], zona: [], dinamica: [] };
      LS.set("facets", state.facets);
      buildFacets(); render();
    });
    host.appendChild(clr);
  }

  function activeFilters() {
    return state.q || state.facets.nivel.length || state.facets.tipo.length || state.facets.zona.length || state.facets.dinamica.length;
  }

  function match(p) {
    var f = state.facets;
    if (f.nivel.length && f.nivel.indexOf(p.nivel) < 0) return false;
    if (f.tipo.length && !f.tipo.some(function (v) { return p.tipo.indexOf(v) > -1; })) return false;
    if (f.zona.length && !f.zona.some(function (v) { return p.zona.indexOf(v) > -1; })) return false;
    if (f.dinamica.length && !f.dinamica.some(function (v) { return p.dinamica.indexOf(v) > -1; })) return false;
    if (state.q) {
      var hay = (p.nombre + " " + p.nombre_en + " " + p.sanscrito + " " + p.traduccion).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  /* ---------- tarjeta ---------- */
  function card(p) {
    var name = state.lang === "en" ? p.nombre_en : p.nombre;
    var c = el("button", "card");
    c.type = "button";
    c.setAttribute("aria-label", name + " — " + t("flip"));
    var inner = el("div", "card-inner");

    // frente
    var front = el("div", "face front");
    var thumb = el("div", "thumb");
    if (p.img) {
      var img = el("img");
      img.src = p.img; img.alt = name; img.loading = "lazy";
      img.addEventListener("error", function () { thumb.classList.add("ph"); thumb.innerHTML = ""; thumb.appendChild(phInner(p)); });
      thumb.appendChild(img);
    } else {
      thumb.classList.add("ph");
      thumb.appendChild(phInner(p));
    }
    front.appendChild(thumb);
    var fm = el("div", "front-meta");
    fm.appendChild(el("p", "name", name));
    fm.appendChild(el("p", "san", p.sanscrito));
    var mc = el("div", "mini-chips");
    mc.appendChild(el("span", null, p.nivel));
    if (p.tipo[0]) mc.appendChild(el("span", null, p.tipo[0]));
    fm.appendChild(mc);
    front.appendChild(fm);
    front.appendChild(el("span", "flip-hint", t("flip") + " ⟳"));

    // reverso
    var back = el("div", "face back");
    var sc = el("div", "scroll");
    sc.appendChild(el("p", "name", name));
    sc.appendChild(el("p", "san", p.sanscrito + (p.traduccion ? " · " + p.traduccion : "")));

    sc.appendChild(el("h4", null, t("entrada")));
    if (state.lang === "en" && p.entrada_en) {
      sc.appendChild(el("p", "en-desc", p.entrada_en)).style.fontSize = "12px";
    } else {
      var ul = el("ul");
      p.entrada.forEach(function (x) { ul.appendChild(el("li", null, x)); });
      sc.appendChild(ul);
    }

    var bens = (state.lang === "en" && p.beneficios_en && p.beneficios_en.length) ? p.beneficios_en : p.beneficios;
    sc.appendChild(el("h4", null, t("beneficios")));
    var ub = el("ul");
    bens.forEach(function (x) { ub.appendChild(el("li", null, x)); });
    sc.appendChild(ub);

    if (p.precaucion && p.precaucion.length) {
      sc.appendChild(el("h4", null, t("precaucion")));
      var up = el("ul", "caution");
      p.precaucion.forEach(function (x) { up.appendChild(el("li", null, x)); });
      sc.appendChild(up);
    }

    var tr = el("div", "tag-row");
    [].concat(p.tipo, p.zona, p.dinamica, p.tema).forEach(function (x) { tr.appendChild(el("span", null, x)); });
    sc.appendChild(tr);

    sc.appendChild(el("p", "src", p.fuente === "propia" ? t("fuentePropia") : t("fuenteApi")));
    back.appendChild(sc);

    inner.appendChild(front);
    inner.appendChild(back);
    c.appendChild(inner);
    c.addEventListener("click", function () { c.classList.toggle("flipped"); });
    return c;
  }

  function phInner(p) {
    var d = document.createDocumentFragment();
    d.appendChild(el("span", "ph-san", p.sanscrito));
    d.appendChild(el("span", "ph-es", state.lang === "en" ? p.nombre_en : p.nombre));
    return d;
  }

  /* ---------- render ---------- */
  function render() {
    var list = POSES.filter(match);
    var grid = $("#grid");
    grid.innerHTML = "";
    if (!list.length) {
      grid.appendChild(el("p", "empty", t("nada")));
    } else {
      var frag = document.createDocumentFragment();
      list.forEach(function (p) { frag.appendChild(card(p)); });
      grid.appendChild(frag);
    }
    $("#count").textContent = list.length + " " + t("de") + " " + POSES.length + " " + t("posturas");
    var cb = $("#clearBtn"); if (cb) cb.disabled = !activeFilters();
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#q").placeholder = t("buscar");
    $("#q").value = state.q;
    $("#q").addEventListener("input", function (e) { state.q = e.target.value; render(); });

    document.querySelectorAll("#langSeg button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === state.lang ? "true" : "false");
      b.addEventListener("click", function () {
        state.lang = b.dataset.lang;
        LS.set("lang", state.lang);
        document.documentElement.lang = state.lang;
        document.querySelectorAll("#langSeg button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        $("#q").placeholder = t("buscar");
        buildFacets(); render();
      });
    });

    document.documentElement.lang = state.lang;
    var cr = $("#creditsLink"), dlg = $("#credits");
    if (cr && dlg) {
      cr.addEventListener("click", function () { dlg.showModal(); });
      $("#credits .dlg-close").addEventListener("click", function () { dlg.close(); });
    }

    buildFacets();
    render();
  });
})();

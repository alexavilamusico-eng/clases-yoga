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
    facets: LS.get("facets", { nivel: [], tipo: [], zona: [], dinamica: [] })
  };

  var T = {
    es: {
      entrada: "Cómo entrar", beneficios: "Beneficios", precaucion: "Precaución", etiquetas: "Etiquetas",
      buscar: "Buscar postura o sánscrito…", nada: "Ninguna postura coincide.", filtros: "Filtros",
      limpiar: "Quitar filtros", de: "de", posturas: "posturas",
      nivelL: "Nivel", tipoL: "Tipo", zonaL: "Zona del cuerpo", dinL: "Dinámica",
      propia: "Ficha redactada para esta app.", breve: "Ficha breve — por completar.", api: "Datos base: yoga-api."
    },
    en: {
      entrada: "How to enter", beneficios: "Benefits", precaucion: "Caution", etiquetas: "Tags",
      buscar: "Search pose or Sanskrit…", nada: "No pose matches.", filtros: "Filters",
      limpiar: "Clear filters", de: "of", posturas: "poses",
      nivelL: "Level", tipoL: "Type", zonaL: "Body zone", dinL: "Dynamic",
      propia: "Entry written for this app.", breve: "Short entry — to be completed.", api: "Base data: yoga-api."
    }
  };
  function t(k) { return (T[state.lang] || T.es)[k]; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

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
    if (p.img) {
      var img = el("img");
      img.src = p.img; img.alt = name; img.loading = "lazy";
      img.addEventListener("error", function () { thumb.classList.add("ph"); thumb.textContent = ""; thumb.appendChild(phInner(p)); });
      thumb.appendChild(img);
    } else {
      thumb.classList.add("ph");
      thumb.appendChild(phInner(p));
    }
    front.appendChild(thumb);
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

    var srcKey = p.fuente === "propia-breve" ? "breve" : (p.fuente === "propia" ? "propia" : "api");
    sc.appendChild(el("p", "src", t(srcKey)));
    back.appendChild(sc);

    inner.appendChild(front);
    inner.appendChild(back);
    c.appendChild(inner);
    c.addEventListener("click", function (e) {
      // dejar que los <details> del reverso funcionen sin voltear la tarjeta
      if (e.target.closest("details")) return;
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

    buildPanel();
    render();
  });
})();

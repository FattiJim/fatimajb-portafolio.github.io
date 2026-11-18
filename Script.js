(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  /* ----- Año del pie de página ----- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ----- Tema claro / oscuro ----- */
  var toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ----- Menú móvil ----- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("is-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ----- Filtro de proyectos ----- */
  var filters = document.querySelectorAll(".filter");
  var projects = document.querySelectorAll(".project");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      projects.forEach(function (p) {
        var cats = (p.getAttribute("data-cat") || "").split(" ");
        p.hidden = !(f === "all" || cats.indexOf(f) !== -1);
      });
    });
  });

  /* ============================================================
     GALERÍA DE CADA PROYECTO
     Para el proyecto con portada  img/el-globo.png  el sitio busca:
       img/el-globo.png            (portada)
       img/el-globo-1.png, -2.png, -3.png ...  (resto de la galería)
     Numera sin saltos: se detiene en el primer número que no exista.
     MAX_GALERIA es el máximo de fotos extra por proyecto.
     ============================================================ */
  var MAX_GALERIA = 12;

  function probe(url) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(true); };
      im.onerror = function () { resolve(false); };
      im.src = url;
    });
  }

  function splitUrl(src) {
    var i = src.lastIndexOf(".");
    return i > -1 ? { base: src.slice(0, i), ext: src.slice(i) } : { base: src, ext: "" };
  }

  function buildGallery(fig) {
    var img = fig.querySelector("img");
    var first = img && img.getAttribute("data-src");
    if (!first) return Promise.resolve();
    var parts = splitUrl(first);
    var urls = [];

    return probe(first)
      .then(function (ok) { if (ok) urls.push(first); })
      .then(function () {
        var n = 1;
        function next() {
          if (n > MAX_GALERIA) return Promise.resolve();
          var u = parts.base + "-" + n + parts.ext;
          return probe(u).then(function (ok) {
            if (!ok) return;
            urls.push(u);
            n += 1;
            return next();
          });
        }
        return next();
      })
      .then(function () {
        if (!urls.length) return;
        img.src = urls[0];
        fig.classList.add("has-img");
        fig._gallery = urls;
        if (urls.length > 1) {
          var badge = document.createElement("span");
          badge.className = "shot__count";
          badge.textContent = "▦ Galería · " + urls.length;
          fig.appendChild(badge);
        }
      });
  }

  var shots = document.querySelectorAll(".project__shot");
  shots.forEach(function (fig) { buildGallery(fig); });

  /* ----- Visor de galería ----- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCap = document.getElementById("lbCap");
  var lbClose = document.getElementById("lbClose");
  var lbPrev = document.getElementById("lbPrev");
  var lbNext = document.getElementById("lbNext");
  var lbThumbs = document.getElementById("lbThumbs");
  var current = { urls: [], i: 0, caption: "" };

  function show(i) {
    var n = current.urls.length;
    if (!n) return;
    current.i = (i + n) % n;
    lbImg.src = current.urls[current.i];
    lbImg.alt = "Captura " + (current.i + 1) + " de " + n + " — " + current.caption;
    lbCap.textContent = current.caption + (n > 1 ? "  ·  " + (current.i + 1) + " / " + n : "");
    Array.prototype.forEach.call(lbThumbs.children, function (b, k) {
      b.classList.toggle("is-active", k === current.i);
      if (k === current.i && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "center" });
    });
  }

  function openGallery(fig) {
    var urls = fig._gallery;
    if (!urls || !urls.length) return;
    current = { urls: urls, i: 0, caption: fig.getAttribute("data-caption") || "" };
    var many = urls.length > 1;
    lbPrev.hidden = !many;
    lbNext.hidden = !many;
    lbThumbs.innerHTML = "";
    if (many) {
      urls.forEach(function (u, k) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Ver imagen " + (k + 1));
        var t = document.createElement("img");
        t.src = u; t.alt = "";
        b.appendChild(t);
        b.addEventListener("click", function () { show(k); });
        lbThumbs.appendChild(b);
      });
    }
    show(0);
    lb.showModal();
  }

  if (lb && lbImg && typeof lb.showModal === "function") {
    shots.forEach(function (fig) {
      fig.addEventListener("click", function () { openGallery(fig); });
    });
    lbPrev.addEventListener("click", function () { show(current.i - 1); });
    lbNext.addEventListener("click", function () { show(current.i + 1); });
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target === lbClose) lb.close();
    });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(current.i - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(current.i + 1); }
    });
    /* deslizar en pantallas táctiles */
    var x0 = null;
    lbImg.addEventListener("touchstart", function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lbImg.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(current.i + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ----- Animación de entrada al hacer scroll ----- */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ----- Enlace activo en la navegación ----- */
  var links = document.querySelectorAll(".nav__links a");
  var sections = Array.prototype.map.call(links, function (a) {
    return document.querySelector(a.getAttribute("href"));
  });
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { if (s) so.observe(s); });
  }
})();
/* QSX AI — site behaviour (vanilla JS, no dependencies) */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var cfg = window.QSX_CONFIG || {};
  var dict = window.QSX_I18N || { en: {}, ar: {} };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function store(key, val) {
    try { if (val === undefined) { return window.sessionStorage.getItem(key); } window.sessionStorage.setItem(key, val); } catch (e) { /* storage unavailable */ }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Contact details from js/config.js (placeholders if left empty)
   * ------------------------------------------------------------------ */
  (function setupContacts() {
    var email = $('[data-contact="email"]');
    var wa = $('[data-contact="whatsapp"]');
    if (email) {
      if (cfg.email) {
        email.href = "mailto:" + cfg.email;
        email.textContent = cfg.email;
      } else {
        email.classList.add("is-placeholder");
        email.removeAttribute("href");
      }
    }
    if (wa) {
      var digits = String(cfg.whatsapp || "").replace(/\D/g, "");
      if (digits) {
        wa.href = "https://wa.me/" + digits;
        wa.target = "_blank";
        wa.rel = "noopener noreferrer";
        wa.textContent = "+" + digits;
      } else {
        wa.classList.add("is-placeholder");
        wa.removeAttribute("href");
      }
    }
  })();

  /* ------------------------------------------------------------------ *
   * Language system (EN / AR) — real lang + dir switching
   * ------------------------------------------------------------------ */
  var lang = "en";
  var menuBtn = $("[data-menu-btn]");
  var panel = $("[data-nav-panel]");
  var langBtn = $("[data-lang-toggle]");
  var langLabel = $("[data-lang-label]");
  var form = $("[data-form]");
  var note = $("[data-form-note]");

  function t(key) {
    var d = dict[lang] || {};
    return d[key] !== undefined ? d[key] : (dict.en[key] || key);
  }

  function applyLang(next) {
    lang = next === "ar" ? "ar" : "en";
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    var year = String(new Date().getFullYear());

    $$("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n")).replace("{year}", year);
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    $$("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });

    doc.title = t("meta.title");
    var meta = $('meta[name="description"]');
    if (meta) { meta.setAttribute("content", t("meta.desc")); }

    if (langLabel) {
      langLabel.textContent = t("lang.label");
      langLabel.lang = lang === "ar" ? "en" : "ar";
    }
    if (langBtn) { langBtn.setAttribute("aria-label", t("lang.aria")); }
    updateMenuLabel();
    if (note) { note.textContent = ""; note.classList.remove("warn"); }
    store("qsx-lang", lang);
  }

  function initialLang() {
    var q = /[?&]lang=(ar|en)\b/.exec(window.location.search);
    if (q) { return q[1]; }
    var saved = store("qsx-lang");
    if (saved === "ar" || saved === "en") { return saved; }
    return /^ar\b/i.test(navigator.language || "") ? "ar" : "en";
  }

  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(lang === "en" ? "ar" : "en");
      requestScenePaint();
    });
  }

  /* ------------------------------------------------------------------ *
   * Mobile menu
   * ------------------------------------------------------------------ */
  var desktopNav = window.matchMedia("(min-width: 1024px)");

  function updateMenuLabel() {
    if (!menuBtn) { return; }
    var open = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-label", t(open ? "menu.close" : "menu.open"));
  }
  function setMenu(open, returnFocus) {
    if (!menuBtn || !panel) { return; }
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.classList.toggle("open", open);
    doc.body.classList.toggle("menu-open", open);
    updateMenuLabel();
    if (!open && returnFocus) { menuBtn.focus(); }
  }
  if (menuBtn && panel) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) { setMenu(false); }
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false, true); }
    });
    var onBreakpoint = function () { if (desktopNav.matches) { setMenu(false); } };
    if (desktopNav.addEventListener) { desktopNav.addEventListener("change", onBreakpoint); }
    else if (desktopNav.addListener) { desktopNav.addListener(onBreakpoint); }
  }

  /* ------------------------------------------------------------------ *
   * Scroll reveals + workflow line
   * ------------------------------------------------------------------ */
  var reveals = $$(".reveal");
  var flow = $("[data-flow]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    if (flow) {
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { flow.classList.add("lit"); fio.disconnect(); }
        });
      }, { threshold: 0.3 });
      fio.observe(flow);
    }
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
    if (flow) { flow.classList.add("lit"); }
  }

  /* ------------------------------------------------------------------ *
   * Hero scene — scroll-driven progress (0 → 1)
   * ------------------------------------------------------------------ */
  var scene = $("[data-scene]");
  var track = $("[data-hero-track]");
  var nodes = $$("[data-node]");
  var links = $$("[data-link]");
  var stickyMQ = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
  var cur = reduceMotion ? 0.85 : 0;
  var tgt = cur;
  var raf = 0;
  var sceneVisible = true;

  function targetProgress() {
    if (reduceMotion) { return 0.85; }
    var vh = window.innerHeight || 800;
    if (stickyMQ.matches && track) {
      var sticky = track.firstElementChild;
      var r = track.getBoundingClientRect();
      var hdr = parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 64;
      var dist = Math.max(1, r.height - (sticky ? sticky.offsetHeight : vh));
      return clamp((hdr - r.top) / (dist * 0.85), 0, 1);
    }
    var s = scene.getBoundingClientRect();
    return clamp((vh * 0.95 - s.top) / (vh * 0.8), 0, 1);
  }

  function paint(p) {
    scene.style.setProperty("--p", p.toFixed(3));
    nodes.forEach(function (n, i) {
      n.style.setProperty("--a", clamp(p * 2 - i * 0.3, 0, 1).toFixed(3));
    });
    links.forEach(function (l, i) {
      l.style.strokeDashoffset = (1 - clamp(p * 1.5 - 0.1 - i * 0.12, 0, 1)).toFixed(3);
    });
  }

  function tick() {
    raf = 0;
    var d = tgt - cur;
    if (Math.abs(d) < 0.002) { cur = tgt; } else { cur += d * 0.14; }
    paint(cur);
    if (cur !== tgt && sceneVisible) { raf = requestAnimationFrame(tick); }
  }
  function requestScenePaint() {
    tgt = targetProgress();
    if (reduceMotion) { cur = tgt; paint(cur); return; }
    if (!raf) { raf = requestAnimationFrame(tick); }
  }

  if (scene) {
    var svgEl = $(".links", scene);
    if (reduceMotion && svgEl && svgEl.pauseAnimations) { svgEl.pauseAnimations(); }

    tgt = targetProgress();
    cur = reduceMotion ? tgt : tgt;       // start from the real position, no jump on load
    paint(cur);

    window.addEventListener("scroll", requestScenePaint, { passive: true });
    window.addEventListener("resize", requestScenePaint);
    if (stickyMQ.addEventListener) { stickyMQ.addEventListener("change", requestScenePaint); }

    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver(function (entries) {
        sceneVisible = entries[0].isIntersecting;
        if (svgEl && svgEl.pauseAnimations) { sceneVisible ? svgEl.unpauseAnimations() : svgEl.pauseAnimations(); }
        if (sceneVisible) { requestScenePaint(); }
      }).observe(scene);
    }
  }

  /* ------------------------------------------------------------------ *
   * Service cards pre-select the matching option in the contact form
   * ------------------------------------------------------------------ */
  $$("[data-service]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = $("#f-service");
      if (sel) { sel.value = a.getAttribute("data-service"); }
    });
  });

  /* ------------------------------------------------------------------ *
   * Contact form → opens the visitor's email app (no backend needed)
   * ------------------------------------------------------------------ */
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name;
      var contact = form.elements.contact;
      var service = form.elements.service;
      var msg = form.elements.message;

      [name, contact].forEach(function (f) { f.classList.toggle("invalid", !f.value.trim()); });
      note.classList.remove("warn");

      if (!name.value.trim() || !contact.value.trim()) {
        note.textContent = t("ct.note.fill");
        note.classList.add("warn");
        (name.value.trim() ? contact : name).focus();
        return;
      }
      if (!cfg.email) {
        note.textContent = t("ct.note.missing");
        note.classList.add("warn");
        return;
      }
      var body = [
        t("ct.mail.name") + ": " + name.value.trim(),
        t("ct.mail.contact") + ": " + contact.value.trim(),
        t("ct.mail.interest") + ": " + service.options[service.selectedIndex].text,
        "",
        msg.value.trim()
      ].join("\n");
      note.textContent = t("ct.note.ok");
      window.location.href = "mailto:" + encodeURIComponent(cfg.email).replace("%40", "@") +
        "?subject=" + encodeURIComponent(t("ct.mail.subject")) + "&body=" + encodeURIComponent(body);
    });
  }

  /* ------------------------------------------------------------------ */
  applyLang(initialLang());
})();

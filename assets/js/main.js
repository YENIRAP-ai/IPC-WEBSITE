/* Industrial Packaging Company
   Three signature moves and nothing else:
     1  the cinematic hero handover
     2  the plate reveal — every large image enters by a clip wipe
   Everything animated is transform, opacity or clip-path. */
(function () {
  "use strict";
  var html = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = function () { return matchMedia("(min-width: 901px)").matches; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* cubic-bezier(0.16, 1, 0.3, 1), solved rather than approximated */
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return function (x) {
      var t = x, i, d, s;
      for (i = 0; i < 6; i++) {
        d = ((ax * t + bx) * t + cx) * t - x; if (Math.abs(d) < 1e-6) break;
        s = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(s) < 1e-6) break; t -= d / s;
      }
      t = clamp(t, 0, 1);
      return ((ay * t + by) * t + cy) * t;
    };
  }

  /* ── nav: shrink, tone, mobile panel ──────────────────────────────────── */
  /* The mark's swoosh completes its circle, then the page goes home. Only
     plain left clicks are held back — cmd/ctrl/middle click must still open a
     new tab, and reduced motion skips straight to navigating. */
  /* Hold the plate's crossfade until it is on screen, so it always starts on
     the first image rather than wherever the clock happens to be. */
  function initSwap() {
    var els = [].slice.call(document.querySelectorAll(".swap"));
    if (!els.length) return;
    if (!window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add("is-live"); });
      return;
    }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (row) {
        if (row.isIntersecting) { row.target.classList.add("is-live"); io.unobserve(row.target); }
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  function initBrand() {
    var a = document.querySelector("[data-brand]");
    if (!a) return;
    a.addEventListener("click", function (e) {
      if (reduce || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (a.classList.contains("is-go")) return;
      a.classList.add("is-go");
      var go = function () { location.href = a.href; };
      var ring = a.querySelector(".brand__swoosh");
      var done = false;
      var fire = function () { if (!done) { done = true; go(); } };
      if (ring) ring.addEventListener("animationend", fire, { once: true });
      setTimeout(fire, 900);          /* in case the animation never runs */
    });
  }

  function initNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var tones = [].slice.call(document.querySelectorAll("[data-tone]"));
    var last = "", q = false;

    function read() {
      q = false;
      nav.classList.toggle("small", (window.scrollY || 0) > 70);
      /* Which room is the bar standing in? Read it from geometry every frame
         so it can never end up bone-on-bone. */
      for (var i = tones.length - 1; i >= 0; i--) {
        var r = tones[i].getBoundingClientRect();
        if (r.top <= 70 && r.bottom > 70) {
          var t = tones[i].getAttribute("data-tone") || "bone";
          if (t !== last) { last = t; html.setAttribute("data-nav", t); }
          return;
        }
      }
      if (last !== "bone") { last = "bone"; html.setAttribute("data-nav", "bone"); }
    }
    function onScroll() { if (!q) { q = true; requestAnimationFrame(read); } }
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener("refresh", read);
    read();
    window.__ipcTone = read;

    var burger = nav.querySelector(".nav__burger");
    if (!burger) return;
    function shut() {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      burger.querySelector(".txt").textContent = "Menu";
    }
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.querySelector(".txt").textContent = open ? "Close" : "Menu";
    });
    addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { shut(); burger.focus(); }
    });
    nav.querySelectorAll(".nav__panel a").forEach(function (a) { a.addEventListener("click", shut); });
  }

  /* The product band drifts continuously and the arrows nudge it. Both act on
     scrollLeft, so an arrow press just sets a target the same loop travels to,
     after which the drift carries on. The list is duplicated once, so wrapping
     at the halfway mark is invisible. */
  function initMarquee() {
    var band = document.querySelector("[data-marquee]");
    if (!band) return;
    var track = band.querySelector(".marquee__track");
    var btns = [].slice.call(document.querySelectorAll("[data-marq]"));
    var DRIFT = 0.55;              /* px per frame — about 33px a second */
    var half = 0, target = null, raf = null;

    function measure() {
      half = track.scrollWidth / 2;
      var card = track.querySelector(".card");
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : 320;
    }
    var step = measure();
    addEventListener("resize", function () { step = measure(); }, { passive: true });

    function wrap() {
      if (!half) return;
      if (band.scrollLeft >= half) {
        band.scrollLeft -= half;
        if (target !== null) target -= half;
      } else if (band.scrollLeft < 0) {
        band.scrollLeft += half;
        if (target !== null) target += half;
      }
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      if (target !== null) {
        var d = target - band.scrollLeft;
        if (Math.abs(d) < 0.6) { band.scrollLeft = target; target = null; }
        else band.scrollLeft += d * 0.16;
      } else if (!band.matches(":focus-within")) {
        /* keyboard focus holds it still, so tabbing is not a moving target */
        band.scrollLeft += DRIFT;
      }
      wrap();
    }
    function start() {
      if (reduce || raf !== null) return;
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    /* The band stays still until it is on screen, then moves straight away.
       Drifting from page load meant a visitor who scrolled down arrived
       mid-travel and never saw the first card. */
    if (!reduce && window.IntersectionObserver) {
      new IntersectionObserver(function (rows) {
        rows.forEach(function (row) {
          if (row.isIntersecting) start(); else stop();
        });
      }, { rootMargin: "0px 0px -15% 0px" }).observe(band);
    } else {
      start();
    }

    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var dir = parseInt(b.getAttribute("data-marq"), 10) || 1;
        if (reduce) {
          band.scrollBy({ left: dir * step, behavior: "smooth" });
          return;
        }
        target = (target === null ? band.scrollLeft : target) + dir * step;
        start();
      });
    });
    /* a drag or a wheel hands control over for a moment, then it resumes */
    ["pointerdown", "wheel", "touchstart"].forEach(function (ev) {
      band.addEventListener(ev, function () { target = null; }, { passive: true });
    });
  }

  function resolveStatic() {
    html.classList.remove("js");
    document.querySelectorAll("[data-hline]").forEach(function (l) { l.style.transform = "none"; });
  }

  /* ── motion ───────────────────────────────────────────────────────────── */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    gsap.registerEase("ipc", bezier(0.16, 1, 0.3, 1));

    var lenis = null;
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      html.classList.add("js");          /* Lenis rewrites the root class list */
    }
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        var t = id && document.getElementById(id);
        if (!t) return;
        e.preventDefault();
        var y = t.getBoundingClientRect().top + window.scrollY - 80;
        if (lenis) lenis.scrollTo(y, { duration: 1.15 }); else scrollTo(0, y);
        history.replaceState(null, "", "#" + id);
      });
    });

    /* Anything in the first screen animates on load. A call to action that
       waits for a scroll trigger is a call to action nobody sees. */
    var above = [].slice.call(document.querySelectorAll(".hero [data-rev], .phead [data-rev]"));
    if (above.length) {
      gsap.to(above, { opacity: 1, y: 0, duration: .85, ease: "ipc", stagger: .075, delay: .08 });
    }
    gsap.utils.toArray("[data-rev]").forEach(function (el) {
      if (above.indexOf(el) > -1) return;
      gsap.to(el, { opacity: 1, y: 0, duration: .85, ease: "ipc",
        scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    gsap.utils.toArray("[data-rev-group]").forEach(function (g) {
      gsap.to(g.children, { opacity: 1, y: 0, duration: .85, ease: "ipc", stagger: .07,
        scrollTrigger: { trigger: g, start: "top 88%", once: true } });
    });

    /* 2 — plate reveal */
    gsap.utils.toArray(".mask").forEach(function (f) {
      var im = f.querySelector("img");
      var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: "top 86%", once: true } });
      tl.to(f, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, ease: "ipc" }, 0);
      if (im) tl.to(im, { scale: 1, duration: 1.4, ease: "ipc" }, 0);
    });

    var lines = document.querySelectorAll("[data-hline]");
    if (lines.length) gsap.to(lines, { y: "0%", duration: 1.05, ease: "ipc", stagger: .09, delay: .05 });

    /* 1 — cinematic hero handover */
    var bg = document.querySelector("[data-hero-bg]");
    if (bg) {
      gsap.to(bg, { scale: 1.09, ease: "none",
        scrollTrigger: { trigger: bg.closest(".hero"), start: "top top", end: "bottom top",
          scrub: .5 } });
    }

    /* a visitor arriving on /#enquiry must land there; Lenis owns the scroll */
    function honourHash() {
      var id = (location.hash || "").slice(1);
      var t = id && document.getElementById(id);
      if (!t) return;
      ST.refresh();
      var y = t.getBoundingClientRect().top + window.scrollY - 80;
      if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
    }
    addEventListener("load", function () { ST.refresh(); honourHash(); setTimeout(honourHash, 120); });
  }

  /* ── enquiry form ─────────────────────────────────────────────────────── */
  /* Enquiries go to the mailbox by email: submitting opens the visitor's mail
     client with every answer already written into the body. There is no file
     upload, so nothing is lost on that path. Setting this to a form handler's
     URL would switch to a background POST instead. */
  var ENDPOINT = "";
  /* Where the fallback email goes. Change this when the mailbox is live. */
  var ENQUIRY_EMAIL = "info@industrialpackagingco.com";

  function initForm() {
    var form = document.getElementById("rfq");
    if (!form) return;
    var status = document.getElementById("rfq-status");
    var go = document.getElementById("rfq-go");
    var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; };

    function mark(el, msg) {
      var f = el.closest(".field");
      var slot = form.querySelector('[data-err="' + el.id + '"]');
      if (f) f.classList.toggle("bad", !!msg);
      if (slot) slot.textContent = msg || "";
      el.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    function validate() {
      var bad = [];
      [["f-company", "Company name is required"],
       ["f-contact", "Contact name is required"],
       ["f-qty", "Monthly quantity is required"]].forEach(function (p) {
        var el = document.getElementById(p[0]);
        var m = el.value.trim() ? "" : p[1];
        mark(el, m); if (m) bad.push(el);
      });
      var em = document.getElementById("f-email"), v = em.value.trim();
      var m = !v ? "Email is required"
        : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "Check the email address" : "";
      mark(em, m); if (m) bad.push(em);
      var pr = document.getElementById("f-product");
      var pm = pr.value ? "" : "Pick a product line";
      mark(pr, pm); if (pm) bad.push(pr);
      return bad;
    }
    function summary() {
      return ["Company: " + g("f-company"), "Contact: " + g("f-contact"),
        "Email: " + g("f-email"), "Phone: " + g("f-phone"), "",
        "Product line: " + g("f-product"), "Monthly quantity: " + g("f-qty"), "",
        "What they need:", g("f-app")].join("\n");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      /* Bot trap. The field is hidden from people, so a filled one is a bot.
         Say nothing and do nothing — a visible rejection teaches it to adapt. */
      var trap = document.getElementById("f-web");
      if (trap && trap.value) { form.reset(); return; }
      status.className = "form__status";
      var bad = validate();
      if (bad.length) {
        status.textContent = bad.length + (bad.length === 1 ? " field needs" : " fields need") + " attention.";
        bad[0].focus();
        return;
      }
      if (!ENDPOINT) {
        location.href = "mailto:" + ENQUIRY_EMAIL + "?subject=" +
          encodeURIComponent("Specification enquiry — " + g("f-company")) +
          "&body=" + encodeURIComponent(summary());
        status.className = "form__status ok";
        status.textContent = "Your email program should now be open with the enquiry filled in. " +
          "Press send, and we will reply to it. If nothing opened, email " + ENQUIRY_EMAIL +
          " or call the number above.";
        return;
      }
      go.disabled = true;
      status.textContent = "Sending…";
      fetch(ENDPOINT, { method: "POST", body: new FormData(form) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset();
          status.className = "form__status ok";
          status.textContent = "Enquiry received. You will get a written reply, and a call if the " +
            "spec needs a question answered first."; })
        .catch(function () {
          status.className = "form__status";
          status.textContent = "That did not send. Please email " + ENQUIRY_EMAIL + " or call " +
            "+91 93114 44625 instead."; })
        .then(function () { go.disabled = false; });
    });
    form.addEventListener("input", function (e) {
      if (e.target.id && e.target.closest(".field.bad")) mark(e.target, "");
    });
  }

  function start() {
    window.__ipc = true;
    initNav();
    initBrand();
    initSwap();
    initMarquee();
    initForm();
    if (reduce || !window.gsap || !window.ScrollTrigger) { resolveStatic(); return; }
    initMotion();
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start);
  else start();
})();

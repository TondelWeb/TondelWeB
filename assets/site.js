/* Tondelweb Catalog: site interactions */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- nav ---------- */
  var nav = $("#nav");
  var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 40); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var menuBtn = $("#menu-btn"), links = $("#nav-links");
  menuBtn.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("#nav-links a").forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- scroll reveal (staggered per group) ---------- */
  var groups = new Map();
  $$(".reveal").forEach(function (el) {
    var parent = el.parentElement;
    var i = groups.get(parent) || 0;
    el.style.setProperty("--d", (i * 0.08).toFixed(2) + "s");
    groups.set(parent, i + 1);
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- steps line draws with scroll ---------- */
  var steps = $("#steps"), path = $("#steps-path");
  if (steps && path && !reduce) {
    var drawLine = function () {
      var r = steps.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      path.style.strokeDashoffset = String(1000 - 1000 * p);
    };
    drawLine();
    window.addEventListener("scroll", drawLine, { passive: true });
  }

  /* ---------- counters ---------- */
  var counters = $$("[data-count]");
  var runCount = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduce || target === 0) { el.textContent = String(target); return; }
    var start = null, dur = 1400;
    var step = function (t) {
      if (!start) start = t;
      var k = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(target * eased));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  } else { counters.forEach(runCount); }

  /* ---------- card spotlight + tilt ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduce) {
    $$("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        card.style.transform = "rotateX(" + ((0.5 - y) * 6).toFixed(2) + "deg) rotateY(" + ((x - 0.5) * 8).toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- hero grid canvas ---------- */
  var canvas = $("#hero-grid");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var cell = 34, cols = 0, rows = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var lit = [];
    var size = function () {
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(r.width / cell) + 1;
      rows = Math.ceil(r.height / cell) + 1;
    };
    var draw = function (now) {
      var w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) { ctx.moveTo(c * cell + 0.5, 0); ctx.lineTo(c * cell + 0.5, h); }
      for (var r = 0; r <= rows; r++) { ctx.moveTo(0, r * cell + 0.5); ctx.lineTo(w, r * cell + 0.5); }
      ctx.stroke();
      for (var i = lit.length - 1; i >= 0; i--) {
        var L = lit[i];
        var age = (now - L.t) / L.life;
        if (age >= 1) { lit.splice(i, 1); continue; }
        var a = Math.sin(age * Math.PI) * L.a;
        ctx.fillStyle = L.bad ? "rgba(255,85,51," + a.toFixed(3) + ")" : "rgba(217,255,51," + a.toFixed(3) + ")";
        ctx.fillRect(L.c * cell + 1, L.r * cell + 1, cell - 1, cell - 1);
      }
    };
    var running = true, last = 0;
    var loop = function (now) {
      if (!running) return;
      if (now - last > 140 && lit.length < 26) {
        last = now;
        lit.push({ c: Math.floor(Math.random() * cols), r: Math.floor(Math.random() * rows), t: now, life: 1800 + Math.random() * 1800, a: 0.05 + Math.random() * 0.1, bad: Math.random() < 0.12 });
      }
      draw(now);
      requestAnimationFrame(loop);
    };
    size();
    window.addEventListener("resize", size);
    if (reduce) {
      draw(0);
    } else {
      var hero = $(".hero");
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          var vis = entries[0].isIntersecting;
          if (vis && !running) { running = true; requestAnimationFrame(loop); }
          if (!vis) running = false;
        }).observe(hero);
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) running = false;
        else if (!running) { running = true; requestAnimationFrame(loop); }
      });
      requestAnimationFrame(loop);
    }
  }

  /* ---------- hero console: cycles through example checks ---------- */
  var scenarios = [
    { sku: "EX-BL-0102", product: "A19 LED Bulb 11W 2700K", field: "Lumens", sup: "1100", store: "(blank)", fixNew: "1100", src: 'price_list.xlsx · row 14 · "Lumens" · "1100"', kind: "fix" },
    { sku: "EX-BL-0113", product: "GU10 LED Bulb 6W 2700K", field: "Color temp", sup: "2700K", store: "3000", fixNew: "2700", src: 'price_list.xlsx · row 26 · "Color Temp (K)" · "2700K"', kind: "fix" },
    { sku: "EX-BL-0114", product: "GU10 LED Bulb 6W 4000K", field: "Wattage", sup: "6", store: "60W equivalent", fixNew: "6", src: 'price_list.xlsx · row 17 · "Watts" · "6"', kind: "fix" },
    { sku: "EX-BL-0112", product: "MR16 LED Bulb 6W 3000K", field: "Barcode", sup: "200000004446", store: "200000004449", fixNew: "200000004446", src: 'price_list.xlsx · row 15 · "UPC" · check digit valid', kind: "fix" },
    { sku: "EX-BL-0120", product: "Corn Bulb 36W 5000K", field: "Voltage", sup: "120-277V", store: "120V", fixNew: "flag for review", src: "protected field: never changed automatically", kind: "flag" }
  ];
  var el = {
    sku: $("#c-sku"), product: $("#c-product"), row: $("#c-row"), field: $("#c-field"), sup: $("#c-sup"),
    store: $("#c-store"), scan: $("#c-scan"), fix: $("#c-fix"), label: $("#c-fix-label"), old: $("#c-old"),
    neu: $("#c-new"), src: $("#c-src"), count: $("#c-count"), fixes: $("#c-fixes"), status: $("#console-status")
  };
  if (el.row) {
    var issues = 0, fixes = 0, idx = 0, timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var fill = function (s) {
      el.sku.textContent = "SKU " + s.sku;
      el.product.textContent = s.product;
      el.field.textContent = s.field;
      el.sup.textContent = s.sup;
      el.store.textContent = s.store;
      el.old.textContent = s.store;
      el.neu.textContent = s.fixNew;
      el.src.textContent = s.src;
      el.label.textContent = s.kind === "flag" ? "Flagged for you (protected field)" : "Proposed fix";
      el.fix.classList.toggle("is-flag", s.kind === "flag");
      el.row.classList.toggle("is-warn", s.kind === "flag");
    };
    var showStatic = function () {
      fill(scenarios[0]);
      el.row.classList.add("flash");
      el.fix.classList.add("show");
      el.count.textContent = "5"; el.fixes.textContent = "4";
      el.status.textContent = "done";
    };
    var play = function () {
      var s = scenarios[idx % scenarios.length];
      el.row.classList.add("swap");
      el.row.classList.remove("flash");
      el.fix.classList.remove("show");
      el.status.textContent = "checking";
      later(function () { fill(s); el.row.classList.remove("swap"); }, 380);
      later(function () { el.scan.classList.remove("run"); void el.scan.offsetWidth; el.scan.classList.add("run"); }, 700);
      later(function () { el.row.classList.add("flash"); issues++; el.count.textContent = String(issues); }, 1500);
      later(function () {
        el.fix.classList.add("show");
        if (s.kind === "fix") { fixes++; el.fixes.textContent = String(fixes); }
        el.status.textContent = s.kind === "flag" ? "flagged" : "fix ready";
      }, 2100);
      idx++;
      later(play, 4600);
    };
    if (reduce) { showStatic(); }
    else {
      var cons = $("#console"), playing = false;
      var start = function () { if (!playing) { playing = true; later(play, 900); } };
      var stop = function () { playing = false; timers.forEach(clearTimeout); timers = []; };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) { entries[0].isIntersecting ? start() : stop(); }, { threshold: 0.2 }).observe(cons);
      } else { start(); }
      document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
    }
  }

  /* ---------- contact form (Formspree) ---------- */
  var form = $("#contact-form");
  if (form) {
    var status = $("#form-status"), btn = $("#f-submit");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      if (!form.checkValidity()) {
        status.textContent = "Please fill in your name, a valid email and a message.";
        status.classList.add("err");
        var bad = form.querySelector(":invalid");
        if (bad) bad.focus();
        return;
      }
      var payload = {
        name: form.name.value,
        email: form.email.value,
        store: form.store.value,
        message: form.message.value,
        _subject: "New Tondelweb Catalog inquiry"
      };
      btn.disabled = true;
      btn.textContent = "Sending…";
      fetch(form.action, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        status.textContent = "Thanks! Your message is in. We'll reply within one business day.";
        status.classList.add("ok");
        form.reset();
        btn.textContent = "Sent";
      }).catch(function () {
        status.textContent = "Something went wrong. Please try again in a minute.";
        status.classList.add("err");
        btn.disabled = false;
        btn.textContent = "Send message";
      });
    });
  }

  var y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

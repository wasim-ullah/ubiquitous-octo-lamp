(function () {
  var root = document.documentElement;
  root.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if (!hasIO || reduce) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  // Lazy-start the film when it nears the viewport
  var film = document.querySelector("video[data-src]");
  if (film) {
    var startFilm = function () {
      film.src = film.dataset.src;
      film.removeAttribute("data-src");
      var p = film.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (!hasIO) startFilm();
    else {
      var vio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { startFilm(); vio.disconnect(); }
      }, { rootMargin: "300px" });
      vio.observe(film);
    }
  }

  // Scroll effects: headline drifts between the image layers, film frame unmasks
  var stages = Array.prototype.slice.call(document.querySelectorAll("[data-parallax-stage]"));
  var mask = document.querySelector("[data-reveal-mask]");
  var doodles = Array.prototype.slice.call(document.querySelectorAll(".doodle"));
  if (reduce) {
    if (mask) mask.style.setProperty("--mask", "0%");
    return;
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;

    stages.forEach(function (stage) {
      var r = stage.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      // progress: 0 when the stage top meets the viewport bottom, 1 when its bottom meets the viewport top
      var progress = (vh - r.top) / (vh + r.height);
      var title = stage.querySelector("[data-parallax-title]");
      if (title) title.style.transform = "translate3d(0," + ((progress - 0.5) * -120).toFixed(1) + "px,0)";
    });

    if (mask) {
      var m = mask.getBoundingClientRect();
      var t = Math.min(Math.max((vh - m.top) / (vh * 0.75), 0), 1);
      mask.style.setProperty("--mask", (10 * (1 - t)).toFixed(2) + "%");
    }

    // brand doodle draws itself as its card scrolls into view
    doodles.forEach(function (svg) {
      var d = svg.parentElement.getBoundingClientRect();
      var k = Math.min(Math.max((vh - d.top) / (vh * 0.9), 0), 1);
      svg.style.setProperty("--draw", (1 - k).toFixed(3));
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// Campaign tracking: UTM values come from the landing page URL, with this campaign's defaults.
var UTM_DEFAULTS = {
  utm_source: "facebook",
  utm_medium: "paid",
  utm_campaign: "ca_nov10_101126_en",
  utm_content: "nov10_en",
  utm_term: "nov10"
};
function readUtms() {
  var out = {}, q = new URLSearchParams(window.location.search), saved = {};
  try { saved = JSON.parse(sessionStorage.getItem("bai_utm") || "{}"); } catch (e) {}
  Object.keys(UTM_DEFAULTS).forEach(function (k) {
    out[k] = (q.get(k) || saved[k] || UTM_DEFAULTS[k]).slice(0, 120);
  });
  try { sessionStorage.setItem("bai_utm", JSON.stringify(out)); } catch (e) {}
  return out;
}
var UTMS = readUtms();

// Quote form: sends each lead to Skye and by email (api/lead.js).
// If both fail, it falls back to WhatsApp so no lead is lost.
(function () {
  var WHATSAPP = "971581935845";
  var form = document.getElementById("quote-form");
  var err = document.getElementById("form-error");
  var done = document.getElementById("form-done");
  var btn = document.getElementById("q-submit");
  if (!form) return;

  function whatsappFallback(p) {
    var msg = "Hi BuyAnyInsurance, I'd like a car insurance quote.\nName: " + p.name + "\nMobile: " + p.phone +
      "\nEmail: " + p.email + "\nCover: " + p.cover;
    err.innerHTML = 'We could not send that online right now. <a href="https://wa.me/' + WHATSAPP + "?text=" +
      encodeURIComponent(msg) + '" target="_blank" rel="noopener">Send it on WhatsApp instead</a> or call <a href="tel:800765429">800 765 429</a>.';
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = "Get my quotes";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var p = {
      name: String(d.get("name") || "").trim(),
      phone: String(d.get("phone") || "").trim(),
      email: String(d.get("email") || "").trim(),
      cover: String(d.get("cover") || "Comprehensive"),
      page: window.location.href,
      _honey: String(d.get("_honey") || "")
    };
    Object.keys(UTMS).forEach(function (k) { p[k] = UTMS[k]; });

    if (!p.name || p.phone.replace(/\D/g, "").length < 9 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
      err.textContent = "Please add your name, a valid mobile number and a valid email.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Sending...";

    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function () {
        form.querySelector(".fields").hidden = true;
        btn.hidden = true;
        form.querySelector(".form-note").hidden = true;
        done.hidden = false;
        if (window.fbq) window.fbq("track", "Lead");
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "generate_lead",
          lead_type: "car_insurance",
          cover_type: p.cover,
          utm_source: p.utm_source, utm_medium: p.utm_medium, utm_campaign: p.utm_campaign,
          utm_content: p.utm_content, utm_term: p.utm_term
        });
      })
      .catch(function () { clearTimeout(timer); whatsappFallback(p); });
  });
})();

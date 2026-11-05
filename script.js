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

// Quote form: emails each lead to the BuyAnyInsurance team via FormSubmit
(function () {
  var ENDPOINT = "https://formsubmit.co/ajax/wasim.ullah@buyanyinsurance.com";
  var form = document.getElementById("quote-form");
  var err = document.getElementById("form-error");
  var done = document.getElementById("form-done");
  var btn = document.getElementById("q-submit");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    if (String(d.get("_honey") || "")) return; // bot trap
    var name = String(d.get("name") || "").trim();
    var phone = String(d.get("phone") || "").trim();
    var car = String(d.get("car") || "").trim();
    var year = String(d.get("year") || "").trim();

    if (!name || phone.replace(/\D/g, "").length < 9 || !car) {
      err.textContent = "Please add your name, a valid mobile number and your car.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Sending...";

    var payload = {
      _subject: "New car insurance lead: " + name + " (" + car + ")",
      _template: "table",
      _captcha: "false",
      Name: name,
      Mobile: phone,
      Car: car + (year ? " (" + year + ")" : ""),
      Emirate: String(d.get("emirate")),
      Cover: String(d.get("cover")),
      Page: window.location.href
    };

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) === "false") throw new Error(res.j.message || "Send failed");
        form.querySelector(".fields").hidden = true;
        btn.hidden = true;
        form.querySelector(".form-note").hidden = true;
        done.hidden = false;
        if (window.fbq) window.fbq("track", "Lead");
      })
      .catch(function () {
        err.innerHTML = 'Sorry, that did not go through. Please call <a href="tel:800765429">800 765 429</a> or <a href="https://wa.me/971581935845" target="_blank" rel="noopener">WhatsApp us</a>.';
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = "Get my quotes";
      });
  });
})();

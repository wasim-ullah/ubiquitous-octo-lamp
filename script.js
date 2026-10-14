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
      mask.style.setProperty("--mask", (14 * (1 - t)).toFixed(2) + "%");
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// Quote form: opens WhatsApp with the driver's details prefilled
(function () {
  var WHATSAPP = "971581935845";
  var form = document.getElementById("quote-form");
  var err = document.getElementById("form-error");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
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

    var msg =
      "Hi BuyAnyInsurance, I'd like a car insurance quote.\n" +
      "Name: " + name + "\n" +
      "Mobile: " + phone + "\n" +
      "Car: " + car + (year ? " (" + year + ")" : "") + "\n" +
      "Emirate: " + d.get("emirate") + "\n" +
      "Cover: " + d.get("cover");

    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  });
})();

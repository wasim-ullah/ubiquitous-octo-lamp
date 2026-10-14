// Lazy-start background videos that sit below the fold.
(function () {
  var lazy = document.querySelectorAll("video[data-src]");
  if (!("IntersectionObserver" in window)) {
    lazy.forEach(function (v) { v.src = v.dataset.src; });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var v = e.target;
        v.src = v.dataset.src;
        v.removeAttribute("data-src");
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
        io.unobserve(v);
      }
    });
  }, { rootMargin: "200px" });
  lazy.forEach(function (v) { io.observe(v); });
})();

// Quote form: opens WhatsApp with the driver's details prefilled.
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

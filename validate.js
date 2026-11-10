// Lead field checks, shared by the landing page (window.BAIValidate) and api/lead.js (require).
(function (root) {
  // UAE mobile prefixes: 050, 052, 054, 055, 056, 058
  var UAE_MOBILE = /^9715[024568]\d{7}$/;

  function phoneDigits(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("00") === 0) d = d.slice(2);
    if (d.indexOf("0") === 0) d = "971" + d.slice(1);
    else if (d.length === 9 && d.charAt(0) === "5") d = "971" + d;
    return d;
  }

  function looksFakeNumber(sub) {
    // sub = last 7 digits
    if (/^(\d)\1{6}$/.test(sub)) return true;                 // 0000000, 1111111
    if ("01234567890".indexOf(sub) !== -1) return true;       // 1234567, 2345678
    if ("09876543210".indexOf(sub) !== -1) return true;       // 7654321
    if (/^(\d)\1{4,}/.test(sub) || /(\d)\1{5,}$/.test(sub)) return true; // 5555512, 1999999
    if (/^(\d\d)\1{2}\d$/.test(sub) || /^(\d{3})\1\d$/.test(sub)) return true; // 1212121, 1231231
    return false;
  }

  function checkPhone(raw) {
    var d = phoneDigits(raw);
    if (!UAE_MOBILE.test(d)) return { ok: false, msg: "Please enter a UAE mobile number, for example 050 123 4567." };
    if (looksFakeNumber(d.slice(5))) return { ok: false, msg: "Please enter your real mobile number so we can reach you." };
    return { ok: true, value: "+" + d };
  }

  var DISPOSABLE = [
    "example.com", "example.org", "example.net", "test.com", "test.ae", "testing.com", "fb.com", "email.com", "domain.com",
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "tempmail.com",
    "temp-mail.org", "tempmail.net", "tempmailo.com", "yopmail.com", "trashmail.com", "getnada.com", "nada.email",
    "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mailnesia.com", "moakt.com", "emailondeck.com",
    "mintemail.com", "mohmal.com", "burnermail.io", "spamgourmet.com", "mytemp.email", "tempr.email", "discard.email",
    "inboxkitten.com", "minuteinbox.com", "emailfake.com", "mailcatch.com", "spam4.me", "grr.la", "33mail.com"
  ];
  var FAKE_LOCAL = /^(test|testing|tester|test\d+|asdf\w*|qwerty\w*|abc|abcd|abc123|xyz|aaa+|sample|dummy|fake|noemail|no-?reply|none|null|na|nil|user|demo|temp)$/;
  var TYPOS = {
    "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
    "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmaill.com": "gmail.com", "gmail.om": "gmail.com",
    "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
    "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
    "outlok.com": "outlook.com", "outllook.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
    "icloud.co": "icloud.com", "icloud.con": "icloud.com", "iclod.com": "icloud.com"
  };
  var EMAIL = /^[a-z0-9](?:[a-z0-9._%+'-]{0,62}[a-z0-9_%+'-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

  function checkEmail(raw) {
    var e = String(raw || "").trim().toLowerCase();
    if (!EMAIL.test(e) || e.indexOf("..") !== -1) return { ok: false, msg: "Please enter a valid email address." };
    var at = e.lastIndexOf("@"), local = e.slice(0, at), domain = e.slice(at + 1);
    if (TYPOS[domain]) return { ok: false, msg: "Did you mean " + local + "@" + TYPOS[domain] + "?", suggest: local + "@" + TYPOS[domain] };
    var parts = domain.split("."), base = parts.slice(-2).join(".");
    if (DISPOSABLE.indexOf(domain) !== -1 || DISPOSABLE.indexOf(base) !== -1 || /^(test|example|invalid|localhost)$/.test(parts[parts.length - 1]))
      return { ok: false, msg: "Please use your real email address so we can send your quotes." };
    if (FAKE_LOCAL.test(local)) return { ok: false, msg: "Please use your real email address so we can send your quotes." };
    return { ok: true, value: e, domain: domain };
  }

  function checkName(raw) {
    var n = String(raw || "").trim().replace(/\s+/g, " ");
    if (n.length < 2 || !/\p{L}/u.test(n) || /\d{3,}/.test(n)) return { ok: false, msg: "Please enter your full name." };
    if (/^(test|testing|asdf|qwerty|abc|xyz|dummy|fake|sample)\b/i.test(n)) return { ok: false, msg: "Please enter your full name." };
    return { ok: true, value: n.slice(0, 120) };
  }

  var api = { checkPhone: checkPhone, checkEmail: checkEmail, checkName: checkName, phoneDigits: phoneDigits };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BAIValidate = api;
})(typeof window !== "undefined" ? window : this);

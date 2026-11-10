// Vercel serverless function: sends each quote request to Skye (via the Pabbly create-lead API)
// and emails it to the BuyAnyInsurance team.
// Project settings (Vercel > Settings > Environment Variables):
//   SKYE_API_TOKEN   bearer token for the create-lead API (required for Skye)
//   RESEND_API_KEY   Resend key (required for email)
//   SKYE_API_URL     optional, defaults to the endpoint below
//   LEAD_TO / LEAD_FROM optional email overrides

const SKYE_URL = process.env.SKYE_API_URL || "https://ext.buyanyinsurance.ae/api/pabbly/create-lead";
const TO = process.env.LEAD_TO || "wasim.ullah@buyanyinsurance.com";
const FROM = process.env.LEAD_FROM || "BuyAnyInsurance Leads <onboarding@resend.dev>";

const UTM_DEFAULTS = {
  utm_source: "facebook",
  utm_medium: "paid",
  utm_campaign: "ca_nov10_101126_en",
  utm_content: "nov10_en",
  utm_term: "nov10",
};
const COVERS = ["Comprehensive", "Third party"];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => String(s == null ? "" : s).trim().slice(0, n);
const utmClean = (s) => clip(s, 120).replace(/[^\w.\-:%+ ]/g, "");

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

// Skye expects international format, e.g. +971501234567
function toIntl(phone) {
  let d = String(phone).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "971" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "971" + d;
  return "+" + d;
}

async function sendToSkye(lead) {
  const token = process.env.SKYE_API_TOKEN;
  if (!token) return { ok: false, why: "skye_not_configured" };
  const body = {
    name: lead.name,
    lead_source: "import_leadgen",
    phone_number: toIntl(lead.phone),
    email: lead.email,
    insurance_type: "car",
    cover_type: lead.cover,
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
  };
  const to = withTimeout(12000);
  try {
    const r = await fetch(SKYE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: to.signal,
    });
    const text = await r.text();
    if (!r.ok) { console.error("skye", r.status, text.slice(0, 500)); return { ok: false, why: `skye_${r.status}` }; }
    let j = {}; try { j = JSON.parse(text); } catch {}
    if (j && j.response && j.response.success === false) { console.error("skye", text.slice(0, 500)); return { ok: false, why: "skye_rejected" }; }
    return { ok: true };
  } catch (e) {
    console.error("skye", e && e.message); return { ok: false, why: "skye_error" };
  } finally { to.done(); }
}

async function sendEmail(lead, skye) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, why: "email_not_configured" };
  const fields = {
    Name: lead.name, Mobile: lead.phone, Email: lead.email, Cover: lead.cover, Insurance: "Car",
    "UTM source": lead.utm_source, "UTM medium": lead.utm_medium, "UTM campaign": lead.utm_campaign,
    "UTM content": lead.utm_content, "UTM term": lead.utm_term, "Sent to Skye": skye.ok ? "Yes" : `No (${skye.why})`, Page: lead.page,
  };
  const rows = Object.entries(fields).filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 14px;background:#c8ddf2;color:#000065;font-weight:700">${esc(k)}</td><td style="padding:8px 14px">${esc(v)}</td></tr>`).join("");
  const wa = lead.phone.replace(/\D/g, "").replace(/^0/, "971");
  const html = `<div style="font-family:Arial,sans-serif;color:#000065"><h2 style="margin:0 0 12px">New car insurance lead</h2>
    <table style="border-collapse:collapse;border:1px solid #c8ddf2">${rows}</table>
    <p style="margin-top:16px">Reply fast: <a href="https://wa.me/${esc(wa)}">WhatsApp ${esc(lead.phone)}</a> · <a href="mailto:${esc(lead.email)}">Email ${esc(lead.email)}</a></p></div>`;
  const text = Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const to = withTimeout(12000);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: lead.email, subject: `New car insurance lead: ${lead.name} (${lead.cover})`, html, text }),
      signal: to.signal,
    });
    if (!r.ok) { console.error("resend", r.status, (await r.text()).slice(0, 500)); return { ok: false, why: `email_${r.status}` }; }
    return { ok: true };
  } catch (e) {
    console.error("resend", e && e.message); return { ok: false, why: "email_error" };
  } finally { to.done(); }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false }); }

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b._honey) return res.status(200).json({ ok: true }); // bot trap

  const lead = {
    name: clip(b.name, 120),
    phone: clip(b.phone, 40),
    email: clip(b.email, 160),
    cover: COVERS.includes(b.cover) ? b.cover : "Comprehensive",
    page: clip(b.page, 400),
  };
  for (const k of Object.keys(UTM_DEFAULTS)) lead[k] = utmClean(b[k]) || UTM_DEFAULTS[k];

  if (!lead.name || lead.phone.replace(/\D/g, "").length < 9 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }

  const skye = await sendToSkye(lead);
  const mail = await sendEmail(lead, skye);
  if (!skye.ok || !mail.ok) console.error("lead delivery", JSON.stringify({ skye, mail }));

  if (skye.ok || mail.ok) return res.status(200).json({ ok: true, skye: skye.ok, email: mail.ok });
  return res.status(502).json({ ok: false, error: "delivery_failed" });
};

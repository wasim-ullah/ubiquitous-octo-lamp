// Vercel serverless function: emails each quote request to the BuyAnyInsurance team.
// Needs RESEND_API_KEY set in the Vercel project (Settings > Environment Variables).
// Optional: LEAD_TO (default below) and LEAD_FROM (a sender on a domain verified in Resend).

const TO = process.env.LEAD_TO || "wasim.ullah@buyanyinsurance.com";
const FROM = process.env.LEAD_FROM || "BuyAnyInsurance Leads <onboarding@resend.dev>";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => String(s == null ? "" : s).trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: "email_not_configured" });

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b._honey) return res.status(200).json({ ok: true }); // bot trap

  const lead = {
    Name: clip(b.name, 120), Mobile: clip(b.phone, 40), Car: clip(b.car, 120), "Model year": clip(b.year, 8),
    Emirate: clip(b.emirate, 40), Cover: clip(b.cover, 40), Page: clip(b.page, 300),
  };
  if (!lead.Name || lead.Mobile.replace(/\D/g, "").length < 9 || !lead.Car) return res.status(400).json({ ok: false, error: "invalid" });

  const rows = Object.entries(lead).filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 14px;background:#c8ddf2;color:#000065;font-weight:700">${esc(k)}</td><td style="padding:8px 14px">${esc(v)}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#000065"><h2 style="margin:0 0 12px">New car insurance lead</h2>
    <table style="border-collapse:collapse;border:1px solid #c8ddf2">${rows}</table>
    <p style="margin-top:16px">Reply fast: <a href="https://wa.me/${esc(lead.Mobile.replace(/\D/g, "").replace(/^0/, "971"))}">WhatsApp ${esc(lead.Mobile)}</a></p></div>`;
  const text = Object.entries(lead).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject: `New car insurance lead: ${lead.Name} (${lead.Car})`, html, text }),
    });
    if (!r.ok) { console.error("resend", r.status, await r.text()); return res.status(502).json({ ok: false, error: "send_failed" }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e); return res.status(502).json({ ok: false, error: "send_failed" });
  }
};

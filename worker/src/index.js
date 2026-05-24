// PolyFilms pre-registration Worker.
// Receives JSON POST from the site form, validates, sends emails via Resend.

const ALLOWED_ORIGINS = [
  "https://polyfilms.pp.ua",
  "https://www.polyfilms.pp.ua",
];
const SANCTIONED = new Set(["RU", "BY", "IR", "KP", "SY", "CU"]);
const CONFIG_TTL_MS = 60_000;

let _configCache = null;
let _configCacheAt = 0;

function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function loadConfig(env) {
  const now = Date.now();
  if (_configCache && now - _configCacheAt < CONFIG_TTL_MS) return _configCache;
  const url = env.CONFIG_URL || "https://polyfilms.pp.ua/data/registration.json";
  const res = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) throw new Error(`config fetch ${res.status}`);
  _configCache = await res.json();
  _configCacheAt = now;
  return _configCache;
}

async function sendEmail(env, { to, cc, replyTo, subject, text, html }) {
  const from = env.FROM_EMAIL || "PolyFilms <noreply@polyfilms.pp.ua>";
  const body = {
    from,
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
    ...(cc ? { cc: [cc] } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend ${res.status}: ${t}`);
  }
}

function validate(payload) {
  if (!payload || typeof payload !== "object") return "invalid payload";
  const { name, phone, email, country, address, comment } = payload;
  if (!name || !phone || !email || !country || !address) return "missing required fields";
  if (String(name).length > 200) return "name too long";
  if (String(address).length > 1000) return "address too long";
  if (String(comment || "").length > 2000) return "comment too long";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return "invalid email";
  if (SANCTIONED.has(String(country).toUpperCase())) return "unsupported country";
  return null;
}

function buildTeamEmail(p, config) {
  const country = (config.countries || []).find(
    (c) => c.code === p.country,
  );
  const countryLabel = country
    ? `${country.uk} / ${country.en} (${country.code})`
    : p.country;
  const ts = new Date().toISOString();

  const text =
    `Імʼя: ${p.name}\n` +
    `Телефон: ${p.phone}\n` +
    `Email: ${p.email}\n` +
    `Країна: ${countryLabel}\n` +
    `Адреса:\n${p.address}\n` +
    (p.comment ? `\nКоментар:\n${p.comment}\n` : "") +
    `\nМова форми: ${p.lang || "uk"}\n` +
    `Час: ${ts}\n`;

  const html =
    `<table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">` +
    `<tr><td><b>Імʼя</b></td><td>${escapeHtml(p.name)}</td></tr>` +
    `<tr><td><b>Телефон</b></td><td><a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a></td></tr>` +
    `<tr><td><b>Email</b></td><td><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></td></tr>` +
    `<tr><td><b>Країна</b></td><td>${escapeHtml(countryLabel)}</td></tr>` +
    `<tr><td valign="top"><b>Адреса</b></td><td>${escapeHtml(p.address).replace(/\n/g, "<br>")}</td></tr>` +
    (p.comment
      ? `<tr><td valign="top"><b>Коментар</b></td><td>${escapeHtml(p.comment).replace(/\n/g, "<br>")}</td></tr>`
      : "") +
    `<tr><td><b>Мова</b></td><td>${escapeHtml(p.lang || "uk")}</td></tr>` +
    `<tr><td><b>Час</b></td><td>${ts}</td></tr>` +
    `</table>`;

  return {
    subject: `[PolyFilms] Нова заявка: ${p.name}`,
    text,
    html,
  };
}

function buildUserEmail(p) {
  const isEn = p.lang === "en";
  if (isEn) {
    return {
      subject: "PolyFilms — registration received",
      text:
        `Hi ${p.name},\n\n` +
        `We've received your pre-registration. Our small team will get back to you within 2–3 days to confirm the order and shipping details.\n\n` +
        `Thanks for supporting Ukrainian craft photography.\n\n— PolyFilms team`,
    };
  }
  return {
    subject: "PolyFilms — заявку отримано",
    text:
      `Вітаємо, ${p.name}!\n\n` +
      `Ми отримали вашу попередню заявку. Наша команда звʼяжеться з вами протягом 2–3 днів, щоб узгодити деталі замовлення та доставки.\n\n` +
      `Дякуємо, що підтримуєте українську крафтову фотографію.\n\n— Команда PolyFilms`,
  };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    if (req.method !== "POST") {
      return jsonResponse(req, 405, { error: "method not allowed" });
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(req, 400, { error: "invalid json" });
    }

    const validationError = validate(payload);
    if (validationError) {
      return jsonResponse(req, 400, { error: validationError });
    }

    let config;
    try {
      config = await loadConfig(env);
    } catch (err) {
      console.error("config load failed:", err);
      return jsonResponse(req, 503, { error: "config unavailable" });
    }

    if (config.open === false) {
      return jsonResponse(req, 403, { error: "registration closed" });
    }

    const notifyTo = config.notify_email;
    const notifyCc = config.notify_cc || "";
    if (!notifyTo) {
      console.error("notify_email missing in config");
      return jsonResponse(req, 500, { error: "notify_email not configured" });
    }

    const teamMail = buildTeamEmail(payload, config);
    const userMail = buildUserEmail(payload);

    try {
      await sendEmail(env, {
        to: notifyTo,
        cc: notifyCc || undefined,
        replyTo: payload.email,
        ...teamMail,
      });
    } catch (err) {
      console.error("team email failed:", err);
      return jsonResponse(req, 502, { error: "email failed" });
    }

    // User auto-reply is best-effort — don't fail the whole request if it bounces.
    try {
      await sendEmail(env, {
        to: payload.email,
        replyTo: notifyTo,
        ...userMail,
      });
    } catch (err) {
      console.warn("user auto-reply failed:", err);
    }

    return jsonResponse(req, 200, { ok: true });
  },
};

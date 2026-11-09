// Auto-reply sent to the registrant. One content block per language,
// rendered into both an HTML body and a plain-text fallback.

const PAYPAL_EMAIL = "polyakovusko@gmail.com";
const PATREON_PAGE = "https://www.patreon.com/cw/Polyfilm";
const PATREON_SHOP = "https://www.patreon.com/c/polyfilm/shop";
const SITE_URL = "https://polyfilms.pp.ua";

const BRAND = '<span style="color:#0077c8">Polyfilm</span>';
const LINK_STYLE = "color:#0066cc;text-decoration:none";

const paypalHtml = `PayPal — <a href="mailto:${PAYPAL_EMAIL}" style="${LINK_STYLE}">${PAYPAL_EMAIL}</a>`;
const shopHtml = (or) =>
  `${or}<br><a href="${PATREON_SHOP}" style="color:#0670db;text-decoration:underline">${PATREON_SHOP}</a>`;

const CONTENT = {
  en: {
    subject: "PolyFilms — registration received",
    htmlLang: "en",
    title: `Confirmation of your ${BRAND} order`,
    greeting: "Hi, my film friend!",
    intro:
      "Thank you for your interest. We're pleased to let you know that we've processed your request and are starting to work on it. Please confirm the details below to finalize your order.",
    detailsTitle: "Order details",
    rows: [
      { label: "Format:", html: "120 roll film only" },
      { label: "Order size:", html: "let us know how many rolls you'd like" },
      {
        label: "Price:",
        html:
          `€30 / $35 USD per roll<br><span style="color:#666666;font-size:14px">Includes the film itself, and international tracked shipping.</span>` +
          `<p style="margin:8px 0 0 0;padding:0">The funds will go towards materials for the project, also supporting my friends who are serving in the armed forces, including photographers.</p>`,
      },
      { label: "Shipping note:", html: "tracking included" },
      { label: "Payment:", html: `${paypalHtml}<br>${shopHtml("or")}` },
      {
        label: "Delivery:",
        html: "we ship orders gradually as new film is produced. Approximate transit time after shipping is 2–3 weeks depending on destination.",
      },
    ],
    confirmTitle: "To confirm your order",
    confirmIntro: "Please reply to this email with:",
    steps: [
      "Confirmation of the terms above",
      "The number of rolls you'd like",
      "Your full shipping address",
      "A phone number (the courier from your postal service may need this)",
    ],
    followTitle: "Follow our journey",
    followBody:
      "We've just launched a Patreon page where we'll share updates on production, new experiments, and behind-the-scenes from Igor's workshop.",
    followLinkLabel: "→ patreon.com/cw/Polyfilm",
    thanks: [
      "Thank you again — your interest and support mean a lot to us!",
      "They help move the project forward.",
    ],
    signoff: "Best regards,",
    signature: "Igor",
    footer: `${BRAND} — handcrafted orthochromatic film from Ukraine`,
  },

  uk: {
    subject: "PolyFilms — заявку отримано",
    htmlLang: "uk",
    title: `Підтвердження вашого замовлення ${BRAND}`,
    greeting: "Привіт, друже-плівкоман!",
    intro:
      "Дякуємо за інтерес. Раді повідомити, що ми опрацювали вашу заявку й беремося до роботи. Будь ласка, підтвердіть деталі нижче, щоб завершити замовлення.",
    detailsTitle: "Деталі замовлення",
    rows: [
      { label: "Формат:", html: "лише плівка 120 типу" },
      { label: "Кількість:", html: "напишіть нам, скільки рулонів вам потрібно" },
      {
        label: "Ціна:",
        html:
          `550 грн за рулон<br><span style="color:#666666;font-size:14px">Включає саму плівку. Доставка — Новою Поштою за ваш рахунок.</span>` +
          `<p style="margin:8px 0 0 0;padding:0">Кошти підуть на матеріали для проєкту, а також на підтримку моїх друзів, які служать у Силах оборони, зокрема фотографів.</p>`,
      },
      { label: "Про доставку:", html: "Новою Поштою, з номером для відстеження" },
      { label: "Оплата:", html: "реквізити надішлемо окремо" },
      {
        label: "Відправлення:",
        html: "ми відправляємо замовлення поступово, у міру виготовлення нової плівки.",
      },
    ],
    confirmTitle: "Щоб підтвердити замовлення",
    confirmIntro: "Будь ласка, дайте відповідь на цей лист і напишіть:",
    steps: [
      "Підтвердження умов, наведених вище",
      "Кількість рулонів, яку ви хочете",
      "Повну адресу доставки (місто та відділення Нової Пошти)",
      "Номер телефону (він може знадобитися службі доставки)",
    ],
    followTitle: "Стежте за нашою історією",
    followBody:
      "Ми щойно запустили сторінку на Patreon, де ділитимемося новинами виробництва, новими експериментами та закулісним життям майстерні Ігоря.",
    followLinkLabel: "→ patreon.com/cw/Polyfilm",
    thanks: [
      "Ще раз дякуємо — ваш інтерес і підтримка багато для нас значать!",
      "Вони допомагають проєкту рухатися вперед.",
    ],
    signoff: "З повагою,",
    signature: "Ігор",
    footer: `${BRAND} — крафтова ортохроматична плівка з України`,
  },
};

function toText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<a [^>]*href="mailto:([^"]+)"[^>]*>[^<]*<\/a>/gi, "$1")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const P = "margin:0 0 16px 0;padding:0;font-size:16px;line-height:1.6;color:#333333";
const P_SMALL = "margin:0 0 16px 0;padding:0;font-size:15px;line-height:1.6;color:#333333";
const H2 = "margin:16px 0 12px 0;padding:0;font-size:18px;font-weight:600;color:#1a1a1a";
const CELL = "padding:12px 16px;font-size:15px;line-height:1.6;color:#333333";

function renderHtml(c) {
  const rows = c.rows
    .map(
      (r, i) =>
        `<tr><td style="${CELL}${i ? ";border-top:1px solid #eaeaea" : ""}"><strong>${r.label}</strong> ${r.html}</td></tr>`,
    )
    .join("");
  const steps = c.steps
    .map((s) => `<li style="margin:0 0 6px 0;padding:0 0 0 4px">${s}</li>`)
    .join("");
  const thanks = c.thanks.map((t) => `<p style="${P_SMALL}">${t}</p>`).join("");

  return (
    `<!DOCTYPE html><html lang="${c.htmlLang}"><head>` +
    `<meta charset="UTF-8"><meta name="viewport" content="width=device-width">` +
    `<meta name="x-apple-disable-message-reformatting"><title>${toText(c.title)}</title></head>` +
    `<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0"><tr><td align="center">` +
    `<table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden">` +
    // header
    `<tr><td style="padding:32px 32px 16px 32px;border-bottom:1px solid #eaeaea"><h1 style="margin:0;padding:0;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3">${c.title}</h1></td></tr>` +
    // intro
    `<tr><td style="padding:24px 32px 0 32px"><p style="${P}">${c.greeting}</p><p style="${P}">${c.intro}</p></td></tr>` +
    // order details
    `<tr><td style="padding:8px 32px 0 32px"><h2 style="${H2}">${c.detailsTitle}</h2>` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:6px">${rows}</table></td></tr>` +
    // how to confirm
    `<tr><td style="padding:24px 32px 0 32px"><h2 style="margin:8px 0 12px 0;padding:0;font-size:18px;font-weight:600;color:#1a1a1a">${c.confirmTitle}</h2>` +
    `<p style="margin:0 0 12px 0;padding:0;font-size:15px;line-height:1.6;color:#333333">${c.confirmIntro}</p>` +
    `<ol style="margin:0 0 16px 0;padding:0 0 0 24px;font-size:15px;line-height:1.7;color:#333333">${steps}</ol></td></tr>` +
    // patreon
    `<tr><td style="padding:8px 32px 0 32px"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff5f0;border:1px solid #ffd9c4;border-radius:6px"><tr><td style="padding:20px">` +
    `<h2 style="margin:0 0 8px 0;padding:0;font-size:17px;font-weight:600;color:#1a1a1a">${c.followTitle}</h2>` +
    `<p style="margin:0 0 12px 0;padding:0;font-size:15px;line-height:1.6;color:#333333">${c.followBody}</p>` +
    `<p style="margin:0;padding:0;font-size:15px;line-height:1.6"><a href="${PATREON_PAGE}" style="color:#e85a2c;text-decoration:none;font-weight:600">${c.followLinkLabel}</a></p>` +
    `</td></tr></table></td></tr>` +
    // sign-off
    `<tr><td style="padding:24px 32px 32px 32px">${thanks}` +
    `<p style="margin:0;padding:0;font-size:15px;line-height:1.6;color:#333333">${c.signoff}<br><strong>${c.signature}</strong></p></td></tr>` +
    // footer
    `<tr><td align="center" style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eaeaea;text-align:center"><p style="margin:0;padding:0;font-size:13px;color:#888888;line-height:1.5">${c.footer}<br><a href="${SITE_URL}" style="${LINK_STYLE}">polyfilms.pp.ua</a></p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function renderText(c) {
  return [
    toText(c.title),
    "",
    c.greeting,
    "",
    c.intro,
    "",
    c.detailsTitle,
    ...c.rows.map((r) => `- ${r.label} ${toText(r.html).replace(/\n/g, "\n  ")}`),
    "",
    c.confirmTitle,
    c.confirmIntro,
    ...c.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    c.followTitle,
    c.followBody,
    PATREON_PAGE,
    "",
    ...c.thanks,
    "",
    c.signoff,
    c.signature,
  ].join("\n");
}

// Ukrainian for registrations from Ukraine, English for everyone else.
export function buildUserEmail(p) {
  const c = p.country === "UA" ? CONTENT.uk : CONTENT.en;
  return { subject: c.subject, html: renderHtml(c), text: renderText(c) };
}

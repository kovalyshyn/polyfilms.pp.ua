# Content CMS & Bilingual Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Externalize gallery and batch log into JSON edited via Pages CMS, add bilingual UA/EN rendering with auto-detect, while keeping `darkroomlog-privacy-policy.html` byte-for-byte unchanged.

**Architecture:** Static site on GitHub Pages. Content split: dynamic data (`data/batches.json`, `data/gallery.json`) edited by non-technical user via [Pages CMS](https://pagescms.org); brand copy (`i18n/strings.json`) edited by developer in git. `index.html` keeps Ukrainian markup as no-JS fallback and uses ~50 lines of JS to fetch JSON, resolve language, and re-render.

**Tech Stack:** Vanilla HTML/CSS/JS (no build step), Node.js (one-shot migration script, no npm deps), Pages CMS (free SaaS, GitHub OAuth).

**Reference spec:** `docs/superpowers/specs/2026-05-09-content-cms-design.md`

**Testing policy (per spec):** No automated test files. Migration script self-verifies via row-count assertions. All other verification is manual smoke testing at each step.

---

## Task 1: Capture baseline + create directory structure

**Files:**
- Create: `data/.gitkeep`, `i18n/.gitkeep`, `scripts/.gitkeep`
- Reference: `darkroomlog-privacy-policy.html` (read-only, hash recorded)

- [ ] **Step 1: Record baseline sha256 of the privacy policy file**

Run:
```bash
shasum -a 256 darkroomlog-privacy-policy.html | tee /tmp/polyfilms-privacy-baseline.txt
```

Expected output: a 64-char hex hash followed by the filename. Example:
```
a1b2c3...  darkroomlog-privacy-policy.html
```

Save the hex hash. We compare against it in Task 11.

- [ ] **Step 2: Create directories**

Run:
```bash
mkdir -p data i18n scripts
touch data/.gitkeep i18n/.gitkeep scripts/.gitkeep
```

- [ ] **Step 3: Verify layout**

Run:
```bash
ls -la data i18n scripts
```

Expected: each directory exists with a `.gitkeep` file.

- [ ] **Step 4: Commit**

```bash
git add data/.gitkeep i18n/.gitkeep scripts/.gitkeep
git commit -m "chore: scaffold data/i18n/scripts directories"
```

---

## Task 2: Write migration script

**Files:**
- Create: `scripts/migrate.mjs`

The script parses the current `index.html`, extracts gallery items and batch rows, writes JSON. It self-asserts expected row counts.

- [ ] **Step 1: Create `scripts/migrate.mjs`**

```javascript
#!/usr/bin/env node
// One-shot: extract gallery and batch data from index.html into JSON.
// Self-verifies expected row counts. Run from repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(REPO_ROOT, "index.html"), "utf8");

// --- Gallery: <div class="gallery-item"><img src="..." alt="..."></div>
const galleryRegex =
  /<div class="gallery-item"><img src="([^"]+)" alt="([^"]+)"><\/div>/g;
const gallery = [];
for (const m of html.matchAll(galleryRegex)) {
  gallery.push({ file: m[1], alt: { uk: m[2], en: m[2] } });
}

// --- Batches: rows inside <table class="batch-log">
const tableMatch = html.match(/<table class="batch-log">([\s\S]*?)<\/table>/);
if (!tableMatch) throw new Error("batch-log table not found");
const rowRegex =
  /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
const batches = [];
for (const m of tableMatch[1].matchAll(rowRegex)) {
  const number = m[1].trim();
  if (number.toLowerCase() === "batch #") continue; // skip header row
  batches.push({
    number,
    character: { uk: m[2].trim(), en: "" },
    notes: { uk: m[3].trim(), en: "" },
  });
}

// --- Self-verification (per spec: no formal tests, script asserts itself)
const EXPECTED_GALLERY = 9;
const EXPECTED_BATCHES = 3;
if (gallery.length !== EXPECTED_GALLERY) {
  throw new Error(
    `gallery: expected ${EXPECTED_GALLERY} items, got ${gallery.length}`,
  );
}
if (batches.length !== EXPECTED_BATCHES) {
  throw new Error(
    `batches: expected ${EXPECTED_BATCHES} rows, got ${batches.length}`,
  );
}

// --- Write
mkdirSync(resolve(REPO_ROOT, "data"), { recursive: true });
writeFileSync(
  resolve(REPO_ROOT, "data/gallery.json"),
  JSON.stringify({ items: gallery }, null, 2) + "\n",
);
writeFileSync(
  resolve(REPO_ROOT, "data/batches.json"),
  JSON.stringify({ items: batches }, null, 2) + "\n",
);

console.log(`✓ data/gallery.json — ${gallery.length} items`);
console.log(`✓ data/batches.json — ${batches.length} rows`);
console.log("\nReminder: EN fields in batches.json are empty. Fill in Task 9.");
```

- [ ] **Step 2: Make executable and commit (script not yet run)**

```bash
chmod +x scripts/migrate.mjs
git add scripts/migrate.mjs
git commit -m "feat: add one-shot migration script for gallery and batches"
```

---

## Task 3: Run migration and commit generated JSON

**Files:**
- Create (via script): `data/gallery.json`, `data/batches.json`

- [ ] **Step 1: Run the script**

Run:
```bash
node scripts/migrate.mjs
```

Expected output:
```
✓ data/gallery.json — 9 items
✓ data/batches.json — 3 rows

Reminder: EN fields in batches.json are empty. Fill in Task 9.
```

If counts mismatch, the script throws — fix the regex in `scripts/migrate.mjs` and re-run.

- [ ] **Step 2: Inspect outputs**

Run:
```bash
cat data/batches.json
cat data/gallery.json
```

Verify: 3 batch rows with UA filled and `en: ""`; 9 gallery items with `alt.uk === alt.en` (both Ukrainian for now — EN translated in Task 9).

- [ ] **Step 3: Commit**

```bash
git add data/batches.json data/gallery.json
git commit -m "feat: extract batch and gallery data into JSON via migration"
```

---

## Task 4: Build `i18n/strings.json` with Ukrainian copy

**Files:**
- Create: `i18n/strings.json`

This file holds every static UA string from `index.html`. EN values stay empty until Task 9.

- [ ] **Step 1: Create `i18n/strings.json`**

```json
{
  "uk": {
    "page_title": "PolyFilm Ortho20 | Крафтова українська емульсія",
    "tagline": "Перша українська крафтова плівка",
    "manifesto": "Крафтова фотографічна емульсія — це живий організм. Від моменту змішування нітрату срібла до моменту, коли вона зустрічає світло у вашій камері, вона дихає, змінюється та формує свій унікальний характер.",
    "section_tests": "Тестові кадри",
    "spec_sensitivity_label": "Чутливість",
    "spec_sensitivity_value": "ISO 20 / 14° DIN",
    "spec_spectrum_label": "Спектр",
    "spec_spectrum_value": "Орто (до 580 нм)",
    "spec_safelight_label": "Світло",
    "spec_safelight_value": "Dark Red Safe",
    "spec_format_label": "Тип",
    "spec_format_value": "120 (Manual Wrap)",
    "card_storage_title": "Зберігання та Термін",
    "card_storage_body": "Зберігати у сухому темному місці. Офіційний термін придатності — 6 місяців. Пам'ятайте: можливий \"дозрівання\" (ріст ISO на 0.5-1 стоп) з часом.",
    "card_emulsion_title": "Робота з шаром",
    "card_emulsion_body": "Крафтова емульсія сохне довше. Слід бути гранично обережним із мокрим шаром. Рекомендована природна сушка: 2-3 години після промивання.",
    "card_winding_title": "Ручна намотка",
    "card_winding_body": "Через особливості ручної роботи рулон може бути трохи товстішим (\"fat roll\"). Заряджайте та витягуйте плівку в тіні, надійно фіксуючи автозаклейку.",
    "tip_strong": "Порада для профі:",
    "tip_body": "Завдяки нечутливості до темно-червоного світла, ви можете заправляти плівку в спіраль та навіть контролювати процес проявки візуально. Це відкриває нові можливості для зонної системи.",
    "desc_main": "Кожна партія виготовляється вручну з акцентом на високу щільність срібла та класичний тональний діапазон. Ми відродили ремесло емульсійного варіння, натхненне піонерами фотографії: <strong>Р. Меддоксом</strong>, <strong>Т. Торном Бейкером</strong>, <strong>Р. Моурі</strong> та <strong>М. Остманом</strong>.",
    "desc_footnote": "*Ми використовуємо нетоксичні реактиви та відновлене срібло. Частина желатину (10-20%) замінена на синтетичні полімери для підвищення стабільності шару.",
    "section_dev": "Рекомендації з проявки",
    "dev_intro": "Температура розчинів: <strong>18-19°C</strong>.<br>Агітація: перша хвилина постійно, далі 10 сек. щохвилини.",
    "dev_th_developer": "Проявник",
    "dev_th_dilution": "Розведення",
    "dev_th_time": "Час",
    "section_join_title": "Станьте частиною дослідження",
    "section_join_body": "Ми збираємо відгуки для вдосконалення рецептури. Кожен ваш кадр допомагає проєкту.",
    "cta_subscribe": "Стати тестером",
    "section_batches": "Лог Партій (Batch Log)",
    "batches_th_number": "Batch #",
    "batches_th_character": "Характер партії",
    "batches_th_notes": "Примітки",
    "section_partners": "Наші партнери",
    "facts_strong": "Цікаві факти:",
    "facts_body": "• У кожному кадрі працюють мільярди нано-кристалів, що перетворюють світло на срібну історію.<br>• Цифрові файли зникають, але срібло на плівці зберігає зображення понад 150 років — найнадійніший архів після глиняних таблиць.<br>• Напівпровідники та чіпи у вашому смартфоні ніколи б не з'явилися без технологій фоточутливості срібних галоїдів.",
    "footer_copyright": "© 2026 PolyFilms Project. Crafted with Silver and Passion.",
    "lang_toggle_uk": "UA",
    "lang_toggle_en": "EN"
  },
  "en": {}
}
```

- [ ] **Step 2: Validate JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/strings.json'))" && echo "OK"
```

Expected: `OK`. If parse error, fix the syntax (likely a missing comma or stray quote).

- [ ] **Step 3: Commit**

```bash
git add i18n/strings.json
git commit -m "feat: extract static UA strings into i18n/strings.json"
```

---

## Task 5: Refactor `index.html` — add `data-i18n` attributes and empty containers

**Files:**
- Modify: `index.html`

Wrap every Ukrainian string in `<span data-i18n="key">` (or apply `data-i18n` to the existing element). Keep current Ukrainian text **inside** the elements as a no-JS fallback. Replace the gallery and batch-log table contents with empty containers identified by `id`.

This task does NOT add JS yet — only changes markup. After this task, the site renders identically with no JS executing.

- [ ] **Step 1: Update `<title>` and `<html lang>`**

Find:
```html
<html lang="uk">
```
Replace with:
```html
<html lang="uk" data-default-lang="uk">
```

Find:
```html
<title>PolyFilm Ortho20 | Крафтова українська емульсія</title>
```
Replace with:
```html
<title data-i18n="page_title">PolyFilm Ortho20 | Крафтова українська емульсія</title>
```

- [ ] **Step 2: Add language toggle markup inside `<header>`**

Find the header opening:
```html
<header>
    <h1><span class="ortho">Poly</span>Film Ortho</h1>
    <p class="tagline">Перша українська крафтова плівка</p>
</header>
```
Replace with:
```html
<header>
    <div class="lang-toggle">
        <button type="button" data-lang-set="uk" data-i18n="lang_toggle_uk">UA</button>
        <span class="lang-toggle-sep">/</span>
        <button type="button" data-lang-set="en" data-i18n="lang_toggle_en">EN</button>
    </div>
    <h1><span class="ortho">Poly</span>Film Ortho</h1>
    <p class="tagline" data-i18n="tagline">Перша українська крафтова плівка</p>
</header>
```

- [ ] **Step 3: Add CSS for the toggle (place before the closing `</style>`)**

Find:
```css
        footer { text-align: center; padding: 60px 0; border-top: 1px solid var(--border); }
```
Insert immediately above:
```css
        .lang-toggle { display: flex; gap: 4px; justify-content: center; margin-bottom: 24px; }
        .lang-toggle button {
            background: none; border: none; color: #888;
            font-family: 'Oswald', sans-serif; font-size: 0.85rem;
            letter-spacing: 2px; cursor: pointer; padding: 4px 8px;
        }
        .lang-toggle button[aria-current="true"] { color: var(--accent); }
        .lang-toggle button:hover { color: var(--accent); }
        .lang-toggle-sep { color: #555; align-self: center; font-size: 0.85rem; }
```

- [ ] **Step 4: Mark the manifesto, section heading, and specs**

Find:
```html
<div class="manifesto-quote">
    Крафтова фотографічна емульсія — це живий організм. Від моменту змішування нітрату срібла до моменту, коли вона зустрічає світло у вашій камері, вона дихає, змінюється та формує свій унікальний характер.
</div>
```
Replace with:
```html
<div class="manifesto-quote" data-i18n="manifesto">
    Крафтова фотографічна емульсія — це живий організм. Від моменту змішування нітрату срібла до моменту, коли вона зустрічає світло у вашій камері, вона дихає, змінюється та формує свій унікальний характер.
</div>
```

Find:
```html
<h3 style="text-align: center; text-transform: uppercase;">Тестові кадри</h3>
```
Replace with:
```html
<h3 style="text-align: center; text-transform: uppercase;" data-i18n="section_tests">Тестові кадри</h3>
```

Find the `<div class="specs">` block and replace its inner items with `data-i18n` attributes:
```html
<div class="specs">
    <div class="spec-item"><b data-i18n="spec_sensitivity_label">Чутливість</b><span data-i18n="spec_sensitivity_value">ISO 20 / 14° DIN</span></div>
    <div class="spec-item"><b data-i18n="spec_spectrum_label">Спектр</b><span data-i18n="spec_spectrum_value">Орто (до 580 нм)</span></div>
    <div class="spec-item"><b data-i18n="spec_safelight_label">Світло</b><span data-i18n="spec_safelight_value">Dark Red Safe</span></div>
    <div class="spec-item"><b data-i18n="spec_format_label">Тип</b><span data-i18n="spec_format_value">120 (Manual Wrap)</span></div>
</div>
```

- [ ] **Step 5: Mark info cards, warning box, description text**

Replace the entire `<div class="info-grid">` block:
```html
<div class="info-grid">
    <div class="info-card">
        <h3 data-i18n="card_storage_title">Зберігання та Термін</h3>
        <p data-i18n="card_storage_body">Зберігати у сухому темному місці. Офіційний термін придатності — 6 місяців. Пам'ятайте: можливий "дозрівання" (ріст ISO на 0.5-1 стоп) з часом.</p>
    </div>
    <div class="info-card">
        <h3 data-i18n="card_emulsion_title">Робота з шаром</h3>
        <p data-i18n="card_emulsion_body">Крафтова емульсія сохне довше. Слід бути гранично обережним із мокрим шаром. Рекомендована природна сушка: 2-3 години після промивання.</p>
    </div>
    <div class="info-card">
        <h3 data-i18n="card_winding_title">Ручна намотка</h3>
        <p data-i18n="card_winding_body">Через особливості ручної роботи рулон може бути трохи товстішим ("fat roll"). Заряджайте та витягуйте плівку в тіні, надійно фіксуючи автозаклейку.</p>
    </div>
</div>
```

Replace the warning box:
```html
<div class="warning-box">
    <strong data-i18n="tip_strong">Порада для профі:</strong>
    <span data-i18n="tip_body">Завдяки нечутливості до темно-червоного світла, ви можете заправляти плівку в спіраль та навіть контролювати процес проявки візуально. Це відкриває нові можливості для зонної системи.</span>
</div>
```

Replace the description-text:
```html
<div class="description-text">
    <p data-i18n="desc_main" data-i18n-html="true">Кожна партія виготовляється вручну з акцентом на високу щільність срібла та класичний тональний діапазон. Ми відродили ремесло емульсійного варіння, натхненне піонерами фотографії: <strong>Р. Меддоксом</strong>, <strong>Т. Торном Бейкером</strong>, <strong>Р. Моурі</strong> та <strong>М. Остманом</strong>.</p>
    <p style="color: #888; font-size: 0.9rem;" data-i18n="desc_footnote">*Ми використовуємо нетоксичні реактиви та відновлене срібло. Частина желатину (10-20%) замінена на синтетичні полімери для підвищення стабільності шару.</p>
</div>
```

(Note: `data-i18n-html="true"` signals to the render JS that the value contains HTML and should be set via `innerHTML` rather than `textContent`. Default is text-only.)

- [ ] **Step 6: Mark dev recommendations section**

Replace the dev section:
```html
<section style="margin: 60px 0;">
    <h3 style="text-align: center; text-transform: uppercase; letter-spacing: 2px;" data-i18n="section_dev">Рекомендації з проявки</h3>
    <p style="text-align: center; font-size: 0.9rem; color: #aaa; margin-bottom: 20px;" data-i18n="dev_intro" data-i18n-html="true">
        Температура розчинів: <strong>18-19°C</strong>. <br>
        Агітація: перша хвилина постійно, далі 10 сек. щохвилини.
    </p>
    <table>
        <thead>
            <tr>
                <th data-i18n="dev_th_developer">Проявник</th>
                <th data-i18n="dev_th_dilution">Розведення</th>
                <th style="text-align: right;" data-i18n="dev_th_time">Час</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Rodinal (Adonal)</td>
                <td>1+25</td>
                <td style="text-align: right; font-weight: bold;">11 – 15 хв</td>
            </tr>
            <tr>
                <td>Kodak HC-110</td>
                <td>Dilution B (1+31)</td>
                <td style="text-align: right; font-weight: bold;">10 – 14 хв</td>
            </tr>
        </tbody>
    </table>
</section>
```

(Developer names like "Rodinal" stay language-neutral. The "хв" suffix is mapped via i18n in a later iteration — for now it stays UA in both. If EN-only users find it unclear, revisit.)

- [ ] **Step 7: Mark the join/CTA section**

Replace:
```html
<div style="text-align: center; margin: 60px 0;">
    <h3 data-i18n="section_join_title">Станьте частиною дослідження</h3>
    <p data-i18n="section_join_body">Ми збираємо відгуки для вдосконалення рецептури. Кожен ваш кадр допомагає проєкту.</p>
    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdMDPyZSOiO6kHvbb6dvB592Hl8D_6nDmDZChDO9m91unzddg/viewform" class="btn" target="_blank" data-i18n="cta_subscribe">Стати тестером</a>
</div>
```

(URL stays as Google Form for now — swap to MonoBase in deferred Task 12.)

- [ ] **Step 8: Replace gallery items and batch-log table body with empty containers**

Find the gallery block:
```html
<div class="gallery">
    <div class="gallery-item"><img src="img/test1.jpg" alt="Batch 260301 | Baldaxette I | ISO 18"></div>
    <div class="gallery-item"><img src="img/test2.jpg" alt="Batch 260301 | Rolleiflex | ISO 18"></div>
    <div class="gallery-item"><img src="img/test3.jpg" alt="Batch 260301 | RB67 | ISO 16"></div>
    <div class="gallery-item"><img src="img/test4.jpg" alt="Batch 260301 | RB67 | ISO 16"></div>
    <div class="gallery-item"><img src="img/test5.jpg" alt="Batch 260301 | Baldaxette I | ISO 18"></div>
    <div class="gallery-item"><img src="img/test6.jpg" alt="Batch 260321 | ISO 20"></div>
    <div class="gallery-item"><img src="img/test7.jpg" alt="Batch 260321 | Baldaxette I | ISO 20"></div>
    <div class="gallery-item"><img src="img/test8.jpg" alt="Batch 260321 | ISO 20"></div>
    <div class="gallery-item"><img src="img/test9.jpg" alt="Batch 260321 | Yashica Mat-EM | ISO 20"></div>
</div>
```
Replace with:
```html
<div class="gallery" id="gallery-container" data-fallback>
    <!-- No-JS fallback: shows first 3 items hardcoded so the page is never empty -->
    <div class="gallery-item"><img src="img/test1.jpg" alt="Batch 260301 | Baldaxette I | ISO 18"></div>
    <div class="gallery-item"><img src="img/test2.jpg" alt="Batch 260301 | Rolleiflex | ISO 18"></div>
    <div class="gallery-item"><img src="img/test3.jpg" alt="Batch 260301 | RB67 | ISO 16"></div>
</div>
```

Find the batch log section:
```html
<h3 style="text-align: center; text-transform: uppercase; letter-spacing: 2px;">Лог Партій (Batch Log)</h3>
<table class="batch-log">
    <thead>
        <tr>
            <th>Batch #</th>
            <th>Характер партії</th>
            <th>Примітки</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>260301</td>
            <td>Класична / Тональна</td>
            <td>М'які переходи, ідеальна для портретів при денному світлі.</td>
        </tr>
        <tr>
            <td>260321</td>
            <td>Стабілізаці / Температура</td>
            <td>Чесні ISO20 та можна проявляти у 20C.</td>
        </tr>
        <tr>
            <td>260410</td>
            <td>Більше срібла</td>
            <td>ISO 25-30 та більше срібла.</td>
        </tr>
    </tbody>
</table>
```
Replace with:
```html
<h3 style="text-align: center; text-transform: uppercase; letter-spacing: 2px;" data-i18n="section_batches">Лог Партій (Batch Log)</h3>
<table class="batch-log">
    <thead>
        <tr>
            <th data-i18n="batches_th_number">Batch #</th>
            <th data-i18n="batches_th_character">Характер партії</th>
            <th data-i18n="batches_th_notes">Примітки</th>
        </tr>
    </thead>
    <tbody id="batches-tbody" data-fallback>
        <!-- No-JS fallback: most recent 2 batches hardcoded -->
        <tr>
            <td>260410</td>
            <td>Більше срібла</td>
            <td>ISO 25-30 та більше срібла.</td>
        </tr>
        <tr>
            <td>260321</td>
            <td>Стабілізаці / Температура</td>
            <td>Чесні ISO20 та можна проявляти у 20C.</td>
        </tr>
    </tbody>
</table>
```

- [ ] **Step 9: Mark partners section, footer facts, and copyright**

Replace partners heading:
```html
<h3 style="text-transform: uppercase; letter-spacing: 2px; font-size: 0.9rem; color: #888; margin-bottom: 30px;" data-i18n="section_partners">Наші партнери</h3>
```

Replace footer block:
```html
<footer>
    <div class="fact-footer">
        <strong data-i18n="facts_strong">Цікаві факти:</strong><br>
        <span data-i18n="facts_body" data-i18n-html="true">• У кожному кадрі працюють мільярди нано-кристалів, що перетворюють світло на срібну історію. <br>• Цифрові файли зникають, але срібло на плівці зберігає зображення понад 150 років — найнадійніший архів після глиняних таблиць. <br>• Напівпровідники та чіпи у вашому смартфоні ніколи б не з'явилися без технологій фоточутливості срібних галоїдів.</span>
    </div>
    <img src="img/made-in-ukraine.png" alt="Зроблено в Україні" style="height: 45px; margin-bottom: 20px;">
    <p data-i18n="footer_copyright">&copy; 2026 PolyFilms Project. Crafted with Silver and Passion.</p>
</footer>
```

- [ ] **Step 10: Manual smoke check (no JS yet)**

Open `index.html` in a browser (e.g., `open index.html` on macOS, or `python3 -m http.server` from repo root then visit `http://localhost:8000/`).

Expected: page looks **identical** to before (Ukrainian text everywhere, gallery shows 3 images instead of 9, batch table shows 2 rows instead of 3 — those are the fallbacks; full set returns once the JS in Task 6 runs). The toggle UA/EN appears at the top centered above the title.

If anything looks broken (missing text, layout shift), the `data-i18n` attribute change probably broke an inline element. Fix and re-check.

- [ ] **Step 11: Commit**

```bash
git add index.html
git commit -m "refactor: add data-i18n attributes and JSON-driven containers"
```

---

## Task 6: Add render and i18n JavaScript

**Files:**
- Modify: `index.html` (extend the existing `<script>` block, or add a new one)

The script: detects language → fetches all three JSON files → applies translations → renders gallery and batches → wires up the existing modal lightbox to the newly-rendered images.

- [ ] **Step 1: Add the i18n + render script**

Find the existing modal-init script tag opening:
```html
<script>
    window.onload = function() {
```

Insert this **new** `<script>` block immediately before it (so the i18n script runs first, then modal init wires up to the rendered images):

```html
<script>
(function () {
  const SUPPORTED = ["uk", "en"];
  const DEFAULT_LANG = "uk";

  function detectLang() {
    const stored = localStorage.getItem("polyfilms.lang");
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("en")) return "en";
    return DEFAULT_LANG;
  }

  function pickLocalized(value, lang) {
    if (value && typeof value === "object" && "uk" in value) {
      return value[lang] || value.uk || "";
    }
    return value || "";
  }

  function applyStrings(strings, lang) {
    const dict = strings[lang] || {};
    const fallback = strings.uk || {};
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = dict[key] || fallback[key];
      if (value == null) return;
      if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = value;
      } else if (el.tagName === "TITLE") {
        document.title = value;
      } else {
        el.textContent = value;
      }
    });
    // toggle aria-current on language buttons
    document.querySelectorAll("[data-lang-set]").forEach((btn) => {
      btn.setAttribute(
        "aria-current",
        btn.getAttribute("data-lang-set") === lang ? "true" : "false",
      );
    });
  }

  function renderGallery(items, lang) {
    const container = document.getElementById("gallery-container");
    if (!container) return;
    container.removeAttribute("data-fallback");
    container.innerHTML = items
      .map((it) => {
        const alt = pickLocalized(it.alt, lang).replace(/"/g, "&quot;");
        const file = (it.file || "").replace(/"/g, "&quot;");
        return `<div class="gallery-item"><img src="${file}" alt="${alt}"></div>`;
      })
      .join("");
  }

  function renderBatches(items, lang) {
    const tbody = document.getElementById("batches-tbody");
    if (!tbody) return;
    tbody.removeAttribute("data-fallback");
    tbody.innerHTML = items
      .map((b) => {
        const num = String(b.number || "");
        const ch = pickLocalized(b.character, lang);
        const nt = pickLocalized(b.notes, lang);
        return `<tr><td>${num}</td><td>${ch}</td><td>${nt}</td></tr>`;
      })
      .join("");
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  async function boot() {
    let strings, gallery, batches;
    try {
      [strings, gallery, batches] = await Promise.all([
        loadJSON("i18n/strings.json"),
        loadJSON("data/gallery.json"),
        loadJSON("data/batches.json"),
      ]);
    } catch (err) {
      console.warn("i18n/data fetch failed; keeping HTML fallback:", err);
      return;
    }

    let currentLang = detectLang();
    applyStrings(strings, currentLang);
    renderGallery(gallery.items || [], currentLang);
    renderBatches(batches.items || [], currentLang);
    // notify modal init that gallery items were re-rendered
    document.dispatchEvent(new Event("gallery:rendered"));

    document.querySelectorAll("[data-lang-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentLang = btn.getAttribute("data-lang-set");
        localStorage.setItem("polyfilms.lang", currentLang);
        applyStrings(strings, currentLang);
        renderGallery(gallery.items || [], currentLang);
        renderBatches(batches.items || [], currentLang);
        document.dispatchEvent(new Event("gallery:rendered"));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
</script>
```

- [ ] **Step 2: Patch the existing modal init to re-bind after gallery re-renders**

Find:
```javascript
window.onload = function() {
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const prevBtn = document.getElementById('modal-prev');
    const nextBtn = document.getElementById('modal-next');
    const closeBtn = document.getElementById('modal-close');

    const images = Array.from(document.querySelectorAll('.gallery-item img'));
    let currentIndex = 0;
```

Replace with:
```javascript
window.onload = function() {
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const prevBtn = document.getElementById('modal-prev');
    const nextBtn = document.getElementById('modal-next');
    const closeBtn = document.getElementById('modal-close');

    let images = [];
    let currentIndex = 0;

    function bindImages() {
        images = Array.from(document.querySelectorAll('.gallery-item img'));
        images.forEach((img, i) => {
            img.onclick = () => openModal(i);
        });
    }
```

Then find the existing line:
```javascript
        images.forEach((img, i) => img.addEventListener('click', () => openModal(i)));
```
Replace with:
```javascript
        bindImages();
        document.addEventListener('gallery:rendered', bindImages);
```

(Reason: the gallery DOM is rebuilt when JSON loads or language toggles. The modal must re-discover images each time. Using `img.onclick = ...` instead of `addEventListener` cleanly replaces any handler from the previous render.)

- [ ] **Step 3: Manual smoke check**

Serve the site from repo root:
```bash
python3 -m http.server 8000
```
Visit `http://localhost:8000/`.

Expected:
- All 9 gallery images render (not just the 3 fallback ones).
- All 3 batch rows render.
- Page text is Ukrainian (you have `uk-UA` browser, presumably).
- Click an image — modal opens, prev/next/close work.

Open browser console — should be no errors. If `cannot read properties of null` appears, the gallery container `id` mismatch is likely.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add i18n+render JS for gallery, batches, and language toggle"
```

---

## Task 7: Verify language toggle and auto-detection

This task adds no code — it's a verification that what we built in Task 6 actually works for both languages. EN strings are still empty at this point, so EN render falls back to UA per the per-field fallback rule. That's the expected behavior of the fallback path.

**Files:** none.

- [ ] **Step 1: Test the manual toggle**

With the dev server running (`python3 -m http.server 8000` from repo root):

1. Visit `http://localhost:8000/`. Verify UA renders.
2. Click "EN" in the header toggle.
3. Expected: page **stays in UA** because EN strings are empty in `i18n/strings.json` and EN fields in `data/*.json` are empty. The fallback to UA is silent and correct.
4. Verify `<html lang>` changes to `en` (inspect the `<html>` element in DevTools).
5. Reload the page — it should remain on EN (localStorage persistence).
6. Click "UA" — page renders UA again, `<html lang="uk">`.

- [ ] **Step 2: Test auto-detection**

1. In DevTools console, run: `localStorage.removeItem('polyfilms.lang'); location.reload();`.
2. With your normal browser locale (likely `uk` or `en`), the page should pick the matching language on first visit.
3. To force EN detection, change browser locale to English in browser settings, clear localStorage, reload. EN selected.

If either fails, fix the bug in the i18n script. Most likely culprits: typo in a `data-i18n` key; `data-i18n-html` flag missing on a key whose value contains tags.

- [ ] **Step 3: No commit needed for this task**

(All verification, no code change.)

---

## Task 8: Add SEO `hreflang` and dynamic `<html lang>`

**Files:**
- Modify: `index.html`

`<html lang>` is already updated dynamically by the i18n script. We add static `<link rel="alternate" hreflang>` for search engines.

- [ ] **Step 1: Add hreflang links**

Find:
```html
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">
```

Insert immediately above:
```html
<link rel="alternate" hreflang="uk" href="https://polyfilms.pp.ua/">
<link rel="alternate" hreflang="en" href="https://polyfilms.pp.ua/">
<link rel="alternate" hreflang="x-default" href="https://polyfilms.pp.ua/">
```

(Same URL for both languages — language is client-side only. `x-default` tells search engines this is the canonical landing page.)

- [ ] **Step 2: Smoke check**

Reload the dev server page. View page source (Ctrl/Cmd+U). Confirm the three `<link rel="alternate">` lines are present.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add hreflang link tags for UA/EN SEO"
```

---

## Task 9: Fill English translations

**Files:**
- Modify: `i18n/strings.json`, `data/batches.json`, `data/gallery.json`

Agent fills in EN values. Photographic terminology (ISO, ortho, developer names, dilutions) stays standard. Batch numbers and developer brand names are language-neutral.

- [ ] **Step 1: Fill `i18n/strings.json` `en` section**

Replace `"en": {}` at the bottom of `i18n/strings.json` with the fully translated block:

```json
  "en": {
    "page_title": "PolyFilm Ortho20 | Ukrainian Hand-Crafted Emulsion",
    "tagline": "First Ukrainian hand-crafted film",
    "manifesto": "A hand-crafted photographic emulsion is a living organism. From the moment silver nitrate is mixed to the moment it meets light in your camera, it breathes, changes, and forms its own unique character.",
    "section_tests": "Test frames",
    "spec_sensitivity_label": "Sensitivity",
    "spec_sensitivity_value": "ISO 20 / 14° DIN",
    "spec_spectrum_label": "Spectrum",
    "spec_spectrum_value": "Ortho (up to 580 nm)",
    "spec_safelight_label": "Safelight",
    "spec_safelight_value": "Dark Red Safe",
    "spec_format_label": "Format",
    "spec_format_value": "120 (Manual Wrap)",
    "card_storage_title": "Storage & Shelf Life",
    "card_storage_body": "Store in a cool, dry, dark place. Official shelf life — 6 months. Note: \"ripening\" is possible (ISO gain of 0.5–1 stop) over time.",
    "card_emulsion_title": "Handling the Emulsion",
    "card_emulsion_body": "Hand-crafted emulsion dries longer than industrial film. Handle the wet layer with extreme care. Recommended natural drying: 2–3 hours after wash.",
    "card_winding_title": "Manual Winding",
    "card_winding_body": "Because the film is hand-rolled, the spool may be slightly thicker (\"fat roll\"). Load and unload in shade and secure the auto-tape firmly.",
    "tip_strong": "Pro tip:",
    "tip_body": "Thanks to insensitivity to deep red light, you can load the spiral and even monitor development visually under a darkroom safelight. This opens new possibilities for the zone system.",
    "desc_main": "Each batch is hand-made with focus on high silver density and a classic tonal range. We revived the craft of emulsion making, inspired by photography pioneers: <strong>R. Maddox</strong>, <strong>T. Thorne Baker</strong>, <strong>R. Mowrey</strong>, and <strong>M. Ostman</strong>.",
    "desc_footnote": "*We use non-toxic reagents and reclaimed silver. Part of the gelatin (10–20%) is replaced with synthetic polymers to improve layer stability.",
    "section_dev": "Development Recommendations",
    "dev_intro": "Solution temperature: <strong>18–19°C</strong>.<br>Agitation: continuous for the first minute, then 10 sec every minute.",
    "dev_th_developer": "Developer",
    "dev_th_dilution": "Dilution",
    "dev_th_time": "Time",
    "section_join_title": "Become part of the project",
    "section_join_body": "We collect feedback to refine the formula. Every frame you shoot helps the project.",
    "cta_subscribe": "Become a tester",
    "section_batches": "Batch Log",
    "batches_th_number": "Batch #",
    "batches_th_character": "Character",
    "batches_th_notes": "Notes",
    "section_partners": "Our partners",
    "facts_strong": "Did you know:",
    "facts_body": "• Each frame holds billions of nano-crystals that turn light into a silver story.<br>• Digital files vanish, but silver on film keeps the image for over 150 years — the most reliable archive after clay tablets.<br>• Semiconductors and chips in your smartphone would never have appeared without the photosensitivity of silver halides.",
    "footer_copyright": "© 2026 PolyFilms Project. Crafted with Silver and Passion.",
    "lang_toggle_uk": "UA",
    "lang_toggle_en": "EN"
  }
```

- [ ] **Step 2: Fill EN fields in `data/batches.json`**

Open `data/batches.json` and update each `en` field. Replace the file contents with:

```json
{
  "items": [
    {
      "number": "260301",
      "character": { "uk": "Класична / Тональна", "en": "Classic / Tonal" },
      "notes": { "uk": "М'які переходи, ідеальна для портретів при денному світлі.", "en": "Smooth tonal transitions; ideal for daylight portraits." }
    },
    {
      "number": "260321",
      "character": { "uk": "Стабілізаці / Температура", "en": "Stabilization / Temperature" },
      "notes": { "uk": "Чесні ISO20 та можна проявляти у 20C.", "en": "Honest ISO 20; can be developed at 20°C." }
    },
    {
      "number": "260410",
      "character": { "uk": "Більше срібла", "en": "More silver" },
      "notes": { "uk": "ISO 25-30 та більше срібла.", "en": "ISO 25–30 and richer silver content." }
    }
  ]
}
```

- [ ] **Step 3: `data/gallery.json` — alts are already neutral**

Camera/ISO captions are universally understood; the existing `alt.en === alt.uk` value is acceptable as-is. No edits needed.

- [ ] **Step 4: Validate JSON**

```bash
node -e "['i18n/strings.json','data/batches.json','data/gallery.json'].forEach(f => JSON.parse(require('fs').readFileSync(f)))" && echo "OK"
```

Expected: `OK`.

- [ ] **Step 5: Smoke check EN render**

With dev server running, visit page and click EN. All visible text should now be English (except: developer names like "Rodinal", batch numbers, ISO values).

- [ ] **Step 6: Commit**

```bash
git add i18n/strings.json data/batches.json
git commit -m "feat: add English translations for static strings and batch data"
```

---

## Task 10: Pages CMS configuration

**Files:**
- Create: `.pages.yml`

This file tells Pages CMS what content collections exist, what fields they have, and (crucially) what files to leave alone — including `darkroomlog-privacy-policy.html`.

- [ ] **Step 1: Create `.pages.yml`**

```yaml
# Pages CMS configuration — https://pagescms.org/docs/configuration/
media:
  input: img
  output: /img

content:
  - name: batches
    label: Партії (Batch Log)
    type: file
    path: data/batches.json
    format: json
    fields:
      - name: items
        label: Партії
        type: object
        list: true
        fields:
          - name: number
            label: Номер партії
            type: string
            required: true
            description: 'Наприклад: 260410'
          - name: character
            label: Характер
            type: object
            fields:
              - name: uk
                label: Характер UA
                type: string
                required: true
              - name: en
                label: Character EN
                type: string
          - name: notes
            label: Примітки
            type: object
            fields:
              - name: uk
                label: Примітки UA
                type: text
              - name: en
                label: Notes EN
                type: text

  - name: gallery
    label: Галерея (Test Frames)
    type: file
    path: data/gallery.json
    format: json
    fields:
      - name: items
        label: Світлини
        type: object
        list: true
        fields:
          - name: file
            label: Файл (квадратне фото, до 2 МБ)
            type: image
            required: true
          - name: alt
            label: Підпис (камера, ISO)
            type: object
            fields:
              - name: uk
                label: Підпис UA
                type: string
                required: true
              - name: en
                label: Caption EN
                type: string
```

(Note: Pages CMS does not natively enforce file size — the 2 MB cap is a hint in the field label. If a strict cap is needed later, an Action can lint commits.)

- [ ] **Step 2: Commit**

```bash
git add .pages.yml
git commit -m "feat: add Pages CMS configuration for batches and gallery"
```

- [ ] **Step 3: Manual setup (outside the repo)**

This step is performed by the developer in a browser; no code change.

1. Visit `https://app.pagescms.org/` and sign in with GitHub.
2. Click "Add project", select the `polyfilms.pp.ua` repository, branch `main`.
3. Verify the two collections "Партії" and "Галерея" appear with the expected fields.
4. Try editing a batch row, save, watch GitHub for the new commit, watch GitHub Pages rebuild (~30 sec).
5. Revert the test edit via GitHub web UI.

If the editor's GitHub account is separate from the developer's, add the editor as a collaborator on the repo with at least `write` access.

---

## Task 11: Final verification — privacy policy hash + full smoke

**Files:** none modified.

- [ ] **Step 1: Verify privacy policy file is byte-identical to baseline**

Run:
```bash
shasum -a 256 darkroomlog-privacy-policy.html
```

Compare the hash to the value saved in Task 1, Step 1 (`/tmp/polyfilms-privacy-baseline.txt`):
```bash
diff <(shasum -a 256 darkroomlog-privacy-policy.html) /tmp/polyfilms-privacy-baseline.txt
```

Expected: empty diff. If anything differs, **stop** and investigate — this file links from the iOS app and must not change.

- [ ] **Step 2: Smoke test the live deployment**

Push the branch (or merge to main if doing direct-to-main), wait ~60 sec for GitHub Pages to rebuild, then visit `https://polyfilms.pp.ua/`.

Verify in this order:
1. Page renders identically to current production (UA visible).
2. All 9 gallery photos load.
3. All 3 batch rows present.
4. Modal lightbox: click image, prev/next, swipe on phone, ESC and X close.
5. Toggle EN: all text switches to English.
6. Toggle UA: switches back.
7. Reload while on EN: stays on EN.
8. `https://polyfilms.pp.ua/darkroomlog-privacy-policy.html` still loads and shows the iOS privacy policy unchanged.

- [ ] **Step 3: No commit needed (verification task)**

---

## Task 12 (deferred): Swap Google Form CTA → MonoBase URL

This task waits until Vitalii completes MonoBase registration and has the public subscription URL.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update CTA href**

Find:
```html
<a href="https://docs.google.com/forms/d/e/1FAIpQLSdMDPyZSOiO6kHvbb6dvB592Hl8D_6nDmDZChDO9m91unzddg/viewform" class="btn" target="_blank" data-i18n="cta_subscribe">Стати тестером</a>
```

Replace with:
```html
<a href="<MONOBASE_URL>" class="btn" target="_blank" data-i18n="cta_subscribe">Стати тестером</a>
```

Where `<MONOBASE_URL>` is the actual subscription URL from MonoBase.

- [ ] **Step 2: Update `cta_subscribe` in both languages**

In `i18n/strings.json`, change:
- `uk.cta_subscribe` from `"Стати тестером"` to `"Підписатися на MonoBase"`
- `en.cta_subscribe` from `"Become a tester"` to `"Subscribe on MonoBase"`

- [ ] **Step 3: Smoke test**

Click the button locally — opens MonoBase in a new tab.

- [ ] **Step 4: Commit**

```bash
git add index.html i18n/strings.json
git commit -m "feat: switch tester CTA to MonoBase subscription"
```

---

## Done

After Task 11, the site has:

- Two JSON files of structured content edited via Pages CMS by a non-technical user.
- A bilingual UA/EN site with auto-detect, manual toggle, and per-field UA fallback.
- The `darkroomlog-privacy-policy.html` file untouched (verified by hash diff).
- One inline static fallback per dynamic section, so a network failure never leaves the page empty.
- Git history with one revertable commit per task.

Task 12 closes the loop on MonoBase whenever Vitalii's account is ready.

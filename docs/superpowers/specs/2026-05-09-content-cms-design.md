# PolyFilm Ortho — Content CMS & Bilingual Site

**Date:** 2026-05-09
**Status:** Approved design, pending implementation plan
**Author:** Vitalii Kovalyshyn (with brainstorming assistance)

---

## Problem

`polyfilms.pp.ua` is a single hand-edited `index.html` on GitHub Pages. Two pieces of content change regularly:

- **Gallery** (`img/test1..9.jpg` + alt text per camera/ISO).
- **Batch log** (table of production batches with character + notes).

Both are hardcoded into HTML. Editing requires opening the file, finding the right markup, and pushing to git. The intended editor is non-technical and should not touch HTML or git.

A third concern — orders — has been removed from scope: subscriptions and payment will live entirely in MonoBase. The site only needs a single "Subscribe on MonoBase" button replacing the current Google Form CTA.

The site must also be available in **English** (auto-detected from browser, with manual toggle), without doubling editor effort and without duplicating layout.

## Goals

1. Non-technical editor adds/edits/removes batches and gallery items via a web form on a phone or desktop.
2. Both UA and EN versions render from the same source of truth.
3. Hosting cost stays at $0; no servers to babysit.
4. Every change is in git history; one-click revert exists.
5. Editor cannot break the site layout or publish broken JSON.

## Non-Goals

- Order intake, payment, shipment tracking — owned by MonoBase.
- A custom-built admin UI (we use an existing CMS).
- Image processing/cropping — editor uploads pre-prepared JPGs; squareness comes from existing CSS `object-fit: cover`.
- Translating the iOS app's privacy policy page (`darkroomlog-privacy-policy.html`) — see Constraints.

## Constraints

- **`darkroomlog-privacy-policy.html` MUST remain at its current path with its current text byte-for-byte.** The DarkroomLog iOS app links to it from its App Store listing. Any change risks App Store rejection or breaking the app's privacy disclosure. The file:
  - Stays English-only.
  - Is excluded from CMS visibility (no edit form, no rename, no delete).
  - Is not migrated to JSON.
- GitHub Pages is the deploy target (no server-side code).
- Free-tier services only (no paid SaaS dependencies).

## Architecture

Static site with externalized content. CMS is a third-party SaaS that commits to the GitHub repo.

```
[Editor browser] ──OAuth──> [Pages CMS] ──GitHub API──> [repo]
                                                          │
                                                          │  data/*.json, img/*
                                                          ▼
[Visitor browser] <──fetch── [GitHub Pages CDN]
```

- Public site: GitHub Pages serves `index.html` + JSON + images.
- Admin: [Pages CMS](https://pagescms.org) (free, OAuth via GitHub), reads/writes content files in the repo.
- Build: none. Rendering is client-side via `fetch` + small JS.

### Why Pages CMS over alternatives

| Option | Verdict |
|---|---|
| **Pages CMS** ✅ | Purpose-built for GitHub Pages. GitHub OAuth out of the box, no auth proxy needed. Free. Mobile-friendly UI. |
| Decap CMS | Works, but needs a separate OAuth proxy to be hosted somewhere. More moving parts. |
| Sveltia CMS | Decap fork; same OAuth-proxy concern. |
| Self-hosted admin on Debian + Nginx | Custom code (~500 lines), TLS, deploy pipeline. Overkill for the volume (~5 batches/year, ~10 photos). |
| Cloudflare Pages + Workers + R2 | Lock-in to CF, more complex than needed. |

**Lock-in risk:** Pages CMS is small open source. If it disappears, the underlying content (`data/*.json` in git, photos in `img/`) is portable to any of the alternatives without changing the site code.

## Bilingual Strategy: Hybrid Two-Layer

Content is split by **who edits it and how often**:

| Layer | Examples | Storage | Editor |
|---|---|---|---|
| **Brand copy** (static) | manifesto quote, info-card descriptions, "Рекомендації з проявки" intro, footer facts | `i18n/strings.json` referenced by `data-i18n` attributes in HTML | developer (rare) |
| **Dynamic content** | batch log rows, gallery alt text | `data/batches.json`, `data/gallery.json` — each translatable field is an object `{ uk, en }` | non-technical editor via CMS (often) |

**Language resolution order** (on page load):
1. `localStorage.getItem('lang')` if set by manual toggle.
2. `navigator.language.startsWith('en') ? 'en' : 'uk'`.
3. Fallback `'uk'`.

**Per-field fallback:** if a record has UA but EN is empty, EN render shows UA text. Site never blanks out.

**Toggle UI:** small `UA / EN` text switcher in header. Click sets `localStorage.lang` and re-renders without reload.

**SEO:**
- `<html lang>` set dynamically to current language.
- `<link rel="alternate" hreflang="uk" href="…">` and `hreflang="en"` in `<head>`.
- Default URL serves both languages from `index.html`; language is a client-side concern (no separate URLs). Acceptable for a small site; revisit if SEO needs separate URLs.

## Components

### File layout (post-migration)

```
/
├── index.html                       # existing; gets ~50 lines of i18n+render JS
├── darkroomlog-privacy-policy.html  # UNTOUCHED
├── favicon.ico, CNAME, README.md, .gitignore
├── img/                             # photos; CMS uploads here
│   ├── test1.jpg … test9.jpg
│   ├── apple-touch-icon.png
│   └── made-in-ukraine.png
├── data/
│   ├── batches.json                 # [{ number, character: {uk, en}, notes: {uk, en} }]
│   └── gallery.json                 # [{ file, alt: {uk, en} }]
├── i18n/
│   └── strings.json                 # { uk: {key: "..."}, en: {key: "..."} }
├── .pages.yml                       # Pages CMS schema
└── docs/superpowers/specs/…
```

### `data/batches.json` schema

```json
[
  {
    "number": "260301",
    "character": { "uk": "Класична / Тональна", "en": "Classic / Tonal" },
    "notes":     { "uk": "М'які переходи…",       "en": "Soft transitions…" }
  }
]
```

### `data/gallery.json` schema

```json
[
  {
    "file": "img/test1.jpg",
    "alt": { "uk": "Batch 260301 | Baldaxette I | ISO 18", "en": "Batch 260301 | Baldaxette I | ISO 18" }
  }
]
```

(Camera names and ISO numbers are language-neutral; `en` field can mirror `uk` and the editor can simply duplicate by default.)

### `i18n/strings.json` schema

```json
{
  "uk": {
    "tagline": "Перша українська крафтова плівка",
    "manifesto": "Крафтова фотографічна емульсія…",
    "section_tests": "Тестові кадри",
    "...": "..."
  },
  "en": { "tagline": "...", "manifesto": "...", "...": "..." }
}
```

Roughly 25–30 keys total (every piece of static UA copy currently in `index.html`).

### `index.html` changes

- All visible Ukrainian text wrapped: `<span data-i18n="tagline">…</span>` (initial UA value stays as a graceful no-JS fallback).
- Hardcoded `<table class="batch-log">` body and `.gallery` container become empty — JS populates from JSON.
- Existing modal lightbox JS still wires up to gallery items after they're rendered.
- Language toggle markup: small `<button>` group in header.
- "Стати тестером" CTA: `href` swapped to MonoBase URL once the channel is registered. Text becomes `data-i18n="cta_subscribe"` (UA: "Підписатися на MonoBase", EN: "Subscribe on MonoBase").

### `.pages.yml` (Pages CMS config)

Defines two collections:
- **Партії / Batches** — list view of `data/batches.json`. Form fields: `number` (string, required), `Характер UA` + `Характер EN`, `Примітки UA` + `Примітки EN`. Reorderable.
- **Галерея / Gallery** — list view of `data/gallery.json`. Form fields: `file` (image upload to `img/`, max 2 MB), `Alt UA` + `Alt EN`. Drag-to-reorder.

Files explicitly excluded from CMS: `darkroomlog-privacy-policy.html`, `index.html`, `i18n/strings.json` (developer-edited).

### `migrate.mjs` (one-shot)

Node script that:
1. Parses current `index.html`.
2. Extracts the 9 gallery items into `data/gallery.json` (alt copied to both `uk` and `en`).
3. Extracts the 3 batch rows into `data/batches.json` (UA filled, EN left as `""`; filled by agent in the next step).
4. Extracts static UI strings into `i18n/strings.json` (UA filled, EN empty).
5. Prints a checklist of every key/field that needs an English translation.

After migration, **the agent performs the EN translation pass** in a single editing step (technical photographic copy: ISO, developers, batch character, etc.). No human translator in the loop.

Run once, then deleted from the repo (or archived under `scripts/`).

## Data Flow

1. Editor opens `app.pagescms.org`, logs in via GitHub.
2. Selects "Партії" or "Галерея", edits via form, saves.
3. Pages CMS commits to `main` branch on the editor's behalf.
4. GitHub Pages rebuilds (~30s).
5. Visitor's browser fetches updated `data/*.json` and re-renders.

For a layout/brand-copy change:
1. Developer edits `index.html` or `i18n/strings.json` directly via git.
2. Pushes; GitHub Pages rebuilds.

## Error Handling

- **Malformed JSON:** prevented by `.pages.yml` schema validation in the CMS UI. Required fields, type checks, max sizes are enforced before commit.
- **`fetch` failure** (network / 404): the rendered page falls back to a small inline static block in `index.html` showing the most recent ~3 batches and ~3 gallery items as plain HTML, so the page never appears empty. The static block is updated by the developer occasionally; staleness is acceptable since this is an offline-failure state only.
- **Missing translation:** per-field UA fallback (described above). Console warning logged in dev.
- **Photo too large:** CMS rejects file over 2 MB with a clear message. Editor resizes externally.
- **Bad commit reaches main:** revert via GitHub web UI in one click. No data is lost since git history is intact.

## Testing

No automated tests for this size of project.

**Migration acceptance:**
- Render before and after migration; visually compare the rendered DOM and screenshots match.
- All 9 gallery images and 3 batch rows present.
- Modal lightbox still works (open, prev/next, close, swipe on mobile).

**Editor self-test (one-time):**
- Add a dummy batch via CMS → appears on site within 60s.
- Upload a dummy photo → appears in gallery.
- Delete dummy entries → removed.

**Bilingual smoke test:**
- Visit site with browser language set to `en-US` → English copy renders.
- Visit with `uk-UA` → Ukrainian renders.
- Toggle UA/EN button → switches without reload, persists across reloads.
- Empty EN field on one batch → that batch renders UA text on EN page (fallback works).

**Privacy policy:**
- Confirm `darkroomlog-privacy-policy.html` is byte-identical pre/post migration (`diff` and `sha256sum`).
- Confirm CMS does not expose it for editing.

## Rollout

1. Branch `feature/cms-i18n`.
2. Run `migrate.mjs`; commit generated JSON.
3. Update `index.html` with `data-i18n` attributes, render JS, language toggle.
4. Add `.pages.yml`.
5. Manually verify rendered output matches current site.
6. Agent fills EN values in `i18n/strings.json` and EN fields in `data/*.json` (one pass).
7. Merge to `main`. Verify GitHub Pages build.
8. Set up Pages CMS: connect repo, create editor's GitHub account, add as collaborator, walk through editing.
9. Replace "Стати тестером" CTA with MonoBase link once available.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pages CMS service shuts down | Content is plain JSON in git; switch to Decap/Sveltia/TinaCMS without site rewrite. |
| Editor accidentally commits broken JSON | CMS schema validation + git revert. |
| `darkroomlog-privacy-policy.html` accidentally edited | Excluded from CMS config; CI check (optional) to fail if its hash changes without explicit approval. |
| EN translations stale or missing | Per-field UA fallback; never blank. |
| Photos balloon repo size | 2 MB cap per upload + repo currently <10 MB; revisit if it ever exceeds 500 MB. |

## Future Considerations (Out of Scope Now)

- Separate URLs per language (`/`, `/en/`) for stronger SEO if traffic justifies it.
- A "developer's notes" / blog section.
- Webhook from MonoBase if it ever exposes one (revisit only if manual workflow proves painful).

## Estimated Effort

- Migration script + JSON extraction: 1 hr
- `index.html` refactor (i18n attributes, render JS, toggle): 2 hrs
- `.pages.yml` + Pages CMS setup + editor onboarding: 1 hr
- EN translation of all strings (done by agent): one editing step, no extra human time
- Verification + smoke tests: 1 hr

**Total: ~6–7 hrs of developer work, plus translation pass.**

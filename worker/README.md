# PolyFilms pre-registration Worker

Cloudflare Worker that receives JSON POSTs from the registration form on polyfilms.pp.ua, validates them and sends email via [Resend](https://resend.com).

## What it does

- Accepts `POST /` with a JSON body (`name`, `phone`, `email`, `country`, `address`, `comment`, `lang`).
- Validates required fields and email format; rejects sanctioned countries (`RU`, `BY`, `IR`, `KP`, `SY`, `CU`) at the server level.
- Fetches `notify_email` and `notify_cc` from `https://polyfilms.pp.ua/data/registration.json` (cached 60s) — so Pages CMS edits to the recipient propagate without re-deploying the worker.
- Sends a notification email to the team (with CC) and a confirmation auto-reply to the registrant in their language.
- Honours the `open: false` flag in the config — returns 403 if registration is paused.

## One-time setup

1. **Install Wrangler:** `npm i -g wrangler` (or use `npx wrangler`).
2. **Log in:** `wrangler login`.
3. **Create a Resend account** at https://resend.com, verify the `polyfilms.pp.ua` domain (Resend gives you the DNS records — usually two `TXT` and one `MX`), then generate an API key.
4. **Add the secret:**
   ```
   cd worker
   wrangler secret put RESEND_API_KEY
   # paste the key when prompted
   ```

## Deploy

```
cd worker
wrangler deploy
```

After the first deploy:

1. Open the Cloudflare dashboard → Workers & Pages → `polyfilms-register` → Settings → Triggers → Custom Domains.
2. Add `api.polyfilms.pp.ua` (Cloudflare will create the DNS record automatically if `polyfilms.pp.ua` is on Cloudflare DNS).
3. In Pages CMS, open the **Попередня реєстрація** entry and set `URL бекенду` to `https://api.polyfilms.pp.ua/`. Save.
4. The form on the site goes live.

## Local test

```
cd worker
wrangler dev
# in another shell:
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Тест","phone":"+380...","email":"you@example.com","country":"UA","address":"Київ, Хрещатик 1","comment":"","lang":"uk"}'
```

You won't actually receive mail in `dev` unless the secret is also configured locally (`wrangler dev --remote` connects to your deployed secrets).

## Operations

- **Pause registration:** flip `Реєстрація відкрита` to off in Pages CMS. The site shows the "closed" notice and the worker rejects new POSTs even if someone bypasses the UI.
- **Change recipients:** edit `Email для сповіщень` / `Email копії` in Pages CMS. Changes apply within ~60 seconds (config cache TTL).
- **Logs:** `wrangler tail` or the Cloudflare dashboard.
- **Spam:** the form has a honeypot. If real spam appears, add [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) — drop the widget into the form and verify the token in the worker.

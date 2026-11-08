# DEPLOYMENT — BLauncher MOD on Cloudflare

The site is 100% static + a single Cloudflare Pages Function directory (`/functions`),
so it deploys in minutes and scales on Cloudflare's edge for free.

---

## Option A — Git integration (recommended)

1. Push this repository to GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   * Framework preset: **None**
   * Build command: *(empty)*
   * Build output directory: `/`
4. Deploy. Functions in `/functions` are picked up automatically.
5. Add the CurseForge key: **Settings → Variables and Secrets → Add**
   * Name: `CURSEFORGE_API_KEY`
   * Value: your official key (Secret)
   * Apply to **Production + Preview**, then *Redeploy*.

## Option B — Direct upload with Wrangler (no Git)

```bash
npm i -g wrangler          # only if you want the CLI
wrangler pages project create blaunchermod
npx wrangler pages deploy . --project-name blaunchermod
npx wrangler pages secret put CURSEFORGE_API_KEY --project-name blaunchermod
```

## Verify the deployment

```
https://<your-pages-domain>/                 → Home
https://<your-pages-domain>/api/health       → {"ok":true, ... "cursed":true|false}
https://<your-pages-domain>/api/curseforge/ping → "key":"present" (after key setup)
https://<your-pages-domain>/modrinth.html    → live Modrinth search works
https://<your-pages-domain>/curseforge.html  → live CurseForge search works
```

* `"cursed":false` simply means the CurseForge key isn't set yet — the site will
  show a friendly setup warning and keep working everywhere else.

## Custom domain

Pages project → **Custom domains → Set up a domain** → follow the DNS prompts.
SSL/proxying is automatic.

## Caching & headers

`_headers` ships with sane rules:

* Immutable long-cache for `/assets/*` (includes `versions.min.js` real-data snapshot).
* `must-revalidate` for HTML.
* Security headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  minimal CSP (Google Fonts allowed for the pixel heading font).

## Local development

```bash
# static only
python3 -m http.server 8080

# with the CurseForge proxy locally
CURSEFORGE_API_KEY=yourkey node server.js   # http://localhost:8787
```

Cloudflare parity preview:
`npx wrangler pages dev .` (loads `wrangler.toml` + `functions/`, uses env vars with `--binding CURSEFORGE_API_KEY`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| CurseForge portal shows setup warning | Add/repair `CURSEFORGE_API_KEY`, redeploy, check `/api/health` |
| `401` from proxy | Key invalid or paid-API access revoked → rotate key (see API_SETUP.md) |
| Fonts look plain | Offline — the pixel font is loaded from Google Fonts with system fallback |
| Modrinth "Network hiccup" | Modrinth API briefly unavailable; cached results still render |

## Redeploys

Git push → automatic build-free deploy (static files only).

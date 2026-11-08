# BLauncher MOD — Minecraft, Amplified.

A premium cinematic fan website and portal for Minecraft mods, modpacks, resource packs,
shaders and every official version **1.0 → 26.3** — powered by the **official Modrinth v2 API**
and the **official CurseForge API** (proxied server-side).

★ Made & sponsored by **Arif The Gamer**

> **Disclaimer:** BLauncher MOD is an independent unofficial fan-made website and is not
> affiliated with Mojang Studios, Microsoft, Modrinth, CurseForge or Overwolf.

---

## Highlights

| Area | What you get |
|---|---|
| Home | Cinematic voxel hero, live project/ version stats, universal search, trending feed |
| Search | Modrinth + CurseForge multi-portal, autocomplete, debounce, sorting, type/category filters |
| Modrinth | Official v2 API: search, facets, project details, gallery, stats, version history, official downloads |
| CurseForge | Official API through a zero-leak server proxy. Missing key → clear setup warning, never fake data |
| Versions | All official Mojang versions (release / snapshot / beta / alpha, 1.0 → 26.3) from piston-meta, plus offline snapshot fallback |
| Downloads | Direct official files. Compatibility check vs. your saved MC version + loader (Settings) |
| Upload | Validated creator submissions: metadata checks, image compression preview, live status |
| Publish | Password-gated admin review dashboard (pending / approved / rejected) via SHA-256 |
| Favorites | ★ any project; stored locally only |
| Settings | Dark/light, **Ultra · Balanced · Performance** render modes, animations toggle, reduced motion, cache controls |
| Performance | No frameworks, no build step, lazy images, API caching, pagination, mobile-first CSS |

## Tech

Pure **HTML + CSS + vanilla ES2020**. Cloudflare Pages **Functions** for the server-side API proxy.
Zero npm dependencies for the site itself — nothing to `npm install` unless you want Wrangler.

```
BLauncherMOD/
├── index.html  special.html  versions.html  modrinth.html  curseforge.html
├── upload.html publish.html  favorites.html  settings.html  about.html
├── privacy.html contact.html  404.html
├── assets/
│   ├── css/style.css          # full design system (dark/light, 3 render modes)
│   ├── js/common.js           # storage, cache, favorites, toasts, nav
│   ├── js/api.js              # Modrinth v2 + CurseForge proxy clients + shared cards/modal
│   ├── js/pages/*.js          # one small script per page
│   ├── data/versions.min.js   # offline snapshot of the official manifest (real data)
│   └── img/logo.png           # pixel-art logo
├── functions/api/curseforge/[[path]].js   # CurseForge official API proxy (key stays server-side)
├── functions/api/health.js                # deployment + key-presence probe
├── server.js                              # optional zero-dep local dev server (same proxy logic)
├── Blauncher.png                          # original logo asset
├── _headers  robots.txt  wrangler.toml
└── README.md  DEPLOYMENT.md  API_SETUP.md  .env.example
```

## Quick start (local)

```bash
# Option A — static only (Modrinth + Versions work; CurseForge shows setup warning)
python3 -m http.server 8080

# Option B — full local parity with Cloudflare Functions (CurseForge proxy included)
cp .env.example .env         # add your official CURSEFORGE_API_KEY
CURSEFORGE_API_KEY=yourkey node server.js
# → http://localhost:8787
```

No build step, no install — the site runs from static files.

## Admin access (Publish page)

* Default password: `BLAUNCHER-ADMIN-2026`
* It is hashed with **SHA-256** (`sha256("<password>|blx")`) — never stored in plain text, kept on your device only.
* Change it right after first login: Publish → *Change password* (min 8 characters).
* For hosted/multi-device review queues, wire the optional Cloudflare KV function described in `API_SETUP.md`.

## Performance model

* **Ultra** — full cinematic atmosphere: CSS-3D floating cubes, glowing portals, animated rings.
* **Balanced** — portals and transitions stay, floating cubes park.
* **Performance** — everything decorative off; content is king.
* Respects `prefers-reduced-motion` and the manual *Reduced motion* switch.
* Animations use only `transform`/`opacity` (GPU-cheap, no jank on budget phones).

## API & data honesty

* Modrinth: `https://api.modrinth.com/v2` — public, called straight from the browser (CORS-friendly).
* CurseForge: `https://api.curseforge.com/v1` — called **only** from the server function; the key
  never reaches the frontend. Missing/invalid key → explicit warning in UI, no invented data — ever.
* Minecraft versions: official `piston-meta` manifest, with a genuinely-fetched offline snapshot
  (`assets/data/versions.min.js`) captured at build time as fallback.

## Privacy

No accounts, no cookies for tracking, no analytics. Favorites/submissions/settings live in your
browser's localStorage — full details in the site's Privacy Policy page.

---

★ Made & sponsored by Arif The Gamer.


## Deploy on GitHub Pages (static hosting)

1. Create a **public** GitHub repository, for example `BLauncher`.
2. Upload the contents of this ZIP to the repository root (not inside another folder).
3. Open **Settings → Pages** and choose **GitHub Actions** as the build/deployment source.
4. The included workflow `.github/workflows/pages.yml` will publish the site after you push to the `main` branch.
5. Your free default address will be `https://YOUR-USERNAME.github.io/BLauncher/`.

**Important limitations:** GitHub Pages is static hosting. Modrinth and the static website pages work, but GitHub Pages cannot execute the included Cloudflare Functions or Node/PHP server code. The CurseForge page will show an honest notice instead of pretending its official API works. To enable CurseForge later, connect a secure backend/proxy separately; never put a CurseForge API key in browser JavaScript or a public repository.

A custom domain such as `BLauncher.com` can be connected later, but owning a `.com` domain normally costs money. GitHub Pages does not provide free `.com` registrations.

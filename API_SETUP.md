# API_SETUP — Official APIs behind BLauncher MOD

BLauncher MOD uses **only official, documented APIs**. Nothing is scraped, nothing fabricated.

---

## 1. Modrinth (no setup needed)

* Base: `https://api.modrinth.com/v2` — public REST API, browser-friendly (CORS enabled).
* Endpoints in use:
  * `GET /search` — query, `facets` (categories, versions, loaders, project_type), `index`, `offset`, `limit`
  * `GET /project/{id|slug}` — full details + gallery + stats
  * `GET /project/{id}/version` — version history + official download files
  * `GET /projects?ids=[...]` — batch lookups (Special page)
* No API key is required for normal public read access. If you ever hit
  Cloudflare rate limits (401/429), request a personal key at
  <https://docs.modrinth.com> and call with header `Authorization: <key>`
  server-side — but by default nothing else is needed.

## 2. CurseForge (official key, server-side only)

* Base: `https://api.curseforge.com/v1` — official CurseForge API (Overwolf).
* Access: request an API key via the **CurseForge for Studios** developer portal:
  <https://console.curseforge.com/> (register your app → API Key).
* The MCP v1 key must be kept secret: it authorizes paid API usage.

### Configure on Cloudflare Pages

Dashboard → Pages project → **Settings → Variables and Secrets**:

| Name | Value | Type |
|---|---|---|
| `CURSEFORGE_API_KEY` | *your official key* | **Secret** |

or via CLI:

```bash
npx wrangler pages secret put CURSEFORGE_API_KEY --project-name blaunchermod
```

### The proxy contract (functions/api/curseforge/[[path]].js)

```
GET /api/curseforge/search        → /v1/mods/search?gameId=432...
GET /api/curseforge/categories    → /v1/categories?gameId=432
GET /api/curseforge/projects/{id}       → /v1/mods/{id}
GET /api/curseforge/projects/{id}/files → /v1/mods/{id}/files
GET /api/curseforge/ping          → { ok, key: "present"|"missing" }
GET /api/health                   → deployment probe (booleans only)
```

* The key is attached as `x-api-key` **inside the Function**. It is never sent to
  clients and never appears in responses.
* Without the key: `503 {"error":"setup"…}` → the UI shows a clear
  "CurseForge API not configured" warning. No fake data is ever shown.

### Local testing

```bash
cp .env.example .env
# put your key into .env, then:
CURSEFORGE_API_KEY=$(grep CURSEFORGE_API_KEY .env | cut -d= -f2) node server.js
curl localhost:8787/api/curseforge/ping
```

### Rate limits & caching

* The official limit scales with your granted access (typically 2400 req/min per key).
* The Function edge-caches identical GETs for 5 minutes (`X-BFX-Cache: hit`).
* The frontend additionally caches responses in-memory/localStorage with TTLs
  and de-duplicates in-flight requests.

### Key rotation

1. Revoke the old key in the developer console, generate a new one.
2. Update the Pages secret (or `.env` locally) and redeploy.
3. Verify with `/api/health` + `/api/curseforge/ping`.

## 3. Mojang piston-meta (no setup needed)

`https://piston-meta.mojang.com/mc/game/version_manifest_v2.json` — the official
manifest used by the Versions page (release/snapshot/beta/alpha, changelog URLs).
A real snapshot of this manifest is bundled as offline fallback.

## 4. Security checklist

- [ ] `CURSEFORGE_API_KEY` exists only as a Cloudflare **Secret** (or local `.env`).
- [x] No key material ships in any frontend file (grep the bundle: zero).
- [x] `functions/api/health.js` returns booleans, never key contents.
- [x] Proxy adds no CORS wildcard beyond the requesting origin.
- [x] Upload submissions stay local until reviewed (or behind your own KV if you
      extend it — see DEPLOYMENT.md).

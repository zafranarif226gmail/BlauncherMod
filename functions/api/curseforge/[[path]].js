/**
 * BLauncher MOD — official CurseForge proxy (Cloudflare Pages Function)
 * GET /api/curseforge/*  →  https://api.curseforge.com/v1/*
 * The x-api-key is injected from the server environment.
 * It is NEVER exposed to the browser. Without the key we return a clean setup error.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cors = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': url.origin,
    'Vary': 'Origin'
  };
  const reply = (status, obj) =>
    new Response(JSON.stringify(obj), { status, headers: cors });

  let rel = url.pathname.replace(/^\/api\/curseforge\/?/, '')
    .replace(/\/+$/, '');
  if (rel === '' || rel === 'ping') {
    return reply(env.CURSEFORGE_API_KEY ? 200 : 503,
      { ok: true, service: 'curseforge-proxy', key: env.CURSEFORGE_API_KEY ? 'present' : 'missing' });
  }

  const key = env.CURSEFORGE_API_KEY;
  if (!key) {
    return reply(503, {
      error: 'setup',
      message: 'CURSEFORGE_API_KEY is not configured on this server. Set it in Cloudflare Pages: Settings > Environment variables. See API_SETUP.md. (Official API only — nothing is faked.)'
    });
  }

  /* map friendly paths to the official CurseForge v1 endpoints */
  let targetPath, params = url.searchParams;
  if (rel === 'search') targetPath = 'mods/search';
  else if (rel === 'categories') targetPath = 'categories';
  else if (/^projects?\/(\d+)\/files$/.test(rel)) {
    targetPath = rel.replace(/^projects?\/(\d+)\/files$/, 'mods/$1/files');
  } else if (/^projects?\/(\d+)$/.test(rel)) {
    targetPath = rel.replace(/^projects?\/(\d+)$/, 'mods/$1');
  } else if (/^mods\/.+$/.test(rel)) targetPath = rel;
  else if (/^games$/.test(rel)) targetPath = 'games';
  else return reply(404, { error: 'not_found', message: 'Unknown proxy route' });

  /* normalize common params for the official contract */
  let qs = new URLSearchParams();
  for (const [k, v] of params) if (!['', null].includes(v)) qs.set(k, v);

  const target = 'https://api.curseforge.com/v1/' + targetPath + (qs.toString() ? '?' + qs.toString() : '');

  /* edge cache: identical public lookups reduce official API usage */
  const cache = caches.default;
  const cacheKey = new Request(target, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) {
    const r2 = new Response(hit.body, hit);
    r2.headers.set('X-BFX-Cache', 'hit');
    return r2;
  }

  const res = await fetch(target, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'x-api-key': key },
    cf: { cacheTtl: 300, cacheEverything: false }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '{}');
    if (res.status === 401 || res.status === 403) {
      return reply(401, { error: 'setup', message: 'CurseForge rejected the configured key (' + res.status + '). Check CURSEFORGE_API_KEY validity/paid API access.' });
    }
    if (res.status === 429) {
      return reply(429, { error: 'rate_limited', message: 'Official CurseForge rate limit hit — retry soon.' });
    }
    return reply(502, { error: 'upstream', status: res.status, message: 'Official API error', detail: body.slice(0, 400) });
  }

  const out = new Response(res.body, res);
  out.headers.set('Content-Type', 'application/json; charset=utf-8');
  out.headers.set('X-BFX-Proxy', 'curseforge');
  out.headers.set('Vary', 'Origin');
  context.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method', message: 'GET only' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } });
}

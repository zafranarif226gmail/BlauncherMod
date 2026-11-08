/** BLauncher MOD — deployment + API health probe (no secrets returned) */
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    service: 'BLauncher MOD',
    version: '1.0.0',
    time: new Date().toISOString(),
    cursed: !!(env && env.CURSEFORGE_API_KEY),
    note: 'cursed:true means CURSEFORGE_API_KEY is configured on this deployment (boolean only — the key never leaves the server).'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

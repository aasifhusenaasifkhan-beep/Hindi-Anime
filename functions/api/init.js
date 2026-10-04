export async function onRequest({ request, env }) {
  const pass = new URL(request.url).searchParams.get('pass');
  if (pass !== env.ADMIN_PASS) return new Response("Unauthorized", { status: 401 });

  const base = env.TURSO_URL.trim().replace(/^libsql:/, "https:").replace(/\/$/, "");
  const sqls = [
    "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, json TEXT, updated INTEGER)",
    "CREATE TABLE IF NOT EXISTS vip (email TEXT PRIMARY KEY, json TEXT)",
    "CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, json TEXT)",
    "CREATE TABLE IF NOT EXISTS links (ep TEXT PRIMARY KEY, url TEXT)",
    "CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, ep TEXT, created INTEGER, unlocked INTEGER, ip TEXT)",
    "CREATE INDEX IF NOT EXISTS idx_tokens_ip ON tokens (ip, created)",
    "CREATE INDEX IF NOT EXISTS idx_tokens_created ON tokens (created)"
  ];
  const body = { requests: [...sqls.map(sql => ({ type: "execute", stmt: { sql } })), { type: "close" }] };

  try {
    const r = await fetch(base + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.TURSO_TOKEN.trim(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    const err = (j.results || []).find(x => x.type === "error");
    if (!r.ok || err) return new Response("Error: " + JSON.stringify(err || j), { status: 500 });
    return new Response("Turso Tables Ready! (posts, vip, config, links, tokens)");
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}

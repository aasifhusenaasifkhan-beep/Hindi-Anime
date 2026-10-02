export async function onRequest({ request, env }) {
  const pass = new URL(request.url).searchParams.get('pass');
  if (pass !== env.ADMIN_PASS) return new Response("Unauthorized", { status: 401 });

  const base = env.TURSO_URL.trim().replace(/^libsql:/, "https:").replace(/\/$/, "");
  const sqls = [
    "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, json TEXT, updated INTEGER)",
    "CREATE TABLE IF NOT EXISTS vip (email TEXT PRIMARY KEY, json TEXT)",
    "CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, json TEXT)"
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
    return new Response("Turso Tables Created Successfully! Ab site ready hai.");
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}

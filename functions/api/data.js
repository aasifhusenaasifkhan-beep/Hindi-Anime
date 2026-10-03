import { getDB } from './_db.js';

export async function onRequest(context) {
  const data = { posts: [], vip: [], cfg: {}, sh: [] };
  try {
    const db = getDB(context.env);
    data.posts = (await db.execute("SELECT json FROM posts ORDER BY updated DESC")).rows.map(r => JSON.parse(r.json));
    data.vip = (await db.execute("SELECT json FROM vip")).rows.map(r => JSON.parse(r.json));
    const cfg = await db.execute("SELECT json FROM config WHERE id = 'cfg'");
    if (cfg.rows.length) data.cfg = JSON.parse(cfg.rows[0].json);
    const sh = await db.execute("SELECT json FROM config WHERE id = 'sh'");
    if (sh.rows.length) data.sh = JSON.parse(sh.rows[0].json);
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    // Khaali data nahi bhejte (warna admin se save karne par DB khaali ho sakta hai)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

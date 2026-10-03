import { getDB } from './_db.js';

export async function onRequestPost(context) {
  const auth = context.request.headers.get("Authorization");
  if (!context.env.ADMIN_PASS || auth !== context.env.ADMIN_PASS) return new Response("Unauthorized (password galat)", { status: 401 });

  try {
    const db = getDB(context.env);
    const payload = await context.request.json();
    const posts = payload.posts || [], vip = payload.vip || [];
    const q = [];

    // Pehle naya data save (REPLACE), phir purana hata do - beech me fail ho to purana data safe rahta hai
    for (const p of posts) q.push({ sql: "INSERT OR REPLACE INTO posts (id, json, updated) VALUES (?, ?, ?)", args: [p.id, JSON.stringify(p), p.updated || Date.now()] });
    q.push(posts.length ? { sql: `DELETE FROM posts WHERE id NOT IN (${posts.map(() => "?").join(",")})`, args: posts.map(p => p.id) } : "DELETE FROM posts");

    for (const v of vip) q.push({ sql: "INSERT OR REPLACE INTO vip (email, json) VALUES (?, ?)", args: [v.email, JSON.stringify(v)] });
    q.push(vip.length ? { sql: `DELETE FROM vip WHERE email NOT IN (${vip.map(() => "?").join(",")})`, args: vip.map(v => v.email) } : "DELETE FROM vip");

    q.push({ sql: "INSERT OR REPLACE INTO config (id, json) VALUES ('cfg', ?)", args: [JSON.stringify(payload.cfg || {})] });
    q.push({ sql: "INSERT OR REPLACE INTO config (id, json) VALUES ('sh', ?)", args: [JSON.stringify(payload.sh || [])] });

    await db.batch(q);
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response("DB Error: " + e.message, { status: 500 });
  }
}

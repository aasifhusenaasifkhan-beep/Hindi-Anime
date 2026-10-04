import { getDB } from './_db.js';
import { adminAuth } from './_util.js';

const ok = o => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

export async function onRequestPost(context) {
  const db = getDB(context.env);
  const a = await adminAuth(context.request, context.env, db);
  if (!a.ok) return new Response(a.blocked ? "Bahut galat try, 10 minute baad aao" : "Unauthorized (password galat)", { status: a.blocked ? 429 : 401 });

  try {
    const payload = await context.request.json();
    if (payload.check) return ok({ ok: true });

    const vip = payload.vip || [];
    const links = [];
    // Real links (dl) ko alag private table me bhejo, public posts se hata do
    const posts = (payload.posts || []).map(p => ({
      ...p,
      eps: (p.eps || []).map(e => {
        const { dl, ...rest } = e;
        if (typeof dl === "string" && /^https?:\/\//i.test(dl.trim())) {
          links.push({ sql: "INSERT OR REPLACE INTO links (ep, url) VALUES (?, ?)", args: [e.id, dl.trim()] });
          delete rest.pd; delete rest.short; rest.hl = 1;
        }
        return rest;
      })
    }));

    // Pehle links save - fail hua to posts ko haath hi nahi lagate (link kho nahi sakta)
    if (links.length) await db.batch(links);

    const q = [];
    for (const p of posts) q.push({ sql: "INSERT OR REPLACE INTO posts (id, json, updated) VALUES (?, ?, ?)", args: [p.id, JSON.stringify(p), p.updated || Date.now()] });
    q.push(posts.length ? { sql: `DELETE FROM posts WHERE id NOT IN (${posts.map(() => "?").join(",")})`, args: posts.map(p => p.id) } : "DELETE FROM posts");

    for (const v of vip) q.push({ sql: "INSERT OR REPLACE INTO vip (email, json) VALUES (?, ?)", args: [v.email, JSON.stringify(v)] });
    q.push(vip.length ? { sql: `DELETE FROM vip WHERE email NOT IN (${vip.map(() => "?").join(",")})`, args: vip.map(v => v.email) } : "DELETE FROM vip");

    q.push({ sql: "INSERT OR REPLACE INTO config (id, json) VALUES ('cfg', ?)", args: [JSON.stringify(payload.cfg || {})] });
    q.push({ sql: "INSERT OR REPLACE INTO config (id, json) VALUES ('sh', ?)", args: [JSON.stringify(payload.sh || [])] });
    await db.batch(q);

    try { await caches.default.delete(new Request(new URL("/api/data", context.request.url).toString())); } catch (e) {}
    return ok({ success: true, links: links.length });
  } catch (e) {
    const m = String(e.message || e);
    return new Response("DB Error: " + m + (/no such table/i.test(m) ? "  -> Pehle /api/init?pass=... ek baar chalao (naye tables)" : ""), { status: 500 });
  }
}

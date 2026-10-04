import { getDB } from './_db.js';
import { adminAuth } from './_util.js';

const H = extra => ({ "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extra });

export async function onRequest(context) {
  const { request, env } = context;
  const hasAuth = !!request.headers.get("Authorization");
  let isAdmin = false;
  if (hasAuth) {
    const au = await adminAuth(request, env, getDB(env));
    if (au.blocked) return new Response(JSON.stringify({ error: "Bahut galat try, 10 minute baad aao" }), { status: 429, headers: H({}) });
    isAdmin = au.ok;
  }
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/data", request.url).toString());

  if (!isAdmin) { try { const hit = await cache.match(cacheKey); if (hit) return hit; } catch (e) {} }

  try {
    const db = getDB(env);
    const data = { posts: [], vip: [], cfg: {}, sh: [] };
    data.posts = (await db.execute("SELECT json FROM posts ORDER BY updated DESC")).rows.map(r => JSON.parse(r.json));
    data.vip = (await db.execute("SELECT json FROM vip")).rows.map(r => JSON.parse(r.json));
    const cfg = await db.execute("SELECT json FROM config WHERE id = 'cfg'");
    if (cfg.rows.length) data.cfg = JSON.parse(cfg.rows[0].json);
    const sh = await db.execute("SELECT json FROM config WHERE id = 'sh'");
    if (sh.rows.length) data.sh = JSON.parse(sh.rows[0].json);

    let out = data;
    if (!isAdmin) {
      // Public ko: koi encrypted/real link, shortener keys ya VIP list nahi
      const { sh: _s, ...pubCfg } = data.cfg || {};
      out = {
        posts: data.posts.map(p => ({ ...p, eps: (p.eps || []).map(({ pd, short, dl, ...e }) => e) })),
        vip: [], sh: [], cfg: pubCfg
      };
    }
    const res = new Response(JSON.stringify(out), { headers: H({ "Cache-Control": isAdmin ? "no-store" : "public, max-age=60" }) });
    if (!isAdmin) { try { context.waitUntil(cache.put(cacheKey, res.clone()).catch(() => {})); } catch (e) {} }
    return res;
  } catch (e) {
    // Khaali data nahi bhejte (warna admin se save karne par DB khaali ho sakta hai)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: H({}) });
  }
}

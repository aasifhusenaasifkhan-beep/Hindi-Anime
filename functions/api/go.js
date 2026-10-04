import { getDB } from './_db.js';
import { json, rand, shortenWith } from './_util.js';

// Har download click par NAYA shortener link banata hai (token ke saath). IP limit nahi.
export async function onRequest({ request, env }) {
  const u = new URL(request.url);
  const id = u.searchParams.get("id") || "", ep = u.searchParams.get("ep") || "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !/^[A-Za-z0-9_-]{1,64}$/.test(ep)) return json({ error: "Invalid link" }, 400);

  const now = Date.now();
  try {
    const db = getDB(env);
    const [lk, shr, cfg] = await db.batch([
      { sql: "SELECT 1 AS x FROM links WHERE ep = ?", args: [ep] },
      "SELECT json FROM config WHERE id = 'sh'",
      "SELECT json FROM config WHERE id = 'cfg'"
    ]);
    if (!lk.rows.length) return json({ error: "Is episode ka link abhi available nahi hai" }, 404);

    const list = (shr.rows.length ? JSON.parse(shr.rows[0].json) : []).filter(s => s && s.d && s.k);
    if (!list.length) return json({ error: "Shortener set nahi hai (admin ko batao)" }, 500);

    const conf = cfg.rows.length ? JSON.parse(cfg.rows[0].json) : {};
    const base = conf.web ? String(conf.web).trim().replace(/\/$/, "") : u.origin;
    const token = rand(16);
    const dest = `${base}/verify.html?id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&t=${token}`;

    // Random order: har click par alag shortener, ek fail ho to agla try hota hai
    const order = list.map(s => ({ s, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.s);
    for (const s of order) {
      const res = await shortenWith(s.d, s.k, dest);
      if (res.url) {
        const q = [{ sql: "INSERT INTO tokens (id, ep, created) VALUES (?, ?, ?)", args: [token, ep, now] }];
        if (Math.random() < 0.01) q.push({ sql: "DELETE FROM tokens WHERE created < ?", args: [now - 86400000] });
        await db.batch(q);
        return json({ url: res.url });
      }
      console.log("shortener fail:", s.d, res.error);
    }
    return json({ error: "Shortener abhi busy hai, thodi der baad try karo" }, 502);
  } catch (e) {
    return json({ error: "Server error: " + e.message }, 500);
  }
}

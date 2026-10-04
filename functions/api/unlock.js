import { getDB } from './_db.js';
import { json, sha } from './_util.js';

const MIN_MS = 8000;              // /go ke itne second baad hi link milega (instant bypass bots ko rokta hai)
const EXPIRE_MS = 2 * 3600e3;     // token 2 ghante me expire
const REUSE_MS = 10 * 60e3;       // unlock ke baad 10 min tak refresh chalega (sirf same IP se)

// Shortener solve karke wapas aane par token se asli link deta hai
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const t = String(body.t || "");
  if (!/^[a-f0-9]{32}$/.test(t)) return json({ error: "invalid" }, 400);
  const now = Date.now();
  try {
    const db = getDB(env);
    const r = await db.execute({
      sql: "SELECT t.created AS created, t.unlocked AS unlocked, t.ip AS ip, l.url AS url FROM tokens t JOIN links l ON l.ep = t.ep WHERE t.id = ?",
      args: [t]
    });
    const row = r.rows[0];
    if (!row) return json({ error: "invalid" }, 404);
    const created = Number(row.created), unlocked = row.unlocked == null ? null : Number(row.unlocked);
    const ip = (await sha(request.headers.get("CF-Connecting-IP") || "x")).slice(0, 16);

    if (now - created > EXPIRE_MS) return json({ error: "expired" }, 410);

    if (unlocked == null) {
      const wait = Math.ceil((MIN_MS - (now - created)) / 1000);
      if (wait > 0) return json({ error: "wait", wait }, 425);     // client itne second baad khud retry karta hai
      await db.execute({ sql: "UPDATE tokens SET unlocked = ?, ip = ? WHERE id = ? AND unlocked IS NULL", args: [now, ip, t] });
      return json({ url: row.url });
    }
    if (now - unlocked > REUSE_MS) return json({ error: "expired" }, 410);
    if (row.ip !== ip) return json({ error: "shared" }, 403);     // link doosre ko forward karne par kaam nahi karega
    return json({ url: row.url });
  } catch (e) {
    return json({ error: "Server error: " + e.message }, 500);
  }
}

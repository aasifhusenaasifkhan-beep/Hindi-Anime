import { getDB } from './_db.js';
import { json, sha, rand } from './_util.js';

// VIP login + direct link (server pe check hota hai, link/passcode public nahi)
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const email = String(b.email || "").trim().toLowerCase(), pass = String(b.pass || "").trim(), ep = b.ep ? String(b.ep) : "";
  if (!email || !pass) return json({ error: "Email + Passcode daalo" }, 400);
  const ip = (await sha(request.headers.get("CF-Connecting-IP") || "x")).slice(0, 16);
  const now = Date.now();
  try {
    const db = getDB(env);
    const [fails, rows] = await db.batch([
      { sql: "SELECT COUNT(*) AS c FROM tokens WHERE ip = ? AND ep = 'vipfail' AND created > ?", args: [ip, now - 600000] },
      { sql: "SELECT json FROM vip WHERE lower(email) = ?", args: [email] }
    ]);
    if (Number(fails.rows[0].c) >= 8) return json({ error: "Bahut try ho gaye, 10 minute baad aao" }, 429);
    const u = rows.rows.length ? JSON.parse(rows.rows[0].json) : null;
    if (!u || u.h !== await sha(pass)) {
      await db.execute({ sql: "INSERT INTO tokens (id, ep, created, ip) VALUES (?, 'vipfail', ?, ?)", args: [rand(16), now, ip] });
      return json({ error: "Gmail ya passcode galat" }, 401);
    }
    if (Number(u.exp) < now) return json({ error: "Ye pass expire ho gaya" }, 403);
    if (!ep) return json({ ok: true, exp: u.exp });
    const l = await db.execute({ sql: "SELECT url FROM links WHERE ep = ?", args: [ep] });
    if (!l.rows.length) return json({ error: "Is episode ka link abhi available nahi hai" }, 404);
    return json({ url: l.rows[0].url });
  } catch (e) {
    return json({ error: "Server error: " + e.message }, 500);
  }
}

// Shared helpers (underscore wali file route nahi banti)
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
});

const hex = u8 => [...u8].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha = async s => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
export const rand = n => hex(crypto.getRandomValues(new Uint8Array(n)));

function pickShort(txt, dest) {
  const t = (txt || "").trim();
  if (/^https?:\/\/\S+$/.test(t)) return t === dest ? null : t;
  try {
    const j = JSON.parse(t);
    if (String(j.status).toLowerCase() === "error") return null;
    const c = j.shortenedUrl || j.short_url || j.shortUrl || j.link || j.url ||
      (j.data && (j.data.shortenedUrl || j.data.short_url || j.data.url)) || j.result;
    if (typeof c === "string" && /^https?:\/\//.test(c) && c !== dest) return c;
  } catch (e) {}
  return null;
}

// Ek shortener se fresh short link banao. Return: { url } ya { error }
export async function shortenWith(domain, key, dest) {
  const host = String(domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!host || !key) return { error: "bad shortener config" };
  const hosts = [...new Set([host, host.startsWith("api.") ? host : "api." + host])];
  let detail = "";
  for (const h of hosts) {
    for (const fmt of ["&format=text", ""]) {
      try {
        const r = await fetch(`https://${h}/api?api=${encodeURIComponent(key)}&url=${encodeURIComponent(dest)}${fmt}`, {
          headers: { "User-Agent": UA, "Accept": "application/json, text/plain, */*" }
        });
        const txt = await r.text();
        const s = pickShort(txt, dest);
        if (s) return { url: s };
        detail = `${h} -> ${r.status}: ${txt.slice(0, 100)}`;
      } catch (e) { detail = `${h} -> ${e.message}`; }
    }
  }
  return { error: detail };
}

// Admin password check. Galat password baar-baar daalne walon ko 10 min ke liye rok deta hai.
// Return: { ok: true } | { ok: false, blocked: true } | { ok: false }
// (Authorization header na ho to sirf { ok: false } - koi record nahi)
export async function adminAuth(request, env, db) {
  const given = request.headers.get("Authorization");
  if (!given) return { ok: false };
  if (env.ADMIN_PASS && given === env.ADMIN_PASS) return { ok: true };
  try {
    const ip = (await sha(request.headers.get("CF-Connecting-IP") || "x")).slice(0, 16);
    const now = Date.now();
    const r = await db.execute({ sql: "SELECT COUNT(*) AS c FROM tokens WHERE ip = ? AND ep = 'adminfail' AND created > ?", args: [ip, now - 600000] });
    if (Number(r.rows[0].c) >= 10) return { ok: false, blocked: true };
    await db.execute({ sql: "INSERT INTO tokens (id, ep, created, ip) VALUES (?, 'adminfail', ?, ?)", args: [rand(16), now, ip] });
  } catch (e) {}
  return { ok: false };
}

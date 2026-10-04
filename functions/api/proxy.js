// Proxy: Telegram post/images (open) + Shortener API (admin only)
import { getDB } from "./_db.js";
import { adminAuth } from "./_util.js";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IMG_HOSTS = /(^|\.)(telegra\.ph|telesco\.pe|cdn-telegram\.org|telegram\.org)$/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
});

async function passImage(src) {
  try {
    const r = await fetch(src, { headers: { "User-Agent": UA, "Referer": "https://t.me/" } });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\//i.test(ct)) return new Response("Not an image", { status: 404 });
    return new Response(r.body, { status: 200, headers: {
      "Content-Type": ct, "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*"
    }});
  } catch (e) { return new Response("Image fetch error", { status: 502 }); }
}

// https://t.me/channel/123 (public channel post) -> its photo / video thumbnail
async function tgPost(ch, id) {
  const hdr = { "User-Agent": UA };
  let img = null;
  try {
    const r = await fetch(`https://t.me/${ch}/${id}?embed=1&mode=tme`, { headers: hdr });
    const h = await r.text();
    const m = h.match(/tgme_widget_message_(?:photo_wrap|video_thumb|roundvideo_thumb|link_preview_image)[^>]*background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
    if (m) img = m[1];
  } catch (e) {}
  if (!img) {
    try {
      const r = await fetch(`https://t.me/${ch}/${id}`, { headers: hdr });
      const h = await r.text();
      const m = h.match(/<meta property="og:image" content="([^"]+)"/);
      if (m) img = m[1];
    } catch (e) {}
  }
  if (!img) return new Response("Telegram post image not found (channel public hai? post me photo hai?)", { status: 404 });
  return passImage(img.replace(/&amp;/g, "&"));
}

function pickShort(txt, dest) {
  const t = (txt || "").trim();
  if (/^https?:\/\/\S+$/.test(t)) return t === dest ? null : t;       // format=text
  try {
    const j = JSON.parse(t);
    if (String(j.status).toLowerCase() === "error") return null;
    const c = j.shortenedUrl || j.short_url || j.shortUrl || j.link || j.url ||
      (j.data && (j.data.shortenedUrl || j.data.short_url || j.data.url)) || j.result;
    if (typeof c === "string" && /^https?:\/\//.test(c) && c !== dest) return c;
  } catch (e) {}
  return null;
}

async function shorten(u) {
  const key = u.searchParams.get("api"), dest = u.searchParams.get("url");
  const host = u.hostname.replace(/^www\./, "");
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
        if (s) return json({ status: "success", shortenedUrl: s });
        detail = `${h} -> ${r.status}: ${txt.slice(0, 120)}`;
      } catch (e) { detail = `${h} -> ${e.message}`; }
    }
  }
  return json({ status: "error", detail: detail.replace(/https?:\/\//g, "") }, 502);
}

export async function onRequest({ request, env }) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return new Response("Missing URL", { status: 400 });
  let u;
  try { u = new URL(target); } catch (e) { return new Response("Bad URL", { status: 400 }); }
  if (!/^https?:$/.test(u.protocol)) return new Response("Bad URL", { status: 400 });

  const tm = u.hostname.replace(/^www\./, "") === "t.me" && u.pathname.match(/^\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (tm) return tgPost(tm[1], tm[2]);

  if (IMG_HOSTS.test(u.hostname)) return passImage(u.href);

  if (u.pathname === "/api" && u.searchParams.has("api") && u.searchParams.has("url")) {
    const au = await adminAuth(request, env, getDB(env));
    if (!au.ok) return json({ status: "error", detail: au.blocked ? "Blocked" : "Unauthorized" }, au.blocked ? 429 : 401);
    return shorten(u);
  }
  return new Response("Not allowed", { status: 403 });
}

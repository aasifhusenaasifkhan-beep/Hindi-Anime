import { getDB } from "./api/_db.js";

export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  const urls = [origin + "/", origin + "/vip.html"];
  try {
    const rows = await getDB(env).execute("SELECT id FROM posts ORDER BY updated DESC LIMIT 5000");
    for (const r of rows.rows) urls.push(`${origin}/post.html?id=${encodeURIComponent(r.id)}`);
  } catch (e) {}
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `<url><loc>${u.replace(/&/g, "&amp;")}</loc></url>`).join("\n") + `\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
}

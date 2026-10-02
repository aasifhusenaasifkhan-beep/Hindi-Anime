import { getDB } from './_db.js';

export async function onRequest(context) {
    const db = getDB(context.env);
    const data = { posts: [], vip: [], cfg: {}, sh: [] };

    try {
        // SQL se data la rahe hain
        const postRows = await db.execute("SELECT json FROM posts ORDER BY updated DESC");
        data.posts = postRows.rows.map(r => JSON.parse(r.json));

        const vipRows = await db.execute("SELECT json FROM vip");
        data.vip = vipRows.rows.map(r => JSON.parse(r.json));

        const cfgRow = await db.execute("SELECT json FROM config WHERE id = 'cfg'");
        if(cfgRow.rows.length) data.cfg = JSON.parse(cfgRow.rows[0].json);

        const shRow = await db.execute("SELECT json FROM config WHERE id = 'sh'");
        if(shRow.rows.length) data.sh = JSON.parse(shRow.rows[0].json);

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    } catch(e) {
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }});
    }
}

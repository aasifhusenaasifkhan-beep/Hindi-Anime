import { getDB } from './_db.js';

export async function onRequestPost(context) {
    const auth = context.request.headers.get("Authorization");
    if (auth !== context.env.ADMIN_PASS) return new Response("Unauthorized", {status:401});
    
    const db = getDB(context.env);
    const payload = await context.request.json(); 
    
    const queries = [];
    queries.push("DELETE FROM posts");
    for(const p of payload.posts) queries.push({ sql: "INSERT INTO posts (id, json, updated) VALUES (?, ?, ?)", args: [p.id, JSON.stringify(p), p.updated || Date.now()] });
    
    queries.push("DELETE FROM vip");
    for(const v of payload.vip) queries.push({ sql: "INSERT INTO vip (email, json) VALUES (?, ?)", args: [v.email, JSON.stringify(v)] });
    
    queries.push("DELETE FROM config");
    queries.push({ sql: "INSERT INTO config (id, json) VALUES ('cfg', ?)", args: [JSON.stringify(payload.cfg)] });
    queries.push({ sql: "INSERT INTO config (id, json) VALUES ('sh', ?)", args: [JSON.stringify(payload.sh)] });

    // Ek baar me saara data Turso me push (High Performance)
    await db.batch(queries, "write");
    
    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
}

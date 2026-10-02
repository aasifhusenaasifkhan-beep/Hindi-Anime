import { getDB } from './_db.js';

export async function onRequest(context) {
    const pass = new URL(context.request.url).searchParams.get('pass');
    
    // Security: Bina password ke koi table create/delete na kar sake
    if (pass !== context.env.ADMIN_PASS) {
        return new Response("Unauthorized", { status: 401 });
    }
    
    const db = getDB(context.env);
    
    // Auto Table Creation Logic
    await db.execute(`CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, json TEXT, updated INTEGER)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS vip (email TEXT PRIMARY KEY, json TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, json TEXT)`);
    
    return new Response("Turso Tables Created Successfully! 🚀 Ab site ready hai.");
}

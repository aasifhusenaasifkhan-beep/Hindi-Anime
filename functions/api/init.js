import { getDB } from './_db.js';

export async function onRequest({ request, env }) {
  const pass = new URL(request.url).searchParams.get('pass');
  if (pass !== env.ADMIN_PASS) return new Response("Unauthorized", { status: 401 });

  try {
    const db = getDB(env);
    await db.batch([
      "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, json TEXT, updated INTEGER)",
      "CREATE TABLE IF NOT EXISTS vip (email TEXT PRIMARY KEY, json TEXT)",
      "CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, json TEXT)"
    ], "write");
    return new Response("Turso Tables Created Successfully! Ab site ready hai.");
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}

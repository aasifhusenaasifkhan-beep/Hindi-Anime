// Turso HTTP client (@libsql library ke bina) - Cloudflare Pages ke liye
const toArg = v => {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "number") return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  return { type: "text", value: String(v) };
};
const fromVal = c => (!c || c.type === "null") ? null : (c.type === "integer" ? Number(c.value) : c.value);

async function run(env, stmts) {
  const base = String(env.TURSO_URL || "").trim().replace(/^libsql:/, "https:").replace(/\/$/, "");
  const reqs = stmts.map(s => {
    const o = typeof s === "string" ? { sql: s } : s;
    return { type: "execute", stmt: { sql: o.sql, args: (o.args || []).map(toArg) } };
  });
  const r = await fetch(base + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + String(env.TURSO_TOKEN || "").trim(), "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [...reqs, { type: "close" }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Turso " + r.status + ": " + JSON.stringify(j).slice(0, 200));
  const out = [];
  for (const x of j.results || []) {
    if (x.type === "error") throw new Error((x.error && x.error.message) || "Turso error");
    const res = x.response && x.response.type === "execute" ? x.response.result : null;
    if (res) {
      const cols = res.cols.map(c => c.name);
      out.push({ rows: res.rows.map(row => Object.fromEntries(cols.map((n, i) => [n, fromVal(row[i])]))) });
    }
  }
  return out;
}

export function getDB(env) {
  return {
    execute: async stmt => (await run(env, [stmt]))[0],
    batch: stmts => run(env, stmts)
  };
}

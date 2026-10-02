import { createClient } from "@libsql/client/web";

export function getDB(env) {
    return createClient({ 
        url: env.TURSO_URL, 
        authToken: env.TURSO_TOKEN 
    });
}

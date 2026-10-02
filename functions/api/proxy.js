export async function onRequest(context) {
    const url = new URL(context.request.url).searchParams.get('url');
    if (!url) return new Response("Missing URL", { status: 400 });
    
    try {
        const res = await fetch(url);
        const headers = new Headers(res.headers);
        // CORS Bypass Magic ✨
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(res.body, { status: res.status, headers });
    } catch(e) {
        return new Response(e.message, { status: 500 });
    }
}

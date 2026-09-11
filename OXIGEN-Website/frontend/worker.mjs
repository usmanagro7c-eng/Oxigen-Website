export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/files") ||
      url.pathname.startsWith("/private/files")
    ) {
      const upstream = env.API_UPSTREAM;
      if (!upstream) {
        return new Response(
          JSON.stringify({ error: "Backend not deployed yet" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      return fetch(upstream + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      });
    }

    const indexUrl = new URL("/index.html", url);
    try {
      const res = await env.ASSETS.fetch(request);
      if (res.status === 404) {
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return res;
    } catch (err) {
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
  },
};
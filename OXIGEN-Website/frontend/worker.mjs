export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── API / Files reverse proxy ───
    if (
      url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/files") ||
      url.pathname.startsWith("/private/files")
    ) {
      const upstream = env.API_UPSTREAM;
      if (!upstream) {
        return apiResponse(503, { error: "Backend not deployed yet" });
      }
      const target = new URL(upstream.replace(/\/+$/, ""));
      target.pathname = url.pathname;
      target.search  = url.search;

      const headers = new Headers();
      for (const [k, v] of request.headers.entries()) {
        const lk = k.toLowerCase();
        if (!["host","connection","cf-connecting-ip","cf-ray"].includes(lk)) headers.append(k, v);
      }
      headers.set("x-forwarded-host", request.headers.get("host") ?? "");
      headers.set("x-forwarded-proto", "https");

      const init = { method: request.method, headers, redirect: "manual" };
      if (!["GET","HEAD"].includes(request.method)) init.body = request.body;

      let resp;
      try { resp = await fetch(target.toString(), init); }
      catch { return apiResponse(502, { error: "Backend unreachable" }); }

      return new Response(resp.body, {
        status:      resp.status,
        statusText:  resp.statusText,
        headers:     pickHeaders(resp.headers),
      });
    }

    // ─── Static assets / SPA (binding ASSETS, not_found_handling=SPA) ───
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return apiResponse(500, { error: "worker asset error", detail: e.message });
    }
  },
};

function apiResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pickHeaders(headers) {
  const out = new Headers();
  const allow = new Set([
    "set-cookie","content-type","content-length","cache-control",
    "location","content-disposition","x-accel-buffering",
    "access-control-allow-origin","access-control-allow-credentials",
  ]);
  for (const [k, v] of headers.entries()) {
    if (allow.has(k.toLowerCase())) out.append(k, v);
  }
  return out;
}
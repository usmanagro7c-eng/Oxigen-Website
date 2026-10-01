export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── Verification portal ───
    // The portal is a separate Worker with its own origin. It cannot be mounted
    // under this origin: it is built for the site root, so it emits root-absolute
    // asset URLs (/assets/*) that collide with this site's SPA assets, and its
    // client-side router resolves "/" to this site instead. Redirect instead.
    if (
      url.pathname === "/verification" ||
      url.pathname.startsWith("/verification/")
    ) {
      const origin = env.VERIFICATION_ORIGIN;
      if (!origin) {
        return apiResponse(503, {
          error: "Verification portal not configured",
        });
      }

      const target = new URL(origin);
      target.pathname =
        url.pathname.slice("/verification".length) || "/";
      target.search = url.search;

      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // ─── API / Files reverse proxy ───
    if (
      url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/files") ||
      url.pathname.startsWith("/private/files")
    ) {
      const upstream = env.API_UPSTREAM;

      if (!upstream) {
        return apiResponse(503, {
          error: "Backend not deployed yet",
        });
      }

      const base = upstream.replace(/\/+$/, "");
      const target = new URL(base + url.pathname);

      // Preserve query parameters
      target.search = url.search;

      const headers = new Headers();

      const realIp =
        request.headers.get("cf-connecting-ip") ?? "";

      // Forward original headers except Cloudflare/proxy-specific ones
      for (const [k, v] of request.headers.entries()) {
        const lk = k.toLowerCase();

        if (
          ![
            "host",
            "connection",
            "cf-connecting-ip",
            "cf-ray",
            "x-forwarded-for",
            "x-real-ip",
          ].includes(lk)
        ) {
          headers.append(k, v);
        }
      }

      // Forward client/proxy information
      headers.set(
        "x-forwarded-for",
        realIp ||
          request.headers.get("x-real-ip") ||
          ""
      );

      headers.set("x-real-ip", realIp);

      headers.set(
        "x-forwarded-host",
        request.headers.get("host") ?? ""
      );

      headers.set("x-forwarded-proto", "https");

      const init = {
        method: request.method,
        headers,
        redirect: "manual",
      };

      // Forward request body for non-GET/HEAD requests
      if (!["GET", "HEAD"].includes(request.method)) {
        init.body = request.body;
      }

      let resp;

      try {
        resp = await fetch(target.toString(), init);
      } catch {
        return apiResponse(502, {
          error: "Backend unreachable",
        });
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: pickHeaders(resp.headers),
      });
    }

    // ─── Static assets / SPA ───
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return apiResponse(500, {
        error: "worker asset error",
        detail: e.message,
      });
    }
  },
};

// ─── JSON API Response ───
function apiResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ─── Allowed upstream response headers ───
function pickHeaders(headers) {
  const out = new Headers();

  const allow = new Set([
    "set-cookie",
    "content-type",
    "content-length",
    "cache-control",
    "location",
    "content-disposition",
    "x-accel-buffering",
    "access-control-allow-origin",
    "access-control-allow-credentials",
  ]);

  for (const [k, v] of headers.entries()) {
    if (allow.has(k.toLowerCase())) {
      out.append(k, v);
    }
  }

  return out;
}
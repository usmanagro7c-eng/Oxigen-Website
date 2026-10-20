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

      // ─── Edge cache for immutable media (GET/HEAD only) ───
      // Images are the heaviest thing this Worker serves and they never change
      // once uploaded to ERPNext, so cache them at the edge and skip the
      // origin round-trip entirely on a hit. `caches.default` is a no-op on
      // cache misses and is safe to call in every deployment.
      const cacheableRequest =
        (request.method === "GET" || request.method === "HEAD") &&
        isCacheableMediaUrl(url);

      let cache;
      if (cacheableRequest) {
        try {
          cache = caches.default;
          const hit = await cache.match(request);
          if (hit) {
            // Re-label at the edge: the stored object still carries the MISS
            // header it was written with, which would otherwise confuse cache
            // verification.
            const hitHeaders = new Headers(hit.headers);
            hitHeaders.set("X-Edge-Cache", "HIT");
            return new Response(hit.body, {
              status: hit.status,
              statusText: hit.statusText,
              headers: hitHeaders,
            });
          }
        } catch {
          // Edge cache unavailable — fall through to origin.
          cache = undefined;
        }
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

      const outHeaders = pickHeaders(resp.headers);

      // A `/private/files/*` path is access-controlled in ERPNext. Force the
      // header here as well as at the origin, because Cloudflare's automatic
      // image cache can otherwise store an old public response for the URL and
      // keep serving it after the origin stops sending long-lived caching.
      if (url.pathname.startsWith("/private/files")) {
        outHeaders.set("Cache-Control", "private, no-store");
        outHeaders.delete("cf-cache-status");
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: outHeaders,
        });
      }

      // Store successful media responses in the edge cache. Only a plain GET
      // is cacheable: `cache.put()` rejects a HEAD request outright, and the
      // body of a 304 (or a 200 echoing a conditional header) is not the file.
      // Never cache anything carrying Set-Cookie, so a stored response can
      // never leak one visitor's session to another. 4xx/5xx are deliberately
      // left uncached: a transient origin failure must not pin a 404 at the
      // edge, and ERPNext does not send negative-cache headers for us.
      if (
        cache &&
        request.method === "GET" &&
        resp.status === 200 &&
        !outHeaders.has("set-cookie")
      ) {
        // 30 days: uploads are immutable; ERPNext filenames are unique.
        outHeaders.set("Cache-Control", "public, max-age=2592000, immutable");
        outHeaders.set("X-Edge-Cache", "MISS");

        const cacheable = new Response(resp.clone().body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: outHeaders,
        });

        try {
          await cache.put(request, cacheable.clone());
        } catch {
          // Cache write failure must never break the response.
        }

        return cacheable;
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: outHeaders,
      });
    }

    // ─── Static assets / SPA fallback ───
    // `not_found_handling` is deliberately off. The assets binding's SPA
    // catch-all gets edge-cached and then shadows the routes handled above,
    // so this Worker stays the single router and resolves index.html itself.
    // Never fall back under /assets: a missing file must 404, not return HTML.
    //
    // A missing *crawlable* file must also 404. Returning the SPA shell for
    // /sitemap.xml is actively harmful: crawlers read it as invalid XML. The
    // SPA fallback is only for extension-less routes the client router owns.
    const isAssetPath = url.pathname.startsWith("/assets/");

    const looksLikeFile =
      !isAssetPath && /\.[a-z0-9]{2,5}$/i.test(url.pathname);

    try {
      const resp = await env.ASSETS.fetch(request);

      if (resp.status === 404 && !isAssetPath) {
        if (looksLikeFile) {
          return new Response("Not found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=300",
            },
          });
        }

        return await env.ASSETS.fetch(
          new Request(new URL("/index.html", url).toString())
        );
      }

      return resp;
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

// ─── Cacheable media detection ───
// Only static media that is safe to serve from the edge:
//   /files/<name>.<ext>            — ERPNext public files
//   /api/files/<name>.<ext>        — alias used by the backend
//   /api/items/image/<encoded>     — item/banner image proxy
// Deliberately excludes /private/files/* (may be access-controlled) and any
// non-image extension so JSON API responses are never cached.
const MEDIA_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "ico", "bmp",
]);

function isCacheableMediaUrl(url) {
  const path = url.pathname;

  if (path.startsWith("/private/files")) return false;

  const isFilesPath =
    path.startsWith("/files/") || path.startsWith("/api/files/");
  const isImageProxy = path.startsWith("/api/items/image/");

  if (!isFilesPath && !isImageProxy) return false;

  // Decode so an encoded proxy path (…%2Ffiles%2Fbanner.jpg) resolves to its
  // real extension before the check.
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }

  const dot = decoded.lastIndexOf(".");
  if (dot === -1) return false;

  const ext = decoded.slice(dot + 1).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext);
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
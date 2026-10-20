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

        const shell = await env.ASSETS.fetch(
          new Request(new URL("/index.html", url).toString())
        );

        // Inject route-specific head tags into the shell. This is a SPA: the
        // router's own `head()` only runs in the browser, so a crawler sees
        // the generic document title for every route without this step.
        return await injectRouteMeta(shell, url, env);
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

// ─── Route-aware document head (prerender for crawlers) ───
// This site is a client-rendered SPA. TanStack Router sets per-route titles in
// the browser, but a crawler that does not execute JavaScript — and the first
// paint of every social preview bot — only sees the static shell. Rewriting
// the head here makes each route carry its own title, description and social
// card in the HTML itself.

// Route → head content. Product and category entries are filled in from the
// live content store so new products are covered without a redeploy.
const STATIC_ROUTE_META = {
  "/": {
    title: "OxiGen — Pakistan's No.1 Vitamin & Wellness Brand",
    description:
      "Shop OxiGen's science-backed supplements in Pakistan — Nutri-Cept for PCOS & hormonal balance and OXIDOP for focus and mental clarity. Free nationwide delivery, cash on delivery available.",
  },
  "/shop": {
    title: "Shop All Supplements — OxiGen",
    description:
      "Browse the full OxiGen range of lab-tested supplements. Free nationwide delivery across Pakistan with cash on delivery available.",
  },
  "/categories": {
    title: "Shop by Category — OxiGen",
    description:
      "Explore OxiGen supplements by health goal — women's wellness, PCOS support, brain focus and cognitive performance.",
  },
  "/about": {
    title: "About OxiGen — Our Story & Mission",
    description:
      "OxiGen exists to make clinically informed nutrition accessible in Pakistan. Learn about our ingredients, standards and mission.",
  },
  "/reviews": {
    title: "Customer Reviews & Real Results — OxiGen",
    description:
      "Read verified customer reviews and real before/after results from people using OxiGen supplements across Pakistan.",
  },
  "/contact": {
    title: "Contact OxiGen — Support & Enquiries",
    description:
      "Questions about an order or a product? Reach the OxiGen team by WhatsApp, phone or email — we reply quickly.",
  },
  "/faq": {
    title: "Frequently Asked Questions — OxiGen",
    description:
      "Answers about OxiGen orders, delivery times, payment methods, returns and how to use our supplements.",
  },
  "/offers": {
    title: "Current Offers & Discounts — OxiGen",
    description:
      "Live deals on OxiGen supplements. Save on bundles and limited-time promotions with free delivery across Pakistan.",
  },
  "/shipping-policy": {
    title: "Shipping Policy — OxiGen",
    description:
      "OxiGen delivery timelines, nationwide coverage and cash-on-delivery details.",
  },
  "/refund-policy": {
    title: "Returns & Refund Policy — OxiGen",
    description:
      "OxiGen's 7-day return policy, eligibility conditions and how to start a return.",
  },
  "/privacy": {
    title: "Privacy Policy — OxiGen",
    description:
      "How OxiGen collects, uses and protects your personal information.",
  },
  "/terms": {
    title: "Terms & Conditions — OxiGen",
    description:
      "The terms governing purchases and use of the OxiGen website and products.",
  },
};

// Filled once per isolate so a burst of crawler requests does not refetch the
// content document for every hit.
let metaIndexPromise;

function contentOrigin(env) {
  return (env.API_UPSTREAM || "").replace(/\/+$/, "");
}

async function buildMetaIndex(env) {
  const origin = contentOrigin(env);
  if (!origin) return { products: {}, categories: {} };

  const res = await fetch(`${origin}/api/site-content`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return { products: {}, categories: {} };

  const json = await res.json();
  const content = json.data ?? json;

  const products = {};
  for (const p of content.products ?? []) {
    const name = String(p.name ?? "");
    if (!name) continue;
    products[slugify(name.split("—")[0])] = {
      title: `${name} — OxiGen`,
      description: String(p.subtitle || p.desc || "").slice(0, 300),
      image: typeof p.img === "string" ? p.img : undefined,
      price: parsePrice(p.price),
    };
  }

  const categories = {};
  for (const c of content.categories ?? []) {
    const name = String(c.name ?? c.title ?? "");
    if (!name) continue;
    categories[slugify(name)] = {
      title: `${name} — OxiGen`,
      description: String(c.desc || `${name} supplements from OxiGen.`).slice(0, 300),
    };
  }

  return { products, categories };
}

function metaIndex(env) {
  if (!metaIndexPromise) {
    metaIndexPromise = buildMetaIndex(env).catch(() => ({
      products: {},
      categories: {},
    }));
  }
  return metaIndexPromise;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// `"Rs.1,600"` → `1600`. Returns undefined when there is no usable number, so
// the structured-data block is omitted rather than emitting a bogus price.
function parsePrice(value) {
  if (typeof value === "number") return value;
  const digits = String(value ?? "").replace(/[^0-9.]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Resolves the head content for a request path, or null when the route has no
// specific metadata (the shell's own tags then stand as-is).
async function resolveMeta(url, env) {
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const staticMeta = STATIC_ROUTE_META[path];
  if (staticMeta) return { ...staticMeta, path };

  const index = await metaIndex(env);

  const productMatch = path.match(/^\/product\/(.+)$/);
  if (productMatch) {
    const entry = index.products[productMatch[1]];
    if (entry) return { ...entry, path, type: "product" };
  }

  const categoryMatch = path.match(/^\/category\/(.+)$/);
  if (categoryMatch) {
    const entry = index.categories[categoryMatch[1]];
    if (entry) return { ...entry, path };
  }

  // Unknown client route: keep it out of the index rather than letting it be
  // catalogued with the generic homepage metadata.
  if (path !== "/") {
    return {
      title: "Page not found — OxiGen",
      description: "The page you are looking for could not be found.",
      path,
      noindex: true,
    };
  }

  return null;
}

async function injectRouteMeta(shellResponse, url, env) {
  const meta = await resolveMeta(url, env);
  if (!meta) return shellResponse;

  const html = await shellResponse.text();
  const origin = url.origin;
  const canonical = `${origin}${meta.path === "/" ? "/" : meta.path}`;
  const absoluteImage = meta.image
    ? meta.image.startsWith("http")
      ? meta.image
      : `${origin}${meta.image}`
    : `${origin}/products/nutricept-new-packaging.jpeg`;

  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);

  let out = html;

  // Replace the shell's static title/description/canonical/OG pairs wholesale:
  // duplicating them would leave the crawler choosing between two values.
  // Each pattern consumes the full tag, including the closing `/>`.
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeHtml(absoluteImage)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(absoluteImage)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${meta.type === "product" ? "product" : "website"}" />`,
  );

  const extras = [];

  if (meta.type === "product") {
    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: meta.title.replace(/\s+—\s+OxiGen$/, ""),
      description: meta.description,
      image: [absoluteImage],
      brand: { "@type": "Brand", name: "OxiGen" },
    };

    if (meta.price !== undefined) {
      product.offers = {
        "@type": "Offer",
        priceCurrency: "PKR",
        price: String(meta.price),
        availability: "https://schema.org/InStock",
        url: canonical,
      };
    }

    extras.push(
      `<script type="application/ld+json">${JSON.stringify(product).replace(
        /</g,
        "\\u003c",
      )}</script>`,
    );
  }

  if (meta.noindex) {
    // Replace the shell's indexable robots directive rather than appending a
    // second one: a page with two conflicting robots tags is treated as
    // unset by some crawlers, which would index the 404 anyway.
    out = out.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      '<meta name="robots" content="noindex, follow" />',
    );
  }

  if (extras.length) {
    out = out.replace("</head>", `${extras.join("")}</head>`);
  }

  return new Response(out, {
    status: shellResponse.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Short TTL: the injected head depends on content that can change, and a
      // stale canonical or title is worse than an origin hit.
      "Cache-Control": "public, max-age=300",
    },
  });
}
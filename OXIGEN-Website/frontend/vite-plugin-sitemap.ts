import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Generates `sitemap.xml` at build time.
 *
 * The route list has two halves:
 *   - Storefront routes are hardcoded here; they change only when a page is
 *     added, which is exactly when someone edits this file.
 *   - Product and category URLs come from the live content store, resolved at
 *     build time so a newly published product appears without hand-editing the
 *     sitemap. If the backend is unreachable the storefront routes are still
 *     emitted and the build proceeds.
 *
 * Ordering is deliberate: static routes first, then the most specific dynamic
 * ones, so the file reads top-down like the site's own navigation.
 */

const SITE_ORIGIN =
  process.env.SITE_ORIGIN?.replace(/\/+$/, "") ||
  "https://oxigen.usman-agro7c.workers.dev";

const CONTENT_ENDPOINT =
  process.env.SITE_CONTENT_ENDPOINT ||
  "http://127.0.0.1:3002/api/site-content";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/shop", priority: "0.9", changefreq: "daily" },
  { path: "/categories", priority: "0.8", changefreq: "weekly" },
  { path: "/offers", priority: "0.7", changefreq: "weekly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/reviews", priority: "0.7", changefreq: "weekly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/shipping-policy", priority: "0.4", changefreq: "yearly" },
  { path: "/refund-policy", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reads product and category slugs from the backend. Returns empty arrays on
 * any failure — a missing sitemap entry is far better than a broken build.
 */
async function fetchDynamicRoutes(log) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(CONTENT_ENDPOINT, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      log.warn(`[sitemap] content store returned ${res.status}; static routes only`);
      return { products: [], categories: [] };
    }

    const json = await res.json();
    const content = json.data ?? json;

    const products = (content.products ?? [])
      .map((p) => {
        const name = String(p.name ?? "");
        return name ? slugify(name.split("—")[0]) : "";
      })
      .filter(Boolean);

    const categories = (content.categories ?? [])
      .map((c) => {
        const name = String(c.name ?? c.title ?? "");
        return name && !/^(all|shop)$/i.test(name) ? slugify(name) : "";
      })
      .filter(Boolean);

    return {
      products: [...new Set(products)],
      categories: [...new Set(categories)],
    };
  } catch (error) {
    log.warn(`[sitemap] could not reach content store (${error.message}); static routes only`);
    return { products: [], categories: [] };
  }
}

function buildSitemap({ products, categories }) {
  const today = new Date().toISOString().slice(0, 10);

  const entries = [
    ...STATIC_ROUTES,
    ...products.map((slug) => ({
      path: `/product/${slug}`,
      priority: "0.8",
      changefreq: "weekly",
    })),
    ...categories.map((slug) => ({
      path: `/category/${slug}`,
      priority: "0.6",
      changefreq: "weekly",
    })),
  ];

  const seen = new Set();
  const urls = entries
    .filter((e) => (seen.has(e.path) ? false : seen.add(e.path)))
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${SITE_ORIGIN}${e.path}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority}</priority>\n` +
        `  </url>`,
    );

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`
  );
}

function buildRobots() {
  return (
    `User-agent: *\n` +
    `Allow: /\n\n` +
    `# Admin, account and checkout flows carry no indexable content and must not\n` +
    `# appear in search results.\n` +
    `Disallow: /admin\n` +
    `Disallow: /admin/\n` +
    `Disallow: /dashboard\n` +
    `Disallow: /dashboard/\n` +
    `Disallow: /checkout\n` +
    `Disallow: /cart\n` +
    `Disallow: /account\n` +
    `Disallow: /signin\n` +
    `Disallow: /signup\n` +
    `Disallow: /forgot-password\n` +
    `Disallow: /set-password\n\n` +
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml\n`
  );
}

export function sitemapPlugin() {
  let outDir = "dist";

  return {
    name: "oxigen-sitemap",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    async closeBundle() {
      const { products, categories } = await fetchDynamicRoutes(this);

      const sitemap = buildSitemap({ products, categories });
      writeFileSync(resolve(outDir, "sitemap.xml"), sitemap, "utf8");

      // robots.txt lives in public/ and is copied by Vite, but the Sitemap
      // line embeds the origin, so rewrite the emitted copy to match.
      const robotsPath = resolve(outDir, "robots.txt");
      if (existsSync(robotsPath)) {
        const existing = readFileSync(robotsPath, "utf8");
        const withSitemap = existing.replace(
          /^Sitemap:.*$/m,
          `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        );
        writeFileSync(robotsPath, withSitemap, "utf8");
      }

      this.info(
        `[sitemap] ${STATIC_ROUTES.length} static + ${products.length} product + ${categories.length} category URLs → ${SITE_ORIGIN}`,
      );
    },
  };
}

import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { catalog } from "@/lib/site-data";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "https://www.oxigen.pk";

const paths = [
  "/",
  "/shop",
  "/categories",
  "/about",
  "/reviews",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/shipping-policy",
  ...catalog.map((p) => `/product/${p.slug}`),
];

export const Route = createFileRoute("/sitemap.xml")({
  component: SitemapComponent,
});

function SitemapComponent() {
  const urls = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === "/" ? "1.0" : "0.8"}</priority>\n  </url>`,
    )
    .join("\n");

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls,
    `</urlset>`,
  ].join("\n");

  return React.createElement(
    "pre",
    { style: { padding: "1rem", whiteSpace: "pre-wrap", wordBreak: "break-all" } },
    xml
  );
}

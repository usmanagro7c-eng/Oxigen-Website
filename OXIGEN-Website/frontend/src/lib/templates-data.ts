export type TemplateStyle = "Dark" | "Light" | "Minimal" | "Luxury" | "Modern" | "Creative";

export type Template = {
  id: string;
  name: string;
  category: string;
  industry: string;
  style: TemplateStyle;
  author: string;
  rating: number;
  downloads: number;
  price: "Free" | "Premium";
  isNew?: boolean;
  responsive?: boolean;
  tags: string[];
  tint: string; // gradient tailwind classes
  accent: string; // hex-ish accent for palette chips
  palette: string[]; // 4 swatches
  fontDisplay: string;
  fontBody: string;
  pages: string[];
  perfScore: number;
  seoScore: number;
  description: string;
  addedDaysAgo: number;
};

export const CATEGORIES = [
  "Fashion", "Electronics", "Restaurant", "Furniture", "Beauty", "Jewelry",
  "Medical", "Corporate", "Agency", "Portfolio", "Education", "Real Estate",
  "Sports", "Food", "Digital Products",
] as const;

export const STYLES: TemplateStyle[] = ["Dark", "Light", "Minimal", "Luxury", "Modern", "Creative"];

export const TEMPLATES: Template[] = [
  {
    id: "aether-runner", name: "Aether Runner", category: "Fashion", industry: "Fashion",
    style: "Modern", author: "Aether Studio", rating: 4.9, downloads: 12840, price: "Premium",
    isNew: true, responsive: true, tags: ["Sneakers", "Editorial", "Drop"],
    tint: "from-slate-800 via-violet-900 to-slate-950", accent: "#a78bfa",
    palette: ["#0f0f1a", "#a78bfa", "#f5f5f5", "#ff7ab6"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Shop", "Product", "Journal", "About", "Contact"],
    perfScore: 98, seoScore: 96,
    description: "A cinematic drop-culture storefront made for fashion brands with a strong point of view.",
    addedDaysAgo: 2,
  },
  {
    id: "noir-atelier", name: "Noir Atelier", category: "Jewelry", industry: "Jewelry",
    style: "Luxury", author: "Maison Studio", rating: 4.8, downloads: 9420, price: "Premium",
    responsive: true, tags: ["Editorial", "High-end", "Slow"],
    tint: "from-amber-700 via-neutral-900 to-black", accent: "#e6b980",
    palette: ["#0a0a0a", "#e6b980", "#f5efe6", "#6b4b2a"],
    fontDisplay: "Playfair Display", fontBody: "Inter",
    pages: ["Home", "Collection", "Story", "Atelier", "Contact"],
    perfScore: 96, seoScore: 94,
    description: "A quiet, luxurious canvas for jewelry houses and heritage brands.",
    addedDaysAgo: 8,
  },
  {
    id: "prism-electronics", name: "Prism", category: "Electronics", industry: "Electronics",
    style: "Dark", author: "Nova Labs", rating: 4.7, downloads: 15320, price: "Free",
    responsive: true, tags: ["Tech", "Product launch"],
    tint: "from-cyan-500 via-sky-800 to-slate-950", accent: "#22d3ee",
    palette: ["#020617", "#22d3ee", "#e2e8f0", "#38bdf8"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Products", "Specs", "Reviews", "Support"],
    perfScore: 99, seoScore: 95,
    description: "High-performance storefront tuned for tech launches and spec-heavy catalogs.",
    addedDaysAgo: 14,
  },
  {
    id: "sable-restaurant", name: "Sable & Table", category: "Restaurant", industry: "Restaurant",
    style: "Minimal", author: "Kitchen Co.", rating: 4.9, downloads: 7810, price: "Premium",
    isNew: true, responsive: true, tags: ["Menu", "Booking"],
    tint: "from-stone-700 via-stone-900 to-neutral-950", accent: "#f5d0a9",
    palette: ["#1c1917", "#f5d0a9", "#fafaf9", "#a16207"],
    fontDisplay: "Fraunces", fontBody: "Inter",
    pages: ["Home", "Menu", "Reservations", "Story", "Press"],
    perfScore: 97, seoScore: 93,
    description: "Warm, appetite-driven layout with built-in reservations and menu system.",
    addedDaysAgo: 5,
  },
  {
    id: "hearth-furniture", name: "Hearth", category: "Furniture", industry: "Furniture",
    style: "Minimal", author: "Loom", rating: 4.6, downloads: 5220, price: "Free",
    responsive: true, tags: ["Catalog", "Rooms"],
    tint: "from-emerald-700 via-teal-900 to-slate-950", accent: "#a7f3d0",
    palette: ["#0f172a", "#a7f3d0", "#f8fafc", "#059669"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Rooms", "Shop", "Journal", "Contact"],
    perfScore: 95, seoScore: 92,
    description: "Room-first browsing with soft imagery for home & lifestyle brands.",
    addedDaysAgo: 21,
  },
  {
    id: "lumen-beauty", name: "Lumen", category: "Beauty", industry: "Beauty",
    style: "Creative", author: "Petal Studio", rating: 4.8, downloads: 11020, price: "Premium",
    responsive: true, tags: ["Skincare", "Ritual"],
    tint: "from-rose-400 via-fuchsia-600 to-purple-900", accent: "#ffb3c7",
    palette: ["#1a1030", "#ffb3c7", "#fff5f7", "#a855f7"],
    fontDisplay: "DM Serif Display", fontBody: "Inter",
    pages: ["Home", "Shop", "Ritual", "Ingredients", "Blog"],
    perfScore: 96, seoScore: 94,
    description: "Sensory storefront with a soft palette, ideal for skincare and wellness.",
    addedDaysAgo: 3,
  },
  {
    id: "orbit-corporate", name: "Orbit", category: "Corporate", industry: "Corporate",
    style: "Modern", author: "North Studio", rating: 4.7, downloads: 8340, price: "Free",
    responsive: true, tags: ["B2B", "Landing"],
    tint: "from-indigo-600 via-slate-800 to-slate-950", accent: "#818cf8",
    palette: ["#0b1020", "#818cf8", "#f1f5f9", "#0ea5e9"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Solutions", "Customers", "Pricing", "About"],
    perfScore: 98, seoScore: 97,
    description: "A crisp, credibility-first template for B2B and enterprise brands.",
    addedDaysAgo: 34,
  },
  {
    id: "quill-portfolio", name: "Quill", category: "Portfolio", industry: "Portfolio",
    style: "Minimal", author: "Ink & Co.", rating: 4.9, downloads: 6180, price: "Premium",
    isNew: true, responsive: true, tags: ["Case studies", "Editorial"],
    tint: "from-neutral-200 via-neutral-400 to-neutral-700", accent: "#111111",
    palette: ["#ffffff", "#111111", "#e5e5e5", "#f59e0b"],
    fontDisplay: "Instrument Serif", fontBody: "Inter",
    pages: ["Home", "Work", "Case", "About", "Contact"],
    perfScore: 99, seoScore: 96,
    description: "Editorial-grade portfolio with immersive case study pages.",
    addedDaysAgo: 1,
  },
  {
    id: "vitals-medical", name: "Vitals", category: "Medical", industry: "Medical",
    style: "Light", author: "Care Studio", rating: 4.6, downloads: 4520, price: "Free",
    responsive: true, tags: ["Clinic", "Booking"],
    tint: "from-sky-300 via-sky-500 to-blue-700", accent: "#38bdf8",
    palette: ["#f8fafc", "#38bdf8", "#0f172a", "#22c55e"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Services", "Team", "Booking", "Contact"],
    perfScore: 97, seoScore: 95,
    description: "Trust-first template for clinics with integrated appointment booking.",
    addedDaysAgo: 12,
  },
  {
    id: "campus-education", name: "Campus", category: "Education", industry: "Education",
    style: "Modern", author: "Studia", rating: 4.5, downloads: 3980, price: "Free",
    responsive: true, tags: ["Courses", "LMS"],
    tint: "from-orange-400 via-rose-600 to-purple-800", accent: "#fb923c",
    palette: ["#1e1b4b", "#fb923c", "#fef3c7", "#a855f7"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Courses", "Instructors", "Pricing", "Blog"],
    perfScore: 95, seoScore: 93,
    description: "Course marketplace with curriculum and instructor spotlights.",
    addedDaysAgo: 19,
  },
  {
    id: "brix-realestate", name: "Brix", category: "Real Estate", industry: "Real Estate",
    style: "Luxury", author: "Skyline", rating: 4.8, downloads: 5620, price: "Premium",
    responsive: true, tags: ["Listings", "Maps"],
    tint: "from-yellow-500 via-stone-800 to-zinc-950", accent: "#fbbf24",
    palette: ["#0a0a0a", "#fbbf24", "#f5f5f4", "#78716c"],
    fontDisplay: "Fraunces", fontBody: "Inter",
    pages: ["Home", "Listings", "Property", "Agents", "Contact"],
    perfScore: 96, seoScore: 94,
    description: "Cinematic listings with immersive property tours.",
    addedDaysAgo: 27,
  },
  {
    id: "kinetic-agency", name: "Kinetic", category: "Agency", industry: "Agency",
    style: "Creative", author: "Motion Dept.", rating: 4.9, downloads: 9840, price: "Premium",
    isNew: true, responsive: true, tags: ["Motion", "Bold"],
    tint: "from-lime-400 via-emerald-600 to-slate-900", accent: "#a3e635",
    palette: ["#0a0a0a", "#a3e635", "#f4f4f5", "#22d3ee"],
    fontDisplay: "Space Grotesk", fontBody: "Inter",
    pages: ["Home", "Work", "Services", "Studio", "Contact"],
    perfScore: 98, seoScore: 95,
    description: "A high-energy agency site with expressive motion and bold typography.",
    addedDaysAgo: 4,
  },
];

export function getTemplate(id: string) {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
}

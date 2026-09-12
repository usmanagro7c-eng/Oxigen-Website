import type { Template } from "@/lib/templates-data";

export type SectionType =
  | "hero-fashion"
  | "hero-luxury"
  | "hero-electronics"
  | "hero-restaurant"
  | "hero-medical"
  | "hero-corporate"
  | "hero-portfolio"
  | "hero-agency"
  | "hero-beauty"
  | "hero-realestate"
  | "hero-furniture"
  | "hero-education"
  | "hero-simple"
  | "banner"
  | "featured-collections"
  | "lookbook"
  | "instagram"
  | "product-comparison"
  | "featured-gadgets"
  | "categories-grid"
  | "food-menu"
  | "chef"
  | "opening-hours"
  | "reservation-form"
  | "doctors"
  | "appointment-form"
  | "services"
  | "team"
  | "testimonials"
  | "portfolio-grid"
  | "timeline"
  | "case-studies"
  | "gallery"
  | "video"
  | "countdown"
  | "faq"
  | "pricing"
  | "newsletter"
  | "contact-form"
  | "map"
  | "products"
  | "cta"
  | "text-block";

export const SECTION_LIBRARY: { type: SectionType; label: string; group: string }[] = [
  { type: "hero-simple", label: "Hero (simple)", group: "Hero" },
  { type: "hero-fashion", label: "Hero — Fashion drop", group: "Hero" },
  { type: "hero-luxury", label: "Hero — Luxury editorial", group: "Hero" },
  { type: "hero-electronics", label: "Hero — Electronics", group: "Hero" },
  { type: "hero-restaurant", label: "Hero — Restaurant", group: "Hero" },
  { type: "hero-medical", label: "Hero — Medical", group: "Hero" },
  { type: "hero-corporate", label: "Hero — Corporate", group: "Hero" },
  { type: "hero-portfolio", label: "Hero — Portfolio", group: "Hero" },
  { type: "hero-agency", label: "Hero — Agency motion", group: "Hero" },
  { type: "hero-beauty", label: "Hero — Beauty", group: "Hero" },
  { type: "hero-realestate", label: "Hero — Real estate", group: "Hero" },
  { type: "hero-furniture", label: "Hero — Furniture rooms", group: "Hero" },
  { type: "hero-education", label: "Hero — Education", group: "Hero" },
  { type: "banner", label: "Promo banner", group: "Marketing" },
  { type: "cta", label: "Call to action", group: "Marketing" },
  { type: "newsletter", label: "Newsletter", group: "Marketing" },
  { type: "countdown", label: "Countdown", group: "Marketing" },
  { type: "featured-collections", label: "Featured collections", group: "Commerce" },
  { type: "lookbook", label: "Lookbook", group: "Commerce" },
  { type: "instagram", label: "Instagram feed", group: "Commerce" },
  { type: "product-comparison", label: "Product comparison", group: "Commerce" },
  { type: "featured-gadgets", label: "Featured gadgets", group: "Commerce" },
  { type: "categories-grid", label: "Categories grid", group: "Commerce" },
  { type: "products", label: "Product grid", group: "Commerce" },
  { type: "pricing", label: "Pricing tiers", group: "Commerce" },
  { type: "food-menu", label: "Food menu", group: "Restaurant" },
  { type: "chef", label: "Chef / About", group: "Restaurant" },
  { type: "opening-hours", label: "Opening hours", group: "Restaurant" },
  { type: "reservation-form", label: "Reservation form", group: "Restaurant" },
  { type: "doctors", label: "Doctors", group: "Medical" },
  { type: "appointment-form", label: "Appointment form", group: "Medical" },
  { type: "services", label: "Services", group: "Business" },
  { type: "team", label: "Team", group: "Business" },
  { type: "testimonials", label: "Testimonials", group: "Business" },
  { type: "portfolio-grid", label: "Portfolio grid", group: "Portfolio" },
  { type: "timeline", label: "Timeline", group: "Portfolio" },
  { type: "case-studies", label: "Case studies", group: "Portfolio" },
  { type: "gallery", label: "Gallery", group: "Media" },
  { type: "video", label: "Video", group: "Media" },
  { type: "faq", label: "FAQ", group: "Content" },
  { type: "contact-form", label: "Contact form", group: "Content" },
  { type: "map", label: "Map", group: "Content" },
  { type: "text-block", label: "Text block", group: "Content" },
];

type PageKit = {
  slug: string;
  label: string;
  sections: { type: SectionType; props?: Record<string, any> }[];
};
type NavKit = { label: string; slug?: string; url?: string; visible?: boolean };

export type TemplateKit = {
  kind: string;
  fontDisplay?: string;
  fontBody?: string;
  nav: NavKit[];
  pages: PageKit[];
};

const DEFAULT_NAV_EXTRAS: NavKit[] = [
  { label: "About", slug: "about", visible: true },
  { label: "Contact", slug: "contact", visible: true },
  { label: "Blog", slug: "blog", visible: false },
  { label: "FAQ", slug: "faq", visible: false },
];

const commonPages: PageKit[] = [
  { slug: "about", label: "About", sections: [
    { type: "hero-simple", props: { eyebrow: "About us", title: "Who we are", body: "A short story about the brand, values, and craft." } },
    { type: "team" }, { type: "testimonials" }, { type: "cta" },
  ]},
  { slug: "contact", label: "Contact", sections: [
    { type: "hero-simple", props: { eyebrow: "Contact", title: "Say hello", body: "We usually reply within a business day." } },
    { type: "contact-form" }, { type: "map" },
  ]},
  { slug: "blog", label: "Blog", sections: [
    { type: "hero-simple", props: { eyebrow: "Journal", title: "Notes & stories", body: "Long-form writing from the studio." } },
    { type: "gallery" },
  ]},
  { slug: "faq", label: "FAQ", sections: [
    { type: "hero-simple", props: { eyebrow: "Help", title: "Frequently asked", body: "Answers to the most common questions." } },
    { type: "faq" },
  ]},
];

function makeKit(kind: string, homeSections: PageKit["sections"], navExtras: NavKit[] = [], extraPages: PageKit[] = []): TemplateKit {
  const nav: NavKit[] = [
    { label: "Home", slug: "home", visible: true },
    ...navExtras,
    ...DEFAULT_NAV_EXTRAS,
  ];
  const pages: PageKit[] = [
    { slug: "home", label: "Home", sections: homeSections },
    ...extraPages,
    ...commonPages,
  ];
  return { kind, nav, pages };
}

const KITS: Record<string, TemplateKit> = {
  "aether-runner": makeKit("fashion", [
    { type: "hero-fashion" },
    { type: "banner", props: { text: "Free shipping on drops over $150 · Members only" } },
    { type: "featured-collections" },
    { type: "lookbook" },
    { type: "instagram" },
    { type: "newsletter" },
  ], [
    { label: "Shop", slug: "shop", visible: true },
    { label: "Collections", slug: "collections", visible: true },
    { label: "Lookbook", slug: "lookbook", visible: true },
  ], [
    { slug: "shop", label: "Shop", sections: [
      { type: "hero-simple", props: { eyebrow: "Shop", title: "All pieces", body: "Everything currently available." } },
      { type: "products" }, { type: "newsletter" },
    ]},
    { slug: "collections", label: "Collections", sections: [
      { type: "hero-simple", props: { eyebrow: "Collections", title: "Curated drops", body: "Themes and seasonal capsules." } },
      { type: "featured-collections" },
    ]},
    { slug: "lookbook", label: "Lookbook", sections: [
      { type: "hero-simple", props: { eyebrow: "Editorial", title: "SS26 Lookbook", body: "Set to motion." } },
      { type: "lookbook" }, { type: "instagram" },
    ]},
  ]),

  "noir-atelier": makeKit("luxury", [
    { type: "hero-luxury" },
    { type: "featured-collections" },
    { type: "lookbook" },
    { type: "cta" },
    { type: "newsletter" },
  ], [
    { label: "Collection", slug: "collection", visible: true },
    { label: "Story", slug: "story", visible: true },
    { label: "Atelier", slug: "atelier", visible: true },
  ], [
    { slug: "collection", label: "Collection", sections: [
      { type: "hero-simple", props: { eyebrow: "Collection", title: "Pieces of intent", body: "Made slowly, worn always." } },
      { type: "products" },
    ]},
    { slug: "story", label: "Story", sections: [
      { type: "hero-simple", props: { eyebrow: "Heritage", title: "A quiet legacy", body: "Three generations, one philosophy." } },
      { type: "timeline" },
    ]},
    { slug: "atelier", label: "Atelier", sections: [
      { type: "hero-simple", props: { eyebrow: "The atelier", title: "Where it's made", body: "A conversation with our craftspeople." } },
      { type: "chef" },
    ]},
  ]),

  "prism-electronics": makeKit("electronics", [
    { type: "hero-electronics" },
    { type: "featured-gadgets" },
    { type: "product-comparison" },
    { type: "categories-grid" },
    { type: "testimonials" },
    { type: "cta" },
  ], [
    { label: "Products", slug: "products", visible: true },
    { label: "Specs", slug: "specs", visible: true },
    { label: "Support", slug: "support", visible: true },
  ], [
    { slug: "products", label: "Products", sections: [
      { type: "hero-simple", props: { eyebrow: "Catalog", title: "Engineered essentials", body: "Filter by category or spec." } },
      { type: "categories-grid" }, { type: "products" },
    ]},
    { slug: "specs", label: "Specs", sections: [
      { type: "hero-simple", props: { eyebrow: "Under the hood", title: "The full spec sheet", body: "Compare every model side by side." } },
      { type: "product-comparison" },
    ]},
    { slug: "support", label: "Support", sections: [
      { type: "hero-simple", props: { eyebrow: "Help center", title: "Answers, fast", body: "Guides, warranties, and getting started." } },
      { type: "faq" }, { type: "contact-form" },
    ]},
  ]),

  "sable-restaurant": makeKit("restaurant", [
    { type: "hero-restaurant" },
    { type: "reservation-form" },
    { type: "food-menu" },
    { type: "chef" },
    { type: "opening-hours" },
    { type: "gallery" },
  ], [
    { label: "Menu", slug: "menu", visible: true },
    { label: "Reservations", slug: "reservations", visible: true },
  ], [
    { slug: "menu", label: "Menu", sections: [
      { type: "hero-simple", props: { eyebrow: "Kitchen", title: "Today's menu", body: "Seasonal, local, unfussy." } },
      { type: "food-menu" },
    ]},
    { slug: "reservations", label: "Reservations", sections: [
      { type: "hero-simple", props: { eyebrow: "Book a table", title: "See you soon", body: "Reservations open 30 days ahead." } },
      { type: "reservation-form" }, { type: "opening-hours" },
    ]},
  ]),

  "vitals-medical": makeKit("medical", [
    { type: "hero-medical" },
    { type: "services" },
    { type: "doctors" },
    { type: "appointment-form" },
    { type: "testimonials" },
    { type: "faq" },
  ], [
    { label: "Services", slug: "services", visible: true },
    { label: "Doctors", slug: "team", visible: true },
    { label: "Booking", slug: "booking", visible: true },
  ], [
    { slug: "services", label: "Services", sections: [
      { type: "hero-simple", props: { eyebrow: "Care", title: "What we treat", body: "Comprehensive care across specialties." } },
      { type: "services" },
    ]},
    { slug: "booking", label: "Booking", sections: [
      { type: "hero-simple", props: { eyebrow: "Appointments", title: "Book a visit", body: "Same-day slots often available." } },
      { type: "appointment-form" },
    ]},
  ]),

  "orbit-corporate": makeKit("corporate", [
    { type: "hero-corporate" },
    { type: "services" },
    { type: "team" },
    { type: "testimonials" },
    { type: "pricing" },
    { type: "cta" },
  ], [
    { label: "Solutions", slug: "solutions", visible: true },
    { label: "Customers", slug: "customers", visible: true },
    { label: "Pricing", slug: "pricing", visible: true },
  ], [
    { slug: "solutions", label: "Solutions", sections: [
      { type: "hero-simple", props: { eyebrow: "Product", title: "One platform, many outcomes", body: "Ship faster with fewer moving parts." } },
      { type: "services" },
    ]},
    { slug: "customers", label: "Customers", sections: [
      { type: "hero-simple", props: { eyebrow: "Proof", title: "Trusted by teams", body: "See the numbers, not just the logos." } },
      { type: "case-studies" }, { type: "testimonials" },
    ]},
    { slug: "pricing", label: "Pricing", sections: [
      { type: "hero-simple", props: { eyebrow: "Pricing", title: "Simple, fair pricing", body: "Cancel anytime, no surprises." } },
      { type: "pricing" }, { type: "faq" },
    ]},
  ]),

  "quill-portfolio": makeKit("portfolio", [
    { type: "hero-portfolio" },
    { type: "portfolio-grid" },
    { type: "case-studies" },
    { type: "timeline" },
    { type: "cta" },
  ], [
    { label: "Work", slug: "work", visible: true },
    { label: "Case", slug: "case", visible: true },
  ], [
    { slug: "work", label: "Work", sections: [
      { type: "hero-simple", props: { eyebrow: "Selected", title: "Recent work", body: "A cross-section of the last two years." } },
      { type: "portfolio-grid" },
    ]},
    { slug: "case", label: "Case", sections: [
      { type: "hero-simple", props: { eyebrow: "Case study", title: "How we shipped it", body: "Process, decisions, outcomes." } },
      { type: "case-studies" },
    ]},
  ]),

  "kinetic-agency": makeKit("agency", [
    { type: "hero-agency" },
    { type: "portfolio-grid" },
    { type: "services" },
    { type: "video" },
    { type: "testimonials" },
    { type: "cta" },
  ], [
    { label: "Work", slug: "work", visible: true },
    { label: "Services", slug: "services", visible: true },
    { label: "Studio", slug: "studio", visible: true },
  ], [
    { slug: "work", label: "Work", sections: [
      { type: "hero-simple", props: { eyebrow: "Reel", title: "Selected work", body: "Motion, brand, product." } },
      { type: "portfolio-grid" },
    ]},
    { slug: "services", label: "Services", sections: [
      { type: "hero-simple", props: { eyebrow: "What we do", title: "Services", body: "Craft-first, systems-minded." } },
      { type: "services" },
    ]},
    { slug: "studio", label: "Studio", sections: [
      { type: "hero-simple", props: { eyebrow: "Inside", title: "The studio", body: "A small team, a large output." } },
      { type: "team" }, { type: "timeline" },
    ]},
  ]),

  "lumen-beauty": makeKit("beauty", [
    { type: "hero-beauty" },
    { type: "featured-collections" },
    { type: "products" },
    { type: "testimonials" },
    { type: "newsletter" },
  ], [
    { label: "Shop", slug: "shop", visible: true },
    { label: "Ritual", slug: "ritual", visible: true },
    { label: "Ingredients", slug: "ingredients", visible: true },
  ], [
    { slug: "shop", label: "Shop", sections: [
      { type: "hero-simple", props: { eyebrow: "Shop", title: "Skincare, refined", body: "Small batches, clean formulas." } },
      { type: "products" },
    ]},
    { slug: "ritual", label: "Ritual", sections: [
      { type: "hero-simple", props: { eyebrow: "Ritual", title: "A daily ritual", body: "Morning, evening, and beyond." } },
      { type: "timeline" },
    ]},
    { slug: "ingredients", label: "Ingredients", sections: [
      { type: "hero-simple", props: { eyebrow: "Formulated with", title: "Every ingredient", body: "Sourced, tested, disclosed." } },
      { type: "services" },
    ]},
  ]),

  "hearth-furniture": makeKit("furniture", [
    { type: "hero-furniture" },
    { type: "categories-grid" },
    { type: "featured-collections" },
    { type: "gallery" },
    { type: "cta" },
  ], [
    { label: "Rooms", slug: "rooms", visible: true },
    { label: "Shop", slug: "shop", visible: true },
  ], [
    { slug: "rooms", label: "Rooms", sections: [
      { type: "hero-simple", props: { eyebrow: "By room", title: "Design by room", body: "Living, dining, bedroom, office." } },
      { type: "categories-grid" },
    ]},
    { slug: "shop", label: "Shop", sections: [
      { type: "hero-simple", props: { eyebrow: "Shop all", title: "Every piece", body: "Made to last." } },
      { type: "products" },
    ]},
  ]),

  "brix-realestate": makeKit("realestate", [
    { type: "hero-realestate" },
    { type: "featured-gadgets", props: { title: "Featured properties" } },
    { type: "services", props: { title: "How we help" } },
    { type: "team", props: { title: "Meet the agents" } },
    { type: "cta" },
  ], [
    { label: "Listings", slug: "listings", visible: true },
    { label: "Agents", slug: "agents", visible: true },
  ], [
    { slug: "listings", label: "Listings", sections: [
      { type: "hero-simple", props: { eyebrow: "Explore", title: "Every listing", body: "Filter by neighborhood or budget." } },
      { type: "featured-gadgets", props: { title: "Listings" } },
    ]},
    { slug: "agents", label: "Agents", sections: [
      { type: "hero-simple", props: { eyebrow: "Agents", title: "Meet the team", body: "Local experts, national reach." } },
      { type: "team" },
    ]},
  ]),

  "campus-education": makeKit("education", [
    { type: "hero-education" },
    { type: "categories-grid", props: { title: "Browse by topic" } },
    { type: "featured-gadgets", props: { title: "Popular courses" } },
    { type: "team", props: { title: "Instructors" } },
    { type: "testimonials" },
    { type: "pricing" },
  ], [
    { label: "Courses", slug: "courses", visible: true },
    { label: "Instructors", slug: "instructors", visible: true },
    { label: "Pricing", slug: "pricing", visible: true },
  ], [
    { slug: "courses", label: "Courses", sections: [
      { type: "hero-simple", props: { eyebrow: "All courses", title: "Learn something new", body: "Self-paced, certificate-ready." } },
      { type: "featured-gadgets", props: { title: "Courses" } },
    ]},
    { slug: "instructors", label: "Instructors", sections: [
      { type: "hero-simple", props: { eyebrow: "Instructors", title: "Taught by practitioners", body: "Real work, real teachers." } },
      { type: "team" },
    ]},
    { slug: "pricing", label: "Pricing", sections: [
      { type: "hero-simple", props: { eyebrow: "Plans", title: "Learn on any budget", body: "Monthly, annual, or lifetime." } },
      { type: "pricing" },
    ]},
  ]),
};

export function buildDefaultsForTemplate(tpl: Template): TemplateKit {
  const kit = KITS[tpl.id];
  if (kit) return { ...kit, fontDisplay: tpl.fontDisplay, fontBody: tpl.fontBody };
  // fallback
  return makeKit("generic", [
    { type: "hero-simple", props: { eyebrow: tpl.category, title: tpl.name, body: tpl.description } },
    { type: "services" }, { type: "testimonials" }, { type: "cta" },
  ]);
}

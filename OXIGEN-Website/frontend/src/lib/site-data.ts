export const CDN = "https://www.oxigen.pk/cdn/shop/files";

export function getOptimizedShopifyUrl(url: string, width: number): string {
  if (!url || (!url.includes("cdn/shop") && !url.includes("oxigen.pk/cdn"))) return url;
  const [base, query] = url.split("?");
  const params = new URLSearchParams(query || "");
  params.set("width", String(width));
  params.set("format", "webp");
  return `${base}?${params.toString()}`;
}

export const brand = {
  name: "OxiGen",
  tagline: "Pakistan's No.1 Vitamin Brand",
  promo: "30% OFF + FREE SHIPPING — TODAY ONLY",
  email: "info@oxigen.pk",
  phone: "+92 330 7069091",
  phoneHref: "tel:+923307069091",
  location: "Pakistan",
  whatsapp: "https://wa.me/+923307069091?text=Hi%2C%20I%27m%20interested%20in%20this%20product.",
  facebook: "https://www.facebook.com/profile.php?id=61555862056972",
  instagram: "https://www.instagram.com/oxigen.pk/",
  shopAll: "/shop",
};

export const announcements = [
  "30% OFF + FREE SHIPPING — TODAY ONLY",
  "🚚 Free nationwide delivery across Pakistan",
  "✅ 100% authentic & sealed products",
  "🔄 Easy 7-day returns — shop worry-free",
  "🌿 Pakistan's No.1 Vitamin & Wellness Brand",
];

export const nav = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Categories", to: "/categories" },
  { label: "About", to: "/about" },
  { label: "Reviews", to: "/reviews" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
] as const;

export const categories = [
  {
    title: "Women's Health",
    desc: "Hormonal balance, PCOS care & everyday female vitality.",
    img: "/products/nutricept-new-packaging.jpeg",
    href: "/product/nutri-cept-women-s-wellness",
  },
  {
    title: "Brain & Focus",
    desc: "Laser focus, mental clarity, calm & natural motivation.",
    img: "/products/oxidop-new-packaging.jpeg",
    href: "/product/oxidop-focus-dopamine-support",
  },
  {
    title: "PCOS Wellness",
    desc: "Inositol synergy, cycle regularity & reproductive health.",
    img: "/products/nutricept-new-packaging.jpeg",
    href: "/product/nutri-cept-women-s-wellness",
  },
  {
    title: "Cognitive Performance",
    desc: "Dopamine support, calm resilience & memory function.",
    img: "/products/oxidop-new-packaging.jpeg",
    href: "/product/oxidop-focus-dopamine-support",
  },
];

export const products = [
  {
    name: "Nutri-Cept — Women's Wellness",
    subtitle: "PCOS & Hormonal Balance Supplement",
    desc: "Nutri-Cept is an advanced women's wellness formula designed to support hormonal balance, fertility health and daily energy. Enriched with Myo-Inositol, D-Chiro-Inositol & Chaste Berry Extract to help support PCOS management, ovulation and reproductive wellness — plus essential vitamins, Iron, Zinc & Folic Acid for immunity, metabolism and everyday female vitality.",
    price: "Rs.1,600",
    was: "Rs.2,000",
    tag: "Women's Favourite",
    img: "/products/nutricept-new-packaging.jpeg",
    gallery: [
      "/products/nutricept-new-packaging.jpeg",
      `${CDN}/WhatsAppImage2025-04-28at5.41.05PM.jpg?v=1747318003&width=800`,
      `${CDN}/image_123650291_11.jpg?v=1755887629&width=800`,
      `${CDN}/image_123650291_7.jpg?v=1755887629&width=800`,
    ],
    highlights: [
      "Supports hormonal balance & PCOS wellness",
      "Myo-Inositol, D-Chiro-Inositol & Chaste Berry",
      "Iron, Zinc & Folic Acid for daily vitality",
      "CoQ10 & antioxidants for healthy aging",
    ],
    ingredients:
      "Ascorbic Acid 45mg, Vitamin D3 300iu, Vitamin E 2mg, Thiamine 2mg, Riboflavin 2.5mg, Niacin 10mg, Vitamin B6 5mg, Folic Acid 200mcg, Vitamin B12 10mcg, Iron 7mg, Zinc 7.5mg, Selenium 25mcg, CoQ10 2.5mg, Myo-Inositol 25mg, Chaste Berry 28mg, D-Chiro-Inositol 25mg",
    href: "/product/nutri-cept-women-s-wellness",
  },
  {
    name: "OxiDop — Focus & Dopamine Support",
    subtitle: "Mental Clarity, Calm & Motivation",
    desc: "Stay focused, motivated and mentally balanced with OxiDop — an advanced calm-focus supplement designed to support productivity without the jitters. Formulated with L-Tyrosine, L-Theanine, GABA, Rhodiola Rosea, Magnesium Glycinate, Vitamin D3, Vitamin B6 & Zinc to support healthy dopamine production, mental clarity, stress resilience and relaxation — ideal for students, professionals and anyone facing mental fatigue.",
    price: "Rs.4,500",
    was: "Rs.6,000",
    tag: "New Launch",
    img: "/products/oxidop-new-packaging.jpeg",
    gallery: [
      "/products/oxidop-new-packaging.jpeg",
      `${CDN}/Focus_Dopamine_Support_Tablets_Mental_Clarity_Calm_Motivation_Supplement.webp?v=1781878798&width=800`,
      `${CDN}/ChatGPTImageJun11_2026_11_21_36PM.png?v=1781202993&width=800`,
      `${CDN}/OXIDOP_Focus_Dopamine_Support_Tablets_Mental_Clarity_Calm_Motivation_Supplement.webp?v=1781558572&width=800`,
    ],
    highlights: [
      "Supports healthy dopamine for motivation",
      "Enhances focus & mental clarity",
      "Promotes calm & relaxation without drowsiness",
      "Rhodiola & Magnesium for everyday stress",
    ],
    ingredients:
      "L-Tyrosine, L-Theanine, GABA, Rhodiola Rosea, Magnesium Glycinate, Vitamin D3, Vitamin B6, Zinc",
    href: "/product/oxidop-focus-dopamine-support",
  },
];

export const perks = [
  {
    title: "Free Shipping",
    desc: "Shop with free shipping. A seamless and cost-effective way to enjoy our products.",
  },
  {
    title: "Quality Guaranteed",
    desc: "Experience the assurance of quality. We guarantee top-notch ingredients in every item.",
  },
  {
    title: "7 Day Return",
    desc: "Shop confidently — if the result doesn't meet expectations, our 7-day return policy has you covered.",
  },
];

export const testimonials = [
  {
    name: "Shaista",
    date: "01/02/2025",
    title: "Best Product for PCOS & Energy",
    text: "Nutri-Cept ne meri cycle aur energy ko kaafi improve kiya hai. PCOS symptoms mein kaafi relief mila aur mood bhi balance feel ho raha hai. Highly recommended!",
  },
  {
    name: "Farukh",
    date: "01/02/2025",
    title: "Amazing Mental Focus",
    text: "Main ne OxiDop ka istemal kiya aur focus bilkul sharp ho gaya hai! Bina kisi caffeine crash ya jittery feeling ke pure din productivity bani rehti hai.",
  },
  {
    name: "Ayesha",
    date: "18/03/2025",
    title: "Hormonal Balance in Weeks",
    text: "Sirf teen hafton mein meri body aur routine mein positive farq mehsoos hua. Nutri-Cept ab meri daily routine ka zaroori hissa ban gaya hai.",
  },
  {
    name: "Bilal",
    date: "27/03/2025",
    title: "Energy & Focus Boost",
    text: "Din bhar thakan mehsoos hoti thi, lekin OxiDop lene ke baad focus aur motivation dono behtar ho gaye. Delivery bhi fast thi across Pakistan.",
  },
  {
    name: "Hina",
    date: "05/04/2025",
    title: "Great Quality & Packaging",
    text: "Sealed packaging aur authentic formula mila. Nutri-Cept ke ingredients kaafi transparent aur effective hain.",
  },
  {
    name: "Usman",
    date: "12/04/2025",
    title: "Genuine & Trustworthy",
    text: "Original product mila aur results bhi real hain. Customer support ne har sawaal ka jawab diya. OxiGen par ab pura bharosa hai.",
  },
];

export const faqs = [
  {
    q: "What types of supplements does OxiGen offer?",
    a: "OxiGen offers a range of nutritional supplements designed to support immunity, skin health, energy, hormonal wellness, and overall daily nutrition.",
  },
  {
    q: "Are OxiGen supplements suitable for everyday use?",
    a: "Many OxiGen supplements are designed for regular use as part of a balanced diet and healthy lifestyle. Always follow product directions and consult a healthcare professional if needed.",
  },
  {
    q: "Why is nutritional supplementation important?",
    a: "Nutritional supplements may help support daily nutrient intake when dietary needs are not fully met through food alone.",
  },
  {
    q: "How does OxiGen ensure product quality?",
    a: "We prioritize quality ingredients, transparent formulations, and responsible manufacturing standards to provide reliable wellness products.",
  },
  {
    q: "Do you offer free shipping across Pakistan?",
    a: "Yes. We offer free nationwide shipping on all orders, delivered right to your doorstep anywhere in Pakistan.",
  },
  {
    q: "How long does delivery take?",
    a: "Orders are typically dispatched within 24 hours and delivered in 2–4 business days, depending on your city.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 7-day return policy. If you're not satisfied, contact our support team and we'll help you with a return or exchange.",
  },
  {
    q: "How soon will I see results?",
    a: "Results vary by individual, but many customers notice improvements within 3–4 weeks of consistent daily use alongside a balanced diet.",
  },
  {
    q: "Are OxiGen products original and authentic?",
    a: "Absolutely. Every product is 100% genuine, sealed, and sourced through trusted manufacturing to guarantee authenticity.",
  },
  {
    q: "Can I take more than one supplement together?",
    a: "Many OxiGen supplements can be combined, but we recommend following each product's directions and consulting a healthcare professional if unsure.",
  },
  {
    q: "How can I place an order?",
    a: "You can order directly from our Shop page or reach us on WhatsApp for quick assistance with your purchase.",
  },
];

// ---- E-commerce catalog helpers ----
export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parsePrice(price: string) {
  const n = Number(price.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type CatalogItem = {
  slug: string;
  name: string;
  subtitle: string;
  desc: string;
  price: number;
  was: number;
  tag: string;
  img: string;
  gallery: string[];
  highlights: string[];
  ingredients: string;
  available: boolean;
};

export const catalog: CatalogItem[] = products.map((p) => {
  const optimizedImg = getOptimizedShopifyUrl(p.img, 800);
  const optimizedGallery = ((p as { gallery?: string[] }).gallery ?? [p.img]).map((g) =>
    getOptimizedShopifyUrl(g, 800),
  );

  return {
    slug: slugify(p.name),
    name: p.name,
    subtitle: p.subtitle,
    desc: p.desc,
    price: parsePrice(p.price),
    was: parsePrice(p.was),
    tag: p.tag,
    img: optimizedImg,
    gallery: optimizedGallery,
    highlights: (p as { highlights?: string[] }).highlights ?? [],
    ingredients: (p as { ingredients?: string }).ingredients ?? "",
    available: p.price !== "Coming Soon",
  };
});

export function getProduct(slug: string) {
  return catalog.find((p) => p.slug === slug);
}

export function formatPKR(n: number) {
  return "Rs." + n.toLocaleString("en-PK");
}

export type ProductReview = {
  name: string;
  date: string;
  rating: number;
  title: string;
  text: string;
  verified: boolean;
};

const reviewPool: ProductReview[] = [
  {
    name: "Ayesha K.",
    date: "18 Mar 2025",
    rating: 5,
    title: "Genuine results",
    text: "Within 3 weeks I noticed a real difference. Original product, sealed packaging and fast delivery.",
    verified: true,
  },
  {
    name: "Bilal R.",
    date: "27 Mar 2025",
    rating: 5,
    title: "Highly recommend",
    text: "Energy and focus both improved. Delivery was quick across Pakistan and support was helpful.",
    verified: true,
  },
  {
    name: "Hina S.",
    date: "05 Apr 2025",
    rating: 4,
    title: "Great quality",
    text: "Quality product with premium packaging. Took a little longer to see results but worth it.",
    verified: true,
  },
  {
    name: "Usman A.",
    date: "12 Apr 2025",
    rating: 5,
    title: "Trustworthy brand",
    text: "100% original and results are real. Customer support answered every question. Fully satisfied.",
    verified: true,
  },
  {
    name: "Sana M.",
    date: "22 Apr 2025",
    rating: 5,
    title: "Loved it",
    text: "Became part of my daily routine. Skin and overall wellness feel much better now.",
    verified: true,
  },
  {
    name: "Fahad T.",
    date: "30 Apr 2025",
    rating: 4,
    title: "Good value",
    text: "Reasonable price for the quality. Free shipping and cash on delivery made it easy to order.",
    verified: false,
  },
];

// Deterministic per-product reviews so ratings stay stable across renders.
export function getProductReviews(slug: string): ProductReview[] {
  const seed = slug.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = 4 + (seed % 3); // 4–6 reviews
  const start = seed % reviewPool.length;
  return Array.from({ length: count }, (_, i) => reviewPool[(start + i) % reviewPool.length]);
}

export function getReviewStats(reviews: ProductReview[]) {
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  return { total, avg: Math.round(avg * 10) / 10 };
}

// ---- Homepage banners (from OxiGen brand assets) ----
export type Banner = {
  id?: string;
  title: string;
  sub: string;
  img: string;
  href: string;
  cta: string;
};

export type HeroBannerItem = {
  id: string;
  slug: string;
  name: string;
  badge: string;
  category: string;
  tagline: string;
  sub: string;
  desc: string;
  img: string;
  price: string;
  wasPrice: string;
  discount: string;
  href: string;
  cta: string;
  theme: {
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    glowColor: string;
    gradientBorder: string;
    bgGradient: string;
    chipBg: string;
  };
  keyActives: { name: string; amount?: string; note: string }[];
  benefits: { title: string; desc: string; icon: string }[];
  highlights: string[];
  packagingNotice: string;
  whatsappMessage: string;
};

export const heroBanners: (Banner & HeroBannerItem)[] = [
  {
    id: "nutri-cept",
    slug: "nutri-cept-women-s-wellness",
    name: "Nutri-Cept®",
    title: "Nutri-Cept Women's Wellness",
    badge: "NEW PACKAGING • 100% ORIGINAL",
    category: "Women's Wellness & PCOS Formula",
    tagline: "Complete Hormonal Balance, PCOS Support & Ovulation Health",
    sub: "Myo-Inositol, D-Chiro-Inositol, Chaste Berry & 15+ Essential Nutrients",
    desc: "Specially formulated for women struggling with irregular cycles, PCOS symptoms, hormonal acne and low energy. A clinical-grade dual Inositol blend with essential micronutrients.",
    img: "/products/nutricept-new-packaging.jpeg",
    price: "Rs.1,600",
    wasPrice: "Rs.2,000",
    discount: "20% OFF",
    href: "/product/nutri-cept-women-s-wellness",
    cta: "Shop Nutri-Cept",
    theme: {
      accentColor: "oklch(0.65 0.22 340)",
      badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
      badgeText: "text-rose-400",
      glowColor: "rgba(244, 63, 94, 0.25)",
      gradientBorder: "from-rose-500/40 via-purple-500/30 to-pink-500/40",
      bgGradient: "from-rose-950/40 via-purple-950/30 to-background",
      chipBg: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    },
    keyActives: [
      { name: "Myo + D-Chiro Inositol", amount: "50mg Total", note: "Ovarian function & cycle regularity" },
      { name: "Chaste Berry (Vitex)", amount: "28mg", note: "Balances estrogen & progesterone" },
      { name: "CoQ10 & Antioxidants", amount: "2.5mg", note: "Cellular energy & egg quality" },
      { name: "Folic Acid, Iron & Zinc", amount: "15+ Vitamins", note: "Fights fatigue & hair thinning" },
    ],
    benefits: [
      { title: "Cycle Regularity", desc: "Predictable, healthy menstrual cycles & ovulation", icon: "cycle" },
      { title: "PCOS Care", desc: "Helps manage hormonal weight, cravings & acne", icon: "pcos" },
      { title: "Hair & Skin Glow", desc: "Reduces androgenic hair thinning & skin breakouts", icon: "sparkle" },
      { title: "Daily Female Energy", desc: "Replenishes iron and essential micronutrients", icon: "energy" },
    ],
    highlights: ["Doctor Formulated", "15+ Micronutrients", "Free Shipping Pakistan", "Cash on Delivery"],
    packagingNotice: "Authentic New Packaging with Enhanced Tamper-Proof Seal",
    whatsappMessage: "Hi, I would like to order Nutri-Cept New Packaging (Rs. 1,600). Please provide more details.",
  },
  {
    id: "oxidop",
    slug: "oxidop-focus-dopamine-support",
    name: "OxiDop®",
    title: "OxiDop Focus & Dopamine Support",
    badge: "NEW PACKAGING • ADVANCED NOOTROPIC",
    category: "Cognitive Focus & Dopamine Support",
    tagline: "Laser Focus, Calm Mental Clarity & Natural Dopamine Drive",
    sub: "L-Tyrosine, L-Theanine, GABA, Rhodiola Rosea & Magnesium Glycinate",
    desc: "Pakistan's premier focus & dopamine booster. Engineered for students and professionals to eliminate brain fog, sustain motivation, and reduce stress without caffeine jitters.",
    img: "/products/oxidop-new-packaging.jpeg",
    price: "Rs.4,500",
    wasPrice: "Rs.6,000",
    discount: "25% OFF",
    href: "/product/oxidop-focus-dopamine-support",
    cta: "Shop OxiDop",
    theme: {
      accentColor: "oklch(0.72 0.14 210)",
      badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
      badgeText: "text-cyan-400",
      glowColor: "rgba(6, 182, 212, 0.25)",
      gradientBorder: "from-cyan-500/40 via-blue-500/30 to-indigo-500/40",
      bgGradient: "from-cyan-950/40 via-blue-950/30 to-background",
      chipBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    },
    keyActives: [
      { name: "L-Tyrosine", amount: "Dopamine Precursor", note: "Fuels drive, motivation & mental alertness" },
      { name: "L-Theanine + GABA", amount: "Alpha Brainwaves", note: "Promotes calm focus with zero drowsiness" },
      { name: "Rhodiola Rosea", amount: "Pure Adaptogen", note: "Protects against cognitive fatigue & burnout" },
      { name: "Magnesium Glycinate + Zinc", amount: "Neuro Synergy", note: "Restores nervous system and memory health" },
    ],
    benefits: [
      { title: "Deep Flow State", desc: "Sustained concentration for work, study and high focus", icon: "brain" },
      { title: "Natural Dopamine", desc: "Fuels willpower, task completion & mood motivation", icon: "sparkle" },
      { title: "Zero Jitters / No Crash", desc: "Clean non-stimulant calm without palpitations", icon: "calm" },
      { title: "Stress Resilience", desc: "Reduces burnout, anxiety and afternoon brain fatigue", icon: "shield" },
    ],
    highlights: ["Clean Nootropic Matrix", "Zero Caffeine Crash", "Free Shipping Pakistan", "Cash on Delivery"],
    packagingNotice: "Authentic New Packaging with Verified Holographic Seal",
    whatsappMessage: "Hi, I would like to order OxiDop New Packaging (Rs. 4,500). Please provide more details.",
  },
];

export const promoBanners: (Banner & {
  tag?: string;
  price?: string;
  wasPrice?: string;
  discount?: string;
  badgeBg?: string;
})[] = [
  {
    id: "nutri-cept",
    title: "Nutri-Cept® — New 2026 Packaging",
    sub: "Dual Inositol (50mg), Chaste Berry & 15+ Female Micronutrients for PCOS, Hormonal Balance & Ovulation.",
    img: "/products/nutricept-new-packaging.jpeg",
    href: "/product/nutri-cept",
    cta: "Shop Nutri-Cept",
    tag: "🌸 WOMEN'S HORMONAL BALANCE",
    price: "Rs.1,600",
    wasPrice: "Rs.2,000",
    discount: "20% OFF",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
  {
    id: "oxidop",
    title: "OxiDop® — Laser Focus & Motivation",
    sub: "Clean Nootropic Matrix with L-Tyrosine, Rhodiola Rosea & GABA for All-Day Productivity without Jitters.",
    img: "/products/oxidop-new-packaging.jpeg",
    href: "/product/oxidop",
    cta: "Shop OxiDop",
    tag: "⚡ BRAIN & DOPAMINE NOOTROPIC",
    price: "Rs.4,500",
    wasPrice: "Rs.6,000",
    discount: "25% OFF",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
];

export const quickLinks = [
  { label: "Women's Health", img: "/products/nutricept-new-packaging.jpeg", to: "/product/nutri-cept" },
  { label: "Brain & Focus", img: "/products/oxidop-new-packaging.jpeg", to: "/product/oxidop" },
  { label: "PCOS Care", img: "/products/nutricept-new-packaging.jpeg", to: "/product/nutri-cept" },
  { label: "Dopamine Boost", img: "/products/oxidop-new-packaging.jpeg", to: "/product/oxidop" },
  { label: "New Launch", img: "/products/oxidop-new-packaging.jpeg", to: "/shop" },
  { label: "All Products", img: "/products/nutricept-new-packaging.jpeg", to: "/shop" },
];

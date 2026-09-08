// Canonical default content for the website.
// This mirrors the values previously hardcoded in the website's site-data.ts and
// route files, so the admin dashboard can manage every presentational section.
// Commerce data (products, orders, stock, customers) remains in ERPNext untouched.

export const CDN = "https://www.oxigen.pk/cdn/shop/files";

export type SectionMeta = { eyebrow?: string; title?: string; sub?: string };

export type BrandContent = {
  name: string;
  tagline: string;
  promo: string;
  email: string;
  phone: string;
  phoneHref: string;
  location: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  shopAll: string;
};

export type NavItem = { label: string; to: string };
export type CategoryItem = { title: string; desc: string; img: string; href: string };
export type PerkItem = { title: string; desc: string };
export type TestimonialItem = { name: string; date: string; title: string; text: string };
export type FaqItem = { q: string; a: string };
export type QuickLinkItem = { label: string; img: string; to: string };

export type ProductItem = {
  name: string;
  subtitle: string;
  desc: string;
  price: string;
  was: string;
  tag: string;
  img: string;
  gallery: string[];
  highlights: string[];
  ingredients: string;
  href: string;
};

export type BannerProduct = { productName: string; sortOrder: number };
export type ApiBanner = {
  id: string;
  title: string;
  image: string;
  isActive: boolean;
  position: number;
  products: BannerProduct[];
};

export type HeroBannerItem = {
  id: string;
  slug: string;
  name: string;
  title: string;
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

export type PromoBannerItem = {
  id: string;
  title: string;
  sub: string;
  img: string;
  href: string;
  cta: string;
  tag?: string;
  price?: string;
  wasPrice?: string;
  discount?: string;
  badgeBg?: string;
};

export type LegalSection = { heading: string; body: string[] };
export type LegalPageContent = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export type AboutPageContent = {
  eyebrow: string;
  title: string;
  sub: string;
  mission: {
    eyebrow: string;
    title: string;
    lead: string;
    body: string;
    image: string;
    imageAlt: string;
    ctaLabel: string;
    ctaTo: string;
  };
  whyHeading: SectionMeta;
};

export type ReviewsPageContent = {
  eyebrow: string;
  title: string;
  sub: string;
  results: SectionMeta;
  // before/after images
  resultsImages: { img: string; fallback: string; label: string }[];
};

export type PagesContent = {
  about: AboutPageContent;
  reviews: ReviewsPageContent;
  legal: {
    terms: LegalPageContent;
    privacy: LegalPageContent;
    shipping: LegalPageContent;
    refund: LegalPageContent;
  };
};

export type ContentDocument = {
  version: number;
  updatedAt: string;
  brand: BrandContent;
  announcements: string[];
  nav: NavItem[];
  categories: CategoryItem[];
  products: ProductItem[];
  perks: PerkItem[];
  testimonials: TestimonialItem[];
  faqs: FaqItem[];
  heroBanners: HeroBannerItem[];
  promoBanners: PromoBannerItem[];
  quickLinks: QuickLinkItem[];
  banners: ApiBanner[];
  pages: PagesContent;
};

export function defaultContent(): ContentDocument {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    brand: {
      name: "OxiGen",
      tagline: "Pakistan's No.1 Vitamin Brand",
      promo: "30% OFF + FREE SHIPPING — TODAY ONLY",
      email: "info@oxigen.pk",
      phone: "+92 330 7069091",
      phoneHref: "tel:+923307069091",
      location: "Pakistan",
      whatsapp:
        "https://wa.me/+923307069091?text=Hi%2C%20I%27m%20interested%20in%20this%20product.",
      facebook: "https://www.facebook.com/profile.php?id=61555862056972",
      instagram: "https://www.instagram.com/oxigen.pk/",
      shopAll: "/shop",
    },
    announcements: [
      "30% OFF + FREE SHIPPING — TODAY ONLY",
      "🚚 Free nationwide delivery across Pakistan",
      "✅ 100% authentic & sealed products",
      "🔄 Easy 7-day returns — shop worry-free",
      "🌿 Pakistan's No.1 Vitamin & Wellness Brand",
    ],
    nav: [
      { label: "Home", to: "/" },
      { label: "Shop", to: "/shop" },
      { label: "Categories", to: "/categories" },
      { label: "About", to: "/about" },
      { label: "Reviews", to: "/reviews" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/contact" },
    ],
    categories: [
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
    ],
    products: [
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
    ],
    perks: [
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
    ],
    testimonials: [
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
    ],
    faqs: [
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
    ],
    heroBanners: [
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
        whatsappMessage:
          "Hi, I would like to order Nutri-Cept New Packaging (Rs. 1,600). Please provide more details.",
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
        whatsappMessage:
          "Hi, I would like to order OxiDop New Packaging (Rs. 4,500). Please provide more details.",
      },
    ],
    promoBanners: [
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
    ],
    quickLinks: [
      { label: "Women's Health", img: "/products/nutricept-new-packaging.jpeg", to: "/product/nutri-cept" },
      { label: "Brain & Focus", img: "/products/oxidop-new-packaging.jpeg", to: "/product/oxidop" },
      { label: "PCOS Care", img: "/products/nutricept-new-packaging.jpeg", to: "/product/nutri-cept" },
      { label: "Dopamine Boost", img: "/products/oxidop-new-packaging.jpeg", to: "/product/oxidop" },
      { label: "New Launch", img: "/products/oxidop-new-packaging.jpeg", to: "/shop" },
      { label: "All Products", img: "/products/nutricept-new-packaging.jpeg", to: "/shop" },
    ],
    banners: [],
    pages: {
      about: {
        eyebrow: "Our Mission — Wellness for Life",
        title: "About OxiGen",
        sub: "Exploring the goodness of nature with innovation.",
        mission: {
          eyebrow: "Our Mission — Wellness for Life",
          title: "Exploring the goodness of nature with innovation",
          lead: "At OxiGen we aim to explore the goodness of nature with innovation. We are dedicated to playing our role in building a happy & healthy community.",
          body: "Quality and transparency are at the heart of everything we do. We carefully select ingredients and formulate products with a focus on safety, quality, and everyday wellness support — helping you make informed choices about your health through trusted nutritional solutions.",
          image: "/banners/banner-nutricept.jpg",
          imageAlt: "OxiGen Premium Nutritional Supplements Pakistan",
          ctaLabel: "Learn More",
          ctaTo: "/about",
        },
        whyHeading: {
          eyebrow: "Why Choose Us",
          title: "A wellness experience you can trust",
        },
      },
      reviews: {
        eyebrow: "Let customers speak for us",
        title: "Loved across Pakistan",
        sub: "See the difference consistent, quality nutrition can make.",
        results: {
          eyebrow: "Real Results",
          title: "Visible transformation",
          sub: "See the difference consistent, quality nutrition can make.",
        },
        resultsImages: [
          { img: "/before_2.webp", fallback: `${CDN}/before_2.webp?v=1780588913&width=1200`, label: "Before" },
          { img: "/after_oxigen.png", fallback: `${CDN}/after_oxigen.png?v=1780590184&width=1200`, label: "After" },
        ],
      },
      legal: {
        terms: {
          eyebrow: "Legal",
          title: "Terms & Conditions",
          updated: "July 2026",
          intro: "Please read these terms carefully before using our website or placing an order.",
          sections: [
            {
              heading: "Use of our website",
              body: [
                "By accessing this website and placing an order you agree to these terms. You confirm that the information you provide is accurate and that you are able to receive deliveries at the address given.",
              ],
            },
            {
              heading: "Products & pricing",
              body: [
                "We aim to describe our products accurately, including ingredients and usage. Prices are listed in Pakistani Rupees (PKR) and may change from time to time. Promotional offers apply while stocks last.",
                "Our supplements are intended to support general wellbeing and are not a substitute for medical advice. Consult a healthcare professional before use if you are pregnant, nursing, or taking medication.",
              ],
            },
            {
              heading: "Orders",
              body: [
                "Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order and to limit quantities. You will receive confirmation once your order is accepted.",
              ],
            },
            {
              heading: "Limitation of liability",
              body: [
                "To the extent permitted by law, OxiGen is not liable for any indirect or consequential loss arising from the use of our products or website.",
              ],
            },
            {
              heading: "Contact",
              body: [
                "Questions about these terms can be directed to our team via WhatsApp or the Contact page.",
              ],
            },
          ],
        },
        privacy: {
          eyebrow: "Legal",
          title: "Privacy Policy",
          updated: "July 2026",
          intro: "Your privacy matters to us. This policy explains what we collect and how we use it.",
          sections: [
            {
              heading: "Information we collect",
              body: [
                "When you place an order or contact us, we collect the details you provide — such as your name, phone number, delivery address and email address. This information is used only to process and deliver your order.",
                "We do not store card details. Payments are handled through cash on delivery or secure third-party payment providers.",
              ],
            },
            {
              heading: "How we use your information",
              body: [
                "We use your information to confirm orders, arrange delivery, provide customer support and, where you have opted in, send occasional offers and wellness tips.",
                "You can unsubscribe from marketing messages at any time.",
              ],
            },
            {
              heading: "Sharing your information",
              body: [
                "We share your delivery details only with our courier partners so your order can reach you. We never sell your personal data to third parties.",
              ],
            },
            {
              heading: "Data security",
              body: [
                "We apply reasonable safeguards to protect your information. While no online service can guarantee absolute security, we work to keep your data safe and limit access to it.",
              ],
            },
            {
              heading: "Your rights",
              body: [
                "You may request access to, correction of, or deletion of the personal information we hold about you by contacting us on WhatsApp or through our Contact page.",
              ],
            },
          ],
        },
        shipping: {
          eyebrow: "Legal",
          title: "Shipping Policy",
          updated: "July 2026",
          intro: "Fast, reliable delivery across Pakistan — with cash on delivery available.",
          sections: [
            {
              heading: "Delivery coverage",
              body: [
                "We deliver nationwide across Pakistan through trusted courier partners, including major cities and most towns.",
              ],
            },
            {
              heading: "Shipping charges",
              body: [
                "Enjoy free shipping on your order during our current promotion. Any applicable charges will always be shown clearly at checkout before you confirm.",
              ],
            },
            {
              heading: "Delivery times",
              body: [
                "Orders are typically dispatched within 1–2 business days. Delivery usually takes 2–5 business days depending on your location. You will receive tracking details once your order ships.",
              ],
            },
            {
              heading: "Cash on delivery",
              body: [
                "Prefer to pay when your order arrives? Cash on delivery is available across Pakistan. Please keep the exact amount ready for the courier.",
              ],
            },
          ],
        },
        refund: {
          eyebrow: "Legal",
          title: "Refund & Return Policy",
          updated: "July 2026",
          intro: "We want you to shop with confidence. Here's how returns and refunds work.",
          sections: [
            {
              heading: "7-day returns",
              body: [
                "If you are not satisfied, you may request a return within 7 days of receiving your order. Items must be unused, in their original sealed packaging and in resalable condition.",
                "For hygiene and safety reasons, opened or used supplement bottles cannot be returned unless the product is damaged or defective.",
              ],
            },
            {
              heading: "Damaged or wrong items",
              body: [
                "If you receive a damaged, defective or incorrect item, contact us within 48 hours of delivery with photos. We will arrange a replacement or full refund at no extra cost.",
              ],
            },
            {
              heading: "How to request a return",
              body: [
                "Message us on WhatsApp or use the Contact page with your order details and reason for return. Our team will guide you through the pickup or drop-off process.",
              ],
            },
            {
              heading: "Refunds",
              body: [
                "Approved refunds are processed within 5–7 business days after we receive the returned item. Refunds are issued via the original payment method or bank transfer for cash-on-delivery orders.",
              ],
            },
          ],
        },
      },
    },
  };
}

export const CONTENT_SECTIONS = [
  "brand",
  "announcements",
  "nav",
  "categories",
  "products",
  "perks",
  "testimonials",
  "faqs",
  "heroBanners",
  "promoBanners",
  "quickLinks",
  "banners",
  "pages",
] as const;

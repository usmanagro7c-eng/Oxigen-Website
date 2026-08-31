const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const nutriceptB64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/nutricept-transparent.png')).toString('base64');
const oxidopB64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/oxidop-transparent.png')).toString('base64');

// 1. DUAL FLAGSHIP BANNER (Nutri-Cept + OxiDop)
const htmlDual = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&family=Outfit:wght@400;600;700;800;900&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }

  body {
    width: 1920px;
    height: 840px;
    overflow: hidden;
    background: #050811;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #ffffff;
    position: relative;
  }

  /* Ambient Studio Glows */
  .bg-glow-left {
    position: absolute;
    top: -120px;
    left: -120px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(244, 63, 94, 0.32) 0%, rgba(217, 70, 239, 0.12) 45%, transparent 70%);
    filter: blur(90px);
    pointer-events: none;
    z-index: 1;
  }

  .bg-glow-right {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.32) 0%, rgba(59, 130, 246, 0.15) 45%, transparent 70%);
    filter: blur(90px);
    pointer-events: none;
    z-index: 1;
  }

  .bg-glow-center {
    position: absolute;
    bottom: -150px;
    left: 50%;
    transform: translateX(-50%);
    width: 1100px;
    height: 480px;
    background: radial-gradient(ellipse, rgba(99, 102, 241, 0.22) 0%, transparent 70%);
    filter: blur(85px);
    pointer-events: none;
    z-index: 1;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: 2;
  }

  .main-container {
    position: relative;
    z-index: 10;
    width: 1920px;
    height: 840px;
    padding: 28px 46px 20px 46px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Header Section */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #f1f5f9;
  }

  .brand-badge .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 10px #10b981;
  }

  .header-titles {
    text-align: center;
    flex-grow: 1;
  }

  .header-titles h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 35px;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1.1;
    color: #ffffff;
  }

  .header-titles h1 span.highlight-rose {
    background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-titles h1 span.highlight-cyan {
    background: linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-titles p {
    margin-top: 4px;
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.4px;
  }

  .header-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    background: linear-gradient(135deg, rgba(244,63,94,0.22), rgba(6,182,212,0.22));
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  }

  /* Dual Showcase Section */
  .showcase-grid {
    display: grid;
    grid-template-columns: 1fr 36px 1fr;
    align-items: center;
    gap: 16px;
    height: 600px;
  }

  /* Product Card Styling */
  .product-card {
    position: relative;
    height: 590px;
    border-radius: 28px;
    backdrop-filter: blur(28px);
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7);
    padding: 24px 28px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 16px;
    align-items: center;
    overflow: hidden;
  }

  .product-card.card-nutricept {
    border: 1px solid rgba(244, 63, 94, 0.35);
    background: linear-gradient(145deg, rgba(32, 12, 26, 0.94) 0%, rgba(15, 23, 42, 0.90) 100%);
  }

  .product-card.card-nutricept::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f43f5e, #ec4899, #d946ef);
  }

  .product-card.card-oxidop {
    border: 1px solid rgba(6, 182, 212, 0.35);
    background: linear-gradient(145deg, rgba(6, 22, 38, 0.94) 0%, rgba(15, 23, 42, 0.90) 100%);
  }

  .product-card.card-oxidop::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #06b6d4, #3b82f6, #6366f1);
  }

  /* Card Info Left Side */
  .card-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    z-index: 5;
  }

  .pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    width: fit-content;
  }

  .pill-tag.rose {
    background: rgba(244, 63, 94, 0.22);
    border: 1px solid rgba(244, 63, 94, 0.5);
    color: #fecdd3;
  }

  .pill-tag.cyan {
    background: rgba(6, 182, 212, 0.22);
    border: 1px solid rgba(6, 182, 212, 0.5);
    color: #bae6fd;
  }

  .product-title-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .product-title {
    font-family: 'Outfit', sans-serif;
    font-size: 35px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .product-badge-mini {
    font-size: 11px;
    font-weight: 800;
    padding: 3px 9px;
    border-radius: 6px;
  }

  .product-badge-mini.rose {
    background: rgba(244, 63, 94, 0.25);
    color: #fda4af;
    border: 1px solid rgba(244, 63, 94, 0.45);
  }

  .product-badge-mini.cyan {
    background: rgba(6, 182, 212, 0.25);
    color: #67e8f9;
    border: 1px solid rgba(6, 182, 212, 0.45);
  }

  .product-subtitle {
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.3;
  }

  .product-subtitle.rose {
    color: #f472b6;
  }

  .product-subtitle.cyan {
    color: #38bdf8;
  }

  /* Benefits List */
  .benefits-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 2px 0;
  }

  .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 12.5px;
    font-weight: 500;
    color: #cbd5e1;
    line-height: 1.35;
  }

  .benefit-item .check-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 900;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .benefit-item.rose .check-icon {
    background: #f43f5e;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(244, 63, 94, 0.7);
  }

  .benefit-item.cyan .check-icon {
    background: #06b6d4;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.7);
  }

  .benefit-item strong {
    color: #ffffff;
    font-weight: 700;
  }

  /* Formula Chip */
  .formula-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 11.5px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
  }

  /* Pricing Row */
  .price-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }

  .price-main {
    font-family: 'Outfit', sans-serif;
    font-size: 29px;
    font-weight: 900;
    color: #ffffff;
  }

  .price-was {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    text-decoration: line-through;
  }

  .discount-badge {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 800;
  }

  .discount-badge.rose {
    background: rgba(244, 63, 94, 0.28);
    border: 1px solid rgba(244, 63, 94, 0.55);
    color: #fda4af;
  }

  .discount-badge.cyan {
    background: rgba(6, 182, 212, 0.28);
    border: 1px solid rgba(6, 182, 212, 0.55);
    color: #67e8f9;
  }

  .pack-size {
    margin-left: auto;
    font-size: 11.5px;
    font-weight: 700;
    color: #cbd5e1;
    background: rgba(255,255,255,0.08);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.12);
  }

  /* Product Image Visual Stage */
  .card-visual {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pedestal-glow {
    position: absolute;
    bottom: 25px;
    width: 240px;
    height: 50px;
    border-radius: 50%;
    filter: blur(18px);
    z-index: 1;
  }

  .pedestal-glow.rose {
    background: rgba(244, 63, 94, 0.8);
    box-shadow: 0 0 60px #f43f5e;
  }

  .pedestal-glow.cyan {
    background: rgba(6, 182, 212, 0.8);
    box-shadow: 0 0 60px #06b6d4;
  }

  .pedestal-disc {
    position: absolute;
    bottom: 35px;
    width: 250px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%);
    backdrop-filter: blur(14px);
    box-shadow: 0 16px 32px rgba(0,0,0,0.6);
    z-index: 2;
  }

  .product-bottle-img {
    position: relative;
    z-index: 4;
    max-height: 480px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 25px 35px rgba(0, 0, 0, 0.85));
    transform: translateY(-8px);
  }

  .floating-badge {
    position: absolute;
    top: 8px;
    right: 0px;
    z-index: 6;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 800;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.25);
    box-shadow: 0 8px 18px rgba(0,0,0,0.4);
    letter-spacing: 0.5px;
  }

  .floating-badge.rose {
    background: rgba(244, 63, 94, 0.35);
    color: #fff;
  }

  .floating-badge.cyan {
    background: rgba(6, 182, 212, 0.35);
    color: #fff;
  }

  /* Center Crest */
  .center-divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 14px;
    position: relative;
  }

  .divider-line {
    width: 1px;
    flex-grow: 1;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.25), transparent);
  }

  .crest-badge {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #090f20;
    border: 2px solid rgba(255,255,255,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
    font-size: 16px;
    font-weight: 900;
    color: #ffffff;
    box-shadow: 0 0 24px rgba(255,255,255,0.3);
    z-index: 10;
  }

  /* Footer Trust Strip */
  .footer-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 26px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
    font-weight: 700;
    color: #e2e8f0;
  }

  .trust-item .icon-circle {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .trust-item span.highlight {
    color: #10b981;
  }
</style>
</head>
<body>

  <!-- Ambient Glow Elements -->
  <div class="bg-glow-left"></div>
  <div class="bg-glow-right"></div>
  <div class="bg-glow-center"></div>
  <div class="bg-grid"></div>

  <div class="main-container">
    
    <!-- Header -->
    <div class="header">
      <div class="brand-badge">
        <span class="dot"></span>
        OxiGen® Pakistan
      </div>
      <div class="header-titles">
        <h1>
          Complete <span class="highlight-rose">Women's Wellness</span> & <span class="highlight-cyan">Peak Dopamine Focus</span>
        </h1>
        <p>Doctor-Formulated • Authentic 2026 Upgraded Packaging • 100% Sealed & Genuine</p>
      </div>
      <div class="header-right">
        ⚡ 30% OFF + FREE SHIPPING TODAY
      </div>
    </div>

    <!-- Dual Showcase Main Grid -->
    <div class="showcase-grid">

      <!-- LEFT: NUTRI-CEPT CARD -->
      <div class="product-card card-nutricept">
        <div class="card-info">
          <span class="pill-tag rose">🌸 Women's Wellness & PCOS Formula</span>
          <div class="product-title-row">
            <h2 class="product-title">Nutri-Cept®</h2>
            <span class="product-badge-mini rose">4.9 ★ Top Rated</span>
          </div>
          <div class="product-subtitle rose">Hormonal Balance, Ovulation & Reproductive Health</div>

          <div class="benefits-list">
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>50mg Dual Inositol (Myo + D-Chiro):</strong> Ovarian function & regular cycles</span>
            </div>
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>Vitex (Chaste Berry) & CoQ10:</strong> Estrogen harmony & cellular vitality</span>
            </div>
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>15+ Essential Nutrients:</strong> Iron, Zinc & Folic Acid for skin glow & energy</span>
            </div>
          </div>

          <div class="formula-chip">
            🌿 Clinical Dosage • Zero Hormonal Disruptors • 30 Tablets
          </div>

          <div class="price-row">
            <div class="price-main">Rs. 1,600</div>
            <div class="price-was">Rs. 2,000</div>
            <div class="discount-badge rose">20% OFF</div>
            <div class="pack-size">Sealed Bottle</div>
          </div>
        </div>

        <div class="card-visual">
          <div class="floating-badge rose">✨ Tamper-Proof Seal</div>
          <div class="pedestal-glow rose"></div>
          <div class="pedestal-disc"></div>
          <img src="${nutriceptB64}" class="product-bottle-img" alt="Nutri-Cept Women's Wellness" />
        </div>
      </div>

      <!-- CENTER DIVIDER -->
      <div class="center-divider">
        <div class="divider-line"></div>
        <div class="crest-badge">+</div>
        <div class="divider-line"></div>
      </div>

      <!-- RIGHT: OXIDOP CARD -->
      <div class="product-card card-oxidop">
        <div class="card-info">
          <span class="pill-tag cyan">⚡ Advanced Nootropic Matrix</span>
          <div class="product-title-row">
            <h2 class="product-title">OxiDop®</h2>
            <span class="product-badge-mini cyan">4.9 ★ Focus Boost</span>
          </div>
          <div class="product-subtitle cyan">Laser Focus, Dopamine Drive & Calm Mental Clarity</div>

          <div class="benefits-list">
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>L-Tyrosine & Rhodiola Rosea:</strong> Dopamine precursor for deep motivation</span>
            </div>
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>L-Theanine + GABA Synergy:</strong> Alpha-wave calm focus with zero drowsiness</span>
            </div>
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>Magnesium Glycinate + Zinc:</strong> Neuro resilience with NO caffeine crash</span>
            </div>
          </div>

          <div class="formula-chip">
            ⚡ Clean Cognitive Fuel • Non-Stimulant • 30 Tablets
          </div>

          <div class="price-row">
            <div class="price-main">Rs. 4,500</div>
            <div class="price-was">Rs. 6,000</div>
            <div class="discount-badge cyan">25% OFF</div>
            <div class="pack-size">Sealed Bottle</div>
          </div>
        </div>

        <div class="card-visual">
          <div class="floating-badge cyan">🛡️ Hologram Authenticated</div>
          <div class="pedestal-glow cyan"></div>
          <div class="pedestal-disc"></div>
          <img src="${oxidopB64}" class="product-bottle-img" alt="OxiDop Focus and Dopamine" />
        </div>
      </div>

    </div>

    <!-- Footer Trust Strip -->
    <div class="footer-strip">
      <div class="trust-item">
        <div class="icon-circle">🚚</div>
        <div><span class="highlight">Free Nationwide Delivery</span> Across Pakistan (2-4 Days)</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">🛡️</div>
        <div><span class="highlight">100% Original</span> Sealed & Authenticated Packaging</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">⭐</div>
        <div><span class="highlight">4.9 / 5 Rating</span> 10,000+ Satisfied Customers</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">🔄</div>
        <div><span class="highlight">7-Day Return</span> Worry-Free Money Back Guarantee</div>
      </div>
    </div>

  </div>

</body>
</html>
`;

// 2. SINGLE NUTRI-CEPT HERO BANNER
const htmlNutricept = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&family=Outfit:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  body {
    width: 1920px;
    height: 840px;
    overflow: hidden;
    background: #11050e;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #ffffff;
    position: relative;
  }
  .bg-glow-1 {
    position: absolute;
    top: -150px;
    right: 150px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(244, 63, 94, 0.4) 0%, rgba(217, 70, 239, 0.15) 50%, transparent 70%);
    filter: blur(90px);
  }
  .bg-glow-2 {
    position: absolute;
    bottom: -150px;
    left: 100px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, transparent 60%);
    filter: blur(80px);
  }
  .main-container {
    position: relative;
    z-index: 10;
    width: 1920px;
    height: 840px;
    padding: 50px 90px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 50px;
    align-items: center;
  }
  .left-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .badge-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .pill-badge {
    padding: 6px 18px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: rgba(244, 63, 94, 0.2);
    border: 1px solid rgba(244, 63, 94, 0.45);
    color: #fecdd3;
  }
  .title {
    font-family: 'Outfit', sans-serif;
    font-size: 58px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1px;
    color: #ffffff;
  }
  .title span {
    background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    font-size: 20px;
    font-weight: 700;
    color: #f472b6;
    margin-top: -4px;
  }
  .desc {
    font-size: 15.5px;
    line-height: 1.5;
    color: #cbd5e1;
    max-width: 800px;
  }
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 8px 0;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    color: #e2e8f0;
  }
  .check-item .c-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f43f5e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    box-shadow: 0 0 12px rgba(244, 63, 94, 0.7);
  }
  .check-item strong { color: #fff; }
  .price-strip {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 10px;
    padding: 16px 28px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    width: fit-content;
  }
  .p-main { font-family: 'Outfit', sans-serif; font-size: 38px; font-weight: 900; color: #fff; }
  .p-was { font-size: 18px; color: #64748b; text-decoration: line-through; }
  .p-disc { background: rgba(244,63,94,0.3); border: 1px solid rgba(244,63,94,0.6); color: #fda4af; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 8px; }
  .p-info { font-size: 13px; color: #94a3b8; font-weight: 600; }
  
  .right-visual {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .p-glow {
    position: absolute;
    bottom: 50px;
    width: 380px;
    height: 70px;
    border-radius: 50%;
    background: rgba(244, 63, 94, 0.85);
    filter: blur(30px);
  }
  .p-disc-3d {
    position: absolute;
    bottom: 70px;
    width: 420px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
    backdrop-filter: blur(14px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  }
  .bottle-img {
    position: relative;
    z-index: 5;
    max-height: 600px;
    filter: drop-shadow(0 30px 40px rgba(0, 0, 0, 0.9));
    transform: translateY(-20px);
  }
  .floating-seal {
    position: absolute;
    top: 40px;
    right: 40px;
    z-index: 6;
    padding: 10px 20px;
    border-radius: 14px;
    background: rgba(244, 63, 94, 0.35);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.3);
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="main-container">
    <div class="left-content">
      <div class="badge-row">
        <span class="pill-badge">🌸 Authentic New 2026 Packaging</span>
        <span class="pill-badge">★ 4.9/5 • 10,000+ Happy Women</span>
      </div>
      <h1 class="title">Nutri-Cept® <span>Women's Wellness</span></h1>
      <div class="subtitle">Complete Hormonal Balance & PCOS Support Formula</div>
      <p class="desc">Clinical-grade dual Inositol blend formulated to help restore predictable ovulation rhythms, clear hormonal breakouts, and boost daily female energy without synthetic hormones.</p>
      <div class="checklist">
        <div class="check-item"><span class="c-icon">✓</span><span><strong>Clinical Dual Inositol (Myo + D-Chiro):</strong> Promotes natural ovarian health & regular cycles</span></div>
        <div class="check-item"><span class="c-icon">✓</span><span><strong>Vitex (Chaste Berry) & CoQ10:</strong> Supports estrogen-progesterone balance & anti-fatigue</span></div>
        <div class="check-item"><span class="c-icon">✓</span><span><strong>15+ Essential Nutrients:</strong> Iron, Zinc, Folic Acid & Vitamins for hair, skin & vitality</span></div>
      </div>
      <div class="price-strip">
        <div class="p-main">Rs. 1,600</div>
        <div class="p-was">Rs. 2,000</div>
        <div class="p-disc">20% OFF</div>
        <div class="p-info">🚚 Free Nationwide Delivery • 100% Sealed & Genuine</div>
      </div>
    </div>
    <div class="right-visual">
      <div class="floating-seal">✨ Tamper-Proof 30 Tablets</div>
      <div class="p-glow"></div>
      <div class="p-disc-3d"></div>
      <img src="${nutriceptB64}" class="bottle-img" alt="Nutri-Cept Women's Wellness" />
    </div>
  </div>
</body>
</html>
`;

// 3. SINGLE OXIDOP HERO BANNER
const htmlOxidop = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&family=Outfit:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  body {
    width: 1920px;
    height: 840px;
    overflow: hidden;
    background: #040d18;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #ffffff;
    position: relative;
  }
  .bg-glow-1 {
    position: absolute;
    top: -150px;
    right: 150px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%);
    filter: blur(90px);
  }
  .bg-glow-2 {
    position: absolute;
    bottom: -150px;
    left: 100px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 60%);
    filter: blur(80px);
  }
  .main-container {
    position: relative;
    z-index: 10;
    width: 1920px;
    height: 840px;
    padding: 50px 90px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 50px;
    align-items: center;
  }
  .left-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .badge-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .pill-badge {
    padding: 6px 18px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.45);
    color: #bae6fd;
  }
  .title {
    font-family: 'Outfit', sans-serif;
    font-size: 58px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1px;
    color: #ffffff;
  }
  .title span {
    background: linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    font-size: 20px;
    font-weight: 700;
    color: #38bdf8;
    margin-top: -4px;
  }
  .desc {
    font-size: 15.5px;
    line-height: 1.5;
    color: #cbd5e1;
    max-width: 800px;
  }
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 8px 0;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    color: #e2e8f0;
  }
  .check-item .c-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #06b6d4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.7);
  }
  .check-item strong { color: #fff; }
  .price-strip {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 10px;
    padding: 16px 28px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    width: fit-content;
  }
  .p-main { font-family: 'Outfit', sans-serif; font-size: 38px; font-weight: 900; color: #fff; }
  .p-was { font-size: 18px; color: #64748b; text-decoration: line-through; }
  .p-disc { background: rgba(6,182,212,0.3); border: 1px solid rgba(6,182,212,0.6); color: #67e8f9; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 8px; }
  .p-info { font-size: 13px; color: #94a3b8; font-weight: 600; }
  
  .right-visual {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .p-glow {
    position: absolute;
    bottom: 50px;
    width: 380px;
    height: 70px;
    border-radius: 50%;
    background: rgba(6, 182, 212, 0.85);
    filter: blur(30px);
  }
  .p-disc-3d {
    position: absolute;
    bottom: 70px;
    width: 420px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
    backdrop-filter: blur(14px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  }
  .bottle-img {
    position: relative;
    z-index: 5;
    max-height: 600px;
    filter: drop-shadow(0 30px 40px rgba(0, 0, 0, 0.9));
    transform: translateY(-20px);
  }
  .floating-seal {
    position: absolute;
    top: 40px;
    right: 40px;
    z-index: 6;
    padding: 10px 20px;
    border-radius: 14px;
    background: rgba(6, 182, 212, 0.35);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.3);
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="main-container">
    <div class="left-content">
      <div class="badge-row">
        <span class="pill-badge">⚡ Advanced Nootropic Matrix</span>
        <span class="pill-badge">★ 4.9/5 • Laser Focus & Drive</span>
      </div>
      <h1 class="title">OxiDop® <span>Focus & Dopamine</span></h1>
      <div class="subtitle">Peak Cognitive Clarity, Willpower & Sustained Motivation</div>
      <p class="desc">Pakistan's premier calm-focus nootropic supplement designed to eliminate brain fog, fuel natural dopamine, and sustain intense productivity without caffeine jitters or afternoon crashes.</p>
      <div class="checklist">
        <div class="check-item"><span class="c-icon">✓</span><span><strong>L-Tyrosine & Rhodiola Rosea:</strong> Dopamine precursor for deep motivation & mental stamina</span></div>
        <div class="check-item"><span class="c-icon">✓</span><span><strong>L-Theanine + GABA Synergy:</strong> Deep alpha-wave focus with zero drowsiness or anxiety</span></div>
        <div class="check-item"><span class="c-icon">✓</span><span><strong>Magnesium Glycinate + Zinc:</strong> Restores neuro resilience with zero caffeine crash</span></div>
      </div>
      <div class="price-strip">
        <div class="p-main">Rs. 4,500</div>
        <div class="p-was">Rs. 6,000</div>
        <div class="p-disc">25% OFF</div>
        <div class="p-info">🚚 Free Nationwide Delivery • 100% Sealed & Genuine</div>
      </div>
    </div>
    <div class="right-visual">
      <div class="floating-seal">🛡️ Hologram Seal 30 Tablets</div>
      <div class="p-glow"></div>
      <div class="p-disc-3d"></div>
      <img src="${oxidopB64}" class="bottle-img" alt="OxiDop Focus and Dopamine" />
    </div>
  </div>
</body>
</html>
`;

(async () => {
  console.log('Rendering all 3 banners at 1920x840 with 2x supersampling...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 840 },
    deviceScaleFactor: 2,
  });

  // Render Dual Banner
  await page.setContent(htmlDual, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outDual = path.join(__dirname, 'public/banners/banner-oxigen-dual.jpg');
  await page.screenshot({ path: outDual, type: 'jpeg', quality: 96, clip: { x: 0, y: 0, width: 1920, height: 840 } });
  console.log('1. Generated banner-oxigen-dual.jpg');

  // Copy to banner-oxigen.jpg
  fs.copyFileSync(outDual, path.join(__dirname, 'public/banners/banner-oxigen.jpg'));
  console.log('2. Updated banner-oxigen.jpg');

  // Render NutriCept Banner
  await page.setContent(htmlNutricept, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outNutricept = path.join(__dirname, 'public/banners/banner-nutricept.jpg');
  await page.screenshot({ path: outNutricept, type: 'jpeg', quality: 96, clip: { x: 0, y: 0, width: 1920, height: 840 } });
  console.log('3. Generated banner-nutricept.jpg');

  // Render OxiDop Banner
  await page.setContent(htmlOxidop, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outOxidop = path.join(__dirname, 'public/banners/banner-oxidop.jpg');
  await page.screenshot({ path: outOxidop, type: 'jpeg', quality: 96, clip: { x: 0, y: 0, width: 1920, height: 840 } });
  console.log('4. Generated banner-oxidop.jpg');

  await browser.close();
  console.log('All banners generated successfully!');
})();

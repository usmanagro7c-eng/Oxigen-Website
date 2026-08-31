const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const nutriceptB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/nutricept-new-packaging.jpeg')).toString('base64');
const oxidopB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/oxidop-new-packaging.jpeg')).toString('base64');

const htmlContent = `
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
    background: #060b14;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #ffffff;
    position: relative;
  }

  /* Ambient Studio Glows */
  .bg-glow-left {
    position: absolute;
    top: -150px;
    left: -100px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(244, 63, 94, 0.28) 0%, rgba(217, 70, 239, 0.12) 40%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
    z-index: 1;
  }

  .bg-glow-right {
    position: absolute;
    top: -150px;
    right: -100px;
    width: 900px;
    height: 900px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(59, 130, 246, 0.14) 40%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
    z-index: 1;
  }

  .bg-glow-center {
    position: absolute;
    bottom: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 1200px;
    height: 500px;
    background: radial-gradient(ellipse, rgba(99, 102, 241, 0.18) 0%, transparent 70%);
    filter: blur(70px);
    pointer-events: none;
    z-index: 1;
  }

  /* Subtle background grid/mesh lines */
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    z-index: 2;
  }

  .main-container {
    position: relative;
    z-index: 10;
    width: 1920px;
    height: 840px;
    padding: 36px 60px 30px 60px;
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
    padding: 8px 22px;
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #e2e8f0;
  }

  .brand-badge .dot {
    width: 8px;
    height: 8px;
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
    font-size: 38px;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1.1;
    background: linear-gradient(135deg, #ffffff 30%, #e2e8f0 70%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-titles h1 span.highlight-rose {
    background: linear-gradient(135deg, #ff4071 0%, #ff80a0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-titles h1 span.highlight-cyan {
    background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-titles p {
    margin-top: 4px;
    font-size: 15px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }

  .header-right {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 20px;
    background: linear-gradient(135deg, rgba(244,63,94,0.15), rgba(6,182,212,0.15));
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
  }

  /* Dual Showcase Section */
  .showcase-grid {
    display: grid;
    grid-template-columns: 1fr 50px 1fr;
    align-items: center;
    gap: 20px;
    height: 570px;
  }

  /* Product Card Styling */
  .product-card {
    position: relative;
    height: 560px;
    border-radius: 28px;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    padding: 28px 32px;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 20px;
    align-items: center;
    overflow: hidden;
  }

  .product-card.card-nutricept {
    border: 1px solid rgba(244, 63, 94, 0.25);
    background: linear-gradient(135deg, rgba(30, 15, 25, 0.85) 0%, rgba(15, 23, 42, 0.75) 100%);
  }

  .product-card.card-nutricept::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #f43f5e, #d946ef, #fb7185);
  }

  .product-card.card-oxidop {
    border: 1px solid rgba(6, 182, 212, 0.25);
    background: linear-gradient(135deg, rgba(10, 25, 38, 0.85) 0%, rgba(15, 23, 42, 0.75) 100%);
  }

  .product-card.card-oxidop::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #06b6d4, #3b82f6, #6366f1);
  }

  /* Product Info Left Side */
  .card-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    z-index: 5;
  }

  .pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    width: fit-content;
  }

  .pill-tag.rose {
    background: rgba(244, 63, 94, 0.18);
    border: 1px solid rgba(244, 63, 94, 0.4);
    color: #fda4af;
  }

  .pill-tag.cyan {
    background: rgba(6, 182, 212, 0.18);
    border: 1px solid rgba(6, 182, 212, 0.4);
    color: #67e8f9;
  }

  .product-title {
    font-family: 'Outfit', sans-serif;
    font-size: 34px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.5px;
  }

  .product-title.rose {
    color: #ffffff;
  }

  .product-title.cyan {
    color: #ffffff;
  }

  .product-subtitle {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
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
    margin: 4px 0;
  }

  .benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
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
    box-shadow: 0 0 8px rgba(244, 63, 94, 0.5);
  }

  .benefit-item.cyan .check-icon {
    background: #06b6d4;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
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
    padding: 7px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
  }

  /* Pricing Row */
  .price-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 6px;
  }

  .price-main {
    font-family: 'Outfit', sans-serif;
    font-size: 30px;
    font-weight: 900;
    color: #ffffff;
  }

  .price-was {
    font-size: 15px;
    font-weight: 600;
    color: #64748b;
    text-decoration: line-through;
  }

  .discount-badge {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 800;
  }

  .discount-badge.rose {
    background: rgba(244, 63, 94, 0.25);
    border: 1px solid rgba(244, 63, 94, 0.5);
    color: #fda4af;
  }

  .discount-badge.cyan {
    background: rgba(6, 182, 212, 0.25);
    border: 1px solid rgba(6, 182, 212, 0.5);
    color: #67e8f9;
  }

  .pack-size {
    margin-left: auto;
    font-size: 12px;
    font-weight: 700;
    color: #94a3b8;
    background: rgba(255,255,255,0.06);
    padding: 4px 10px;
    border-radius: 6px;
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
    width: 220px;
    height: 40px;
    border-radius: 50%;
    filter: blur(14px);
    z-index: 1;
  }

  .pedestal-glow.rose {
    background: rgba(244, 63, 94, 0.65);
    box-shadow: 0 0 40px #f43f5e;
  }

  .pedestal-glow.cyan {
    background: rgba(6, 182, 212, 0.65);
    box-shadow: 0 0 40px #06b6d4;
  }

  .pedestal-disc {
    position: absolute;
    bottom: 35px;
    width: 240px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 2;
  }

  .product-bottle-img {
    position: relative;
    z-index: 3;
    max-height: 440px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.7));
    transform: translateY(-8px);
  }

  .floating-badge {
    position: absolute;
    top: 15px;
    right: 5px;
    z-index: 6;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 800;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
    letter-spacing: 0.5px;
  }

  .floating-badge.rose {
    background: rgba(244, 63, 94, 0.3);
    color: #fff;
  }

  .floating-badge.cyan {
    background: rgba(6, 182, 212, 0.3);
    color: #fff;
  }

  /* Center VS / & Crest */
  .center-divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    position: relative;
  }

  .divider-line {
    width: 1px;
    flex-grow: 1;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent);
  }

  .crest-badge {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #0f172a;
    border: 2px solid rgba(255,255,255,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    font-weight: 900;
    color: #ffffff;
    box-shadow: 0 0 20px rgba(255,255,255,0.2);
    z-index: 10;
  }

  /* Footer Trust Strip */
  .footer-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 28px;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #e2e8f0;
  }

  .trust-item .icon-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
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
        OxiGen® Official Flagship
      </div>
      <div class="header-titles">
        <h1>
          Complete <span class="highlight-rose">Women's Wellness</span> & <span class="highlight-cyan">Peak Dopamine Focus</span>
        </h1>
        <p>Doctor-Formulated • Authentic 2026 Upgraded Packaging • 100% Sealed & Genuine</p>
      </div>
      <div class="header-right">
        ⚡ TODAY ONLY • 30% OFF PROMO
      </div>
    </div>

    <!-- Dual Showcase Main Grid -->
    <div class="showcase-grid">

      <!-- LEFT: NUTRI-CEPT CARD -->
      <div class="product-card card-nutricept">
        <div class="card-info">
          <span class="pill-tag rose">🌸 Women's Wellness & PCOS Formula</span>
          <h2 class="product-title rose">Nutri-Cept®</h2>
          <div class="product-subtitle rose">Hormonal Balance, Ovulation & Reproductive Rhythm</div>

          <div class="benefits-list">
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>50mg Dual Inositol (Myo + D-Chiro):</strong> Ovarian health & cycle regularity</span>
            </div>
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>Vitex (Chaste Berry) & CoQ10:</strong> Estrogen balance & anti-fatigue vitality</span>
            </div>
            <div class="benefit-item rose">
              <span class="check-icon">✓</span>
              <span><strong>15+ Essential Nutrients:</strong> Iron, Zinc & Folic Acid for skin glow & hair care</span>
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
          <div class="floating-badge rose">✨ Tamper-Proof 2026 Seal</div>
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
          <h2 class="product-title cyan">OxiDop®</h2>
          <div class="product-subtitle cyan">Laser Focus, Dopamine Motivation & Calm Drive</div>

          <div class="benefits-list">
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>L-Tyrosine & Rhodiola Rosea:</strong> Fuels dopamine production & mental alertness</span>
            </div>
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>L-Theanine + GABA Synergy:</strong> Clean alpha-wave focus with zero drowsiness</span>
            </div>
            <div class="benefit-item cyan">
              <span class="check-icon">✓</span>
              <span><strong>Magnesium Glycinate + Zinc:</strong> Stress resilience with NO caffeine crash</span>
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
          <div class="floating-badge cyan">🛡️ Verified Hologram Seal</div>
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
        <div><span class="highlight">Free Delivery</span> Nationwide in Pakistan (2-4 Days)</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">🛡️</div>
        <div><span class="highlight">100% Original</span> Sealed & Holographic Authenticated</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">⭐</div>
        <div><span class="highlight">4.9 / 5 Rating</span> Over 10,000+ Verified Customers</div>
      </div>
      <div class="trust-item">
        <div class="icon-circle">🔄</div>
        <div><span class="highlight">7-Day Guarantee</span> Easy Hassle-Free Returns</div>
      </div>
    </div>

  </div>

</body>
</html>
`;

(async () => {
  console.log('Rendering high-res banners...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 840 },
    deviceScaleFactor: 2, // 2x supersampling for ultra sharp retina quality!
  });

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // ensure fonts are loaded

  const outputPathDual = path.join(__dirname, 'public/banners/banner-oxigen-dual.jpg');
  await page.screenshot({
    path: outputPathDual,
    type: 'jpeg',
    quality: 96,
    clip: { x: 0, y: 0, width: 1920, height: 840 },
  });
  console.log('Generated banner-oxigen-dual.jpg at 1920x840');

  // Also replace banner-oxigen.jpg with this flagship dual banner!
  const outputPathOxigen = path.join(__dirname, 'public/banners/banner-oxigen.jpg');
  fs.copyFileSync(outputPathDual, outputPathOxigen);
  console.log('Updated banner-oxigen.jpg');

  await browser.close();
})();

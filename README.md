# OXIGEN — E-Commerce Platform & Admin Dashboard

A full-stack commerce platform built around **ERPNext / Frappe**. A single Express
backend serves both the customer-facing **Storefront** and the management **Admin
Dashboard**; a single Vite/React SPA renders both — `https://localhost:5173/` for
shoppers and `/admin` for operations staff.

The storefront powers browsing, carts, checkout, and the customer portal. The
admin console provides real-time management of inventory, orders, customers,
discounts, site content, and brand appearance — all backed by the same ERPNext
instance.

---

## Architecture

```
                                ┌──────────────────────────────┐
                                │       ERPNext / Frappe       │
                                │  Items · Orders · Invoices   │
                                │  Inventory · Pricing rules   │
                                └──────────────┬───────────────┘
                                               │  REST (API key) + session cookies
                                               │
                        ┌──────────────────────┴───────────────────────┐
                        │           Express + TypeScript backend        │
                        │              (port 3002)                      │
                        │  Storefront APIs  +  /api/admin/* endpoints   │
                        │  Unified auth · CSRF · SSE · order queue      │
                        └──────────────────────┬───────────────────────┘
                                               │  proxy /api · /files ·
                                               │  /private/files (dev)
                        ┌──────────────────────┴───────────────────────┐
                        │            Vite + React SPA (port 5173)      │
                        │   Storefront  →  `/` + `/shop`, `/dashboard` │
                        │   Admin       →  `/admin` and nested routes  │
                        │   Router: TanStack Router · Zustand · Query  │
                        └───────────────────────────────────────────────┘
```

- **One codebase, one stack.** Admin routes, libs, and components live inside the
  same React app as the storefront (`src/routes/admin.*.tsx`,
  `src/components/admin*/`, `src/lib/admin-*`). Vite proxies `/api` and the file
  mounts to the backend in dev; in production the backend serves the built SPA
  itself (`SERVE_FRONTEND=true`), so the app is same-origin and CORS-free.
- **Unified auth.** Everyone logs in through `/signin`. ERPNext **System Users**
  are granted the admin console (`/admin` guard); regular **Website Users** land
  in the customer portal (`/dashboard`).
- **Coupon / promotion logic** runs against ERPNext pricing so storefront and
  admin always see the same canonical data.
- **Live operations.** Order events stream over Server-Sent Events into the admin
  console; heavy ERPNext writes (checkouts, stock adjustments) go through a
  resilient order queue with provider circuit-breaking.

---

## Repository Structure

```
.
├── Admin Dashboard/               # ⚠️ LEGACY — retired copy, kept as reference only.
│                                    Both services (backend :3001, frontend :5174)
│                                    were merged into OXIGEN-Website. Do not run.
│
├── OXIGEN-Website/                # ⚠️ THE LIVE APPLICATION
│   ├── backend/                   # Express + TypeScript API server (port 3002)
│   │   └── src/
│   │       ├── routes/            # Storefront + /api/admin/* routers
│   │       ├── controllers/       # auth, checkout, settings…
│   │       ├── services/          # ERPNext client, mailer, session sync…
│   │       ├── middlewares/       # requireAuth, requireAdmin, CSRF, rate limit
│   │       └── lib/               # erpnext-client, content-store, templates…
│   ├── frontend/                  # Vite + React SPA (port 5173)
│   │   └── src/
│   │       ├── routes/            # Storefront routes + admin.*.tsx admin routes
│   │       ├── components/        # Shared UI, Site, admin/, admin-site/, admin-templates/
│   │       └── lib/               # Stores (zustand incl. admin-auth-store), admin-api, templates…
│   ├── new branding/              # Product & brand packaging assets
│   ├── tests/                     # Playwright suites (backend API + UI audit)
│   ├── package.json               # Root scripts: dev (both servers), test
│   └── playwright.config.ts       # E2E test configuration
│
└── README.md
```

---

## Technology Stack

| Layer        | Technology                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite, TanStack Router (file-based, type-safe), TanStack Query, Zustand     |
| UI / Styling | Tailwind CSS v4, Radix UI / shadcn-style components, Recharts, Motion (Framer Motion)            |
| Backend      | Node.js, Express, TypeScript (tsx in dev), Zod validation, Pino logging, Helmet, CORS, CSRF      |
| Real-time    | Server-Sent Events (admin live notifications), resilient order/signup queue, circuit breaker     |
| ERP & Data   | ERPNext / Frappe REST API (token + session auth), persistent connection pooling (undici Agent),  |
|              | JSON local stores for site content, banners, and settings                                        |

---

## Features

### Storefront
- Dynamic product catalog, category navigation, search, and product detail pages.
- Cart + checkout with ERPNext-synced pricing, taxes, and order placement; live
  order confirmation with email via ERPNext.
- Customer portal (`/dashboard`): order history & tracking, address book,
  wishlist, notifications, profile/security settings.
- Homepage composed from admin-managed content (promo banners, perks, product
  slides, testimonials, FAQs).
- Responsive, animation-rich UI optimized for conversion and mobile use.

### Admin Dashboard (`/admin`)
- **Overview**: revenue/order/customer KPIs, monthly charts, live order feed via SSE.
- **Orders**: live list with per-order products, item counts, outstanding balances,
  shipping details, payment capture, return/cancel workflows, CSV export.
- **Inventory**: actual/reserved/available stock, out-of-stock detection,
  one-click disable, and a **Disabled/archive** section for products linked to
  orders that cannot be deleted.
- **Products & Categories**: catalog management with pricing, slideshow images,
  publish/unpublish to the website.
- **Customers, Discounts, Team/Users**: full CRUD; discounts archive instead of
  hard-deleting when linked to orders.
- **Content Editor**: every site section — banners, perks, brand & announcements,
  testimonials, FAQs, quick links, and all **Pages** (About, Reviews, Terms,
  Privacy, Shipping, Refund) — editable via typed visual forms, with a 30s live
  site-refresh cache.
- **Settings & Appearance**: brand/organization settings, logo upload,
  preferences (language, time zone, date format, currency).
- **Security**: CSRF double-submit protection, rate limiting, and strict input
  validation on every admin endpoint.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A reachable ERPNext / Frappe instance (API key + secret for reads; an ERPNext
  **System User** is required to access the admin console)

### Installation
```bash
# Install the whole application (backend + frontend) from the app root
cd "OXIGEN-Website" && npm install        # root (dev runner + Playwright)

# …or install each package individually
npm run dev --prefix backend
npm run dev --prefix frontend
```

### Environment Configuration
The backend reads environment from `OXIGEN-Website/backend/.env` (git-ignored):

```dotenv
NODE_ENV=development
PORT=3002

# ERPNext
ERPNEXT_URL=http://your-erpnext-host
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret

# Allowed browser origins (CORS) — add the dev SPA
FRONTEND_URL=http://localhost:3000,http://localhost:5173
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

# Sessions / authorization
WEBHOOK_SECRET=change-me
ADMIN_EMAIL=admin@example.com

# ERPNext defaults used by checkout / inventory flows
DEFAULT_COMPANY=Oxigen
DEFAULT_WAREHOUSE=Oxigen Warehouse - O
ONLINE_WAREHOUSE=Oxigen Warehouse - O
```

The frontend needs no `.env` in development — it uses `/api` (and `/files`) which
Vite proxies to `http://localhost:3002`. For deployments where the SPA is served
from the same origin as the backend, `frontend/.env.production` may set
`VITE_API_URL=/api` (the default).

### Running the Services
From `OXIGEN-Website`:
```bash
npm run dev          # starts backend (:3002) + frontend (:5173), both in watch mode
```

| What                 | URL                                  |
| -------------------- | ------------------------------------ |
| Storefront           | http://localhost:5173                |
| Admin console        | http://localhost:5173/admin          |
| Backend API          | http://localhost:3002/api            |
| Backend health       | http://localhost:3002/api/health     |

> Sign in at `http://localhost:5173/signin` with an ERPNext **System User** account
> to access `/admin`. Regular customers stay on the storefront / customer portal.

### Production Build
```bash
cd "OXIGEN-Website/frontend" && npm run build   # → frontend/dist
cd "../backend" && npm run build                # → backend/dist
NODE_ENV=production SERVE_FRONTEND=true PORT=8080 npm start   # serves API + SPA
```

---

## Scripts

| Script             | Scope                        | Purpose                                        |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `npm run dev`      | OXIGEN-Website (root)        | Start backend + frontend dev servers (watch)   |
| `npm run dev --prefix backend` | Backend            | Start the API server (:3002)                   |
| `npm run dev --prefix frontend` | Frontend         | Start the SPA dev server (:5173)               |
| `npm run build`    | backend / frontend           | Compile TypeScript → `dist/` / `vite build`    |
| `npm start`        | backend                      | Run the compiled production build              |
| `npx tsc --noEmit` | frontend / backend           | Static type-check (CI gate)                    |
| `npm run test`     | OXIGEN-Website (root)        | Playwright suites (`test:backend`, `test:ui`)  |

---

## Data & Security Notes

- Environment files (`.env`, `.env.*`), local data stores (`backend/data/`,
  `uploads/`, `storage/`), and logs are git-ignored. ERPNext credentials exist
  only in `backend/.env`.
- **Unified authentication**: a single `POST /api/auth/login` (`usr`/`pwd`)
  authenticates against ERPNext. System Users receive the admin session cookie;
  the `/admin/*` routes are guarded by `requireAdmin` (ERPNext System User check).
- Every state-changing request (except auth, webhooks, and SSE) requires a CSRF
  token from `GET /api/csrf-token` (double-submit cookie pattern).
- **Admin safety**: destructive operations on records linked to orders (products,
  discounts) are automatically converted into archive/disable actions so history
  is preserved.
- **Resilience**: checkouts and other ERPNext writes flow through an in-process
  queue with a provider circuit breaker, so brief ERPNext outages degrade
  gracefully instead of failing hard.

---

## License

All rights reserved © Oxigen.
# OXIGEN — E-Commerce Platform & Admin Dashboard

A full-stack commerce platform built around **ERPNext / Frappe**, consisting of a customer-facing **Storefront** and a management **Admin Dashboard**. The storefront powers browsing, carts, checkout, and the customer portal; the admin dashboard provides real-time management of inventory, orders, customers, discounts, site content, and brand appearance.

---

## Architecture

```
                        ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                        │                     ERPNext / Frappe                  │
                        │              Items · Orders · Invoices · Inventory    │
                        └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                                   ▲                ▲             ▲
                     REST (token)  │                │             │  REST (token)
        ┌──────────────────────────┴────┐   ┌───────┴──────────────┴─────────┐
        │      Storefront Backend       │   │       Admin Dashboard Backend  │
        │   Express + ERPNext adapter   │   │    Express + ERPNext adapter   │
        └──────────────┬────────────────┘   └───────────────┬────────────────┘
                       │ proxy /api                         │ proxy /api
        ,──────────────┴─────────────,          ,───────────┴────────────,
        │   Storefront Frontend      │          │  Admin Frontend        │
        │   Vite · React · TanStack  │          │  TanStack Start · UI   │
        │   http://localhost:5173    │          │  http://localhost:5174  │
        └────────────────────────────┘          └────────────────────────┘
```

- **Coupon / promotion logic** runs against ERPNext pricing, ensuring storefront and admin see the same canonical data.
- **Order placement** flows through the storefront backend into ERPNext; order events are pushed to the admin dashboard for live monitoring.

---

## Repository Structure

```
.
├── Admin Dashboard/
│   ├── backend/              # Express + TypeScript API server (port 3001)
│   └── frontend/             # TanStack Start admin UI (port 5174)
│
├── OXIGEN-Website/
│   ├── backend/              # Express + TypeScript API server (port 3002)
│   ├── frontend/             # Vite + React storefront (port 5173)
│   └── new branding/         # Product & brand packaging assets
│
└── README.md
```

---

## Technology Stack

| Layer        | Technology                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Frontend     | React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Radix UI / shadcn components           |
| Backend      | Node.js, Express, TypeScript (tsx in dev), Zod validation, Pino logging, Helmet, CORS, CSRF, express-rate-limit     |
| Admin UI     | TanStack Start, Zustand state store, Recharts, Radix UI, Tailwind CSS v4                                           |
| ERP & Data   | ERPNext / Frappe REST API (token auth), persistent connection pooling, JSON local storage                          |

---

## Features

### Storefront (`OXIGEN-Website`)
- Dynamic product catalog, category navigation, search, and product detail pages.
- Cart and checkout with ERPNext-synced pricing, taxes, and order placement.
- Customer portal: order history, order tracking, address book, notifications, and profile/security settings.
- Responsive, animation-rich UI optimized for conversion and mobile use.
- Homepage composed from admin-managed content (promo banners, perks, product slides, before & after results).

### Admin Dashboard (`Admin Dashboard`)
- **Inventory**: live stock levels (actual / reserved / available), out-of-stock detection, and a **Disabled** archive for products linked to orders that cannot be deleted. Out-of-stock items offer a one-click disable toggle; archived items are grouped in a dedicated collapsible block with a restore toggle.
- **Orders**: live order list with per-order product summaries, item counts, outstanding balances, shipping details, payment capture, and return/cancel workflows.
- **Products**: catalog management with pricing, slideshow images, enable/disable website publishing.
- **Customers, Discounts, Categories/Collections, Team**: full CRUD; discounts archive instead of hard-deleting when linked to orders.
- **Content Editor**: every site section — banners, perks, mission/why/results, reviews, and all **Pages** (About, Reviews, Terms, Privacy, Shipping, Refund) — is editable through typed visual forms, with optimistic JSON fallbacks and live site refresh (30s cache). Homepage supports a two-tab hero (promo + before & after).
- **Real-time insights**: stat cards, export to CSV, search, status filters, and advanced multi-field filtering on every list.
- **Security**: CSRF double-submit protection, rate limiting, and strict input handling.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm (or pnpm / bun)
- A reachable ERPNext / Frappe instance with an API key + secret

### Installation

```bash
# Storefront backend
cd "OXIGEN-Website/backend"   && npm install

# Storefront frontend
cd "../frontend"              && npm install

# Admin backend
cd "../../Admin Dashboard/backend"   && npm install

# Admin frontend
cd "../frontend"              && npm install
```

### Environment Configuration

Each backend reads environment from an `.env` file (git-ignored). The minimal shared configuration:

```dotenv
# ERPNext connection (identical pattern on both backends)
ERPNEXT_URL=http://192.168.90.114
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret

# Service ports
# Storefront backend → PORT=3002   (Admin Dashboard/backend/.env)
# Admin backend     → PORT=3001   (OXIGEN-Website/backend/.env)
```

The admin frontend points at its backend via:

```dotenv
# Admin Dashboard/frontend/.env
VITE_API_URL=http://localhost:3001/api
```

### Running the Services

| Service                | Directory                       | Command        | URL                    |
| ---------------------- | ------------------------------- | -------------- | ---------------------- |
| Storefront frontend    | `OXIGEN-Website/frontend`       | `npm run dev`  | http://localhost:5173  |
| Storefront backend     | `OXIGEN-Website/backend`        | `npm run dev`  | http://localhost:3002  |
| Admin frontend         | `Admin Dashboard/frontend`      | `npm run dev`  | http://localhost:5174  |
| Admin backend          | `Admin Dashboard/backend`       | `npm run dev`  | http://localhost:3001  |

All four dev servers run in watch mode and restart on change.

---

## Scripts

| Script                | Scope                          | Purpose                                  |
| --------------------- | ------------------------------ | ---------------------------------------- |
| `npm run dev`         | All four packages              | Start the dev server (watch mode)        |
| `npm run build`       | Both backends / storefront     | Compile TypeScript → `dist/` (or `vite build`) |
| `npm start`           | Both backends                 | Run compiled production build            |
| `npx tsc --noEmit`    | Admin frontend/backend         | Static type-check (CI gate)              |
| `npm run lint`        | Both frontends                 | ESLint                                   |

> The storefront root also ships **Playwright** suites (`npm run test`, `npm run test:backend`, `npm run test:ui`) for API and UI end-to-end testing.

---

## Data & Security Notes

- ERPNext credentials live in `backend/.env` files only; `.gitignore` excludes all `.env*`, `data/`, `uploads/`, and `storage/` directories.
- All state-changing admin/website requests require a CSRF token obtained from `GET /api/csrf-token` (double-submit cookie pattern).
- The admin dashboard serves as the operations front-end for ERPNext; destructive operations (e.g., deleting a linked product or discount) are automatically converted into **archive/disable** actions so historical records are preserved.

---

## License

All rights reserved © Oxigen.
# OxiGen E-Commerce Platform

A modern, high-performance, and secure e-commerce application built with **React**, **Vite**, **TypeScript**, and **Express**. The platform features dynamic product browsing, a rich and responsive user interface, and integration with an ERPNext backend.

> This single application now also hosts the **Admin Dashboard** in the same SPA —
> the management console lives at `/admin` (routes `src/routes/admin.*.tsx`), signed
> in with an ERPNext System User. See the [root README](../README.md) for the merged
> architecture and how the former standalone `Admin Dashboard/` project was folded in.

---

## 🚀 Technology Stack

### Frontend (`/frontend`)
*   **Framework:** React 19 (TypeScript)
*   **Build Tool:** Vite 8
*   **Routing:** TanStack Router (File-based type-safe routing)
*   **State Management & Data Fetching:** TanStack Query (React Query)
*   **Styling:** Tailwind CSS V4 + Tailwind CSS Vite Plugin
*   **UI Components:** Shadcn/UI (Radix UI primitives)
*   **Animations:** Framer Motion / Motion + Tailwind animations

### Backend (`/backend`)
*   **Runtime:** Node.js
*   **Framework:** Express (ES Modules)
*   **Language:** TypeScript (run with `tsx` in development)
*   **Data Validation:** Zod
*   **Logging:** Pino & Pino HTTP (for high-performance structured logging)
*   **Security:** Helmet, CORS, CSRF-CSRF (Double Submit Cookie pattern), express-rate-limit

### Testing (`/tests`)
*   **Framework:** Playwright (for automated API and UI E2E test suites)

---

## 📁 Directory Structure

```text
OxiGen Website/
├── backend/               # Express backend application
│   └── src/               # TypeScript source files (data/ storage is git-ignored)
├── frontend/              # Vite + React frontend application
│   ├── src/               # React components, routes, and styles
│   │   ├── components/    # Reusable UI (shadcn) and Site components
│   │   │   ├── admin/         # Admin console UI (sidebar, topnav, forms…)
│   │   │   ├── admin-site/    # Admin site-section editors (hero, testimonials…)
│   │   │   └── admin-templates/ # Admin template previews
│   │   ├── routes/        # Page routes (Tanstack Router) incl. admin.*.tsx (admin console)
│   │   └── lib/           # Stores (admin-auth-store, site-store), admin-api, utilities
│   ├── public/            # Static assets (favicons, robots.txt)
│   └── .gitignore         # Frontend-level git ignores
├── tests/                 # Playwright test specifications
├── playwright.config.ts   # E2E test configuration
├── .gitignore             # Root repository-level git ignores
└── README.md              # Project documentation
```

---

## 🛠️ Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) installed.

### Installation

1. Navigate to the project directory:
   ```bash
   cd "OxiGen Website"
   ```

2. Install dependencies for the root, backend, and frontend:
   ```bash
   # Install root testing dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

---

## ⚙️ Environment Configuration

### Backend Setup
1. Navigate to the `backend/` directory.
2. Create a `.env` file (git-ignored) with your ERPNext credentials and service settings:
   ```dotenv
   NODE_ENV=development
   PORT=3002

   # ERPNext
   ERPNEXT_URL=http://your-erpnext-host
   ERPNEXT_API_KEY=your_api_key
   ERPNEXT_API_SECRET=your_api_secret

   FRONTEND_URL=http://localhost:3000,http://localhost:5173
   FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173
   WEBHOOK_SECRET=change-me
   ADMIN_EMAIL=admin@example.com
   DEFAULT_COMPANY=Oxigen
   DEFAULT_WAREHOUSE=Oxigen Warehouse - O
   ONLINE_WAREHOUSE=Oxigen Warehouse - O
   ```
3. For production hosting on `testing.oxigen.com.pk`, set:
   ```text
   NODE_ENV=production
   PORT=8080
   FRONTEND_URL=https://testing.oxigen.com.pk
   FRONTEND_ORIGIN=https://testing.oxigen.com.pk
   SERVE_FRONTEND=true
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Create a `.env` file (also ignored by Git).
3. Set any required Vite-specific environment variables:
   ```text
   VITE_API_URL=http://localhost:3002/api
   ```
4. For production builds targeting the same domain as the backend, create `frontend/.env.production` with:
   ```text
   VITE_API_URL=/api
   ```

---

## 💻 Running the Application

### Start the Backend
From the `backend/` directory:
```bash
npm run dev
```
The backend server runs in watch mode at `http://localhost:3002`.

### Start the Frontend
From the `frontend/` directory:
```bash
npm run dev
```
The dev server runs at `http://localhost:5173`.

---

## 🧪 Testing

We use **Playwright** to execute backend API and UI tests.

Run all tests from the root directory:
```bash
npm run test
```

### Specific Test Runners:
*   **Backend API Tests:** `npm run test:backend`
*   **UI / Audit Tests:** `npm run test:ui`

---

## 🔒 Security & Git Best Practices
This project has strict rules regarding ignored files to prevent leaking sensitive API tokens or pushing unnecessary logs/agent folders:
*   **Environment Files (`.env`, `.env.*`):** Always ignored.
*   **Databases (`backend/data/`):** Local JSON/SQLite storage is ignored.
*   **Logs (`*.log`):** Application logs are ignored.
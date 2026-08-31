# OXIGEN - E-Commerce Platform & Admin Dashboard

A modern, high-performance monorepo platform comprising the **Oxigen E-Commerce Storefront** and the **Oxigen Admin Management Dashboard**.

---

## 📁 Repository Structure

```
.
├── Admin Dashboard/          # Comprehensive Admin & Operations Dashboard
│   ├── backend/              # Node.js/Express TypeScript API Server & ERP Integration
│   └── frontend/             # TanStack Router + Tailwind CSS Admin UI
│
├── OXIGEN-Website/           # Customer-Facing E-Commerce Web Application
│   ├── backend/              # Backend API, Order Queue, Frappe/ERPNext Integration
│   ├── frontend/             # High-converting Storefront with TanStack Router & Radix UI
│   └── new branding/         # High-resolution Product & Brand Packaging Assets
│
└── README.md
```

---

## ✨ Features

### 🛍️ Storefront (`OXIGEN-Website`)
- **Modern E-Commerce Experience**: Dynamic product catalog, categories, cart management, and seamless checkout.
- **Customer Portal**: Account management, order tracking, address book, security settings, and notifications.
- **Fast & Responsive**: Built with Vite, React, TanStack Router, and Tailwind CSS.
- **ERP Integration**: Real-time integration with ERPNext / Frappe backend for item catalogs and order processing.

### 🛡️ Admin Dashboard (`Admin Dashboard`)
- **Unified Management**: Centralized hub for inventory, orders, customer analytics, and site appearance.
- **Template & Theme Kit**: Flexible branding controls, page templates, and live site preview.
- **Enterprise Security**: Role-based access control (RBAC), rate-limiting, and audit trails.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- npm / pnpm / bun

### Quick Setup

```bash
# Install dependencies for Website
cd "OXIGEN-Website/backend" && npm install
cd "../frontend" && npm install

# Install dependencies for Admin Dashboard
cd "../../Admin Dashboard/backend" && npm install
cd "../frontend" && npm install
```

### Running the Services

```bash
# Storefront Frontend
cd "OXIGEN-Website/frontend" && npm run dev

# Storefront Backend
cd "OXIGEN-Website/backend" && npm run dev

# Admin Frontend
cd "Admin Dashboard/frontend" && npm run dev

# Admin Backend
cd "Admin Dashboard/backend" && npm run dev
```

---

## 📄 License
All rights reserved © Oxigen.

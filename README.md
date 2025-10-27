# 🏢 AyazTrade - Enterprise Business Suite

<div align="center">

![AyazTrade Logo](https://via.placeholder.com/200x80/4A90E2/FFFFFF?text=AyazTrade)

**Integrated Business Management Platform for Modern Enterprises**

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

</div>

---

## 🎯 Overview

**AyazTrade** is a comprehensive enterprise business suite that combines multiple modular systems to provide a complete business management solution. Built with cutting-edge technologies and following 2025 software engineering standards, it offers a scalable foundation for modern enterprises.

### 🧩 Modular Architecture

AyazTrade consists of independent, reusable modules that can work together or separately:

- 🛒 **AyazComm** - E-commerce module (B2C, B2B, Marketplace)
  - Products, Orders, Customers, Cart, Payments
  - Reviews, Promotions, Search, Shipping
  - Analytics, SEO, Multi-language, AI/ML
  - **B2B Features**: Tiered pricing, Bulk orders, Shopping lists
  
- 👥 **AyazCRM** - Customer Relationship Management
  - **Quotes Management** (RFQ, Approval, Versioning)
  - **Contracts** (Agreements, Pricing, Renewal)
  - Leads, Activities, Dealers, SLA
  
- 📊 **AyazERP** - Enterprise Resource Planning
  - **Finance**: Credit management, Invoicing
  - **e-Fatura/e-Arşiv** integration (Turkey)
  - **Payment Terms**: Net 15/30/60/90
  - HR, Inventory, Procurement
  
- 📦 **AyazWMS** - Warehouse Management System (3PL ready)
- 📈 **AyazAnalytics** - Business Intelligence & Reporting
- 🔗 **AyazIntegration** - Third-party integrations
  - **Marketplaces**: Trendyol, Hepsiburada, N11, Amazon TR, Sahibinden
  - **Shipping**: Aras, Yurtiçi, MNG, PTT Kargo
  - **Payments**: Stripe, İyzico, PayTR, BKM Express, Masterpass, Garanti/Akbank/İşbank POS

---

## ✨ Key Highlights

- 🧩 **Modular Design** - Use only what you need, each module is independent
- 🏢 **Multi-tenant Architecture** - Support for multiple stores and vendors
- 🌍 **Multi-currency & Multi-language** - Global operations ready
- 📱 **Headless Architecture** - API-first design for any frontend
- 🔒 **Enterprise Security** - OAuth2, JWT, rate limiting, and more
- ⚡ **High Performance** - Redis caching, Elasticsearch, optimized queries
- 📊 **Real-time Analytics** - Live insights and reporting
- 🎨 **Modern UI** - iOS-inspired admin panels
- 🔍 **Advanced Search** - Elasticsearch with Turkish language support, fuzzy matching, autocomplete
- 🤖 **AI/ML** - Product recommendations, customer segmentation, predictive analytics

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14
- Redis >= 6
- Elasticsearch >= 8
- Docker (optional)

### Environment Setup
Copy and configure environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

### Installation

```bash
# Clone repository
git clone https://github.com/ayaz/ayaztrade.git
cd ayaztrade

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Database setup
npm run db:generate
npm run db:migrate

# Start development
npm run start:dev

# Or start all services
npm run dev
```

The API will be available at `http://localhost:5000`

---

## 📚 API Documentation

- **Swagger UI**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/api/v1/health`
- **Metrics**: `http://localhost:5000/api/v1/metrics`

---

## 🏗️ Project Structure

```
ayaztrade/
├── src/modules/
│   ├── ayaz-comm/              # E-commerce (B2C + B2B)
│   │   ├── products/
│   │   ├── orders/
│   │   ├── payments/           # 8 payment gateways
│   │   ├── b2b/                # B2B features
│   │   ├── search/             # Advanced Elasticsearch
│   │   ├── ai/                 # ML recommendations
│   │   └── ...
│   │
│   └── shared/
│       ├── ayaz-crm/           # Quotes, Contracts, Leads
│       ├── ayaz-erp/           # Finance, Invoicing, e-Fatura
│       ├── ayaz-wms/           # Warehouse management
│       ├── ayaz-analytics/     # BI & Reporting
│       └── ayaz-integration/   # External APIs
│
└── frontend/
    ├── admin/                  # Admin panel (iOS-style)
    ├── b2b-portal/             # B2B customer portal
    ├── storefront/             # Customer store (PWA)
    └── mobile-app/             # React Native app
```

---

## 🎯 Features Implemented

### ✅ Core E-commerce (100%)
- Products, Categories, Orders, Customers
- Shopping Cart, Wishlist
- Reviews & Ratings
- Promotions & Discounts

### ✅ Payments (8 Gateways)
- Stripe, İyzico, PayTR
- BKM Express, Masterpass
- Garanti, Akbank, İşbank Virtual POS

### ✅ Marketplaces (5 Platforms)
- Trendyol, Hepsiburada, N11
- Amazon TR, Sahibinden.com

### ✅ Shipping (4 Carriers)
- Aras, Yurtiçi, MNG, PTT Kargo

### ✅ B2B Features
- Tiered/Volume pricing
- Bulk order import (Excel/CSV)
- Shopping lists
- Quick order by SKU

### ✅ CRM Integration
- Quote management
- Contract management
- Sales rep assignment

### ✅ ERP Integration
- Credit limit management
- Payment terms (Net 30/60/90)
- Invoice generation
- e-Fatura integration (Turkey)

### ✅ Advanced Features
- **Search**: Elasticsearch, Turkish language, fuzzy, autocomplete
- Google Analytics & Facebook Pixel
- Multi-language CMS
- SEO tools (Sitemap, Schema markup)
- AI product recommendations
- Customer segmentation (ML)
- Marketing automation
- A/B testing
- PWA support

---

## 📊 Statistics

- **40+ Services** implemented
- **10,000+ Lines** of production code
- **5 Marketplace** integrations
- **8 Payment** gateways
- **4 Shipping** carriers
- **100% TypeScript** codebase
- **Modular** architecture

---

## 📝 License

Proprietary - All rights reserved © 2025 Ayaz Technology

---

<div align="center">

**Built with ❤️ by Ayaz Technology**

*Powering the future of enterprise commerce*

</div>

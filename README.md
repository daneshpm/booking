# Rooman Bookings Platform

> **Official Appointment Scheduling, Skilling Consultation & Center of Excellence (CoE) Platform for Rooman Technologies**  
> *Pioneering IT Training, Vocations & Certifications in India Since 1999 • 1.5M+ Professionals Trained • 1,000+ Academic & Hiring Partners*

---

## 📖 Overview

**Rooman Bookings** is an enterprise-grade multi-tenant appointment scheduling platform built for **Rooman Technologies** (Bengaluru, Karnataka, India). The platform bridges the gap between aspiring students, colleges, universities, corporate enterprises, and certified IT mentors across India.

It features:
- **1-on-1 Career & Certification Roadmapping**: Free 30-minute guidance sessions with senior advisors covering AI/ML, Cloud Computing (AWS/Azure), Cybersecurity, Cisco Networking, and Red Hat certifications.
- **Technical Mock Interviews**: Rigorous 45-minute live evaluations covering coding, system design, and communication with detailed scorecards.
- **University Center of Excellence (CoE) Discovery**: Strategic partnership consultations for university deans, college trustees, and directors to establish on-campus IT & AI labs.
- **Corporate Workforce Upskilling**: Tailored engineering cohort training discovery for enterprises.
- **Airtight Scheduling Engine**: Pure timezone-aware availability algorithms, automatic prep/wrap buffer zones, and PostgreSQL transactional collision checks to guarantee zero double-bookings.

---

## 🎨 Design System & Aesthetics

Rooman Bookings utilizes a **targeted hybrid design architecture**:

1. **Client Conversion Surfaces** (*Landing Page, Workspace Public Catalog, Concierge Booking Flow*):
   - **Modern Light SaaS Aesthetic** (inspired by Stripe, Linear, and Google Stitch).
   - Base canvas: `#fafbfc` with pure white (`#ffffff`) cards, subtle borders (`#e2e8f0`), deep slate typography (`#0f172a`), and royal indigo accents (`#4f46e5` / `#2563eb`).
   - High conversion date/time slot pickers, instant Google Meet link delivery, and guest intake forms.

2. **Faculty & Staff Dashboard** (*Appointments, Calendar, Staff Management, Availability*):
   - **Zoho Bookings Design System**:
   - Deep royal purple branding (`#5c34ad` / `#4a288f`), intuitive top navigation bar, quick workspace switcher, and structured data tables.

---

## 🏗️ Architecture & Core Principles

The platform is organized as a clean **Turborepo monorepo** adhering to Domain-Driven Design (DDD):

```
├── apps/
│   └── web/                               # Next.js 15 App Router (Frontend & Server Actions)
│       ├── app/
│       │   ├── (dashboard)/               # Faculty internal dashboard (Zoho Bookings theme)
│       │   │   ├── appointments/          # Appointments list & status lifecycle
│       │   │   ├── availability/          # Shifts, lunch breaks & buffer controls
│       │   │   ├── booking-pages/         # Public link generator & embed widgets
│       │   │   ├── calendar/              # Full schedule timeline view
│       │   │   ├── customers/             # Client directory & history
│       │   │   ├── services/              # Service catalog management
│       │   │   ├── staff/                 # Staff directory & role permissions
│       │   │   └── workflows/             # Automated email & reminder sequences
│       │   ├── book/                      # Public booking routes & concierge client
│       │   │   └── [slug]/                # Dynamic workspace catalog & direct booker
│       │   ├── components/                # Reusable presentation components (ApexLandingPage)
│       │   ├── login/ & signup/           # Multi-tenant onboarding & authentication
│       │   └── layout.tsx & page.tsx      # Root application shell & landing page
│
├── packages/
│   ├── core/                              # Pure domain entities, algorithms & value objects
│   │   └── src/domain/                    # Availability calculator, buffer rules & collision models
│   ├── database/                          # Prisma ORM schema, client & seed scripts
│   │   ├── prisma/schema.prisma           # Multi-tenant PostgreSQL database models
│   │   └── src/seed.ts                    # Rooman Technologies demo data seeder
│   ├── feature-services/                  # Hexagonal use cases & repositories for services
│   └── ui/                                # Reusable UI component library (Buttons, Badges, Inputs)
│
└── docker/
    └── docker-compose.yml                 # PostgreSQL 16, Redis 7, Mailpit
```

### Core Engine Safeguards
- **Zero Double-Bookings**: PostgreSQL interval collision queries (`startTime < existing.endTime AND endTime > existing.startTime`) run inside serializable transactions before booking creation.
- **Timezone Awareness**: All shift calculations, availability generation, and appointments are computed with `date-fns-tz` and stored in UTC in PostgreSQL.
- **Buffer Management**: Configurable preparation buffers (e.g., 10 mins before) and wrap-up buffers (e.g., 15 mins after) protect mentors from meeting fatigue.
- **Automated Video Conferencing**: Google Meet and video links are provisioned and delivered automatically upon confirmation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, Server Components & Server Actions) |
| **Language** | TypeScript 5.7 |
| **Frontend UI** | React 19, TailwindCSS, Lucide Icons, Vanilla Design Tokens |
| **Database** | PostgreSQL 16 with Prisma ORM 6 |
| **Caching / Queues** | Redis 7 + BullMQ |
| **Local Email Testing** | Mailpit (SMTP on `1025`, Web UI on `8025`) |
| **Testing** | Vitest (with dot & compact reporters) |
| **Monorepo Tooling** | Turborepo 2, npm workspaces |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Docker / Docker Desktop**: For running PostgreSQL, Redis, and Mailpit

### 2. Environment Configuration
Create a `.env` file in the root directory (or use `.env.local`):

```bash
# Database connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password123@localhost:5434/bookings_dev?schema=public"

# Auth Secret & URLs
NEXTAUTH_SECRET="rooman-bookings-super-secret-key-at-least-32-chars-long"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# Email (Mailpit)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="Rooman Bookings <noreply@rooman.net>"
```

### 3. Start Supporting Services
Run Docker Compose to spin up PostgreSQL (`5434`), Redis (`6379`), and Mailpit (`8025`):

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Setup Database & Seed Data
Push the Prisma schema to PostgreSQL and seed Rooman Technologies data:

```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
The application will be live at **[http://localhost:3000](http://localhost:3000)**.

---

## 🔗 Key Local Routes

| Page | URL | Description |
| :--- | :--- | :--- |
| **Rooman Bookings Home** | `http://localhost:3000` | Light SaaS landing page with live interactive scheduler preview |
| **Rooman Public Catalog** | `http://localhost:3000/book/rooman-technologies` | Client booking catalog with INR pricing & service cards |
| **Career Guidance Booker** | `http://localhost:3000/book/rooman-technologies/career-guidance` | 3-step date/time slot picker for free 1-on-1 career mentoring |
| **Mock Interview Booker** | `http://localhost:3000/book/rooman-technologies/mock-interview-assessment` | Technical mock interview scheduling with scorecard evaluation |
| **University CoE Booker** | `http://localhost:3000/book/rooman-technologies/university-coe-consultation` | Executive briefing for on-campus Centers of Excellence |
| **Appointments Dashboard** | `http://localhost:3000/appointments` | Internal appointment management (Zoho Bookings theme) |
| **Calendar Schedule** | `http://localhost:3000/calendar` | Interactive schedule timeline |
| **Mailpit Inbox** | `http://localhost:8025` | Local web client to inspect confirmation & reminder emails |

---

## 🧪 Testing & Validation

Run unit tests covering availability slot calculations, buffer intersections, and collision prevention:

```bash
# Run domain unit tests
npx vitest run --reporter=dot

# Run TypeScript typecheck
npm run lint --workspace=@bookings/web
```

---

## 🌿 Git & Deployment Policy

- **Target Branch**: Push ONLY to the **`danesh`** branch. Never push directly to `main`.
- **Syncing Changes**: Use the Antigravity IDE Source Control panel (`Ctrl + Shift + G` -> *Sync Changes*) to push commits directly to GitHub.

---

## 🏢 About Rooman Technologies

- **Founded**: 1999 in Bengaluru, Karnataka, India
- **Headquarters**: Bengaluru, India
- **Official Website**: [www.rooman.com](https://www.rooman.com) • [www.rooman.net](https://www.rooman.net)
- **Specializations**: Artificial Intelligence, Cloud Computing (AWS/Azure), Cybersecurity, Cisco Networking, Centers of Excellence, PMKVY / NSDC Skill Development.

---
*© 2026 Rooman Technologies Pvt. Ltd. All rights reserved. Rooman Bookings Platform.*

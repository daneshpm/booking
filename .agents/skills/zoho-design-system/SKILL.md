---
name: zoho-design-system
description: >-
  Provides UI tokens, color palettes, component specifications, and layout patterns for replicating and extending the Zoho Bookings design system. Activate this skill when creating or modifying dashboard layouts, headers, sidebars, navigation pills, empty-state illustrations, or booking forms.
---

# Zoho Bookings Design System Skill

This skill defines the visual language, design tokens, and component patterns matching Zoho Bookings.

---

## 1. Color Palette Tokens

- **Primary Brand Purple**: `#5c34ad` (Hover: `#4d2994`, Active Pill: `#5c34ad` with white text)
- **Lavender Backgrounds**: `#f8f5ff` (Borders: `#f1ebfc` or `border-purple-100`)
- **Coral / Salmon Badges**: `#e05666` / `#ff6b6b` (Workspace avatar badges, "Complete Setup" gradient cards)
- **Neutral Dark Text**: `text-slate-800` (Headings: `text-xl font-bold tracking-tight`)
- **Muted Text**: `text-slate-500` (Subheadings: `text-xs`)
- **Borders**: `border-slate-200` (Subtle dividers: `border-slate-100`)

---

## 2. Layout Structure

- **Top Bar (`h-12`)**:
  - Circular Bookings checkmark logo.
  - Trial alert: *"Your trial ends in 1 days. Extend your Trial | Upgrade now"*.
  - Purple `[+]` quick action button.
  - Icon cluster: Calendar, Bell (with unread dot), Settings gear, Avatar circle.
- **Left Sidebar (`w-56`)**:
  - Workspace selector: Rounded card with coral square badge (`RO`), title, and chevron.
  - Active navigation pill: Rounded rectangle with deep purple background (`#5c34ad`) and white icon/text.
  - Inactive navigation links: `text-slate-700 hover:bg-slate-50`.
  - Bottom card: Gradient coral/orange *"Complete Setup 0/4"* with setup link.
- **Bottom Utility Strip (`h-7`)**:
  - Left: "My Pins", "Chats", "Contacts" (`text-[11px] text-slate-500`).
  - Right: Purple "Help" pill and "User Guide".

---

## 3. Empty States & Cute 3D Illustrations

- Always use stylized SVG calendar motifs:
  - Top header: Deep purple `#5c34ad` with twin metal ring coils.
  - Grid: Light squares with marked cells (pink `✕` and purple `?`).
  - Top-right floating circular clock badge.
  - Floating pastel confetti dots and crosses around the illustration.
  - Direct CTA button: `+ New Appointment` in `#5c34ad`.

# ShopIt - Stack & High-Level Architecture

## Problem Statement

When planning a large or expensive purchase, research is scattered across WhatsApp messages, browser tabs, and mental notes. There's no structured way to collect product links, compare key attributes, shortlist options, and make a collaborative decision with family.

**ShopIt** is a focused tool that turns a URL into a structured product card, lets you compare and shortlist items, and share the entire list with collaborators — all from your phone.

---

## Core Features (v1)

| Feature | Description |
|---------|-------------|
| **URL Ingestion** | Paste a product URL; app scrapes and extracts structured data (title, price, image, specs, reviews summary, pros/cons) |
| **Product Table** | Clean table/card view of all products with sortable columns and key stats |
| **Shortlisting** | Mark items as shortlisted; filter view to shortlisted only |
| **Collaboration** | Share a purchase list with other users via email invite; all members can add items, comment, vote |
| **Purchase Lists** | Organize products into named lists (e.g., "New TV", "Laptop for Mom") |
| **Notes & Comments** | Add personal notes or collaborative comments to any product |
| **Status Workflow** | Items move through: Researching → Shortlisted → Decided → Purchased |

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR/SSG, API routes as serverless functions, great mobile perf |
| **Styling** | Tailwind CSS 4 | Utility-first, responsive design, consistent design system |
| **UI Components** | shadcn/ui | High-quality, accessible, Linear/Notion-tier components |
| **Hosting** | Vercel | Zero-config serverless, free tier covers personal use, edge functions |
| **Database** | Supabase (PostgreSQL) | Free tier, built-in auth/realtime/storage, row-level security |
| **Auth** | Supabase Auth | Magic links + Google OAuth, no cost at family scale |
| **URL Scraping** | Firecrawl | Pay-per-use, returns clean markdown from product URLs |
| **AI Extraction** | Google Gemini API (Flash) | Parse scraped content into structured product data, very low cost |
| **File Storage** | Supabase Storage | Product images/thumbnails, included in free tier |
| **Real-time** | Supabase Realtime | Live updates when collaborators add/modify items |

### Cost Estimate (Family Use)

| Service | Expected Cost |
|---------|---------------|
| Vercel | $0 (free tier: 100GB bandwidth) |
| Supabase | $0 (free tier: 500MB DB, 1GB storage, 50K auth users) |
| Gemini Flash | ~$0.01 per 100 products extracted |
| URL Scraping | ~$0.10 per 100 URLs (Firecrawl) or $0 (Jina free tier) |
| **Total** | **< $1/month for typical family use** |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Client (Next.js)                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Product  │  │  List    │  │  Share   │  │  Compare  │ │
│  │  Cards   │  │  View    │  │  Modal   │  │   View    │ │
│  └─────────┘  └──────────┘  └──────────┘  └───────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ /api/ingest │  │ /api/lists   │  │ /api/share      │ │
│  │  (URL→Data) │  │  (CRUD)      │  │ (invitations)   │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
└─────────┼────────────────┼────────────────────┼──────────┘
          │                │                    │
          ▼                ▼                    ▼
┌──────────────┐  ┌────────────────────────────────────────┐
│  External    │  │           Supabase                      │
│  Services    │  │  ┌──────────┐  ┌──────────┐            │
│ ┌──────────┐ │  │  │ Postgres │  │   Auth   │            │
│ │ Scraper  │ │  │  │   (DB)   │  │ (Magic   │            │
│ │ (Firecrawl│ │  │  │          │  │  Links)  │            │
│ │ or Jina) │ │  │  └──────────┘  └──────────┘            │
│ └──────────┘ │  │  ┌──────────┐  ┌──────────┐            │
│ ┌──────────┐ │  │  │ Realtime │  │ Storage  │            │
│ │ Gemini   │ │  │  │(WebSocket│  │ (Images) │            │
│ │ Flash    │ │  │  │  sync)   │  │          │            │
│ └──────────┘ │  │  └──────────┘  └──────────┘            │
└──────────────┘  └────────────────────────────────────────┘
```

---

## URL Ingestion Pipeline

```
User pastes URL
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Scraper    │────▶│  Gemini      │────▶│  Save to DB   │
│  Service    │     │  Flash       │     │  + Storage    │
│             │     │              │     │               │
│ Returns:    │     │ Extracts:    │     │ Stores:       │
│ - HTML/MD   │     │ - Title      │     │ - Product     │
│ - Images    │     │ - Price      │     │ - Images      │
│ - Metadata  │     │ - Specs      │     │ - Metadata    │
│             │     │ - Pros/Cons  │     │               │
│             │     │ - Rating     │     │               │
│             │     │ - Review     │     │               │
│             │     │   Summary    │     │               │
└─────────────┘     └──────────────┘     └───────────────┘
```

---

## Data Model (High Level)

### Users
- id, email, name, avatar_url, created_at

### Lists (Purchase Lists)
- id, name, description, status (active/archived), owner_id, created_at

### List Members (Collaboration)
- list_id, user_id, role (owner/editor/viewer), invited_at

### Products
- id, list_id, added_by
- url, title, price, currency, image_url
- specs (JSONB), pros (text[]), cons (text[])
- rating, review_count, review_summary
- status (researching/shortlisted/decided/purchased)
- raw_scraped_data (JSONB)
- created_at, updated_at

### Comments
- id, product_id, user_id, content, created_at

### Votes (thumbs up/down on products)
- product_id, user_id, vote (up/down)

---

## Key Design Decisions

1. **Next.js App Router** over Pages Router — better layouts, server components reduce client JS, streaming for perceived speed
2. **Supabase over Firebase** — PostgreSQL is better for structured product comparisons (sorting, filtering, JOINs), RLS for security
3. **Gemini Flash over fine-tuned model** — structured extraction via prompting is sufficient; Flash is fast and extremely cheap
4. **JSONB for specs** — product specs vary wildly between categories; JSONB gives flexibility without schema migrations
5. **Serverless API routes** over separate backend — keeps deployment simple, single Vercel project
6. **Magic links as primary auth** — minimal friction for family members who just need to view a shared list

---

## Non-Goals (v1)

- Price tracking / alerts
- Browser extension
- Affiliate links
- Native mobile app (responsive web is sufficient)
- Multi-language support
- AI-powered recommendations

# ShopIt — Product Detail Sheet

Detailed design spec for the Product Detail Sheet — the slide-over panel that reveals full product information when a user taps a product card.

> **Note:** This is a sheet/panel component, not a standalone page route. It opens over the List Detail page (`/lists/[id]`). See [06a-page-list-detail.md](./06a-page-list-detail.md) for the parent page spec.

---

## Overview

The Product Detail Sheet is where users go deeper on a single product. Tapping any product card (or table row) on the List Detail page opens this sheet, revealing everything the AI extracted plus space for collaboration.

On mobile, it slides up from the bottom as a near-full-screen sheet. On desktop, it slides in from the right as a side panel (like Linear's issue detail), keeping the product grid visible behind it for context. This lets users quickly flip between products without losing their place.

The sheet serves three purposes:

1. **Full product information** — hero image, complete specs table, pros/cons, price details, and source link. Everything the card view hides behind progressive disclosure lives here.
2. **AI insights** — the AI-generated summary, review synthesis, and verdict are displayed prominently. These are the extracted fields from the ingestion pipeline (`ai_summary`, `ai_review_summary`, `ai_verdict`), presented as readable sections rather than raw text.
3. **Collaboration** — a comment thread at the bottom lets family members discuss the product. Comments appear in real-time via Supabase Realtime. Action buttons (shortlist, mark purchased, delete) are always accessible.

The sheet also handles two special states: **extraction in progress** (skeleton content with a progress indicator) and **extraction failed** (error state with a retry button).

---

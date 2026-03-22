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

## Layout — Desktop (Right Sheet)

```
┌────────────────────────────────────────────┬──────────────────────────────┐
│                                            │  ← Back to list        [✕]  │
│  [main content — product grid or table]    │  ─────────────────────────── │
│                                            │                              │
│  Cards/rows remain visible but dimmed      │  ┌──────────────────────┐   │
│  slightly. Clicking outside the sheet      │  │                      │   │
│  closes it.                                │  │   🖼  Product Image   │   │
│                                            │  │      (hero, 16:9)    │   │
│                                            │  │                      │   │
│                                            │  └──────────────────────┘   │
│                                            │                              │
│                                            │  Sony A80L 65" OLED TV      │
│                                            │  Sony · amazon.in 🔗        │
│                                            │                              │
│                                            │  ₹89,990                    │
│                                            │  ★ 4.5 (2,100 reviews)      │
│                                            │                              │
│                                            │  ✨ "Premium pick" ── AI verdict
│                                            │                              │
│                                            │  ─────────────────────────── │
│                                            │                              │
│                                            │  [★ Shortlisted]  [Mark Purchased]
│                                            │                              │
│                                            │  ─────────────────────────── │
│                                            │                              │
│                                            │  ▸ AI Summary                │
│                                            │  ▸ Specs (12)                │
│                                            │  ▸ Pros & Cons               │
│                                            │  ▸ Reviews                   │
│                                            │                              │
│                                            │  ─────────────────────────── │
│                                            │                              │
│                                            │  💬 Comments (3)             │
│                                            │  ┌──────────────────────┐   │
│                                            │  │ Aman: "This is the   │   │
│                                            │  │ one. Picture quality  │   │
│                                            │  │ is insane."    2h ago │   │
│                                            │  ├──────────────────────┤   │
│                                            │  │ Priya: "Too pricey.  │   │
│                                            │  │ What about the       │   │
│                                            │  │ Samsung?"      1h ago│   │
│                                            │  └──────────────────────┘   │
│                                            │                              │
│                                            │  ┌──────────────────────┐   │
│                                            │  │ Add a comment...     │   │
│                                            │  └──────────────────────┘   │
│                                            │                              │
│                                            │  ─────────────────────────── │
│                                            │  Added by Aman · Mar 18     │
│                                            │  [🔗 View on amazon.in]     │
│                                            │  [🗑 Remove from list]      │
│                                            │                              │
└────────────────────────────────────────────┴──────────────────────────────┘

Legend:
  [✕] = Close sheet
  [★ Shortlisted] = Toggle button, filled when active
  ▸ = Collapsible accordion section (closed by default except AI Summary)
  🔗 = External link to source product page
```

**Sheet dimensions:** `w-[440px]` fixed width. Full viewport height. Separated from main content by `border-l border-border`.

**Overlay:** Main content gets a `bg-black/5` overlay (light) or `bg-black/20` overlay (dark). Clicking the overlay closes the sheet.

**Scroll:** The sheet content scrolls independently. The hero image scrolls with content (not sticky). Action buttons are inline, not sticky — the sheet is short enough that they're always accessible without scrolling on most viewports, and sticking them would eat vertical space.

---

## Layout — Mobile (Bottom Sheet)

```
┌───────────────────────────────┐
│  ── drag handle ──            │
│  ← Back                 [✕]  │
│  ──────────────────────────── │
│                               │
│  ┌───────────────────────────┐│
│  │                           ││
│  │    🖼  Product Image       ││
│  │       (hero, 16:9)        ││
│  │                           ││
│  └───────────────────────────┘│
│                               │
│  Sony A80L 65" OLED TV        │
│  Sony · amazon.in 🔗          │
│                               │
│  ₹89,990                      │
│  ★ 4.5 (2,100 reviews)        │
│                               │
│  ✨ "Premium pick"             │
│                               │
│  ──────────────────────────── │
│                               │
│  [★ Shortlisted] [Purchased]  │
│                               │
│  ──────────────────────────── │
│                               │
│  ▸ AI Summary                 │
│  ▸ Specs (12)                 │
│  ▸ Pros & Cons                │
│  ▸ Reviews                    │
│                               │
│  ──────────────────────────── │
│                               │
│  💬 Comments (3)               │
│  ┌───────────────────────────┐│
│  │ Aman: "This is the one.  ││
│  │ Picture quality is        ││
│  │ insane."          2h ago  ││
│  ├───────────────────────────┤│
│  │ Priya: "Too pricey."     ││
│  │                    1h ago ││
│  └───────────────────────────┘│
│                               │
│  ┌───────────────────────────┐│
│  │ Add a comment...          ││
│  └───────────────────────────┘│
│                               │
│  ──────────────────────────── │
│  Added by Aman · Mar 18       │
│  [🔗 View on amazon.in]       │
│  [🗑 Remove from list]        │
│                               │
└───────────────────────────────┘
```

**Sheet height:** Opens to 92vh (near full screen). Draggable handle at top — swipe down to close. Uses shadcn `Sheet` with `side="bottom"`.

**Padding:** `px-4 pb-8` (extra bottom padding for safe area on notched phones via `pb-safe`).

**Image:** Full width, no horizontal padding on the image itself (bleeds edge to edge within the sheet).

---

## Layout — Extraction In Progress

Shown when the product has `extraction_status = 'pending'` or `'processing'`. The user tapped a skeleton card and opened the sheet before extraction finished.

```
┌──────────────────────────────┐
│  ← Back                [✕]  │
│  ─────────────────────────── │
│                              │
│  ┌────────────────────────┐  │
│  │░░░░░░░░░░░░░░░░░░░░░░░░│  │
│  │░░░░  skeleton image  ░░│  │
│  │░░░░░░░░░░░░░░░░░░░░░░░░│  │
│  └────────────────────────┘  │
│                              │
│  ░░░░░░░░░░░░░░░░░          │  ← title skeleton
│  ░░░░░░░░░░                  │  ← brand + domain
│                              │
│  ░░░░░░░                     │  ← price
│  ░░░░░░░░░░░░                │  ← rating
│                              │
│  ─────────────────────────── │
│                              │
│  ◌ Extracting product data...│
│    Scraping page and running │
│    AI analysis               │
│                              │
│  ████████░░░░░░░░░░ ~40%     │  ← indeterminate progress bar
│                              │
│  ─────────────────────────── │
│  Source: amazon.in/dp/B0C... │
│                              │
└──────────────────────────────┘

Legend:
  ░░░ = Skeleton placeholder (animate-pulse)
  ◌ = Spinner icon (animate-spin)
  ████░░░ = Indeterminate progress bar (ai-accent color)
```

**Behavior:** Skeletons match the real content layout exactly (same heights and widths). When extraction completes, Supabase Realtime pushes the update and content crossfades in from the skeleton. The URL is always visible at the bottom — the one piece of real data we have before extraction.

**Progress bar:** Indeterminate (oscillating) since we can't predict extraction time. Uses `--ai-accent` color. Styled as a thin bar (`h-1 rounded-full`).

---

## Layout — Extraction Failed

Shown when `extraction_status = 'failed'`.

```
┌──────────────────────────────┐
│  ← Back                [✕]  │
│  ─────────────────────────── │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │     ⚠  Extraction      │  │
│  │        Failed           │  │
│  │                        │  │
│  │  We couldn't extract    │  │
│  │  product data from      │  │
│  │  this page.             │  │
│  │                        │  │
│  │  "Connection timed out" │  │  ← extraction_error
│  │                        │  │
│  │  ┌──────────────────┐  │  │
│  │  │   ↻ Try Again    │  │  │
│  │  └──────────────────┘  │  │
│  │                        │  │
│  │  ┌──────────────────┐  │  │
│  │  │  🔗 Open Page    │  │  │
│  │  └──────────────────┘  │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ─────────────────────────── │
│  Source: amazon.in/dp/B0C... │
│  [🗑 Remove from list]       │
│                              │
└──────────────────────────────┘
```

**"Try Again"** re-triggers the ingestion pipeline by resetting `extraction_status` to `'pending'`, which fires the database webhook again. The sheet transitions back to the extraction-in-progress state.

**"Open Page"** opens the source URL in a new tab — lets the user verify the link is valid.

---

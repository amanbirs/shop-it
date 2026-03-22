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

## Design Decisions

### Decision 1: Panel Type — Right Sheet vs Modal vs Full Page

**Chosen: Right sheet (desktop) + bottom sheet (mobile)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Right sheet / bottom sheet (Chosen)** | Keeps product grid visible for context. Quick to open/close. Matches Linear's issue detail pattern. Natural on mobile as bottom sheet. | Limited width (440px) constrains layout. Can't show very wide spec tables. |
| **B. Modal dialog** | Centered, focused attention. Familiar pattern. | Completely hides the list. No context. Feels heavy for quick browsing. |
| **C. Full page route (`/lists/[id]/products/[pid]`)** | Unlimited space. Can deep-link. SEO-friendly. | Complete context switch. Slow to browse multiple products. Back button required. |
| **D. Expandable card (inline)** | No overlay at all — card expands in place. | Pushes other cards around. Breaks grid layout. Hard to show comments inline. |

Right sheet is the established pattern in the project (Expert Opinion panel uses the same approach). Users can quickly flip between products by clicking different cards while the sheet is open — the content swaps without the sheet closing. NN/g cautions against using bottom sheets for full product detail pages with complex navigation, but our case is different: the sheet shows a single product's data with no internal navigation beyond accordion sections. The source URL link opens externally, not within the sheet.

### Decision 2: Content Organization — Accordion vs Tabs vs Long Scroll

**Chosen: Vertically collapsed accordion sections**

| Option | Pros | Cons |
|--------|------|------|
| **A. Accordion sections (Chosen)** | Baymard research shows only 8% of users overlook sections (vs 27% with tabs). Progressive disclosure — open what you need. Multiple sections can be open simultaneously. | Requires scrolling if many sections open. |
| **B. Horizontal tabs** | Clean, organized. Fixed content height. | Baymard: 27% of users overlook tabbed content. Tabs inside a side panel feel cramped. Hides content behind an extra click. |
| **C. Single long scroll** | Everything visible. No hidden content. | Overwhelming. Specs table + reviews + comments = very long scroll. Hard to find specific sections. |

shadcn `Accordion` with `type="multiple"` so users can expand several sections at once. The "AI Summary" section defaults to open (it's the most valuable content). All others start collapsed. This matches Baymard's 2025 finding that vertically collapsed sections outperform every other layout for product detail pages.

The accordion lives inside a shadcn `ScrollArea` with `h-[calc(100vh-80px)]` to ensure smooth scrolling within the constrained sheet panel.

### Decision 3: Product Navigation — Swipe Between Products

**Chosen: Click-to-swap with keyboard shortcuts**

| Option | Pros | Cons |
|--------|------|------|
| **A. Click-to-swap + keyboard (Chosen)** | Simplest. Click a different card → sheet content swaps. Arrow keys (↑/↓) navigate between products. No gesture complexity. | Requires the grid to be visible (fine on desktop, not on mobile bottom sheet). |
| **B. Swipe left/right inside sheet** | Natural mobile gesture. Carousel-like browsing. | Complex to implement. Users may confuse with "swipe to close." No visual indication of order. |
| **C. Prev/Next arrows in sheet header** | Works on both mobile and desktop. Clear navigation affordance. | Adds UI clutter. Order may be confusing if products are filtered. |

On desktop, clicking a different product card while the sheet is open swaps the content with a crossfade animation. On mobile (bottom sheet), we add small `←` / `→` nav arrows in the header since the grid isn't visible behind the sheet. Keyboard shortcuts: `j`/`k` or `↑`/`↓` to navigate between products (same as Linear's issue navigation).

### Decision 4: Comment Thread — Inline vs Separate Section

**Chosen: Inline at bottom of sheet**

| Option | Pros | Cons |
|--------|------|------|
| **A. Inline at bottom (Chosen)** | Comments are always visible after scrolling through product info. Natural reading flow: learn about product → discuss it. | Adds length to the sheet. |
| **B. Separate tab** | Clean separation of product info and discussion. | Tabs-in-a-sheet feels heavy. Easy to miss (Baymard tab problem). |
| **C. Popover from a button** | Saves space. Opens a mini chat window. | Feels disconnected from the product context. Extra click. |

Comments sit below a `Separator` after the accordion sections. The thread supports one level of replies (matching the `comments.parent_id` schema). New comments from other collaborators animate in via Supabase Realtime. The comment input is a simple text field — not a rich text editor — matching the "Apple Notes simplicity" principle from our design research.

### Decision 5: Action Buttons — Sticky vs Inline

**Chosen: Inline (not sticky)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Inline (Chosen)** | Clean. Buttons are part of the content flow. No permanent UI eating vertical space. | Must scroll up to find them if deep in comments. |
| **B. Sticky footer bar** | Always accessible. No hunting. | Eats 56px+ of vertical space permanently. On a 440px-wide sheet, this feels cramped. Covers content. |
| **C. Sticky header actions** | Visible at top. Combines with close button. | Header becomes heavy. Competes with product title for attention. |

Action buttons (Shortlist + Mark Purchased) are placed inline below the price/rating block and above the accordion. This is the "hero zone" — the most visible area after opening the sheet. On typical viewports, this zone is visible without scrolling. The destructive action (Remove from list) is isolated at the very bottom, below comments, with `variant="ghost"` styling in `text-destructive` — hard to hit accidentally.

### Decision 6: Image Treatment — Hero vs Thumbnail vs Gallery

**Chosen: Single hero image, full width**

| Option | Pros | Cons |
|--------|------|------|
| **A. Single hero image (Chosen)** | Clean. One great photo. Matches the card's image but larger. Fast to load. | Only one image (but we only extract one via ingestion). |
| **B. Image carousel/gallery** | Shows multiple angles. Richer visual context. | We only extract `image_url` (single image) in v1. Carousel for one image is silly. |
| **C. Small thumbnail** | Saves space for text content. | Loses visual impact. Product images sell — they should be prominent. |

Single hero image at `aspect-video` (16:9), full width within the sheet. This mirrors the card's image treatment but at a larger scale. In dark mode, images get `brightness-90` to prevent them from feeling like a flashlight. If `image_url` is null (rare — extraction usually finds one), we show a placeholder with the product's domain favicon centered on a `bg-muted` background.

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Sheet container** | shadcn `<Sheet>` | Desktop: `<SheetContent side="right" className="w-[440px] p-0">`. Mobile: `<SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">`. Content wrapped in `<ScrollArea className="h-full">`. |
| 2 | **Close button** | shadcn `<SheetClose>` | `<Button variant="ghost" size="icon">` with `X` icon. Top-right corner. `absolute right-4 top-4 z-10`. |
| 3 | **Back / title row** | Custom flex row | `← Back to list` as `<Button variant="ghost" size="sm">` with `ChevronLeft` icon. Mobile: also shows `← →` product navigation arrows at right end. `sticky top-0 z-10 bg-card/80 backdrop-blur-sm px-4 py-3 border-b`. |
| 4 | **Hero image** | `<img>` or Next.js `<Image>` | `aspect-video w-full object-cover`. No horizontal padding (bleeds edge-to-edge within sheet). Falls back to `<div className="aspect-video bg-muted flex items-center justify-center">` with domain favicon if `image_url` is null. Dark mode: `dark:brightness-90`. |
| 5 | **Product title** | `<h2>` | `text-xl font-semibold text-foreground leading-tight`. Full text, no truncation (unlike card's `line-clamp-2`). `px-5 pt-4`. |
| 6 | **Brand + domain row** | Flex row | Brand in `text-sm text-muted-foreground`. Domain as `<DomainBadge>` (favicon + domain text, `text-xs bg-muted rounded-full px-2 py-0.5`). Source link icon `<ExternalLink size={12}>` next to domain — opens product URL in new tab. |
| 7 | **Price display** | `<PriceDisplay>` | Uses `price_min`, `price_max`, `currency`. Single price: `text-lg font-semibold`. Range: `₹69,990 – ₹89,990`. `price_note` rendered below in `text-xs text-muted-foreground italic` (e.g., "Sale ends Apr 1"). |
| 8 | **Rating badge** | Custom flex row | Filled star icon (`text-amber-500`) + `rating` as `text-sm font-medium` + review count in `text-muted-foreground text-sm` parenthetical. e.g., `★ 4.5 (2,100 reviews)`. Null rating: section hidden entirely. |
| 9 | **AI verdict badge** | `<Badge>` | `✨` sparkle prefix + `ai_verdict` text. `bg-ai-accent/10 text-ai-accent border-ai-accent/20 text-sm`. e.g., `✨ "Premium pick"`. Hidden if `ai_verdict` is null. |
| 10 | **Action buttons** | Flex row of `<Button>` | Two buttons side by side in `px-5`. **Shortlist:** `<Button variant={isShortlisted ? "default" : "outline"}>` with star icon. Filled amber when active. **Mark Purchased:** `<Button variant="outline">` with `Check` icon. Switches to `variant="default"` green when purchased. Both full-width within a `grid grid-cols-2 gap-3`. |
| 11 | **Accordion container** | shadcn `<Accordion type="multiple" defaultValue={["ai-summary"]}>` | Four accordion items. Wrapped in `px-5`. Each `AccordionTrigger` uses `text-sm font-medium`. Section count badges in `text-muted-foreground` (e.g., "Specs (12)"). |
| 12 | **AI Summary section** | `<AccordionItem value="ai-summary">` | Renders `ai_summary` as a paragraph in `text-sm text-foreground leading-relaxed`. Below it, `ai_review_summary` as a second paragraph with a `💬` prefix and `text-muted-foreground italic`. Opens by default. |
| 13 | **Specs section** | `<AccordionItem value="specs">` | Renders `specs` JSONB as a two-column key-value table. Keys in `text-muted-foreground text-xs uppercase tracking-wide`. Values in `text-sm text-foreground`. Alternating row background: `even:bg-muted/30`. Trigger shows count: "Specs (12)". |
| 14 | **Pros & Cons section** | `<AccordionItem value="pros-cons">` | Two columns (or stacked on narrow sheets). Pros: green `CheckCircle` icon + text. Cons: red `XCircle` icon + text. Each item `text-sm`. Items from `pros[]` and `cons[]` arrays. Empty arrays: section hidden. |
| 15 | **Reviews section** | `<AccordionItem value="reviews">` | Renders `scraped_reviews` JSONB array. Each review: snippet text in `text-sm italic`, star rating as small stars, source badge. Max 5 shown, "Show all" expander if more. Empty array: section hidden. |
| 16 | **Comments section** | `<CommentThread>` | Below accordion, after a `<Separator>`. Header: `💬 Comments (N)` in `text-sm font-medium`. Each comment: avatar + name + content + relative timestamp. Replies indented with `ml-8 border-l-2 border-muted pl-3`. New comments from Realtime animate in. |
| 17 | **Comment input** | `<CommentInput>` | `<Input placeholder="Add a comment..." className="text-sm">` with `<Button variant="ghost" size="icon">` send arrow. Submit on Enter. Optimistic: comment appears immediately, reverts on failure. |
| 18 | **Footer metadata** | Custom section | Below comments after `<Separator>`. "Added by {name} · {relative_time}" in `text-xs text-muted-foreground`. |
| 19 | **Source link button** | `<Button variant="outline" size="sm">` | `🔗 View on {domain}`. Opens `url` in new tab via `window.open`. `w-full`. |
| 20 | **Remove button** | `<Button variant="ghost" size="sm">` | `🗑 Remove from list`. `text-destructive hover:text-destructive hover:bg-destructive/10 w-full`. Confirms via `AlertDialog` before deleting. Intentionally at the bottom, isolated from other actions. |
| 21 | **Extraction skeleton** | Custom skeleton layout | Matches elements 4-9 exactly: image skeleton (`aspect-video`), title skeleton (2 lines), price skeleton (1 line), rating skeleton, verdict skeleton. All with `animate-pulse`. Shown when `extraction_status` is `pending` or `processing`. |
| 22 | **Extraction progress indicator** | Custom component | Spinner icon (`Loader2 className="animate-spin"`) + "Extracting product data..." text + indeterminate progress bar in `bg-ai-accent h-1 rounded-full` with CSS `@keyframes` sliding animation. |
| 23 | **Extraction error state** | `<ErrorState>` | Warning icon + "Extraction Failed" heading + `extraction_error` text + "Try Again" `<Button>` + "Open Page" `<Button variant="outline">`. Centered within the sheet content area. |
| 24 | **Mobile nav arrows** | Two `<Button variant="ghost" size="icon">` | `ChevronLeft` and `ChevronRight` icons. Only shown on mobile bottom sheet (desktop uses click-to-swap on grid). Disabled at first/last product. In the header row, right-aligned. |

---

## Animation Spec

### Sheet Open (Desktop — Right)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Overlay fades in: opacity 0→0.05 (light) / 0→0.20 (dark)
  0ms     Sheet slides in from right: x: 100%→0%
  300ms   Complete
─────────────────────────────────────────────────────
  Easing: spring(1, 80, 12) — fast snap with subtle settle
```

**Framer Motion implementation:**
```
<SheetContent>
  <motion.div
    initial={{ x: "100%" }}
    animate={{ x: 0 }}
    exit={{ x: "100%" }}
    transition={{ type: "spring", stiffness: 80, damping: 12 }}
  />
</SheetContent>
```

Note: shadcn Sheet uses Radix Dialog internally which has its own enter/exit animations via CSS. We override with `data-[state=open]:animate-none` and apply Framer Motion for physics-based spring feel instead of CSS ease.

### Sheet Open (Mobile — Bottom)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Overlay fades in: opacity 0→0.30
  0ms     Sheet slides up from bottom: y: 100%→0%
  350ms   Complete
─────────────────────────────────────────────────────
  Easing: spring(1, 70, 14) — slightly softer than desktop
```

### Content Stagger (on sheet open)

```
Timeline (after sheet animation completes):
─────────────────────────────────────────────────────
  0ms     Hero image      opacity 0→1
  60ms    Title           opacity 0→1, y: 6→0
  120ms   Brand/domain    opacity 0→1, y: 6→0
  180ms   Price/rating    opacity 0→1, y: 6→0
  240ms   AI verdict      opacity 0→1, y: 6→0
  300ms   Action buttons  opacity 0→1, y: 6→0
  360ms   Accordion       opacity 0→1
─────────────────────────────────────────────────────
  Each element: duration 300ms, ease [0.25, 0.4, 0, 1]
```

**Framer Motion implementation:**
```
Parent:
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 }}
  }}

Each child:
  variants={{
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0,
               transition: { duration: 0.3, ease: [0.25, 0.4, 0, 1] }}
  }}
```

### Product Swap (click different card while sheet is open)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Current content fades out: opacity 1→0 (150ms)
  150ms   New content fades in: opacity 0→1 (200ms)
          ScrollArea scrolls to top
─────────────────────────────────────────────────────
  No sheet close/reopen — content swaps in place
```

**Framer Motion implementation:**
```
<AnimatePresence mode="wait">
  <motion.div
    key={product.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    <ProductDetailContent product={product} />
  </motion.div>
</AnimatePresence>
```

### Shortlist Toggle

```
Tap:
  0ms     Star icon: scale 1→0.85 (whileTap)
  Release Icon fills: outline→filled
          Color: muted-foreground → amber-500
          Scale: 0.85→1.15→1 (spring bounce)
          Duration: 300ms, spring(1, 80, 10)

Untap (remove shortlist):
  Same scale animation but color: amber-500 → muted-foreground
  Icon: filled → outline
```

### Mark Purchased

```
Tap:
  0ms     Button: scale 1→0.97 (whileTap)
  Release Checkmark icon appears with draw-on animation (strokeDashoffset)
          Button bg transitions: transparent → green-500/10
          Button text: "Mark Purchased" → "✓ Purchased"
          Duration: 400ms total
```

### Extraction Complete (skeleton → real content)

```
Timeline (triggered by Supabase Realtime):
─────────────────────────────────────────────────────
  0ms     Skeleton pulse stops
  0ms     Real content crossfades in:
          Image: skeleton→real (opacity 0→1, 300ms)
          Title: skeleton→text (opacity 0→1, y: 4→0, 300ms)
          Price: skeleton→text (opacity 0→1, 200ms, +100ms delay)
          Rating: skeleton→text (opacity 0→1, 200ms, +150ms delay)
  400ms   Verdict badge fades in (opacity 0→1, scale 0.95→1, 250ms)
  500ms   Progress indicator fades out
  600ms   Accordion section appears (opacity 0→1, y: 8→0)
─────────────────────────────────────────────────────
```

### New Comment (Realtime)

```
Another user's comment arrives:
  0ms     Comment slides in: y: -8→0, opacity 0→1
  200ms   Complete
          Brief highlight: bg-ai-accent/10 → transparent (600ms fade)
          Ease: ease-out
```

### Sheet Close

```
Desktop:
  Sheet slides out: x: 0→100% (200ms, ease-in)
  Overlay fades: opacity→0 (150ms)

Mobile:
  Sheet slides down: y: 0→100% (250ms, ease-in)
  Also closeable by drag — velocity-based dismiss (if drag velocity > 500px/s, close)
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Sheet background | `bg-card` (white) | `bg-card` (#111 range) |
| Sheet border (desktop) | `border-l border-border` (zinc-200) | `border-l border-border` (zinc-800) |
| Overlay behind sheet | `bg-black/5` | `bg-black/20` |
| Header bar (sticky) | `bg-card/80 backdrop-blur-sm` | `bg-card/80 backdrop-blur-sm` |
| Hero image | Full brightness | `brightness-90` filter |
| Image placeholder bg | `bg-muted` (zinc-100) | `bg-muted` (zinc-800) |
| Product title | `text-foreground` (near-black) | `text-foreground` (off-white) |
| Brand text | `text-muted-foreground` (zinc-500) | `text-muted-foreground` (zinc-400) |
| Domain badge bg | `bg-muted` (zinc-100) | `bg-muted` (zinc-800) |
| Price text | `text-foreground font-semibold` | `text-foreground font-semibold` |
| Rating star | `text-amber-500` | `text-amber-400` (desaturated) |
| AI verdict badge bg | `bg-ai-accent/10` | `bg-ai-accent/15` |
| AI verdict badge text | `text-ai-accent` | `text-ai-accent` (desaturated 20%) |
| Shortlist button (active) | `bg-amber-500 text-white` | `bg-amber-400/90 text-white` |
| Purchased button (active) | `bg-green-600 text-white` | `bg-green-500/90 text-white` |
| Accordion trigger | `text-foreground hover:bg-muted` | `text-foreground hover:bg-muted` |
| Accordion content bg | `bg-background` | `bg-background` |
| Specs table even rows | `bg-muted/30` | `bg-muted/20` |
| Specs key text | `text-muted-foreground` | `text-muted-foreground` |
| Pros icon | `text-green-600` | `text-green-400` |
| Cons icon | `text-red-600` | `text-red-400` |
| Comment bg | `bg-background` | `bg-background` |
| Comment author | `text-foreground text-sm font-medium` | `text-foreground text-sm font-medium` |
| Comment timestamp | `text-muted-foreground text-xs` | `text-muted-foreground text-xs` |
| Comment reply border | `border-l-2 border-muted` | `border-l-2 border-muted` |
| New comment highlight | `bg-ai-accent/10` | `bg-ai-accent/15` |
| Comment input | `bg-background border-input` | `bg-muted/30 border-input` |
| Remove button | `text-destructive` (red-500) | `text-destructive` (red-400) |
| Separator | `bg-border` (zinc-200) | `bg-border` (zinc-800) |
| Progress bar | `bg-ai-accent` | `bg-ai-accent` |
| Skeleton pulse | `bg-muted animate-pulse` | `bg-muted animate-pulse` |
| Error icon | `text-amber-500` | `text-amber-400` |
| Drag handle (mobile) | `bg-muted-foreground/30 w-12 h-1 rounded-full` | `bg-muted-foreground/20 w-12 h-1 rounded-full` |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Bottom sheet at 92vh. Drag handle to close. Full-width hero image. `← →` nav arrows in header for product switching. Comment input gets `pb-safe` for notched phones. Accordion sections fill full width. Action buttons stack vertically if text is long (`grid-cols-1`). Font sizes unchanged — sheet is already full width so no cramping. |
| Tablet (`640-1024px`) | Right sheet at `w-[400px]`. Slightly narrower than desktop to leave more list content visible. Otherwise identical to desktop behavior. Touch-friendly — all tap targets ≥ 44px. |
| Desktop (`> 1024px`) | Right sheet at `w-[440px]`. Click-to-swap navigation via product grid. Keyboard shortcuts active (`j`/`k` for nav, `s` for shortlist, `Esc` to close). Hover states on buttons and domain link. Accordion can have multiple sections open simultaneously without feeling cramped. |

**Sheet width rationale:**
- 440px is wide enough for readable text (65-75 chars per line at `text-sm`) and a comfortable specs table, but narrow enough to keep 60%+ of the product grid visible on a 1280px screen.
- On tablets (640-1024px), 400px leaves enough room for 1-2 visible product cards, maintaining context.

**Comment input on mobile:**
- Fixed at the bottom of the scroll area (not sticky-fixed to viewport — that would cover content). Uses `pb-safe` / `env(safe-area-inset-bottom)` to stay above the home indicator on notched phones.
- On keyboard open: the sheet naturally scrolls so the input stays visible. No special handling needed — this is default browser behavior for inputs inside scrollable containers.

---

## Accessibility

- **Sheet** uses Radix Dialog internally — proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the product title. Focus is trapped within the sheet while open.
- **Close button** has `aria-label="Close product detail"`. Also closeable via `Escape` key.
- **Hero image** has `alt={product.title}`. Placeholder has `aria-label="No product image available"`.
- **Product title** is `<h2>` — proper heading hierarchy within the sheet (sheet title is the product name).
- **External link** (domain badge) has `aria-label="View on {domain} (opens in new tab)"` and `target="_blank" rel="noopener noreferrer"`.
- **Price** has `aria-label="Price: {formatted price}"` for screen readers to announce the full formatted value including currency.
- **Rating** has `aria-label="{rating} out of 5 stars, {review_count} reviews"`.
- **AI verdict** has `aria-description="AI-generated verdict"` so screen readers announce the AI context.
- **Shortlist button** uses `aria-pressed={isShortlisted}` and `aria-label="Shortlist {product title}"`. State change announced via `aria-live="polite"` region.
- **Mark Purchased button** uses `aria-pressed={isPurchased}` and `aria-label="Mark {product title} as purchased"`.
- **Accordion** — shadcn Accordion is built on Radix, which implements WAI-ARIA accordion pattern automatically: `role="region"`, `aria-labelledby`, `aria-expanded`, `aria-controls`. Keyboard: `Enter`/`Space` to toggle, arrow keys to navigate between sections.
- **Specs table** uses `role="table"` with `role="row"` and `role="cell"` for proper screen reader announcement.
- **Comment thread** — each comment has `role="article"` with `aria-label="{author name} commented: {content}"`. New comments announced via `aria-live="polite"` container.
- **Comment input** has `aria-label="Add a comment on {product title}"`. Submit button has `aria-label="Send comment"`.
- **Remove button** — `AlertDialog` confirmation is fully keyboard accessible (Radix). Focus moves to the cancel button by default (preventing accidental deletion).
- **Mobile nav arrows** have `aria-label="Previous product"` / `aria-label="Next product"` and `aria-disabled` when at boundaries.
- **Keyboard shortcuts** (desktop):
  - `Escape` — close sheet
  - `j` / `↓` — next product
  - `k` / `↑` — previous product
  - `s` — toggle shortlist
  - `p` — toggle purchased
  - Shortcuts disabled when comment input is focused (to avoid conflicts with typing).
- **Extraction loading** — skeleton region has `aria-busy="true"` and `aria-label="Loading product details"`. Progress bar has `role="progressbar"` with `aria-valuetext="Extracting product data"`.
- **Extraction error** — error message is in an `aria-live="assertive"` region so it's immediately announced. "Try Again" button is auto-focused.
- **`prefers-reduced-motion`** — all Framer Motion animations respect `useReducedMotion()`. When enabled: sheet appears instantly (no slide), content appears without stagger, shortlist toggle has no bounce. Functional behavior unchanged.
- **Touch targets** — all buttons and interactive elements are minimum 44x44px. Accordion triggers use full-width tap areas.

---

## Appendix: Dynamic / Data-Adaptive UI (Future Direction)

> **Status: Exploration / v2 consideration.** This section captures opportunities to make the Product Detail Sheet adapt its layout, emphasis, and visible sections based on the actual data each product carries. The current spec uses a static template — every product gets the same layout. This appendix asks: what if the sheet were smarter?

### The Opportunity

Our data model is inherently variable. A TV has `specs: { screen_size: "65\"", refresh_rate: "120Hz", panel_type: "OLED" }`. A stroller has `specs: { weight_capacity: "25kg", fold_type: "one-hand", wheel_size: "12\"" }`. These have zero overlap — the data model already acknowledged this by making `specs` JSONB. But the UI currently treats them identically: same accordion, same layout, same visual weight.

Meanwhile, the industry is moving fast. [Gartner predicts 30% of all new apps will use AI-driven adaptive interfaces by 2026](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products). [Vercel's AI SDK 3.0 introduced Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) — streaming React Server Components from LLMs. [Google launched A2UI](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) for agent-driven, generative interfaces. The direction is clear: UIs that shape themselves around data, not data that fills a fixed template.

### What Varies Per Product (Data Analysis)

| Field | Variability | UI Impact |
|-------|------------|-----------|
| `specs` (JSONB) | **High** — keys differ by category. A laptop might have 20 specs, a book might have 3. | Spec table rows vary. A 3-spec product shouldn't show the same visual weight as a 20-spec product. |
| `pros[]` / `cons[]` | **Medium** — some products have 5+ pros, some have 0. Ratio varies (all pros? mixed? all cons?). | A product that's all-pros-no-cons could highlight differently than a contentious product with 5 cons. |
| `ai_verdict` | **Medium** — tone varies: "Best value", "Premium pick", "Risky — mixed reviews", null. | A "Risky" verdict should feel visually different than a "Best value" verdict. Color, icon, weight. |
| `ai_summary` | **Low** — always a paragraph. Length varies (50-300 words). | Long summaries could truncate with "Read more". Short ones display in full. |
| `ai_review_summary` | **Medium** — present or null depending on whether reviews existed on the source page. | If null, the "Reviews" accordion section has nothing meaningful. Why show it? |
| `scraped_reviews[]` | **Medium** — 0 to 10+ reviews. Some have ratings, some don't. | Zero reviews → hide the section entirely. Many reviews → show aggregate + expandable list. |
| `rating` / `review_count` | **Medium** — null for products without ratings on the source page. | No rating → hide the star display. High review count → emphasize social proof. |
| `price_min` / `price_max` | **Low-Medium** — single price vs range. `price_note` present or null. | Range products could show a price slider or "from ₹X" treatment. |
| `image_url` | **Low** — usually present, occasionally null. | Already handled (placeholder fallback). But quality/aspect ratio varies. |
| `category` | **Medium** — freeform text, often null. When present, could drive layout hints. | Category could trigger visual themes or spec groupings (see below). |

### Concrete Opportunities (Ranked by Impact vs Effort)

#### Tier 1: Low Effort, High Impact (v1.1)

**1. Conditional Section Visibility**
Don't show empty sections. This is already partially described in the element breakdown ("Empty arrays: section hidden") but should be systematic:

```
Rules:
- pros.length === 0 && cons.length === 0 → hide Pros & Cons accordion item
- scraped_reviews.length === 0 && !ai_review_summary → hide Reviews accordion item
- Object.keys(specs).length === 0 → hide Specs accordion item
- !rating → hide rating badge row entirely
- !ai_verdict → hide verdict badge
- !price_note → hide price note line
```

This isn't "dynamic UI" in the generative sense — it's just good conditional rendering. But it means a product with only an AI summary and a price looks clean and focused, not like a skeleton with empty sections.

**2. Verdict-Aware Coloring**
The `ai_verdict` already carries sentiment. Use it:

```
Verdict contains "best" / "top" / "excellent" / "premium"
  → badge: bg-green-500/10 text-green-700 border-green-500/20
  → icon: Trophy or Sparkles

Verdict contains "risky" / "mixed" / "caution" / "avoid"
  → badge: bg-amber-500/10 text-amber-700 border-amber-500/20
  → icon: AlertTriangle

Verdict contains "value" / "budget" / "affordable"
  → badge: bg-blue-500/10 text-blue-700 border-blue-500/20
  → icon: BadgeDollarSign

Default / neutral
  → badge: bg-ai-accent/10 text-ai-accent (current styling)
  → icon: Sparkles
```

Implementation: a simple keyword-match function. Or better — have Gemini return a `verdict_sentiment` enum (`positive`, `neutral`, `caution`, `negative`) during extraction. One extra field, zero ambiguity.

**3. Spec Count-Aware Layout**
Adapt the specs section based on how many specs exist:

```
≤ 3 specs  → render inline as key: value pairs (no table, no accordion)
4-8 specs  → standard two-column table in accordion (current design)
9+ specs   → grouped table with category headers (if category hints available)
            OR searchable/filterable specs with a search input
```

#### Tier 2: Medium Effort, High Impact (v2)

**4. Category-Driven Section Ordering**
If `category` is set, reorder accordion sections by relevance:

```
Electronics (TV, laptop, phone):
  1. Specs (most important — users compare specs)
  2. AI Summary
  3. Pros & Cons
  4. Reviews

Fashion / Home:
  1. AI Summary (visual/subjective — summary matters more)
  2. Pros & Cons
  3. Reviews
  4. Specs (less important — "material: cotton" is not a decision driver)

Books / Media:
  1. AI Summary (essentially a review)
  2. Reviews
  3. Specs (just ISBN, pages, publisher — minimal)
  → Pros & Cons likely empty, auto-hidden
```

Implementation: a `categoryConfig` map that returns section order + default-open sections. Falls back to current order when `category` is null.

**5. Pros/Cons Sentiment Visualization**
Instead of flat lists, visualize the balance:

```
Mostly positive (4 pros, 1 con):
  ████████░░ 80% positive — show a subtle green tint on the section

Balanced (3 pros, 3 cons):
  █████░░░░░ 50/50 — neutral presentation, maybe a "Divisive" label

Mostly negative (1 pro, 4 cons):
  ██░░░░░░░░ 20% positive — amber/caution tint, "Proceed with caution" note
```

This turns raw data into an instant visual signal. Users glance and know whether to dive deeper or skip.

**6. Review Confidence Signal**
Combine `rating`, `review_count`, and `scraped_reviews` to show confidence:

```
rating: 4.5, review_count: 10,000+, reviews: 8 scraped
  → "Highly rated" badge, strong confidence, reviews section prominent

rating: 4.5, review_count: 12, reviews: 2 scraped
  → "Limited reviews" note, lower confidence signal, don't over-emphasize

rating: null, review_count: null, reviews: 0
  → "No reviews yet" — section hidden, no false confidence
```

#### Tier 3: High Effort, Transformative (v3 / Generative UI)

**7. AI-Composed Layout via Generative UI**
Use the Vercel AI SDK's Generative UI pattern: instead of rendering a fixed component tree, have the LLM compose the sheet layout as part of the extraction step.

```
During extraction, Gemini returns:
{
  ...existing fields...,
  "ui_hints": {
    "hero_emphasis": "image",        // or "specs" or "price"
    "primary_section": "specs",      // what to open by default
    "callout": "Price dropped 15% in the last week",
    "comparison_prompt": "Similar to Product X but with better battery",
    "visual_theme": "tech"           // drives subtle color/icon theming
  }
}
```

The sheet reads `ui_hints` and adapts: a fashion product gets a large hero image with specs minimized. A laptop gets specs front-and-center with the image smaller. A book gets the AI summary as the hero element, no image prominence.

This is the [Vercel Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) pattern applied to product detail — not streaming React components from the LLM (overkill for our case), but using AI-generated layout hints to drive conditional rendering.

**8. Cross-Product Contextual Callouts**
When the sheet opens, check the product against others in the same list:

```
"Cheapest in your list" → if price_min is lowest among list products
"Highest rated" → if rating is highest
"Most reviewed" → if review_count is highest
"Similar to {other product}" → if AI detects overlap (via embeddings or category match)
"Only option under ₹10,000" → if it's the sole product in a price bracket
```

These callouts appear as a small banner below the AI verdict. They're computed client-side from the list's product data — no extra API call. They make each product sheet contextually aware of its surroundings.

### Architecture Considerations

**Where the logic lives:**
- Tier 1 (conditional visibility, verdict coloring): Pure client-side. React conditional rendering. No schema changes.
- Tier 2 (category ordering, sentiment viz): Client-side with a config map. Optional: store `category` more reliably by having Gemini always extract it.
- Tier 3 (AI-composed hints): Requires schema change (`ui_hints jsonb` column or extending `specs`). Logic in the extraction pipeline (Gemini prompt includes layout hint instructions).

**Risk: Uncanny valley of personalization.**
[NN/g research](https://www.nngroup.com/articles/ecommerce-product-pages/) and [industry observation](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products) both warn that overly aggressive adaptation can feel jarring — users expect consistency. The sweet spot: **same structure, different emphasis**. The accordion sections are always there (when data exists). The order, default-open state, and visual weight shift — but the user always knows where to find things.

**Principle: Data-absent = section-absent, not section-empty.**
Never render a section with placeholder text like "No specs available." If there's no data, the section doesn't exist. This makes sparse products (e.g., a book with just a title and AI summary) feel intentionally minimal, not broken.

### Recommendation

Start with **Tier 1 in v1** (conditional visibility + verdict coloring + spec count layout). These are essentially free — just better conditional rendering. They make every product sheet feel "right" without any generative AI complexity.

Introduce **Tier 2 in v2** once `category` is reliably extracted. Category-driven ordering is the single highest-impact change for making sheets feel product-aware.

Explore **Tier 3 in v3** only if the product mix is diverse enough to justify it. For a family buying a TV, a stroller, and headphones in the same list, AI layout hints would make each sheet feel bespoke. For a list of 10 laptops, the consistency of a fixed layout is actually better.

---

## References

**Sheet/Drawer Patterns:**
- [shadcn Sheet](https://ui.shadcn.com/docs/components/radix/sheet) — the Sheet component we use (Radix Dialog-based)
- [Mobbin — Drawer UI Glossary](https://mobbin.com/glossary/drawer) — drawer variants and real-world examples
- [NN/g — Bottom Sheets: Definition and UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/) — when to use (and when not to use) bottom sheets
- [Material Design 3 — Bottom Sheets](https://m3.material.io/components/bottom-sheets/guidelines) — sheet sizing, drag-to-dismiss, and behavior specs
- [LogRocket — How to Design Bottom Sheets for Optimized UX](https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/) — mobile bottom sheet best practices
- [Design Monks — Side Drawer UI Guide](https://www.designmonks.co/blog/side-drawer-ui) — overlay vs push vs persistent drawer patterns
- [Creative Bloq — UI Pattern Tips: Slideouts, Sidebars and Drawers](https://www.creativebloq.com/ux/ui-design-pattern-tips-slideouts-sidebars-101413343) — when to use each panel type
- [SaaS Interface — Side Panel Examples](https://saasinterface.com/components/side-panel/) — 72 real-world side panel UI patterns

**Product Detail UX:**
- [Baymard Institute — Product Page UX Best Practices 2025](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — collapsed sections outperform tabs (8% vs 27% overlooked)
- [Baymard — Quick Views for Visually Driven Products](https://baymard.com/blog/mobile-desktop-quick-views) — when quick view panels help vs hurt
- [NN/g — UX Guidelines for E-Commerce Product Pages](https://www.nngroup.com/articles/ecommerce-product-pages/) — product page information architecture
- [UI Patterns — Product Page Design Pattern](https://ui-patterns.com/patterns/ProductPage) — canonical product page pattern
- [Shopify — 19 Best Product Page Design Examples](https://www.shopify.com/blog/product-page) — modern product page layouts and trends
- [Trafiki — Guide to Product Page UX in 2025](https://www.trafiki-ecommerce.com/marketing-knowledge-hub/the-ultimate-guide-to-product-page-ux/) — mobile-first product page guidance

**Component Library:**
- [shadcn Accordion](https://ui.shadcn.com/docs/components/radix/accordion) — collapsible sections with `type="multiple"` support
- [shadcn ScrollArea](https://ui.shadcn.com/docs/components/radix/scroll-area) — scrollable container for sheet content
- [shadcn AlertDialog](https://ui.shadcn.com/docs/components/radix/alert-dialog) — confirmation dialog for destructive actions

**Animation:**
- [Framer Motion — AnimatePresence](https://motion.dev/docs/react-animate-presence) — content swap animations (product switching)
- [Framer Motion — Layout Animations](https://motion.dev/docs/react-layout-animations) — sheet open/close spring physics
- [Motion.dev Examples](https://motion.dev/examples) — 330+ animation examples for reference

**Accessibility:**
- [WAI-ARIA Accordion Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) — keyboard and screen reader requirements
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — modal dialog focus trapping and labeling
- [Radix UI — Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) — built-in a11y in shadcn's foundation

**Design Research (from project docs):**
- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) — side panel detail view inspiration
- [Mobbin — Card UI Glossary](https://mobbin.com/glossary/card) — card-to-detail interaction patterns
- [Mobbin — Bottom Sheet Explore](https://mobbin.com/explore/mobile/ui-elements/bottom-sheet) — mobile bottom sheet examples from production apps

**Dynamic / Adaptive UI (Appendix):**
- [Vercel AI SDK 3.0 — Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) — streaming React Server Components from LLMs
- [Google A2UI — Agent-Driven Interfaces](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) — cross-platform generative UI for AI agents
- [Stan Vision — UX/UI Trends 2026: Generative UI & AI Personalization](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products) — Gartner's 30% prediction, adaptive interface patterns
- [CREHLER — UX/UI Trends in E-Commerce for 2026](https://crehler.com/en/ux-ui-trends-in-e-commerce-for-2026/) — real-time adaptive layouts in e-commerce
- [Medium — AI-Driven Trends in UI/UX Design 2025-2026](https://medium.com/@designstudiouiux/ai-driven-trends-in-ui-ux-design-2025-2026-7cb03e5e5324) — AI personalization at UI component level
- [Veza Digital — AI in UX/UI Design Trends 2026](https://www.vezadigital.com/post/ai-ux-ui-design-trends) — emotionally intelligent and context-aware interfaces
- [ustwo — Data-Driven React](https://ustwo.com/blog/data-driven-react/) — JSON-driven component trees for dynamic layout composition
- [Baymard — Product Page UX Best Practices 2025](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — collapsed sections outperform tabs; layout varies by product type
- [Dynamic Yield — Product Detail Page](https://www.dynamicyield.com/glossary/product-detail-page/) — AI personalization on product pages at scale

---

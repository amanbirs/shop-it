# ShopIt — Page 3: List Detail (`/lists/[id]`)

Detailed design spec for the List Detail page — the core workspace for a purchase decision.

> **Note:** This page was split from `06-pages.md` due to its size. See that file for Pages 1 (Login) and 2 (Dashboard).

---

## Overview

The core workspace for a purchase decision. Shows all products in a list with two view modes (card grid and comparison table), a URL input for adding products, filter tabs, and an AI Expert Opinion panel.

This page also surfaces **AI-recommended products** — items the AI has found and is suggesting as potential additions to the list. These are NOT yet in the user's list. They appear visually differentiated from user-added products, and each has explicit `[+ Add to List]` and `[✕ Dismiss]` actions. A recommendation only becomes a real list item when the user explicitly adds it.

---

## Layout — Card Grid View (Default)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                     [◑] [▤]      │
│  │ ◆    │  The Great TV Showdown              [⊞] [≡]  [Get AI Opinion]   │
│  │ side │  🤖 "Four contenders, zero regrets incoming!"                    │
│  │ bar  │  ─────────────────────────────────────────────────────────────── │
│  │      │  Budget: ₹30K-50K  ·  By: Mar 30  ·  👤👤 2 members             │
│  │ ───  │  [picture quality] [low input lag] [smart TV]   ← priority chips │
│  │ Home │                                                                  │
│  │ list │  ┌──────────────────────────────────────────────────────────┐    │
│  │ list │  │  🔍  Paste a URL or search for products...    [Search]  │    │
│  │ list │  └──────────────────────────────────────────────────────────┘    │
│  │      │                                                                  │
│  │      │  [All (6)] [Shortlisted (2)] [Purchased (0)]  ← filter tabs     │
│  │      │                                                                  │
│  │      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │      │  │ 🖼 ────────  │ │ 🖼 ────────  │ │ 🖼 ────────  │            │
│  │      │  │ Sony A80L    │ │ Samsung S90C │ │ LG C3 OLED  │            │
│  │      │  │ ₹89,990      │ │ ₹74,990      │ │ ₹69,990      │            │
│  │      │  │ ★ 4.5 (2.1K) │ │ ★ 4.3 (1.8K) │ │ ★ 4.6 (3.2K) │            │
│  │      │  │ amazon.in    │ │ flipkart.com │ │ amazon.in    │            │
│  │      │  │ "Premium     │ │ "Best value" │ │ "Top rated"  │            │
│  │      │  │  pick" ✨     │ │  ✨           │ │  ✨           │            │
│  │      │  │         [★]  │ │         [☆]  │ │         [★]  │            │
│  │      │  └──────────────┘ └──────────────┘ └──────────────┘            │
│  │      │                                                                  │
│  │      │  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ ┌──────────────┐ ┌──────────────┐            │
│  │      │  ┊ ✨ AI Suggests ┊ │ 🖼 ────────  │ │ 🖼 ────────  │            │
│  │      │  ┊ TCL C745     ┊ │ Hisense U7H  │ │ Toshiba M550 │            │
│  │      │  ┊ ₹44,990      ┊ │ ₹52,990      │ │ ₹39,990      │            │
│  │      │  ┊ "Fits your   ┊ │ ★ 4.1 (890)  │ │ ★ 3.9 (560)  │            │
│  │      │  ┊  budget with ┊ │ flipkart.com │ │ amazon.in    │            │
│  │      │  ┊  top gaming  ┊ │              │ │              │            │
│  │      │  ┊  specs"      ┊ │              │ │              │            │
│  │      │  ┊ [+Add] [✕]   ┊ │         [☆]  │ │         [☆]  │            │
│  │      │  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ └──────────────┘ └──────────────┘            │
│  │      │                                                                  │
│  └──────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  [⊞] = Grid view (active)    [≡] = Table view
  [★] = Shortlisted            [☆] = Not shortlisted
  ┌╌╌┐ = AI-suggested card (dashed border + tinted bg, NOT yet in user's list)
  [+Add] = Accept suggestion into the list
  [✕] = Dismiss suggestion
```

---

## Smart Input Bar

The input bar (`AddProductForm`) detects whether the user typed a URL or a text query:

| Input | Icon | Button | Behavior |
|-------|------|--------|----------|
| URL (`https://...` or `www.`) | 🔗 Link2 | "Add" | Existing flow — `addProduct` creates a product row, triggers ingestion |
| Text query | 🔍 Search | "Search" | Calls `searchProducts` → opens Search Results Panel below |

The detection is a simple regex (`/^(https?:\/\/|www\.)/i`). Everything that doesn't match is treated as a search query.

---

## Search Results Panel

When the user searches for products, a results panel slides in between the input bar and the filter tabs (pushes the grid down). Animated entry with Framer Motion.

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 Results for "best OLED TV under 150k"    4 products    [×]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────┐  Samsung S95D 65"                                    │
│  │  img   │  ₹1,29,990 · amazon.in                              │
│  └────────┘  "Best anti-glare OLED, complements your LG C4"     │
│                                                       [Add]      │
│  ─────────────────────────────────────────────────────────────   │
│  ┌────────┐  Sony A95L 65"                                      │
│  │  img   │  ₹1,49,990 · sony.co.in                             │
│  └────────┘  "Premium pick with superior color accuracy"         │
│                                                       [Add]      │
│  ─────────────────────────────────────────────────────────────   │
│  ...                                                              │
│                                                                   │
│  💬 Need help narrowing down? Chat with AI                       │
└──────────────────────────────────────────────────────────────────┘
```

### Key behaviors:

- **Result cards** are horizontal (image left, details right) — compact, list-like. Different from the grid cards used for list products.
- **"Add" button** calls `addProductFromSearch` → product row created with pre-filled data → goes through normal extraction pipeline. After adding, the button changes to a green "Added" checkmark.
- **Close (×)** clears search and returns to normal view.
- **"Chat with AI"** link at the bottom opens the chat panel with the search query pre-filled, enabling conversational refinement.
- **Max height** of 480px with overflow scroll — the panel never pushes the grid completely off screen on desktop.
- **Results are contextualized** — the AI knows what products are already in the list and explains how each result relates (e.g., "Cheaper alternative to the Samsung S95D").

---

## Layout — Table View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                                  │
│  │ ◆    │  The Great TV Showdown              [⊞] [≡]  [Get AI Opinion]   │
│  │ side │  🤖 "Four contenders, zero regrets incoming!"                    │
│  │ bar  │  ─────────────────────────────────────────────────────────────── │
│  │      │  ┌──────────────────────────────────────────────────────────┐    │
│  │ ───  │  │  🔗  Paste a product URL...                      [Add]  │    │
│  │ Home │  └──────────────────────────────────────────────────────────┘    │
│  │ list │                                                                  │
│  │ list │  [All (6)] [Shortlisted (2)] [Purchased (0)]                    │
│  │      │                                                                  │
│  │      │  ┌─────┬──────────────┬─────────┬───────┬──────────┬─────┬────┐ │
│  │      │  │     │ Product      │ Price   │Rating │ Verdict  │ ★   │ ⋯  │ │
│  │      │  ├─────┼──────────────┼─────────┼───────┼──────────┼─────┼────┤ │
│  │      │  │ 🖼  │ Sony A80L    │ ₹89,990 │ 4.5 ★ │ Premium  │ [★] │ ⋯  │ │
│  │      │  │     │ amazon.in    │         │(2.1K) │ pick     │     │    │ │
│  │      │  ├─────┼──────────────┼─────────┼───────┼──────────┼─────┼────┤ │
│  │      │  │ 🖼  │ Samsung S90C │ ₹74,990 │ 4.3 ★ │ Best     │ [☆] │ ⋯  │ │
│  │      │  │     │ flipkart.com │         │(1.8K) │ value    │     │    │ │
│  │      │  ├─────┼──────────────┼─────────┼───────┼──────────┼─────┼────┤ │
│  │      │  │ 🖼  │ LG C3 OLED  │ ₹69,990 │ 4.6 ★ │ Top      │ [★] │ ⋯  │ │
│  │      │  │     │ amazon.in    │         │(3.2K) │ rated    │     │    │ │
│  │      │  ╞═════╪══════════════╪═════════╪═══════╪══════════╪═════╪════╡ │
│  │      │  │  ✨ AI Suggestions — products found based on your priorities  │ │
│  │      │  │  These are not in your list yet. Add any that interest you.   │ │
│  │      │  ├─────┼──────────────┼─────────┼───────┼──────────┼─────┼────┤ │
│  │      │  │░🖼░ │ TCL C745     │ ₹44,990 │ 4.2 ★ │ Fits     │[+]  │ [✕]│ │
│  │      │  │░   ░│ amazon.in    │  ✓budgt │(1.2K) │ budget   │ Add │    │ │
│  │      │  ├─────┼──────────────┼─────────┼───────┼──────────┼─────┼────┤ │
│  │      │  │░🖼░ │ Hisense U7H │ ₹38,990 │ 4.0 ★ │ Budget   │[+]  │ [✕]│ │
│  │      │  │░   ░│ flipkart.com │  ✓budgt │ (650) │ king     │ Add │    │ │
│  │      │  └─────┴──────────────┴─────────┴───────┴──────────┴─────┴────┘ │
│  │      │                                                                  │
│  └──────┘                                                                  │

Legend:
  ░ = tinted background row (ai-accent/5)
  ╞═══╡ = section divider for AI suggestions
  [+] Add = accept suggestion into the user's list
  [✕] = dismiss suggestion (AI won't re-suggest it)
```

---

## Layout — AI Expert Opinion Panel (Right Drawer)

```
┌──────────────────────────────────────────┬──────────────────────┐
│                                          │  ✨ AI Expert Opinion │
│  [main content — cards or table]         │  ──────────────────  │
│                                          │                      │
│                                          │  🏆 Top Pick          │
│                                          │  LG C3 OLED          │
│                                          │  "Best overall for   │
│                                          │   your priorities..." │
│                                          │                      │
│                                          │  💰 Value Pick        │
│                                          │  Samsung S90C         │
│                                          │  "Best within your   │
│                                          │   ₹30-50K budget..." │
│                                          │                      │
│                                          │  ▸ Summary            │
│                                          │  ▸ Detailed Compare   │
│                                          │  ▸ Concerns           │
│                                          │  ▸ Final Verdict      │
│                                          │                      │
│                                          │  ⚠ Stale — 2 products │
│                                          │  added since last gen │
│                                          │  [Regenerate]         │
│                                          │                      │
│                                          │  ──────────────────  │
│                                          │  Generated Mar 20    │
│                                          │  via Gemini Flash    │
└──────────────────────────────────────────┴──────────────────────┘
```

---

## Layout — Empty State

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                       │
│  │ ◆    │                                                       │
│  │ side │         ┌───────────────────────────────┐             │
│  │ bar  │         │                               │             │
│  │      │         │      📦  No products yet       │             │
│  │      │         │                               │             │
│  │      │         │   Paste a product URL to       │             │
│  │      │         │   start comparing              │             │
│  │      │         │                               │             │
│  │      │         │   ┌──────────────────────┐    │             │
│  │      │         │   │ 🔗 Paste URL here... │    │             │
│  │      │         │   └──────────────────────┘    │             │
│  │      │         │                               │             │
│  │      │         │   Try:                         │             │
│  │      │         │   • amazon.in/dp/...           │             │
│  │      │         │   • flipkart.com/...           │             │
│  │      │         │   • any product page           │             │
│  │      │         │                               │             │
│  │      │         └───────────────────────────────┘             │
│  │      │                                                       │
│  └──────┘                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (Card View)

```
┌───────────────────────────┐
│  ◆ ShopIt          [⊞][≡] │
│  The Great TV Showdown     │
│  🤖 "Four contenders..."   │
│  ───────────────────────── │
│  ₹30K-50K · Mar 30 · 👤👤  │
│  ───────────────────────── │
│                            │
│  ┌────────────────────────┐│
│  │ 🔗 Paste URL...  [Add]││
│  └────────────────────────┘│
│                            │
│  [All] [Shortlisted] [Purch│
│                            │
│  ┌────────────────────────┐│
│  │ 🖼 ──────────────────  ││
│  │ Sony A80L              ││
│  │ ₹89,990  ★ 4.5 (2.1K) ││
│  │ "Premium pick" ✨  [★]  ││
│  └────────────────────────┘│
│                            │
│  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐│
│  ┊ ✨ AI Suggests          ┊│
│  ┊ TCL C745 · ₹44,990     ┊│
│  ┊ "Fits your budget"     ┊│
│  ┊ [+ Add]     [✕ Dismiss]┊│
│  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘│
│                            │
│  ┌────────────────────────┐│
│  │ Samsung S90C           ││
│  │ ...                    ││
│                            │
│  [Home] [Lists]  [+ New]   │
└───────────────────────────┘
```

---

## Design Decisions

### Decision 1: View Toggle — Card Grid vs Table

**Chosen: Segmented ToggleGroup (2 icons: grid + table)**

| Option | Pros | Cons |
|--------|------|------|
| **A. shadcn ToggleGroup (Chosen)** | Clean, familiar (Figma, Notion, Shopify all use this). Two icons side-by-side in a pill. Active state highlighted. | Limited to 2-3 options max. |
| **B. Dropdown selector** | Scales to many views (grid, table, kanban, timeline). Airtable pattern. | Overkill for 2 views. Extra click. |
| **C. Tab-based** | More prominent, acts as top-level navigation. | Takes more horizontal space. Visually heavy for a simple toggle. |

Two-icon `ToggleGroup` with `LayoutGrid` and `Table2` icons from Lucide. Persisted in URL via `nuqs` (`?view=grid`). Tooltip shows keyboard shortcut. Placed in the header row next to the page title.

**View transition animation:** Framer Motion `layoutId` on each product — when toggling, items morph from card position/size to table row position/size. Duration 300ms, spring easing. This is the exact pattern Framer Motion's `layout` prop was designed for.

### Decision 2: Data Density Per View

| Data Point | Card View | Table View |
|-----------|-----------|------------|
| Image | Large hero (aspect-video) | 48x48 thumbnail |
| Title | `text-lg font-semibold`, 2-line clamp | Full text, single row |
| Brand | Below title, `text-sm text-muted` | Combined with title |
| Price | Prominent, `text-base font-semibold` | Column |
| Rating | Stars + count badge | `4.5 ★ (2.1K)` compact |
| Domain | Small badge | Text in subtitle |
| AI Verdict | Bottom of card, 1-line | Column, truncated |
| Shortlist | Star icon, bottom-right | Icon column |
| Actions | Hover-to-reveal | Row overflow menu `⋯` |
| Pros/Cons | Not shown (expand to see) | Not shown (expand row) |

### Decision 3: AI-Suggested Products — Visual Treatment

AI-suggested products are items the AI has found that might be relevant to the user's purchase decision. They are **not yet in the user's list** — they're proposals. The user must explicitly `[+ Add]` to accept one, or `[✕ Dismiss]` to remove the suggestion. This follows the manual-approval pattern (GitHub Copilot, Notion AI, Grammarly) — the user stays in control.

The `products` table already has `added_via` (`'user'` | `'ai'`) to distinguish these once added.

**Options researched:**

| Option | Description | Pros | Cons |
|--------|------------|------|------|
| **A. Tinted card + dashed border (Chosen)** | `bg-ai-accent/5 border-dashed border-ai-accent/30` with sparkle badge "✨ AI Suggests". Same card layout but visually distinct. `[+ Add]` and `[✕ Dismiss]` actions. | Clearly different without being jarring. Consistent with the "dashed border = provisional" pattern (already used for "+ New List" card on Dashboard). | Subtle — might be missed by some users. |
| **B. Gradient glow border** | Animated `conic-gradient` border with purple shimmer. Card "glows" subtly. | Eye-catching, premium feel, unmissable. | Can feel heavy/distracting with multiple AI cards. Performance cost of CSS animation. |
| **C. Larger "promoted" card** | AI card is 1.5x width in grid (spans 2 columns), or has extra content section with AI explanation. | More room for "why suggested" text. Stands out by size. | Breaks grid rhythm. Harder to compare visually with regular cards. |
| **D. Inline banner between cards** | Not a card at all — a horizontal banner: "✨ AI found 2 products that match your budget" with mini-cards below. | Very clear separation. Dedicated section. | Breaks the scannable grid flow. Can feel like an ad. |

**Grid view:** AI suggestion cards use the same card component but with `variant="ai"` — dashed border, tinted background, sparkle badge, and `[+ Add to List]` / `[✕ Dismiss]` action buttons instead of shortlist toggle. No shortlist toggle because the product isn't in the user's list yet.

**Table view:** AI suggestions are grouped below a section divider row ("✨ AI Suggestions — products found based on your priorities"). Rows have tinted background `bg-ai-accent/5`. Action column shows `[+ Add]` and `[✕]` instead of shortlist. The divider row includes a subtitle: "These are not in your list yet. Add any that interest you."

### Decision 4: AI Suggestion Interactions

| Interaction | Behavior |
|-------------|----------|
| **[+ Add to List]** | Accepts the suggestion — product is added to the user's list with `added_via: 'ai'`. Card morphs from dashed-border AI style to solid-border regular style (satisfying "acceptance" animation). Sonner toast: "TCL C745 added to your list." Product now has shortlist toggle like any other product. |
| **[✕ Dismiss]** | Removes the AI suggestion. Exit animation: scale down + fade. Stored so AI doesn't re-suggest the same product. Sonner toast: "Dismissed" with `[Undo]` action. |
| **"Why this?"** | Info icon → tooltip/popover: "Suggested because it fits your ₹30K-50K budget and prioritizes picture quality." Uses list priorities + budget context. |
| **Hover state** | Same flashlight effect as regular cards, but the glow uses `--ai-accent` color instead of the default. |

### Decision 5: Table Component

| Option | Verdict |
|--------|---------|
| **shadcn Data Table (TanStack Table)** ✓ | Best fit. Sorting, filtering, column visibility built-in. Matches existing shadcn stack. |
| Plain HTML + Tailwind | Sufficient for static display but no sorting/filtering out of the box. |
| AG Grid | Overkill for 5-20 rows. Heavy bundle. |

shadcn Data Table (wraps TanStack Table). Columns: thumbnail, product name + domain, price, rating, AI verdict, status badge, actions. Sortable by price and rating. Filterable by shortlist/purchased status (already handled by tab filter).

### Decision 6: AI Expert Opinion Panel

| Option | Pros | Cons |
|--------|------|------|
| **A. Right drawer (Chosen)** | Desktop: slides in from right, main content compresses. Stays open while browsing products. | Eats horizontal space on smaller desktops. |
| **B. Bottom sheet** | Natural on mobile. Full width. | On desktop, feels disconnected from the product being discussed. |
| **C. Full-page overlay** | Most room for content. | Loses context — can't see products while reading opinion. |

Option A on desktop (right drawer, `w-[380px]`, compresses main content). Option B on mobile (bottom sheet via shadcn `Sheet` with `side="bottom"`). Content streams in with typewriter effect during generation. Sections are collapsible via shadcn `Accordion`.

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **View toggle** | shadcn `<ToggleGroup>` | Two items: `LayoutGrid` + `Table2` icons. `value` synced to URL via `nuqs`. `type="single"` `variant="outline"`. |
| 2 | **URL input** | shadcn `<Input>` + `<Button>` | `type="url"` `placeholder="Paste a product URL..."`. Link icon prefix. Auto-detects pasted URLs. "Add" button right-aligned. Full width, prominent placement. |
| 3 | **Filter tabs** | shadcn `<Tabs>` | Three tabs: "All (N)", "Shortlisted (N)", "Purchased (N)". Counts derived from product data. Underline style indicator. Synced to URL via `nuqs`. |
| 4 | **Product card (user-added)** | shadcn `<Card>` | `rounded-xl overflow-hidden`. Hero image `aspect-video object-cover`. Title `text-lg font-semibold line-clamp-2`. Price `text-base font-semibold`. Rating as star badge. Domain as muted badge. AI verdict in `text-sm text-muted-foreground italic` with sparkle icon. Shortlist star bottom-right. Hover: shadow lift + action reveal. |
| 5 | **Product card (AI suggestion)** | `<Card variant="ai">` | Same layout as #4 but: `border-dashed border-ai-accent/30 bg-ai-accent/5`. Sparkle badge top-left: "✨ AI Suggests". AI explanation text replaces verdict: "Fits your budget with top gaming specs". Actions: `[+ Add to List]` primary button + `[✕]` ghost dismiss. **No shortlist toggle** — product is not in the user's list yet. |
| 6 | **Product table** | shadcn Data Table (TanStack) | Columns defined as TanStack column defs. Sortable by price, rating. Row click expands detail sub-row. Sticky first column on mobile scroll. |
| 7 | **AI suggestion section (table)** | Custom divider row + tinted rows | Full-width `colspan` divider: "✨ AI Suggestions — products found based on your priorities" with `bg-ai-accent/5 border-t-2 border-ai-accent/30`. Subtitle: "These are not in your list yet." AI product rows below with tinted bg. Actions column: `[+ Add]` `[✕]`. |
| 8 | **List header** | Custom flex layout | Title (editable, pencil icon on hover). AI comment bubble below. Budget/deadline/member badges. Priority chips (reorderable). |
| 9 | **Priority chips** | Flex row of `<Badge>` | `variant="secondary"`. Draggable for reorder. "+" to add new. Each chip: `text-xs px-2 py-0.5 rounded-full`. |
| 10 | **Member avatars** | Avatar stack | Same as dashboard: overlapping circles, "+N" badge. Click opens member management sheet. |
| 11 | **AI Expert Opinion button** | shadcn `<Button>` | "Get AI Opinion" or "Regenerate" if one exists. Sparkle icon. Loading: spinner + "Analyzing..." text. |
| 12 | **AI Expert Opinion panel** | shadcn `<Sheet side="right">` (desktop) / `<Sheet side="bottom">` (mobile) | `w-[380px]` desktop. Sections: Top Pick, Value Pick, Summary, Comparison, Concerns, Verdict — each in a `<Accordion>` item. Stale warning badge when products changed since last generation. |
| 13 | **Shortlist toggle** | Custom `<Button variant="ghost">` | Star icon. Filled amber when shortlisted, outline when not. `whileTap={{ scale: 0.85 }}` + spring bounce to filled state. Optimistic update. Only on user-added products (not AI suggestions). |
| 14 | **Extraction skeleton** | Skeleton card | Matches card layout exactly: image skeleton + 3 text lines + badge skeleton. `animate-pulse`. Shown for `extraction_status = 'pending' | 'processing'`. |
| 15 | **Empty state** | Centered content block | Package icon, "No products yet" heading, "Paste a product URL to start comparing" subtext, embedded URL input, example URLs as muted text. |
| 16 | **"Why this?" tooltip** | shadcn `<Tooltip>` or `<Popover>` | Info icon on AI suggestion cards. Content: "Suggested because it fits your ₹30K-50K budget and prioritizes [priority 1]." |

---

## Animation Spec

### Card Entry (Page Load Stagger)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Card 1    opacity 0→1, y: 12→0, scale: 0.97→1
  60ms    Card 2    opacity 0→1, y: 12→0, scale: 0.97→1
  120ms   Card 3    opacity 0→1, y: 12→0, scale: 0.97→1
  ...     Card N    +60ms per card (caps at 8, rest instant)
─────────────────────────────────────────────────────
  Each: duration 350ms, ease [0.25, 0.4, 0, 1]
```

### View Toggle Transition (Grid ↔ Table)

```
Using Framer Motion layout animation:
  Each product has layoutId={`product-${id}`}

  Grid → Table (300ms, spring):
    - Cards morph from grid position to table row position
    - Image shrinks from hero (aspect-video) to thumbnail (48x48)
    - Text reflows from stacked to inline
    - AI suggestion cards maintain tinted styling in both views

  Table → Grid (300ms, spring):
    - Reverse of above
    - Rows expand into card positions
```

**Framer Motion implementation:**
```
Parent container:
  <motion.div layout className={view === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'flex flex-col gap-1'
  }>

Each product:
  <motion.div
    layoutId={`product-${id}`}
    layout
    transition={{ layout: { duration: 0.3, type: "spring", bounce: 0.15 }}}
  >
    {view === 'grid' ? <ProductCard /> : <ProductRow />}
  </motion.div>
```

### New Product Appearance (after URL paste)

```
0ms    Skeleton card appears: opacity 0, scale 0.9, blur 8px
200ms  Skeleton: opacity 1, scale 1, blur 0 (spring)
...    Extraction runs (2-5s)
Done   Skeleton morphs to real card via layout animation
       AI fields fade in: opacity 0→1, y: 4→0
```

### Shortlist Toggle

```
Tap:
  0ms     scale: 1 → 0.85 (whileTap)
  Release Star fills amber: spring(1, 80, 10)
          scale: 1 → 1.2 → 1 (bounce)
          Color: muted-foreground → --shortlisted (amber)
```

### AI Suggestion Accept (Add to List)

```
[+ Add] clicked:
  0ms     Dashed border → solid (150ms transition)
  100ms   bg-ai-accent/5 → bg-card (150ms fade)
  200ms   "✨ AI Suggests" badge fades out
  300ms   Shortlist star fades in (replaces Add/Dismiss buttons)
  Toast:  "TCL C745 added to your list" (Sonner)
  Product is now a regular list item — user can shortlist, comment, etc.
```

### AI Suggestion Dismiss

```
[✕] clicked:
  0ms     Card: scale 1→0.95, opacity 1→0 (200ms)
  200ms   Card removed, siblings shift via layout animation
  Toast:  "Dismissed" with [Undo] action (Sonner)
```

### AI Expert Opinion Panel

```
Open:
  0ms     Panel slides in from right: x: 100% → 0% (300ms, spring)
  100ms   Main content compresses (layout animation)
  200ms   Section headings stagger in (+60ms each)

Content generation (streaming):
  Text appears with typewriter effect (15ms per character)
  Each section fades in as it completes
```

### Filter Tab Switch

```
Tab underline slides to active tab: translateX animation (200ms, ease-out)
Product grid: AnimatePresence — filtered-out cards exit (scale 0.95 + fade)
              Remaining cards reposition via layout animation
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Page background | `bg-background` (white) | `bg-background` (#0a0a0a) |
| Card background | `bg-card` (white) | `bg-card` (#111) |
| Card border | `border-border` (zinc-200) | `border-border` (zinc-800) |
| Card image | Full brightness | `brightness-90` filter |
| AI suggestion card bg | `bg-[hsl(var(--ai-accent)/0.05)]` | `bg-[hsl(var(--ai-accent)/0.08)]` — slightly stronger tint |
| AI suggestion card border | `border-dashed border-[hsl(var(--ai-accent)/0.30)]` | `border-dashed border-[hsl(var(--ai-accent)/0.40)]` |
| AI sparkle badge | `bg-ai-accent/10 text-ai-accent` | `bg-ai-accent/15 text-ai-accent` (desaturated 20%) |
| Table header | `bg-muted/50` | `bg-muted/30` |
| Table row hover | `hover:bg-muted/50` | `hover:bg-muted/30` |
| AI table section divider | `bg-ai-accent/5 border-ai-accent/20` | `bg-ai-accent/8 border-ai-accent/30` |
| AI Expert Opinion panel | `bg-card border-l` | `bg-card border-l border-border` (slightly elevated) |
| Shortlist star (active) | `text-amber-500` | `text-amber-400` (slightly desaturated) |
| URL input | `bg-background border-input` | `bg-muted/30 border-input` |
| Price (best value in table) | `text-green-600` | `text-green-400` |
| Extraction skeleton | `bg-muted animate-pulse` | `bg-muted animate-pulse` |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Sidebar hidden. Single column cards. Table view forces horizontal scroll with sticky product name column. AI panel opens as bottom sheet. View toggle in header. Filter tabs scroll horizontally. Priority chips wrap to 2 lines. |
| Tablet (`640-1024px`) | Sidebar collapsible. 2-column card grid. Table view shows all columns with horizontal scroll if needed. AI panel as right drawer (compresses content). |
| Desktop (`> 1024px`) | Sidebar visible. 3-column card grid. Table fits without scroll. AI panel as right drawer `w-[380px]`. Flashlight hover effect active. |
| Mobile table view | Auto-switches to card view below 640px OR shows simplified 3-column table (product, price, actions) with expand-for-details on row tap. |

---

## Accessibility

- View toggle is a `role="radiogroup"` with `aria-label="View mode"`. Each option has `aria-label="Grid view"` / `aria-label="Table view"`.
- URL input has `aria-label="Product URL"`. Validation errors announced via `aria-describedby`.
- Filter tabs use shadcn Tabs (built on Radix — proper `role="tablist"` / `role="tab"` / `role="tabpanel"`).
- Product cards are focusable (`tabindex="0"`), navigate on Enter. Card actions keyboard-accessible.
- Table uses proper `<table>` / `<thead>` / `<tbody>` semantics. Sortable columns have `aria-sort`.
- AI suggestion cards have `aria-description="AI suggested product — not yet in your list"`. Add/Dismiss buttons have clear labels: `aria-label="Add TCL C745 to your list"`, `aria-label="Dismiss suggestion"`.
- AI Expert Opinion panel traps focus when open. Close button has `aria-label="Close AI opinion panel"`.
- Shortlist toggle: `aria-label="Shortlist {product name}"` with `aria-pressed`.
- Extraction loading: skeleton has `aria-busy="true"` `aria-label="Loading product details"`.
- Color is never the sole differentiator — AI suggestion cards have tint AND badge AND dashed border.
- All interactive elements have visible focus rings in both themes.

---

## References

**View Toggle Patterns:**
- [Figma File Browser — Grid/List toggle](https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser)
- [shadcn ToggleGroup](https://ui.shadcn.com/docs/components/toggle-group) — the toggle component we use
- [Framer Motion layout animations](https://motion.dev/docs/react-layout-animations) — `layoutId` morph between views
- [Notion Database Views](https://www.notion.so/help/views) — gallery/table/list switching UX
- [Airtable Interface Designer](https://support.airtable.com/docs/interface-designer-overview) — view switching patterns
- [UX Patterns: Table vs List vs Cards](https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards) — when to use which
- [PatternFly Card View Guidelines](https://www.patternfly.org/patterns/card-view/design-guidelines/)

**AI Recommendation Injection:**
- [Spotify Smart Shuffle UX](https://newsroom.spotify.com/2023-03-08/smart-shuffle-new-listening-feature-spotify/) — injected AI suggestions in playlists
- [YouTube Recommendation Controls](https://blog.youtube/inside-youtube/on-youtube-s-recommendation-system/) — "Not interested" / dismiss patterns
- [Amazon Recommendation Engine](https://aws.amazon.com/personalize/) — inline suggested products in results
- [Aceternity UI — Glowing/Spotlight Cards](https://ui.aceternity.com/components) — card glow effects for differentiation
- [DaisyUI Card Dash](https://daisyui.com/components/card/) — dashed border card variant pattern
- [Google Design — AI Sparkle Icon Research](https://design.google/library/ai-sparkle-icon-research-pozos-schmidt) — sparkle icon recognition
- [NN/g — AI Sparkles Icon Problem](https://www.nngroup.com/articles/ai-sparkles-icon-problem/) — why to pair icons with text
- [20+ GenAI UX Patterns (UX Collective)](https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1)

**Comparison Table:**
- [shadcn Data Table](https://ui.shadcn.com/docs/components/data-table) — TanStack Table integration guide
- [NN/g — Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) — UX research on comparison patterns
- [Smashing Magazine — Feature Comparison Tables](https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/) — design patterns
- [Baymard Institute — Comparison Tool UX](https://baymard.com/ecommerce-design-examples/39-comparison-tool) — e-commerce best practices
- [TanStack Table Examples](https://tanstack.com/table/latest/docs/framework/react/examples/basic)

**General:**
- [SaaS Side Panel Examples](https://saasinterface.com/components/side-panel/) — 72 side panel UI patterns
- [AI UX Design Patterns (Userpilot)](https://userpilot.com/blog/ai-ux-design/) — transparency in AI features
- [Motion.dev Examples](https://motion.dev/examples) — 330+ animation examples
- [shadcn Blocks](https://ui.shadcn.com/blocks) — product card grid patterns
- [Enterprise Table UX (Pencil & Paper)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Mobbin Card UI Glossary](https://mobbin.com/glossary/card) — real-world card design patterns

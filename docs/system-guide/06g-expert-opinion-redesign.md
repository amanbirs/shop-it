# ShopIt -- AI Expert Opinion Redesign

Detailed design spec for the redesigned Expert Opinion feature -- replacing the text-heavy, obviously-AI-styled panel with an integrated, scannable decision summary that feels native to the page.

> **Note:** This spec supersedes the Expert Opinion sections in [06a-page-list-detail.md](./06a-page-list-detail.md) (Decision 6, Element 12) and replaces the current implementations in `components/ai/expert-opinion-card.tsx` and `components/ai/expert-opinion-cta.tsx`.

---

## Overview

The Expert Opinion is ShopIt's decision accelerator. It takes all the products in a list, weighs them against the user's stated priorities and budget, and produces a structured recommendation. The redesign addresses four problems with the current implementation:

1. **Too much text.** Six flat sections (summary, comparison, concerns, verdict, top pick, value pick) rendered as paragraph blocks. Users had to read everything to find the answer.
2. **Visually segregated.** Purple `ai-accent` borders, sparkle icons, green value-pick backgrounds -- the feature screamed "AI widget" instead of feeling like a natural part of the page.
3. **Not scannable.** No visual hierarchy between sections. The verdict (the most important piece) was buried at the bottom.
4. **Disconnected from products.** Top pick and value pick were text labels. Users had to mentally map names back to the product grid.

The redesign inverts the information hierarchy: verdict first, picks with product thumbnails second, details on demand. It uses the app's neutral palette (`--foreground`, `--muted`, `--border`) with no special AI coloring. It sits below the product grid as an inline section, not a separate panel.

---

## Layout -- Desktop (Inline Below Product Grid)

The opinion renders inline below the product grid when the detail panel is closed. Full width of the content area. When the detail panel is open, the opinion is hidden (the user is focused on a single product).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  [product grid -- 3 columns of cards as defined in 06a]                     │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                             │
│  Based on your priorities                              Updated 2 hours ago  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  "The LG C3 OLED is the strongest overall pick -- it leads on      │    │
│  │   picture quality and input lag, your top two priorities."          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────── Best overall ────────────┐  ┌──────── Best value ─────────┐ │
│  │                                       │  │                             │ │
│  │  ┌──────┐  LG C3 OLED               │  │  ┌──────┐  Samsung S90C    │ │
│  │  │ img  │  ₹69,990 · amazon.in      │  │  │ img  │  ₹74,990        │ │
│  │  │ 48px │  ★ 4.6 (3.2K reviews)     │  │  │ 48px │  ★ 4.3 (1.8K)  │ │
│  │  └──────┘                             │  │  └──────┘                   │ │
│  │  "Best picture quality and lowest     │  │  "Best price-to-feature    │ │
│  │   input lag in the group."            │  │   ratio within budget."    │ │
│  │                                       │  │                             │ │
│  │                        [View product] │  │              [View product] │ │
│  └───────────────────────────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  > How they compare                                            [v]  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  (collapsed by default -- expands to show comparison text)          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  > Things to watch out for                                    [v]   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key layout decisions:**

- The verdict quote is the single most prominent element -- `text-lg` or `text-base`, full width, in a lightly tinted `bg-muted/50` container. One to two sentences maximum.
- The two pick cards sit side-by-side in a 2-column grid. Each contains the product's actual thumbnail, name, price, and a one-line reason.
- Comparison and concerns are behind collapsible sections. Most users will never open them -- the verdict and picks are sufficient.
- Attribution text ("Based on your priorities") is small and muted. No sparkle icon. No "AI" in the heading.
- Timestamp ("Updated 2 hours ago") is right-aligned, muted, same treatment as any other metadata.

---

## Layout -- Desktop (Stale State)

When products have been added or removed since the opinion was generated, a subtle inline banner replaces the attribution line.

```
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Products have changed since this was generated.    [Regenerate]   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [rest of opinion content, slightly faded with opacity-60]                │
```

The stale banner uses `bg-muted` background, `text-muted-foreground`, and a standard `variant="outline"` button. No amber/yellow warning coloring. The opinion content below gains `opacity-60` to visually deprioritize it.

---

## Layout -- CTA (No Opinion Yet)

When no opinion has been generated, a minimal prompt appears below the product grid.

```
│                                                                           │
│  [product grid]                                                           │
│                                                                           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                           │
│         Compare your products and get a recommendation                    │
│         Based on your priorities and budget.                              │
│                                                                           │
│                      [Get recommendation]                                 │
│                                                                           │
```

- Centered text, `text-muted-foreground`, no border, no background tint.
- Button uses the default `variant="default"` (primary). No purple, no sparkles.
- If fewer than 2 products exist, the button is disabled and the subtitle reads "Add at least 2 products to compare."
- No dashed border box. No AI-accent coloring. Feels like a native page section.

---

## Layout -- Mobile (< 640px)

On mobile, the opinion stacks vertically. The two pick cards become a single column.

```
┌───────────────────────────────┐
│                               │
│  Based on your priorities     │
│  Updated 2 hours ago          │
│                               │
│  ┌───────────────────────────┐│
│  │ "The LG C3 OLED is the   ││
│  │  strongest overall pick   ││
│  │  -- it leads on picture   ││
│  │  quality and input lag."  ││
│  └───────────────────────────┘│
│                               │
│  Best overall                 │
│  ┌───────────────────────────┐│
│  │ ┌──────┐ LG C3 OLED      ││
│  │ │ img  │ ₹69,990          ││
│  │ │ 48px │ ★ 4.6 (3.2K)    ││
│  │ └──────┘                   ││
│  │ "Best picture quality..."  ││
│  │              [View product]││
│  └───────────────────────────┘│
│                               │
│  Best value                   │
│  ┌───────────────────────────┐│
│  │ ┌──────┐ Samsung S90C     ││
│  │ │ img  │ ₹74,990          ││
│  │ │ 48px │ ★ 4.3 (1.8K)    ││
│  │ └──────┘                   ││
│  │ "Best price-to-feature.." ││
│  │              [View product]││
│  └───────────────────────────┘│
│                               │
│  > How they compare      [v]  │
│  > Watch out for         [v]  │
│                               │
└───────────────────────────────┘
```

- Pick cards are full width, stacked.
- Collapsibles remain collapsed by default.
- Verdict text may wrap to 3-4 lines on narrow screens -- that is acceptable.

---

## Layout -- Loading State (Generation In Progress)

While the opinion is being generated, show a skeleton that matches the final layout.

```
│  Based on your priorities                                                 │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            │  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────── ░░░░░░░ ─────────┐  ┌──────────── ░░░░░░░ ─────────┐ │
│  │  ┌──────┐  ░░░░░░░░░░░░          │  │  ┌──────┐  ░░░░░░░░░░░       │ │
│  │  │ ░░░░ │  ░░░░░░░░              │  │  │ ░░░░ │  ░░░░░░░           │ │
│  │  │ ░░░░ │  ░░░░░░░░░░            │  │  │ ░░░░ │  ░░░░░░░░░         │ │
│  │  └──────┘                         │  │  └──────┘                     │ │
│  │  ░░░░░░░░░░░░░░░░░░░░░░          │  │  ░░░░░░░░░░░░░░░░░░░         │ │
│  └───────────────────────────────────┘  └───────────────────────────────┘ │
```

- Skeleton uses `animate-pulse` on `bg-muted` blocks matching the verdict area and two pick cards.
- No shimmer or fancy loading -- matches the existing skeleton pattern used for product cards.
- Attribution text is real (not skeleton) since it can render immediately.

---

## Design Decisions

### Decision 1: Verdict Placement -- Top vs Bottom

**Chosen: Verdict at the top, as a quote block**

| Option | Pros | Cons |
|--------|------|------|
| **A. Verdict at top (Chosen)** | Scannable in 3 seconds. The user gets the answer immediately -- no scrolling, no reading. Follows the inverted pyramid pattern (journalism). Mimics how a trusted friend would answer: conclusion first, reasoning on request. | Verdict must be well-written to stand alone without context. Requires the AI prompt to produce a concise, self-contained statement. |
| B. Verdict at bottom (current) | Logical reading order: evidence then conclusion. Feels like a structured report. | Buried. Users scanning quickly will never reach it. Forces reading 4-5 paragraphs first. Fails the "3-second scan" test. |
| C. Verdict as sidebar callout | Always visible while scrolling through details. | Requires a multi-column layout within the opinion section itself. Overly complex for 1-2 sentences. |

The verdict is rendered as a `blockquote`-style element: `bg-muted/50 rounded-lg p-4` with `text-base` or `text-lg` depending on length. No quotation marks in the UI -- the styling itself communicates "this is the key statement." Maximum 2 sentences enforced by the AI prompt template.

### Decision 2: Product References -- Text Names vs Visual Cards

**Chosen: Mini product cards with thumbnails**

| Option | Pros | Cons |
|--------|------|------|
| **A. Mini product cards (Chosen)** | The user can see exactly which product is being recommended without scrolling back to the grid. Thumbnail + name + price provides instant recognition. "View product" link enables navigation to the detail panel. Feels integrated with the product grid rather than separate from it. | Requires passing product data (image, price, rating) to the opinion component, not just names. Adds visual weight compared to plain text. |
| B. Text names only (current) | Lightweight. Easy to implement. | Users must mentally map "Samsung S90C" back to the grid. No visual connection. Fails the "integrated, not bolted on" goal. |
| C. Full product card embeds | Maximum recognition -- same card as in the grid. | Too heavy. Duplicates the grid. The opinion section should summarize, not replicate. |
| D. Linked text names | Clickable text that scrolls to the product in the grid. | Better than plain text but still requires the user to leave the opinion section to see what the product looks like. |

Each pick card shows: 48x48 rounded thumbnail, product name (`font-medium`), price, rating with review count, and a one-line reason. A ghost "View product" link at the bottom opens the product detail panel. The card uses `bg-card border rounded-lg p-4` -- the same treatment as any other card surface in the app.

### Decision 3: Collapsible Sections vs Flat Display

**Chosen: Comparison and concerns behind collapsible disclosure**

| Option | Pros | Cons |
|--------|------|------|
| **A. Collapsible (Chosen)** | Reduces initial visual weight by approximately 60%. Most users only need verdict + picks. Power users can expand for reasoning. Follows the progressive disclosure principle from 04-frontend-architecture.md. Matches the accordion pattern already used in the product detail panel (06b). | Content is one click deeper. Some users may not discover it. |
| B. Flat display (current) | Everything visible at once. No interaction required to see full content. | Wall of text. Not scannable. Overwhelms. Directly causes the "too text-heavy" problem. |
| C. Tabbed sections | Organized. Fixed height. | Tabs within a section within a page is too much nesting. Over-engineered for 2 sections. |

Uses shadcn `Collapsible` (not full `Accordion`). Two items: "How they compare" and "Things to watch out for." Both collapsed by default. Chevron icon rotates on expand. Content inside is `text-sm text-muted-foreground leading-relaxed` -- readable but not prominent.

### Decision 4: AI Attribution -- Prominent vs Subtle

**Chosen: Subtle attribution line, no AI branding**

| Option | Pros | Cons |
|--------|------|------|
| **A. Subtle line (Chosen)** | "Based on your priorities" frames the opinion as personalized advice rather than AI output. Feels like a feature of the page, not a separate AI widget. Avoids the "uncanny valley" of AI branding (sparkles, purple, "AI Expert"). Matches how Linear attributes automated features -- small, factual, no fanfare. | Users may not realize AI generated this. (But they clicked "Get recommendation" -- they know.) |
| B. Prominent AI header (current) | Clear attribution. Users know exactly what generated this. Sparkle icon is recognizable. | Makes the feature feel bolted on. Purple border + sparkle icon screams "AI feature." Breaks the visual integration with the rest of the page. See NN/g research: "AI sparkle icon is not universally understood." |
| C. No attribution at all | Cleanest. Feels fully native. | Misleading. Users should know this is generated, not hand-written. |

The attribution line reads "Based on your priorities" in `text-xs text-muted-foreground`. The timestamp sits right-aligned on the same line. No icon. No border. No background. It is metadata, styled as metadata.

### Decision 5: Color Palette -- AI-Accent vs Neutral

**Chosen: App's neutral palette only**

| Option | Pros | Cons |
|--------|------|------|
| **A. Neutral palette (Chosen)** | The opinion looks like it belongs on the page. No visual segregation. Cards use `bg-card`, text uses `--foreground` and `--muted-foreground`, borders use `--border`. Same treatment as product cards, list header, filter tabs. Linear-inspired: monochromatic UI with selective color only for status. | Less visually distinctive. Users must rely on placement and content (not color) to identify this section. |
| B. AI-accent tinting (current) | Clearly distinct from the rest of the page. Users can instantly identify AI content. | Feels foreign. Purple/green coloring creates a visual "this is different" signal that makes the feature feel like a third-party widget rather than a native page section. |
| C. Accent border only | Middle ground -- neutral fill, colored left border. | Still creates visual segregation. Half-measure that satisfies neither goal fully. |

The only color in the opinion section comes from the product thumbnails and the standard `--foreground`/`--muted-foreground` text hierarchy. The "Best overall" and "Best value" labels use `text-sm font-medium text-muted-foreground` -- no special color, no icons. Differentiation comes from position and typography, not color.

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Attribution line** | `<div>` with flex layout | Left: "Based on your priorities" `text-xs text-muted-foreground`. Right: "Updated {relativeTime}" same style. `justify-between`. No icon, no border. |
| 2 | **Verdict quote** | `<blockquote>` or `<div>` | `bg-muted/50 rounded-lg p-4 text-base leading-relaxed`. Content is `opinion.verdict` trimmed to 2 sentences max. No quotation marks -- the container styling differentiates it. `font-normal` (not italic). |
| 3 | **Pick cards container** | CSS Grid | `grid grid-cols-1 sm:grid-cols-2 gap-4`. Two cards side-by-side on desktop, stacked on mobile. |
| 4 | **Pick card (Best overall)** | `<Card>` (shadcn) | `bg-card border rounded-lg p-4`. Label: "Best overall" in `text-xs font-medium text-muted-foreground uppercase tracking-wide` above the card content. Inside: 48x48 rounded thumbnail (`aspect-square object-cover rounded-md`), product name `text-sm font-medium`, price `text-sm text-muted-foreground`, rating `text-xs text-muted-foreground`. Reason: `text-sm text-muted-foreground mt-2`. "View product" ghost button at bottom right. |
| 5 | **Pick card (Best value)** | Same as #4 | Identical structure. Label reads "Best value" instead. Product data from `opinion.value_pick` with matching product's image, price, rating. |
| 6 | **Product thumbnail** | `<img>` or Next.js `<Image>` | `w-12 h-12 rounded-md object-cover bg-muted`. Fallback: `bg-muted` with package icon if no image. Matches the 48x48 thumbnail size used in table view (06a). |
| 7 | **"View product" link** | `<Button variant="ghost" size="sm">` | `text-xs text-muted-foreground hover:text-foreground`. On click: opens the product detail panel for that product (same as clicking a product card in the grid). |
| 8 | **Collapsible: "How they compare"** | shadcn `<Collapsible>` | Trigger: `text-sm font-medium` with `ChevronRight` icon that rotates 90deg on open. Content: `opinion.comparison` rendered as `text-sm text-muted-foreground leading-relaxed` with `p-4`. Border-top separator from trigger. |
| 9 | **Collapsible: "Things to watch out for"** | shadcn `<Collapsible>` | Same structure as #8. Content: `opinion.concerns`. Only rendered if `opinion.concerns` is non-null and non-empty. |
| 10 | **Stale banner** | `<div>` | `bg-muted rounded-lg px-4 py-3 flex items-center justify-between`. Left: "Products have changed since this was generated." `text-sm text-muted-foreground`. Right: `<Button variant="outline" size="sm">Regenerate</Button>`. Replaces the attribution line when stale. |
| 11 | **CTA (no opinion)** | `<div>` centered | Heading: "Compare your products and get a recommendation" `text-sm text-muted-foreground text-center`. Subtext: "Based on your priorities and budget." `text-xs text-muted-foreground text-center`. Button: `<Button>Get recommendation</Button>` default variant, centered. Disabled state: `productCount < 2`. |
| 12 | **Loading skeleton** | Skeleton layout | Verdict: `<Skeleton className="h-16 w-full rounded-lg" />`. Pick cards: two `<Skeleton className="h-32 rounded-lg" />` in the 2-col grid. Uses `animate-pulse` per existing pattern. |
| 13 | **Section separator** | Visual spacing | `mt-8 pt-8 border-t border-border` between the product grid and the opinion section. A standard content divider, not a decorative element. |

---

## Animation Spec

### Opinion Appearance (After Generation)

```
Timeline:
---------------------------------------------------------------
  0ms     Attribution line    opacity 0 -> 1              (150ms, ease-out)
  50ms    Verdict block       opacity 0 -> 1, y: 8 -> 0  (250ms, ease-out)
  150ms   Pick card 1         opacity 0 -> 1, y: 8 -> 0  (250ms, ease-out)
  200ms   Pick card 2         opacity 0 -> 1, y: 8 -> 0  (250ms, ease-out)
  300ms   Collapsible 1       opacity 0 -> 1              (150ms, ease-out)
  350ms   Collapsible 2       opacity 0 -> 1              (150ms, ease-out)
---------------------------------------------------------------
  Total sequence: ~500ms
```

Uses Framer Motion `staggerChildren: 0.05` on the parent container. Each child uses `initial={{ opacity: 0, y: 8 }}` and `animate={{ opacity: 1, y: 0 }}`. No spring physics -- simple ease-out to keep it calm and understated. Matches the card entry stagger pattern from 06a but with smaller `y` offset (8px vs 12px) because these are text blocks, not cards.

### Collapsible Expand / Collapse

```
Expand:
  0ms     Chevron rotates 0deg -> 90deg  (200ms, ease-in-out)
  0ms     Content height 0 -> auto       (200ms, ease-out)
  0ms     Content opacity 0 -> 1         (200ms, ease-out)

Collapse:
  0ms     Chevron rotates 90deg -> 0deg  (200ms, ease-in-out)
  0ms     Content opacity 1 -> 0         (150ms, ease-in)
  100ms   Content height auto -> 0       (150ms, ease-in)
```

Standard `Collapsible` animation. No custom physics. Chevron rotation uses CSS `transition-transform duration-200`. Content height animation uses Framer Motion `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` and `animate={{ height: "auto", opacity: 1 }}`.

### Stale Banner Entry

```
0ms     Banner: opacity 0, height 0 -> auto  (200ms, ease-out)
0ms     Opinion content: opacity 1 -> 0.6    (300ms, ease-out)
```

Subtle. The banner slides into view and the opinion content simultaneously dims. Uses `AnimatePresence` for the banner and a conditional `opacity-60` class on the opinion container.

### Regenerate Button Loading

```
Click:
  0ms     Button text "Regenerate" -> spinner + "Updating..."
          Entire opinion section: opacity 0.6 -> 0.3 (pulse, 2s loop)
Complete:
  0ms     New opinion replaces old with the same stagger animation
          as initial appearance (reuses the same motion config)
```

No full skeleton replacement during regeneration. The existing content stays visible but pulsed, so the user retains context. When the new opinion arrives, it replaces the old content with the standard stagger entrance.

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Verdict background | `bg-muted/50` (near-white) | `bg-muted/50` (dark grey, ~#1a1a1a) |
| Pick card background | `bg-card` (white) | `bg-card` (#111 range) |
| Pick card border | `border-border` (zinc-200) | `border-border` (zinc-800 / white-10%) |
| Product thumbnail | Full brightness | `brightness-90` (matches product card treatment from 06a) |
| Attribution text | `text-muted-foreground` (zinc-500) | `text-muted-foreground` (zinc-400) |
| Stale banner background | `bg-muted` (zinc-100) | `bg-muted` (zinc-800) |
| Collapsible trigger text | `text-foreground` (near-black) | `text-foreground` (near-white) |
| Collapsible content text | `text-muted-foreground` | `text-muted-foreground` |
| Section separator border | `border-border` (zinc-200) | `border-border` (white-10%) |

No special dark mode overrides. Every element uses semantic tokens that automatically adapt. This is the benefit of eliminating `ai-accent` and `purchased` colors from the opinion -- the section inherits the page's theme without any dark-mode-specific code.

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Attribution line stacks: "Based on your priorities" on one line, timestamp below it, both left-aligned. Pick cards stack to single column (`grid-cols-1`). Verdict text may wrap to 3-4 lines. Collapsible triggers are full-width tap targets with `min-h-[44px]` for touch. CTA button is full-width. |
| Tablet (`640px - 1023px`) | Same as desktop layout. Pick cards side-by-side. Opinion section matches the 2-column product grid width. |
| Desktop (`>= 1024px`) | Full layout as shown in the ASCII wireframe. Pick cards side-by-side. Collapsibles use hover state on trigger. |
| Detail panel open (any width) | Opinion section is hidden (`hidden` class). When the user is in the detail panel, they are focused on one product -- showing the comparative opinion would be noise. The opinion reappears when the panel closes. |

---

## Accessibility

- **Verdict region**: Wrapped in `<section aria-label="Product recommendation">` so screen readers can navigate directly to it.
- **Verdict text**: Uses `role="status"` when first generated so screen readers announce the new recommendation. After initial announcement, removes the role to avoid re-reading on every render.
- **Pick cards**: Each is a `<div role="article">` with `aria-label="Best overall: LG C3 OLED"` (or "Best value: ..."). Screen readers announce the label, then the user can tab into the content.
- **"View product" links**: `aria-label="View LG C3 OLED details"` -- includes the product name so it is not an ambiguous "View product" link.
- **Collapsible triggers**: Use `aria-expanded="true|false"` and `aria-controls` pointing to the content panel ID. Keyboard: Enter/Space toggles. Standard Radix Collapsible behavior.
- **Stale banner**: `role="alert"` so screen readers announce when the opinion is outdated. The "Regenerate" button has `aria-label="Regenerate product recommendation"`.
- **CTA button (disabled)**: `aria-disabled="true"` with `aria-describedby` pointing to the subtitle that explains why ("Add at least 2 products to compare.").
- **Loading skeleton**: `aria-busy="true"` and `aria-label="Generating product recommendation"` on the skeleton container.
- **Color independence**: No information is conveyed through color alone. "Best overall" and "Best value" are text labels, not color-coded badges. The stale state uses text + banner, not a color change.
- **Focus management**: When the opinion is first generated, focus moves to the verdict section so keyboard users are aware of the new content. Uses `tabIndex={-1}` with `ref.focus()` on mount.
- **Reduced motion**: All Framer Motion animations respect `prefers-reduced-motion`. The `staggerChildren` and `y` transitions are replaced with instant opacity changes when reduced motion is preferred.

---

## Component Architecture

### New Components

```
components/ai/
  expert-opinion.tsx              # Container: fetches opinion data, renders CTA or result
  expert-opinion-verdict.tsx      # The verdict quote block
  expert-opinion-pick-card.tsx    # Reusable pick card (used for both "best overall" and "best value")
  expert-opinion-details.tsx      # The two collapsible sections (comparison + concerns)
  expert-opinion-cta.tsx          # Redesigned CTA (replaces current implementation)
  expert-opinion-skeleton.tsx     # Loading skeleton matching final layout
  expert-opinion-stale-banner.tsx # Stale state banner with regenerate button
```

### Data Flow

```
expert-opinion.tsx (Server Component)
  |
  +-- Reads opinion data + product data for top_pick / value_pick
  |
  +-- If no opinion:
  |     +-- expert-opinion-cta.tsx ('use client' -- handles generate action)
  |
  +-- If opinion exists:
        +-- expert-opinion-stale-banner.tsx ('use client' -- if stale, handles regenerate)
        +-- expert-opinion-verdict.tsx (Server Component -- static render)
        +-- expert-opinion-pick-card.tsx x2 (Server Component -- static render)
        +-- expert-opinion-details.tsx ('use client' -- collapsible interaction)
```

### Props Changes

The current `ExpertOpinionCard` receives `productNames: Record<string, string>`. The redesign requires richer product data for the pick cards:

```typescript
type PickProduct = {
  id: string
  title: string
  image_url: string | null
  price_min: number | null
  currency: string
  rating: number | null
  review_count: number | null
  domain: string | null
}

type ExpertOpinionProps = {
  opinion: ListAiOpinion
  topPickProduct: PickProduct | null
  valuePickProduct: PickProduct | null
  productCount: number
  onViewProduct: (productId: string) => void
}
```

---

## What Changes From Current Implementation

| Aspect | Current | Redesigned |
|--------|---------|-----------|
| **Verdict position** | Bottom of 6 sections | Top -- first thing visible |
| **Product references** | Text names only | Mini cards with thumbnail, price, rating |
| **AI coloring** | Purple `ai-accent` borders, green `purchased` for value pick | Neutral palette only (`bg-card`, `border-border`, `text-foreground`) |
| **Sparkle icons** | Header, top pick, value pick, CTA | None |
| **Trophy/Coins icons** | Top pick and value pick headers | None -- text labels only ("Best overall", "Best value") |
| **Sections visible** | All 6 (summary, comparison, concerns, verdict, top pick, value pick) | 2 visible (verdict, picks), 2 collapsible (comparison, concerns), summary removed (verdict replaces it) |
| **Summary section** | Separate paragraph | Removed -- the verdict now serves as the summary |
| **CTA styling** | Purple dashed border, `bg-ai-accent/5`, sparkle icon | No border, no tint, centered text + default button |
| **Stale warning** | Amber border, `RefreshCw` icon, `extraction-pending` color | Muted banner, no icon, `variant="outline"` button |
| **Container** | `<Card>` with `border-ai-accent/20` | No wrapping card -- inline section with `border-t` separator from grid |
| **Header** | "AI Expert Opinion" with sparkle | "Based on your priorities" -- small, muted attribution |
| **Information architecture** | Flat list of 6 equal-weight sections | Inverted pyramid: verdict (prominent) > picks (medium) > details (collapsed) |

---

## References

**Information Hierarchy and Scanability:**
- [NN/g -- Inverted Pyramid for Web Writing](https://www.nngroup.com/articles/inverted-pyramid/) -- conclusion first, details on demand
- [NN/g -- How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/) -- F-pattern scanning, front-load key information
- [NN/g -- Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) -- show only what is needed, reveal complexity on request

**AI Feature Design (Subtle, Not Flashy):**
- [NN/g -- AI Sparkles Icon Problem](https://www.nngroup.com/articles/ai-sparkles-icon-problem/) -- sparkle icons are not universally understood; pair with text or avoid
- [Google -- AI Sparkle Icon Research](https://design.google/library/ai-sparkle-icon-research-pozos-schmidt) -- the sparkle icon signals "AI" but can also signal "premium" or "magic"
- [Apple Intelligence Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/machine-learning) -- AI features should feel like natural extensions, not separate modes
- [NN/g -- AI Feature Transparency](https://www.nngroup.com/articles/ai-generated-content/) -- attribute AI content, but do not over-brand it

**Product Comparison UX:**
- [NN/g -- Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) -- comparison should highlight differences, not dump data
- [Baymard Institute -- Product Comparison UX](https://baymard.com/ecommerce-design-examples/39-comparison-tool) -- effective comparison surfaces key differentiators
- [Google Shopping Comparison](https://shopping.google.com/) -- verdict + key stats pattern for quick decision support

**Minimal UI / Linear-Inspired Design:**
- [Linear -- How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) -- monochromatic UI, selective color, information density without clutter
- [Linear -- A Calmer Interface](https://linear.app/now/behind-the-latest-design-refresh) -- "be gentle" -- reduce visual noise, let content breathe
- [Rauno Freiberg -- Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design) -- subtle animations, purposeful motion

**Progressive Disclosure in Product UIs:**
- [Notion -- Progressive Complexity](https://www.notion.so/help/guides/the-ultimate-guide-to-simple-project-management-in-notion) -- start simple, expand on demand
- [Figma -- Variable Modes](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) -- collapsible complexity in product tools

**Card Design Patterns:**
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) -- card component API reference
- [shadcn/ui Collapsible](https://ui.shadcn.com/docs/components/collapsible) -- collapsible component API reference
- [Mobbin -- Card UI Patterns](https://mobbin.com/glossary/card) -- real-world card designs from production apps

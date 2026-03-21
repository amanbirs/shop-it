# ShopIt — Frontend Architecture

## Design Principles

These are non-negotiable. Every component, page, and interaction should be measured against them.

### 1. Craft Over Convention
We're building something that feels as polished as Linear and Notion, not a Bootstrap CRUD app. Every pixel matters. Transitions should be smooth, spacing should be intentional, and interactions should feel physical. If something feels "off" visually, it is — fix it before shipping.

### 2. Component-Heavy, Clearly Defined
The codebase is organized around small, composable, single-responsibility components. A `ProductCard` doesn't fetch data — it receives props and renders. A `ShortlistButton` doesn't know about lists — it receives `isShortlisted` and `onToggle`. This makes every piece testable, reusable, and easy to reason about.

### 3. Dark and Light Mode as First-Class Citizens
Not an afterthought. Both themes are designed simultaneously, not "light mode + invert colors." We use semantic color tokens (not raw hex values) so every surface, text color, and border adapts correctly. The user can choose light, dark, or system preference.

### 4. Progressive Disclosure
Show what matters now, reveal complexity on demand. The product card shows title, price, image, and verdict. Specs, reviews, and AI analysis are one click deeper. List settings hide behind a gear icon. Power features (priorities, budget, expert opinion) are discoverable but not in your face.

### 5. Speed Is a Feature
Optimistic UI for every mutation. Skeleton loading states that match the real layout. Server Components for initial render — no client-side fetch waterfalls. The app should feel instant, even when the network isn't.

### 6. Mobile-First, Desktop-Enhanced
The primary use case is someone on their phone pasting a product URL from another app. The mobile experience must be flawless. Desktop adds multi-column layouts and hover interactions, but mobile is the baseline.

### 7. Accessibility by Default
shadcn/ui gives us accessible primitives (keyboard navigation, ARIA labels, focus management). We don't strip these out. Color contrast meets WCAG AA in both themes. Interactive elements have visible focus rings. Screen readers can navigate the full app.

### 8. Delight in the Details
Micro-interactions that reward actions: a subtle bounce when shortlisting, a smooth slide when a new product card appears via Realtime, a satisfying check animation when marking as purchased. These aren't cosmetic — they're feedback that tells the user "it worked."

---

## Technology

| Layer | Choice | Why |
|-------|--------|-----|
| **Component Library** | shadcn/ui | Accessible, unstyled primitives we own and customize. Not a dependency — copied into our codebase. |
| **Styling** | Tailwind CSS 4 | Utility-first, design tokens via CSS variables, built-in dark mode support (`dark:` variant). |
| **Theming** | CSS custom properties + `next-themes` | Semantic tokens (`--background`, `--foreground`, `--muted`, etc.) that swap between light/dark. `next-themes` handles preference persistence and system sync. |
| **Icons** | Lucide React | Consistent, clean icon set. Same icons Linear uses. Tree-shakeable. |
| **Animation** | Tailwind `animate-*` + Framer Motion (selective) | Tailwind for simple transitions. Framer Motion only where physics-based animation adds real value (page transitions, drag-and-drop, list reordering). |
| **Forms** | React Hook Form + Zod | Performant forms with schema validation. Shares Zod schemas with Server Actions. |
| **State** | React Server Components + URL state (`nuqs`) | No global state library. Server Components own data. Client state lives in URL params (filters, view mode) via `nuqs` for shareable URLs. |
| **Toast/Notifications** | Sonner | Beautiful, accessible toasts. Pairs well with shadcn. |

---

## Theming System

### Semantic Color Tokens

We define colors as semantic tokens, not raw values. This is the backbone of dark/light mode.

```css
/* Light theme (default) */
:root {
  --background: 0 0% 100%;         /* white */
  --foreground: 240 10% 3.9%;      /* near-black */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;

  /* ShopIt-specific tokens */
  --shortlisted: 45 93% 47%;       /* amber for shortlisted items */
  --purchased: 142 71% 45%;        /* green for purchased items */
  --ai-accent: 262 83% 58%;        /* purple for AI-generated content */
  --extraction-pending: 38 92% 50%;/* amber pulse for loading */
}

/* Dark theme */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 6%;              /* not pure black — #111 range */
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 15.9%;
  /* ... same semantic names, different values */
}
```

**Key decisions:**
- **No pure black (`#000`) in dark mode.** We use dark greys (`#0a0a0a` to `#171717`) following Material Design guidance. Pure black kills depth — you can't cast shadows on it, and white text on pure black causes halation (text appears to bleed).
- **Desaturated colors in dark mode.** Saturated colors vibrate against dark backgrounds. Our dark theme reduces saturation by ~20% across accent colors.
- **ShopIt-specific tokens** for domain concepts (shortlisted, purchased, AI content) so these colors are consistent everywhere and adapt to both themes.

### Theme Toggle

`next-themes` handles:
- Persisting preference to `localStorage`
- Syncing with system preference (`prefers-color-scheme`)
- Preventing flash of wrong theme on load (script injection in `<head>`)
- Providing `useTheme()` hook for the toggle component

The toggle lives in the top-right of the sidebar/header — always accessible, never buried in settings.

---

## Component Architecture

### Organization

```
components/
  ui/                          # shadcn/ui primitives (we own these)
    button.tsx
    card.tsx
    dialog.tsx
    dropdown-menu.tsx
    input.tsx
    skeleton.tsx
    tooltip.tsx
    badge.tsx
    separator.tsx
    sheet.tsx                   # mobile slide-over panels
    command.tsx                 # command palette (⌘K)
    ...

  layout/                      # Structural components
    sidebar.tsx                 # Main navigation sidebar
    header.tsx                  # Top bar with search, theme toggle, user menu
    mobile-nav.tsx              # Bottom tab bar for mobile
    page-header.tsx             # Page title + actions bar

  lists/                       # List-related components
    list-card.tsx               # List preview card (for dashboard)
    list-header.tsx             # List page header (name, budget, deadline)
    list-filters.tsx            # Filter bar (all / shortlisted / purchased)
    list-priorities.tsx         # Reorderable priority chips
    list-settings-sheet.tsx     # Settings panel (budget, deadline, members)
    create-list-dialog.tsx      # New list modal

  products/                    # Product-related components
    product-card.tsx            # The main product card
    product-card-skeleton.tsx   # Loading skeleton matching card shape
    product-grid.tsx            # Grid/table layout for product cards
    product-detail-sheet.tsx    # Slide-over with full product details
    product-specs.tsx           # Specs table (renders JSONB keys)
    product-reviews.tsx         # Review snippets + AI summary
    product-pros-cons.tsx       # Pros/cons list with icons
    product-status-badge.tsx    # Shortlisted/purchased badge
    product-actions.tsx         # Action buttons (shortlist, purchased, delete)
    add-product-form.tsx        # URL input + paste handler
    extraction-progress.tsx     # Animated extraction status indicator

  ai/                          # AI feature components
    expert-opinion-card.tsx     # Expert opinion display
    expert-opinion-cta.tsx      # "Get Expert Opinion" button + staleness banner
    ai-verdict-badge.tsx        # "Best value", "Top pick" badge on product cards
    ai-summary-section.tsx      # AI-generated product summary

  collaboration/               # Multi-user components
    member-list.tsx             # List of members with roles
    invite-member-dialog.tsx    # Invite modal
    member-avatar.tsx           # Avatar with online indicator
    avatar-stack.tsx            # Overlapping avatar group
    comment-thread.tsx          # Comments on a product
    comment-input.tsx           # Comment text input

  common/                      # Shared across domains
    empty-state.tsx             # "No products yet" with illustration
    error-state.tsx             # Error display with retry
    price-display.tsx           # Formats price/range with currency
    domain-badge.tsx            # "amazon.in" favicon badge
    relative-time.tsx           # "2 hours ago" display
    theme-toggle.tsx            # Light/dark/system toggle
    command-menu.tsx            # ⌘K command palette
```

### Component Principles

**1. Composition over props bloat**
```tsx
// Good: composable
<ProductCard>
  <ProductCard.Image src={...} />
  <ProductCard.Title>{title}</ProductCard.Title>
  <ProductCard.Price min={29999} max={null} currency="INR" />
  <ProductCard.Actions>
    <ShortlistButton ... />
  </ProductCard.Actions>
</ProductCard>

// Bad: prop explosion
<ProductCard
  title={...}
  imageUrl={...}
  priceMin={...}
  priceMax={...}
  currency={...}
  isShortlisted={...}
  onShortlist={...}
  // 20 more props...
/>
```

**2. Server vs Client boundary**

```
Server Components (default):
  - ProductGrid (fetches + renders product list)
  - ListHeader (reads list metadata)
  - ExpertOpinionCard (reads opinion data)

Client Components ('use client'):
  - ShortlistButton (onClick handler)
  - AddProductForm (input state + form submission)
  - ThemeToggle (useTheme hook)
  - CommentInput (controlled input)
  - ExtractionProgress (Realtime subscription)
  - CommandMenu (keyboard event listeners)
```

**Rule:** Start as Server Component. Add `'use client'` only when the component needs interactivity (event handlers, hooks, browser APIs). Push the client boundary as far down the tree as possible.

**3. Loading states match real layout**

Every component that loads data has a matching skeleton:
```tsx
// product-card-skeleton.tsx mirrors product-card.tsx exactly
<div className="rounded-lg border p-4">
  <Skeleton className="h-40 w-full rounded-md" />    {/* image */}
  <Skeleton className="mt-3 h-5 w-3/4" />            {/* title */}
  <Skeleton className="mt-2 h-4 w-1/4" />            {/* price */}
  <Skeleton className="mt-2 h-4 w-1/2" />            {/* verdict */}
</div>
```

No layout shift when data arrives.

---

## Page Structure

```
app/
  (auth)/                       # Unauthenticated layout (no sidebar)
    login/page.tsx              # Email input → magic link
    auth/callback/route.ts      # Magic link callback

  (app)/                        # Authenticated layout (sidebar + header)
    layout.tsx                  # Sidebar, header, theme provider, Realtime setup
    page.tsx                    # Dashboard: your lists
    lists/
      [listId]/
        page.tsx                # Product grid for a list
        settings/page.tsx       # List settings, members, danger zone
    profile/
      page.tsx                  # User profile, context, preferences
```

### Key Layouts

**Authenticated layout** (`(app)/layout.tsx`):
```
┌──────────────────────────────────────────────┐
│  Sidebar (desktop)  │  Header (search, user) │
│                     │────────────────────────│
│  - Your Lists       │                        │
│  - Shared with me   │     Page Content       │
│  - Settings         │                        │
│                     │                        │
│                     │                        │
└─────────────────────┴────────────────────────┘

Mobile:
┌──────────────────────┐
│  Header              │
│──────────────────────│
│                      │
│    Page Content      │
│                      │
│──────────────────────│
│  Bottom Tab Bar      │
└──────────────────────┘
```

**List page** (`lists/[listId]/page.tsx`):
```
┌──────────────────────────────────────────────┐
│  ← Back   List Name        ⚙ Settings       │
│  Budget: ₹30K-50K  |  Due: Mar 30  | 👥 3   │
│──────────────────────────────────────────────│
│  [Paste URL here...]                    [+]  │
│──────────────────────────────────────────────│
│  All (6)  |  Shortlisted (3)  |  Purchased   │
│──────────────────────────────────────────────│
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Product │  │ Product │  │ Product │      │
│  │  Card   │  │  Card   │  │  Card   │      │
│  │         │  │         │  │         │      │
│  └─────────┘  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Product │  │ Product │  │ Skeleton│      │
│  │  Card   │  │  Card   │  │(loading)│      │
│  └─────────┘  └─────────┘  └─────────┘      │
│──────────────────────────────────────────────│
│  🤖 Get Expert Opinion                       │
└──────────────────────────────────────────────┘
```

---

## View Modes

The product list supports two view modes, persisted in URL params:

### Card View (default)
Responsive grid of product cards. 1 column on mobile, 2 on tablet, 3 on desktop. Each card shows: image, title, price, domain badge, AI verdict, shortlist button. Tap to expand detail sheet.

### Table View
Dense table for comparison. Columns: image thumbnail, title, price, rating, verdict, status. Sortable by price, rating, date added. Better for desktop when comparing 5+ products side by side.

Toggle is a segmented control in the filter bar: `[Grid] [Table]`

---

## Interaction Patterns

### URL Paste (Core Flow)
1. User taps the URL input field
2. Pastes a URL (or types it)
3. On submit: Server Action inserts product with `pending` status
4. Card appears instantly as a skeleton with a shimmer animation
5. Realtime subscription fires as extraction progresses
6. Skeleton is replaced with real data — smooth crossfade transition
7. Toast: "Product added successfully"

### Shortlisting
1. User taps the star/heart icon on a product card
2. Optimistic update: icon fills immediately with a subtle scale animation
3. Server Action fires in background
4. If it fails: revert icon, show error toast
5. Other collaborators see the change via Realtime

### Product Detail
1. User taps a product card
2. Sheet slides up from bottom (mobile) or from right (desktop)
3. Full product details: image, all specs, pros/cons, reviews, AI summary
4. Comments section at the bottom
5. Action buttons: Shortlist, Mark Purchased, Delete

### Expert Opinion
1. User scrolls to bottom of list page
2. "Get Expert Opinion" CTA button
3. On click: loading state with animated AI indicator
4. Opinion streams in section by section (top pick → value pick → comparison → verdict)
5. Result persists — shown inline on the list page
6. If products change: "Opinion may be outdated" banner with "Regenerate" button

### Command Palette (⌘K)
Quick access to:
- Switch between lists
- Search products across all lists
- Create new list
- Toggle theme
- Navigate to settings

---

## Responsive Breakpoints

Following Tailwind's default breakpoints:

| Breakpoint | Value | Layout |
|-----------|-------|--------|
| Default (mobile) | `< 640px` | Single column, bottom nav, sheets for detail |
| `sm` | `640px` | Minor spacing adjustments |
| `md` | `768px` | 2-column product grid |
| `lg` | `1024px` | Sidebar appears, 2-3 column grid |
| `xl` | `1280px` | 3-column grid, wider sidebar |

---

## Animation Guidelines

| Type | Tool | Duration | Easing |
|------|------|----------|--------|
| Hover effects | Tailwind `transition-colors` | 150ms | `ease-in-out` |
| Sheet open/close | Framer Motion | 300ms | `spring(0.3, 0.8)` |
| Card appear (Realtime) | Framer Motion `AnimatePresence` | 200ms | `ease-out` |
| Skeleton shimmer | Tailwind `animate-pulse` | 2s loop | linear |
| Shortlist toggle | CSS `transform: scale` | 200ms | `spring` bounce |
| Toast enter/exit | Sonner (built-in) | 200ms | — |
| Page transitions | None (instant) | — | — |

**Rule:** Animations should be fast (under 300ms) and purposeful. If an animation doesn't communicate state change or provide feedback, remove it.

---

## Folder Structure (Frontend)

```
app/
  (auth)/
    login/page.tsx
    auth/callback/route.ts
  (app)/
    layout.tsx
    page.tsx                     # Dashboard
    lists/
      [listId]/
        page.tsx                 # List detail
        settings/page.tsx        # List settings
    profile/page.tsx
  globals.css                    # Tailwind directives + theme tokens
  layout.tsx                     # Root layout: fonts, providers

components/
  ui/                            # shadcn/ui primitives
  layout/                        # Sidebar, header, nav
  lists/                         # List domain components
  products/                      # Product domain components
  ai/                            # AI feature components
  collaboration/                 # Multi-user components
  common/                        # Shared utilities

hooks/
  use-realtime-products.ts       # Supabase Realtime subscription
  use-realtime-comments.ts       # Comment subscription
  use-optimistic-action.ts       # Optimistic update wrapper

lib/
  utils.ts                       # cn() helper, formatters
  constants.ts                   # App-wide constants
```

---

## What's NOT in v1 Frontend

- **Drag-and-drop reorder** — position field exists in DB, but manual reorder UI is v2
- **Inline editing** — product titles/notes edited via the detail sheet, not inline on cards
- **Notification center** — Realtime updates the UI directly; no notification bell
- **Onboarding tour** — the app is simple enough; if family members can't figure it out, the UX failed
- **Analytics/dashboard** — no charts, no spend tracking; that's v2
- **Offline support** — PWA/service worker is v2; the app requires connectivity

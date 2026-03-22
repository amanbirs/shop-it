# ShopIt — Global Shell & Layout

Detailed design spec for the authenticated app shell — the sidebar, header, and layout wrapper that frames every page after login.

> **Note:** This is the `(app)/layout.tsx` component. It wraps the Dashboard (`/`), List Detail (`/lists/[id]`), and all other authenticated pages.

---

## Overview

The global shell is the persistent frame around every authenticated page. It provides navigation (sidebar on desktop, bottom tabs on mobile), a header bar with search and user actions, and the layout structure that all page content sits within.

Design inspiration: **Linear's app shell** — clean sidebar with list navigation, minimal header, content area that fills the remaining space. The sidebar is the primary way users move between lists. The header is deliberately thin — most actions live on the pages themselves, not in a global toolbar.

The shell has three main pieces:

1. **Sidebar** (desktop) — persistent left navigation. Shows logo, all user's lists (owned + shared), and a settings link. Collapsible.
2. **Header bar** — thin top bar with command palette trigger (`⌘K`), theme toggle, and user avatar menu.
3. **Content area** — fills remaining space. Pages render here. Scrolls independently from sidebar.

On mobile, the sidebar is replaced by a **bottom tab bar** and the header simplifies to a hamburger + user avatar.

---

## Layout — Desktop (Sidebar Expanded)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────────────────────────────────┐  │
│ │              │ │  ⌘K Search...                    [◑] [▤ avatar ▾] │  │
│ │  ◆ ShopIt    │ ├────────────────────────────────────────────────────┤  │
│ │              │ │                                                    │  │
│ │  ─────────── │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  YOUR LISTS  │ │                                                    │  │
│ │              │ │              Page Content                          │  │
│ │  📺 The Great│ │              (Dashboard, List Detail, etc.)        │  │
│ │     TV Show… │ │                                                    │  │
│ │  🛋 Operation│ │                                                    │  │
│ │     Dream C… │ │                                                    │  │
│ │  🎧 Audio    │ │                                                    │  │
│ │     Quest    │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  ─────────── │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  SHARED      │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  🏠 House    │ │                                                    │  │
│ │     Reno     │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  ─────────── │ │                                                    │  │
│ │              │ │                                                    │  │
│ │  [←] Collapse│ │                                                    │  │
│ │  ⚙ Settings  │ │                                                    │  │
│ │              │ │                                                    │  │
│ └──────────────┘ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Sidebar Collapsed (icon-only):**
```
┌────┐ ┌──────────────────────────────────────────────────┐
│ ◆  │ │  ⌘K Search...                    [◑] [▤ ▾]     │
│    │ ├──────────────────────────────────────────────────┤
│ 📺 │ │                                                  │
│ 🛋 │ │                                                  │
│ 🎧 │ │              Page Content                        │
│    │ │                                                  │
│ ── │ │                                                  │
│ 🏠 │ │                                                  │
│    │ │                                                  │
│ ── │ │                                                  │
│ [→]│ │                                                  │
│ ⚙  │ │                                                  │
└────┘ └──────────────────────────────────────────────────┘
```

**Sidebar dimensions:**
- Expanded: `w-64` (256px)
- Collapsed: `w-14` (56px) — icon + padding only
- Collapse state persisted in `localStorage`

## Layout — Mobile

```
┌────────────────────────────────────┐
│  [☰]  ShopIt             [▤ ▾]    │
├────────────────────────────────────┤
│                                    │
│                                    │
│         Page Content               │
│         (scrollable)               │
│                                    │
│                                    │
│                                    │
├────────────────────────────────────┤
│  [🏠 Home]  [📋 Lists]  [⚙ Settings]│
└────────────────────────────────────┘
```

**Hamburger menu (slides in from left):**
```
┌──────────────────┬─────────────────┐
│                  │ ░░░░░░░░░░░░░░░ │
│  ◆ ShopIt        │ ░░ (dimmed) ░░░ │
│                  │ ░░  page    ░░░ │
│  YOUR LISTS      │ ░░ content  ░░░ │
│  📺 The Great TV │ ░░░░░░░░░░░░░░░ │
│  🛋 Operation    │ ░░░░░░░░░░░░░░░ │
│  🎧 Audio Quest  │ ░░░░░░░░░░░░░░░ │
│                  │ ░░░░░░░░░░░░░░░ │
│  SHARED          │ ░░░░░░░░░░░░░░░ │
│  🏠 House Reno   │ ░░░░░░░░░░░░░░░ │
│                  │ ░░░░░░░░░░░░░░░ │
│  ⚙ Settings      │ ░░░░░░░░░░░░░░░ │
│                  │ ░░░░░░░░░░░░░░░ │
└──────────────────┴─────────────────┘
```

---

## Design Decisions

### Decision 1: Navigation — Sidebar vs Top Nav vs Bottom Tabs

**Chosen: Sidebar (desktop) + bottom tabs (mobile)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Sidebar + bottom tabs (Chosen)** | Sidebar shows all lists at a glance — critical for an app where users switch between lists constantly. Matches Linear/Notion/Slack pattern. Bottom tabs are standard mobile navigation (iOS/Android convention). | Sidebar eats horizontal space (256px). Collapsible mitigates this. |
| **B. Top nav only** | Maximum content width. Simple. | Can't show a list of lists in top nav — would need a dropdown. Less discoverable. |
| **C. Bottom tabs only (all platforms)** | Consistent across devices. | On desktop, bottom tabs feel mobile-ported. Wastes vertical space. Can't show individual lists in tabs. |

The sidebar is the soul of the navigation. Users maintain 1-5 active lists. Seeing them all in the sidebar means one click to switch context — no dropdown hunting. This is the same pattern Linear uses for projects and Slack uses for channels. Familiarity matters.

### Decision 2: Sidebar — Persistent vs Overlay

**Chosen: Persistent (pushes content) on desktop, overlay on mobile**

| Option | Pros | Cons |
|--------|------|------|
| **A. Persistent push (Chosen)** | Content reflows naturally. No overlap. User always knows the sidebar is there. Collapse/expand is smooth with layout animation. | Uses 256px when expanded. On narrow viewports (1024-1280px), content feels slightly cramped. |
| **B. Overlay (slides over content)** | Full-width content always available. | Feels like a mobile pattern on desktop. Content is hidden when sidebar is open. Easy to forget it exists. |
| **C. Persistent, not collapsible** | Always visible. No state to manage. | Wastes space on focused tasks (e.g., reading a product detail sheet). |

Desktop: persistent, collapsible. Collapsed state (`w-14`, icons only) gives content room to breathe while keeping navigation accessible. Expanded state (`w-64`) shows full list names. Collapse state persisted in `localStorage`. Mobile: overlay (slide from left), triggered by hamburger. Content is dimmed behind. Standard mobile drawer pattern.

### Decision 3: Header — Thick vs Thin

**Chosen: Thin header (single row, minimal)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Thin header (Chosen)** | Maximizes vertical space for content. Page-specific actions live on the page, not the header. Clean — matches Linear's approach. | Limited space for global actions. |
| **B. Thick header with breadcrumbs** | Shows location context (Home > Lists > "TV Showdown"). More room for actions. | Eats vertical space. Breadcrumbs are redundant when the sidebar already shows where you are. |
| **C. No header** | Maximum space. Ultra-clean. | Nowhere for search, theme toggle, user menu. Feels incomplete. |

The header contains only three things: command palette trigger (`⌘K`), theme toggle, and user avatar menu. Everything else is page-specific. This keeps the shell thin and lets pages own their content.

### Decision 4: List Organization — Flat vs Grouped

**Chosen: Two groups — "Your Lists" and "Shared"**

| Option | Pros | Cons |
|--------|------|------|
| **A. Two groups (Chosen)** | Clear ownership distinction. User immediately sees what they own vs what others shared with them. Matches mental model: "my stuff" vs "stuff I'm helping with." | Two sections even if one is empty (we hide empty "Shared" section). |
| **B. Flat list (all mixed)** | Simpler. One list to scan. | No ownership context. User can't tell which lists they own. |
| **C. Grouped by status (active/archived)** | Shows archived lists. | Status isn't the primary mental model — ownership is. Archived lists should be behind a toggle, not a permanent section. |

"Your Lists" shows lists where `role = 'owner'`. "Shared" shows lists where `role = 'editor'` or `'viewer'`. Section headers are small caps in `text-xs text-muted-foreground font-medium tracking-wider`. Empty "Shared" section is hidden entirely.

### Decision 5: Command Palette — Build vs Skip

**Chosen: Include command palette (⌘K)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Include (Chosen)** | Power users love it. Fast navigation to any list, any product. Matches Linear/Notion/Slack pattern. Can surface AI actions later ("Compare products", "Get expert opinion"). | Requires building a search index across lists and products. |
| **B. Skip for v1** | Less work. Sidebar already provides navigation. | Misses a key differentiator. Users with many products will struggle to find things. |

v1 scope: search lists by name and products by title. Future: AI-powered actions in the palette. Implementation: shadcn `<CommandDialog>` (built on cmdk). The trigger in the header shows `⌘K` on desktop, magnifying glass on mobile.

---

## Element Breakdown

### Sidebar

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Sidebar container** | `<aside>` | Desktop expanded: `w-64 h-screen fixed left-0 top-0 bg-card border-r border-border flex flex-col`. Collapsed: `w-14`. Transition: `transition-[width] duration-200 ease-out`. Mobile: hidden, replaced by overlay drawer via `<Sheet side="left">`. |
| 2 | **Logo row** | Flex row | `◆` geometric mark + "ShopIt" in `font-semibold text-lg`. Collapsed: only `◆` mark shown. `px-4 py-4`. Click navigates to Dashboard (`/`). |
| 3 | **Section header — "Your Lists"** | `<p>` | `text-xs text-muted-foreground font-medium tracking-wider uppercase px-4 pt-4 pb-1`. Collapsed: hidden. |
| 4 | **List nav item** | `<NavLink>` (or `<Link>`) | `flex items-center gap-3 px-3 py-2 rounded-lg text-sm`. Emoji + list name (truncated with `truncate`). Active: `bg-accent text-accent-foreground font-medium`. Hover: `hover:bg-accent/50`. Collapsed: only emoji shown, centered, with tooltip showing full name. |
| 5 | **Section header — "Shared"** | `<p>` | Same styling as "Your Lists" header. Hidden if no shared lists exist. |
| 6 | **Shared list nav item** | Same as #4 | Identical styling. No visual distinction needed — the section header provides context. Shared lists show a small `👥` badge or are under the "Shared" heading. |
| 7 | **Collapse/expand button** | `<Button variant="ghost" size="sm">` | `ChevronLeft` icon (expanded) / `ChevronRight` (collapsed). At bottom of sidebar, above settings. `text-muted-foreground`. Tooltip: "Collapse sidebar" / "Expand sidebar". |
| 8 | **Settings link** | `<NavLink>` | `⚙` gear icon + "Settings" text. Bottom of sidebar. Same styling as list nav items. Collapsed: only icon. |
| 9 | **New List shortcut** | `<Button variant="ghost" size="sm">` | `+` icon at end of "Your Lists" section header row. Opens Create List dialog. Tooltip: "New list". Collapsed: `+` icon below the last list emoji. |

### Header Bar

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 10 | **Header container** | `<header>` | `h-12 border-b border-border flex items-center justify-between px-4`. Sticky at top of content area (`sticky top-0 z-30 bg-card/80 backdrop-blur-sm`). |
| 11 | **Command palette trigger** | `<Button variant="outline" size="sm">` | Left side of header. Desktop: shows `🔍 Search... ⌘K` in `text-muted-foreground text-sm`. `w-64 justify-start`. Mobile: just a `🔍` icon button. Opens shadcn `<CommandDialog>`. |
| 12 | **Theme toggle** | `<Button variant="ghost" size="icon">` | Sun/Moon icon. Cycles through light → dark → system. Uses `next-themes` `useTheme()`. `text-muted-foreground`. Tooltip shows current mode. |
| 13 | **User avatar menu** | shadcn `<DropdownMenu>` | Trigger: `<Avatar>` (32px) with user's profile image or initials fallback. Dropdown items: user name + email (non-interactive header), "Profile" link, "Settings" link, `<Separator>`, "Sign Out" (calls Supabase `signOut()`). |
| 14 | **Mobile hamburger** | `<Button variant="ghost" size="icon">` | `Menu` icon. Only shown on mobile (`sm:hidden`). Opens sidebar as overlay sheet from left. |

### Command Palette

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 15 | **Command dialog** | shadcn `<CommandDialog>` (cmdk) | Opens on `⌘K` (desktop) or search icon tap (mobile). `max-w-lg` centered. Input at top with instant search. |
| 16 | **Search input** | `<CommandInput>` | `placeholder="Search lists, products..."`. Auto-focused. Filters results as user types. |
| 17 | **Lists group** | `<CommandGroup heading="Lists">` | Shows matching lists with emoji + name. Click navigates to `/lists/[id]`. |
| 18 | **Products group** | `<CommandGroup heading="Products">` | Shows matching products with image thumbnail + title + list name. Click opens product detail sheet on the parent list page. |
| 19 | **Actions group** | `<CommandGroup heading="Actions">` | "Create New List" (opens dialog), "Toggle Theme", "Go to Settings". Static items, always shown. |
| 20 | **Empty state** | `<CommandEmpty>` | "No results found." in `text-sm text-muted-foreground`. |

### Bottom Tab Bar (Mobile)

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 21 | **Tab bar container** | `<nav>` | `fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around`. `pb-safe` for notched phones. `sm:hidden` — desktop has sidebar. |
| 22 | **Home tab** | `<NavLink>` | `🏠` icon + "Home" text in `text-xs`. Active: `text-primary`. Inactive: `text-muted-foreground`. Navigates to Dashboard (`/`). |
| 23 | **Lists tab** | `<NavLink>` | `📋` icon + "Lists" text. Opens a sheet with the full list navigation (same content as sidebar "Your Lists" + "Shared" sections). |
| 24 | **Settings tab** | `<NavLink>` | `⚙` icon + "Settings". Navigates to settings page. |

---

## Animation Spec

### Sidebar Collapse/Expand

```
Expand (w-14 → w-64):
─────────────────────────────────────────────────────
  0ms     Width animates: 56px → 256px (200ms, ease-out)
  0ms     Content area width adjusts (CSS transition on margin-left)
  100ms   Text labels fade in: opacity 0→1 (150ms, +100ms delay)
          Section headers appear
          List names appear next to emojis
─────────────────────────────────────────────────────

Collapse (w-64 → w-14):
─────────────────────────────────────────────────────
  0ms     Text labels fade out: opacity 1→0 (100ms)
  50ms    Width animates: 256px → 56px (200ms, ease-out)
  0ms     Content area expands to fill
─────────────────────────────────────────────────────
```

Implementation: `transition-[width] duration-200` on the sidebar. Text labels use `overflow-hidden whitespace-nowrap` and fade with `transition-opacity`. Content area uses `ml-64` / `ml-14` with matching transition.

### Active List Indicator

```
When navigating to a list:
─────────────────────────────────────────────────────
  0ms     Previous active item: bg-accent → transparent (150ms)
  0ms     New active item: transparent → bg-accent (150ms)
          Framer Motion layoutId="activeNav" for smooth sliding indicator
─────────────────────────────────────────────────────
```

Optional: a small animated pill/bar that slides between active items (like Linear's active indicator). Uses Framer Motion `layoutId` for automatic interpolation between positions.

### Command Palette Open/Close

```
Open (⌘K pressed):
─────────────────────────────────────────────────────
  0ms     Overlay fades in: opacity 0→0.50 (100ms)
  0ms     Dialog drops in: y: -10→0, opacity 0→1 (150ms, ease-out)
  150ms   Input auto-focused, cursor blinking
─────────────────────────────────────────────────────

Close (Escape or overlay click):
─────────────────────────────────────────────────────
  0ms     Dialog: y: 0→-10, opacity 1→0 (100ms, ease-in)
  50ms    Overlay fades out (100ms)
─────────────────────────────────────────────────────
```

### Command Palette Results

```
As user types:
─────────────────────────────────────────────────────
  Results filter instantly (client-side for lists/products already loaded)
  New results fade in: opacity 0→1 (100ms)
  Removed results fade out: opacity 1→0 (80ms)
  Selected result has bg-accent highlight that moves with arrow keys
    (smooth slide via layoutId or CSS transition, 80ms)
─────────────────────────────────────────────────────
```

### Mobile Hamburger Menu

```
Open:
─────────────────────────────────────────────────────
  0ms     Overlay fades in: opacity 0→0.50
  0ms     Sidebar slides in from left: x: -100%→0%
  300ms   Complete
  Easing: spring(1, 80, 14)
─────────────────────────────────────────────────────

Close (tap overlay, swipe left, or tap hamburger):
─────────────────────────────────────────────────────
  0ms     Sidebar slides out: x: 0%→-100% (200ms, ease-in)
  100ms   Overlay fades out (150ms)
─────────────────────────────────────────────────────
```

### Page Transition

```
When navigating between pages (e.g., Dashboard → List Detail):
─────────────────────────────────────────────────────
  0ms     Current page content: opacity 1→0 (100ms)
  100ms   New page content: opacity 0→1 (200ms)
          Sidebar stays static (no animation)
          Header stays static
─────────────────────────────────────────────────────
  Easing: ease-out
```

Subtle — users shouldn't consciously notice page transitions. The shell stays perfectly still; only the content area crossfades. This reinforces the "single-page app" feel.

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Sidebar bg | `bg-card` (white) | `bg-card` (#111 range) |
| Sidebar border | `border-r border-border` (zinc-200) | `border-r border-border` (zinc-800) |
| Active nav item | `bg-accent text-accent-foreground` | `bg-accent text-accent-foreground` |
| Nav item hover | `hover:bg-accent/50` | `hover:bg-accent/50` |
| Section headers | `text-muted-foreground` | `text-muted-foreground` |
| Header bg | `bg-card/80 backdrop-blur-sm` | `bg-card/80 backdrop-blur-sm` |
| Header border | `border-b border-border` | `border-b border-border` |
| Command palette bg | `bg-card` | `bg-card` |
| Command palette border | `border-border` | `border-border` |
| Command palette input | `bg-transparent` | `bg-transparent` |
| Search result hover | `bg-accent` | `bg-accent` |
| User avatar ring | `ring-2 ring-background` | `ring-2 ring-background` |
| Dropdown menu bg | `bg-popover` | `bg-popover` |
| Bottom tab bar bg | `bg-card` (white) | `bg-card` (#111 range) |
| Bottom tab active | `text-primary` | `text-primary` |
| Bottom tab inactive | `text-muted-foreground` | `text-muted-foreground` |
| Theme toggle icon | `Sun` (light) / `Moon` (dark) | `Moon` (dark) / `Sun` (light) |
| Overlay (mobile menu) | `bg-black/50` | `bg-black/60` |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Sidebar hidden. Bottom tab bar visible. Header shows hamburger (left) + logo (center) + avatar (right). Command palette opens full-width. Page content fills entire width. Hamburger opens sidebar as overlay sheet from left. |
| Tablet (`640-1024px`) | Sidebar collapsed by default (`w-14`, icons only). Expandable on click. No bottom tab bar. Header shows full search trigger. Content area adapts to sidebar width. |
| Desktop (`> 1024px`) | Sidebar expanded by default (`w-64`). Collapsible. No bottom tab bar. Full header with search + theme + avatar. Content area has `ml-64` (or `ml-14` when collapsed). |

**Sidebar collapse persistence:** State is saved in `localStorage` (`sidebar-collapsed: true/false`). On page load, sidebar initializes to the saved state without a visual flash (read state before first render in layout component).

---

## Accessibility

### Sidebar
- `<aside>` element with `role="navigation"` and `aria-label="Main navigation"`.
- List nav items are `<a>` links (or `<Link>`) — proper semantics for navigation.
- Active item has `aria-current="page"`.
- Section headers ("YOUR LISTS", "SHARED") use `role="heading" aria-level="2"` within the nav.
- Collapse button has `aria-label="Collapse sidebar"` / `"Expand sidebar"` and `aria-expanded` state.
- Collapsed state: emoji-only items have `title` attribute and tooltip for sighted users, `aria-label="{list name}"` for screen readers.

### Header
- `<header>` element with `role="banner"`.
- Command palette trigger has `aria-label="Search (⌘K)"` and `aria-haspopup="dialog"`.
- Theme toggle has `aria-label="Toggle theme"` and cycles through light/dark/system with announced state.
- User avatar menu: `<DropdownMenu>` trigger has `aria-label="User menu"` and `aria-haspopup="menu"`.

### Command Palette
- `<CommandDialog>` uses Radix Dialog internally — `role="dialog"`, `aria-modal="true"`.
- Search input has `aria-label="Search lists and products"`.
- Results use `role="listbox"` with `role="option"` per result.
- Arrow keys navigate between results, `Enter` selects.
- Groups have `role="group"` with `aria-label` ("Lists", "Products", "Actions").
- Selected result has `aria-selected="true"`.

### Bottom Tab Bar (Mobile)
- `<nav>` with `aria-label="Main navigation"`.
- Each tab is a `<Link>` with icon + text (text always visible, not hidden).
- Active tab has `aria-current="page"`.
- Touch targets: full tab width, `h-14` (56px) exceeds 44px minimum.

### Keyboard Navigation
- `⌘K` (or `Ctrl+K` on Windows/Linux) opens command palette from anywhere.
- `Escape` closes command palette, mobile menu, or any open dialog.
- `Tab` from main content does not enter the sidebar — sidebar has its own tab sequence accessible via `F6` (landmark navigation) or screen reader navigation.
- Sidebar list items navigate with arrow keys when sidebar is focused.

### Skip Link
- `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>` at the very top of the layout. Becomes visible on first Tab press. Skips sidebar and header.

### `prefers-reduced-motion`
- Sidebar collapse/expand: instant width change, no animation.
- Page transitions: instant opacity swap.
- Command palette: instant open/close, no slide.
- Active nav indicator: instant switch, no sliding pill.

---

## References

- [Linear App Shell](https://linear.app/) — sidebar + minimal header pattern inspiration
- [shadcn Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) — sidebar component
- [shadcn Command](https://ui.shadcn.com/docs/components/cmdk/command) — command palette (cmdk-based)
- [shadcn DropdownMenu](https://ui.shadcn.com/docs/components/radix/dropdown-menu) — user avatar menu
- [cmdk](https://cmdk.paco.me/) — command palette library by Paco
- [next-themes](https://github.com/pacocoursey/next-themes) — theme switching for Next.js
- [NN/g — Navigation Design](https://www.nngroup.com/articles/navigation-design/) — sidebar vs top nav research
- [Material Design 3 — Navigation Drawer](https://m3.material.io/components/navigation-drawer/overview) — drawer pattern guidelines
- [Apple HIG — Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) — mobile bottom tab bar conventions
- [WAI-ARIA — Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) — nav, banner, main landmarks
- [Framer Motion — Layout Animations](https://motion.dev/docs/react-layout-animations) — sidebar collapse + active indicator

---

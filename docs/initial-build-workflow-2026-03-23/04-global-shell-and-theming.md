# Phase 4: Global Shell & Theming

## Checklist

- [x] Set up `next-themes` ThemeProvider in root layout (`app/layout.tsx`)
- [x] Build sidebar component (`components/layout/sidebar.tsx`) — collapsible, emoji per category, owned/shared sections
- [x] Build header component (`components/layout/header.tsx`) — command palette trigger, theme toggle, user dropdown
- [x] Build mobile bottom tab bar (`components/layout/mobile-nav.tsx`) — Home/Lists/Settings tabs
- [x] Build theme toggle (`components/common/theme-toggle.tsx`) — cycles light/dark/system
- [x] Build command palette skeleton (`components/common/command-menu.tsx`) — Cmd+K, list search, actions
- [x] Build user avatar menu (in header — Profile, Settings, Sign Out)
- [x] Create authenticated layout (`app/(app)/layout.tsx`) — fetches lists + profile server-side
- [x] Create unauthenticated layout (`app/(auth)/layout.tsx`)
- [x] Build app shell wrapper (`components/layout/app-shell.tsx`) — wires sidebar, header, mobile nav, skip link
- [x] Implement sidebar collapse/expand with localStorage persistence
- [ ] Test: dark/light theme switching
- [ ] Test: sidebar collapse persists across page loads
- [ ] Test: mobile layout shows bottom tabs, hides sidebar
- [ ] Test: keyboard shortcut (Cmd+K) opens command palette
- **Note:** shadcn v4 uses Base UI (not Radix) — no `asChild` prop on triggers. Adapted components accordingly.

---

## Step 1: Root Layout with ThemeProvider

File: `app/layout.tsx`

```
- Import Geist Sans and Geist Mono fonts via next/font/google
- Wrap body in <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
- Add <Toaster /> from sonner
- Set html lang="en" and suppressHydrationWarning (required by next-themes)
```

Reference: `04-frontend-architecture.md` — Technology section (next-themes setup).

## Step 2: Unauthenticated Layout

File: `app/(auth)/layout.tsx`

Minimal layout — no sidebar, no header. Just centers children. Used by `/login` and `/auth/callback`.

## Step 3: Authenticated Layout

File: `app/(app)/layout.tsx`

This is the global shell from `06e-global-shell.md`. It wraps Dashboard, List Detail, and all other authenticated pages.

Structure:
```
<div className="flex h-screen">
  <Sidebar />                          {/* hidden on mobile */}
  <div className="flex-1 flex flex-col">
    <Header />
    <main id="main-content" className="flex-1 overflow-auto">
      {children}
    </main>
    <MobileNav />                       {/* hidden on desktop */}
  </div>
</div>
```

Include skip link: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>`

## Step 4: Sidebar

File: `components/layout/sidebar.tsx` — `'use client'` (needs state for collapse)

From `06e-global-shell.md` element breakdown:

### Data Requirements
- Fetch user's lists: "Your Lists" (role=owner) and "Shared" (role=editor/viewer)
- Pass lists as props from the layout Server Component, or fetch in a Server Component wrapper

### Elements
1. **Logo row:** `◆ ShopIt` mark + text. Collapsed: only mark. Click → `/`
2. **"YOUR LISTS" section:** Small caps header + list nav items (emoji + name)
3. **"SHARED" section:** Same styling, hidden if empty
4. **List nav items:** emoji + truncated name, active state (`bg-accent`), tooltip on collapsed
5. **New List button:** `+` icon at end of "Your Lists" header row
6. **Collapse/expand button:** ChevronLeft/Right at bottom
7. **Settings link:** gear icon at very bottom

### Dimensions
- Expanded: `w-64` (256px)
- Collapsed: `w-14` (56px)
- Transition: `transition-[width] duration-200 ease-out`

### Collapse Persistence
```typescript
// Read initial state from localStorage (before first render to avoid flash)
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sidebar-collapsed') === 'true'
})

// Persist on change
useEffect(() => {
  localStorage.setItem('sidebar-collapsed', String(collapsed))
}, [collapsed])
```

### Active State
Use `usePathname()` from `next/navigation` to highlight the current list. Consider Framer Motion `layoutId` for a sliding active indicator pill.

## Step 5: Header

File: `components/layout/header.tsx`

From `06e-global-shell.md` element breakdown:

### Elements
1. **Container:** `h-12 sticky top-0 border-b bg-card/80 backdrop-blur-sm`
2. **Command palette trigger (left):** Desktop shows `🔍 Search... ⌘K` outline button. Mobile shows just `🔍` icon
3. **Theme toggle (right):** Sun/Moon icon cycling light → dark → system
4. **User avatar menu (right):** Avatar with dropdown (Profile, Settings, Sign Out)
5. **Mobile hamburger (left, mobile only):** `Menu` icon, opens sidebar overlay

## Step 6: Mobile Navigation

File: `components/layout/mobile-nav.tsx` — `'use client'`

From `06e-global-shell.md`:

### Elements
- Fixed bottom bar: `h-14 border-t bg-card`
- Three tabs: Home (🏠), Lists (📋), Settings (⚙)
- Active tab: `text-primary`, inactive: `text-muted-foreground`
- `pb-safe` for notched phones
- Only visible on mobile (`sm:hidden`)

### Mobile Hamburger Menu
When hamburger is tapped, open sidebar as a `Sheet side="left"` (shadcn Sheet). Content is same as the desktop sidebar.

## Step 7: Theme Toggle

File: `components/common/theme-toggle.tsx` — `'use client'`

```typescript
// Uses useTheme() from next-themes
// Cycles: light → dark → system
// Shows Sun icon (light), Moon icon (dark), Monitor icon (system)
// Button variant="ghost" size="icon"
// Tooltip shows current mode name
```

## Step 8: Command Palette (Skeleton)

File: `components/common/command-menu.tsx` — `'use client'`

From `06e-global-shell.md` — build the structure now, wire up search data in later phases.

### Elements
- shadcn `<CommandDialog>` (built on cmdk)
- Opens on `Cmd+K` / `Ctrl+K`
- Input: `placeholder="Search lists, products..."`
- Groups: "Lists", "Products" (empty for now), "Actions" (Create New List, Toggle Theme, Go to Settings)
- Empty state: "No results found."

### Keyboard Binding
```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setOpen(prev => !prev)
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

## Step 9: User Avatar Menu

Built into the Header component. Uses shadcn `<DropdownMenu>`:

- Trigger: `<Avatar>` with user's image or initials fallback
- Items:
  - User name + email (non-interactive header)
  - Profile link
  - Settings link
  - `<Separator />`
  - Sign Out (calls `supabase.auth.signOut()` then redirects to `/login`)

## Test Checkpoint

1. **Theme switching:** Toggle between light/dark/system. Both themes look correct (no white text on white background, etc.). Preference persists on page refresh.
2. **Sidebar:** Collapse and expand work. State persists in localStorage. Emojis/icons visible in collapsed state.
3. **Mobile:** Resize to < 640px. Sidebar hidden, bottom tabs visible. Hamburger opens sidebar overlay.
4. **Command palette:** `Cmd+K` opens palette. Escape closes it. Actions group shows items.
5. **Sign out:** Clicking Sign Out redirects to `/login`.
6. **Accessibility:** Tab through sidebar items. Focus rings visible. Skip link works.
7. **Page transitions:** Navigate between `/` and any other route — shell stays static, only content area changes.

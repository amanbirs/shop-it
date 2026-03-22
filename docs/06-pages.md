# ShopIt — Page Design Specifications

Detailed design specs for every page, including ASCII layouts, element breakdowns, animation specs, and dark mode adaptations.

---

## Page 1: Login (`/login`)

### Overview

Single-purpose page: enter email → receive magic link → sign in. Two states: **email entry** and **check your email** confirmation. No nav, no sidebar — just the login card centered on screen.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│ · · · · · · ·╭─────────────────────╮· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · ·░░░░│    ◆  ShopIt        │░░░░· · · · · · · · · │
│ · · · · ░░░░░│                     │░░░░░ · · · · · · · · │
│ · · · · ░░░░░│  Purchase decisions,│░░░░░ · · · · · · · · │
│ · · · · ░░░░░│  made together.     │░░░░░ · · · · · · · · │
│ · · · · ·░░░░│                     │░░░░· · · · · · · · · │
│ · · · · · · ·│  ┌─────────────────┐│· · · · · · · · · · · │
│ · · · · · · ·│  │ name@email.com  ││· · · · · · · · · · · │
│ · · · · · · ·│  └─────────────────┘│· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  ┌─────────────────┐│· · · · · · · · · · · │
│ · · · · · · ·│  │Continue w/ Email││· · · · · · · · · · · │
│ · · · · · · ·│  └─────────────────┘│· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  ── or continue ──  │· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  [Google] [ Apple ] │· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·╰─────────────────────╯· · · · · · · · · · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│                                                             │
│             ░░ = radial glow behind card                    │
│             · · = dot grid pattern (fades at edges)         │
└─────────────────────────────────────────────────────────────┘
```

**State 2: "Check your email"**
```
┌─────────────────────────────────────────────────────────────┐
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│ · · · · · · ·╭─────────────────────╮· · · · · · · · · · · │
│ · · · · ·░░░░│                     │░░░░· · · · · · · · · │
│ · · · · ░░░░░│    ✉  Check your    │░░░░░ · · · · · · · · │
│ · · · · ░░░░░│       email         │░░░░░ · · · · · · · · │
│ · · · · ░░░░░│                     │░░░░░ · · · · · · · · │
│ · · · · ·░░░░│  We sent a magic    │░░░░· · · · · · · · · │
│ · · · · · · ·│  link to            │· · · · · · · · · · · │
│ · · · · · · ·│  name@email.com     │· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  Click the link in  │· · · · · · · · · · · │
│ · · · · · · ·│  your email to      │· · · · · · · · · · · │
│ · · · · · · ·│  sign in.           │· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  ┌─────────────────┐│· · · · · · · · · · · │
│ · · · · · · ·│  │  Resend email   ││· · · · · · · · · · · │
│ · · · · · · ·│  └─────────────────┘│· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·│  ← Back to login    │· · · · · · · · · · · │
│ · · · · · · ·│                     │· · · · · · · · · · · │
│ · · · · · · ·╰─────────────────────╯· · · · · · · · · · · │
│ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
└─────────────────────────────────────────────────────────────┘
```

**Mobile:** Same layout, card stretches full width with `mx-4` padding. No sidebar, no nav.

### Design Decisions

- **Background: Dot Grid + Radial Glow.** Subtle dot pattern creates texture without distraction. Radial glow behind the card draws the eye to the center. Linear-inspired — clean, understated, professional. Lighter weight than animated mesh gradients, feels more "tool" than "marketing page."
- **Card: Glassmorphism (Frosted Glass).** Semi-transparent card with backdrop blur. The dot grid shows through subtly, adding depth. Elevated look without being heavy.
- **Entry Animation: Stagger Reveal.** Elements appear sequentially with blur-to-focus — feels intentional and polished without being slow.
- **State Transition: Crossfade.** Smooth height animation between email entry and confirmation states. Card feels alive.

### Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Dot grid background** | Absolute-positioned div | `bg-[radial-gradient(#d4d4d8_1px,transparent_1px)]` with `bg-[size:16px_16px]`. Fades at edges via `[mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]`. Or use Magic UI `DotPattern` component. |
| 2 | **Radial glow** | Absolute-positioned div | `bg-[radial-gradient(ellipse_at_center,hsl(var(--ai-accent)/0.15),transparent_70%)]`. Centered behind card. Subtle purple/blue halo. |
| 3 | **Glass card** | shadcn `<Card>` | `backdrop-blur-xl rounded-2xl max-w-md w-full mx-4 p-8`. Light: `bg-white/70 border-white/50 shadow-xl`. Dark: `bg-zinc-900/60 border-zinc-700/50 shadow-xl shadow-black/30`. |
| 4 | **Logo** | Custom SVG mark + text | Geometric mark (diamond/bag icon) + "ShopIt" in `font-semibold text-2xl text-foreground`. Centered. |
| 5 | **Tagline** | `<p>` | "Purchase decisions, made together." `text-muted-foreground text-sm text-center`. |
| 6 | **Email input** | shadcn `<Input>` | `type="email"` `placeholder="name@email.com"` `autoFocus`. `text-base` (prevents iOS zoom). Focus ring via `ring-ring`. |
| 7 | **Submit button** | shadcn `<Button>` | Full width `w-full`. Text: "Continue with Email". Loading state: `<Loader2 className="animate-spin" />` replaces text while submitting. |
| 8 | **Divider** | Flex row with separators | `<Separator />` + `<span className="text-muted-foreground text-xs">or continue with</span>` + `<Separator />` |
| 9 | **OAuth buttons** | shadcn `<Button variant="outline">` | Side by side in flex row. Google icon + "Google", Apple icon + "Apple". `hover:bg-accent` transition. |
| 10 | **Confirmation heading** | `<h2>` + mail icon | "Check your email" in `font-semibold text-xl`. Mail icon with subtle float/pulse animation. |
| 11 | **Confirmation body** | `<p>` | "We sent a magic link to **name@email.com**" (email in `font-medium`). |
| 12 | **Resend button** | shadcn `<Button variant="ghost">` | "Resend email" with cooldown timer: "Resend in 47s" (disabled state during cooldown). |
| 13 | **Back link** | Text button | "← Back to login" in `text-muted-foreground text-sm`. Returns to email entry state with reverse crossfade. |

### Animation Spec

#### Entry Animation (Stagger Reveal)

```
Timeline (on mount):
─────────────────────────────────────────────────────
  0ms     Logo          opacity 0→1, y: 8→0, blur: 4px→0
  80ms    Tagline       opacity 0→1, y: 8→0, blur: 4px→0
  160ms   Email input   opacity 0→1, y: 8→0, blur: 4px→0
  240ms   Button        opacity 0→1, y: 8→0, blur: 4px→0
  320ms   Divider       opacity 0→1
  400ms   OAuth row     opacity 0→1, y: 8→0, blur: 4px→0
─────────────────────────────────────────────────────
  Each element: duration 400ms, ease [0.25, 0.4, 0, 1]
  Total perceived time: ~600ms
```

**Framer Motion implementation:**
```
Parent container:
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 }}
  }}

Each child element:
  variants={{
    hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)",
               transition: { duration: 0.4, ease: [0.25, 0.4, 0, 1] }}
  }}
```

#### State Transition (Email → Check Your Email)

```
Step 1 (0-200ms):    Current content fades out
                     opacity 1→0, scale 1→0.98
Step 2 (200-250ms):  Card height animates smoothly (layout animation)
Step 3 (250-500ms):  New content fades in
                     opacity 0→1, scale 0.98→1
```

**Framer Motion implementation:**
```
<AnimatePresence mode="wait">
  {state === "email" ? (
    <motion.div
      key="email"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    />
  ) : (
    <motion.div
      key="confirmation"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: 0.05 }}
    />
  )}
</AnimatePresence>

Card wrapper uses layout prop for smooth height transitions.
```

### Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Dot grid color | `#d4d4d8` (zinc-300) | `#3f3f46` (zinc-700) |
| Radial glow | `hsl(262 83% 58% / 0.12)` | `hsl(262 83% 58% / 0.20)` — stronger glow in dark |
| Glass card bg | `bg-white/70` | `bg-zinc-900/60` |
| Card border | `border-white/50` | `border-zinc-700/50` |
| Card shadow | `shadow-xl` (default) | `shadow-xl shadow-black/30` — deeper shadow |
| Page background | `bg-background` (white) | `bg-background` (near-black) |

### Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Card is `w-full mx-4`. Padding `p-6`. OAuth buttons stack vertically if needed. |
| Tablet+ (`≥ 640px`) | Card is `max-w-md` centered. Padding `p-8`. OAuth buttons side by side. |

### Accessibility

- Email input has visible label (or `aria-label="Email address"`)
- Submit button shows loading state with `aria-busy="true"` and `aria-label="Sending magic link"`
- Focus is trapped within the card
- Tab order: email input → submit → Google → Apple
- Confirmation state: focus moves to heading for screen reader announcement
- All interactive elements have visible focus rings
- Color contrast meets WCAG AA in both themes

### References

- [Magic UI DotPattern](https://magicui.design/docs/components/dot-pattern) — SVG dot pattern component
- [Aceternity UI Grid/Dot Backgrounds](https://ui.aceternity.com/components/grid-and-dot-backgrounds) — dot + glow examples
- [ibelick — Grid & Dot Backgrounds](https://ibelick.com/blog/create-grid-and-dot-backgrounds-with-css-tailwind-css) — pure CSS technique
- [Cruip — Blur Reveal Effect](https://cruip.com/blur-reveal-effect-with-framer-motion-and-tailwind-css/) — stagger + blur animation
- [Frontend.fyi — Staggered Text Animations](https://www.frontend.fyi/tutorials/staggered-text-animations-with-framer-motion) — Framer Motion stagger pattern
- [Epic Web Dev — Glassmorphism with Tailwind](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css) — backdrop-blur technique

---

## Page 2: Dashboard (`/`)

### Overview

The home page after login. Shows all the user's purchase lists as cards in a responsive grid. This is the "mission control" — quick access to every active purchase decision, plus a prominent way to start a new one.

Two states: **populated** (user has lists) and **empty** (first-time user, no lists yet).

Every list card gets two LLM-powered touches:
1. **AI hype title** — when creating a new list, the AI auto-generates a fun, slightly dramatic title based on the category/description (e.g., "The Great TV Showdown" for a TV list, "Operation: Dream Couch" for furniture). The user sees this as the default title and can edit it anytime.
2. **AI comment bubble** — a dynamic one-liner on each card that reacts to the list's current state. Positive, slightly funny, context-aware. Updates as the list evolves.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                              [+] [◑] [▤] │
│  │ ◆    │  ShopIt                                     new  theme  │
│  │ side │  ─────────────────────────────────────────────────────── │
│  │ bar  │                                                          │
│  │      │  Your Lists                              [⊞ Grid] [≡ List]│
│  │ ───  │                                                          │
│  │ Home │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ ···  │  │ 📺           │ │ 🛋️           │ │ 🎧           │     │
│  │ list │  │ The Great TV │ │ Operation:   │ │ Audio Quest  │     │
│  │ list │  │ Showdown     │ │ Dream Couch  │ │ 2026         │     │
│  │ list │  │              │ │              │ │              │     │
│  │      │  │ 4 products   │ │ 2 products   │ │ 6 products   │     │
│  │      │  │ ★ 1 shortl.  │ │ ✓ purchased  │ │ ★ 3 shortl.  │     │
│  │      │  │              │ │              │ │              │     │
│  │      │  │ 🤖 "Four     │ │ 🤖 "Mission  │ │ 🤖 "Six      │     │
│  │      │  │  contenders, │ │  accomplished│ │  options and │     │
│  │      │  │  zero regrets│ │  — your butt │ │  your ears   │     │
│  │      │  │  incoming!"  │ │  thanks you!"│ │  can't wait!"│     │
│  │      │  │              │ │              │ │              │     │
│  │      │  │ 2 members    │ │ 1 member     │ │ 3 members    │     │
│  │      │  │ ○○           │ │ ○            │ │ ○○○          │     │
│  │      │  └──────────────┘ └──────────────┘ └──────────────┘     │
│  │      │                                                          │
│  │      │  ┌─ ─ ─ ─ ─ ─ ─┐                                       │
│  │      │  │  + New List  │  ← dashed border card                 │
│  │      │  └─ ─ ─ ─ ─ ─ ─┘                                       │
│  │      │                                                          │
│  └──────┘                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Empty State (first-time user):**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                          │
│  │ ◆    │                                                          │
│  │ side │         ┌─────────────────────────────┐                  │
│  │ bar  │         │                             │                  │
│  │      │         │    📦  No lists yet          │                  │
│  │ ───  │         │                             │                  │
│  │ Home │         │    Start your first          │                  │
│  │      │         │    purchase decision         │                  │
│  │      │         │                             │                  │
│  │      │         │    ┌───────────────────┐    │                  │
│  │      │         │    │  + Create a List  │    │                  │
│  │      │         │    └───────────────────┘    │                  │
│  │      │         │                             │                  │
│  │      │         │    "What are we buying      │                  │
│  │      │         │     today?" — ShopIt AI     │                  │
│  │      │         │                             │                  │
│  │      │         └─────────────────────────────┘                  │
│  │      │                                                          │
│  └──────┘                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile (< 640px):** Sidebar collapses to bottom tab bar or hamburger. Cards stack into a single column. AI comment truncates to one line with ellipsis.

### Design Decisions

- **Card grid over table/list.** Lists are visual — each one represents a purchase mission. Cards let us show status, member avatars, and the AI comment at a glance. Grid feels like a dashboard; a table would feel like a spreadsheet.
- **AI hype titles as defaults.** When a user creates "TV" as a list, the AI generates something like "The Great TV Showdown" as the default name. Fun, memorable, and gives each list personality. The user can always edit it to something boring if they want. Generated via a fast Gemini call at list creation time. Stored in `lists.name` — just a string, no special field needed.
- **AI comment bubble on each card.** A small, dynamic one-liner that reacts to the list's state. Not static — regenerated when the list changes (product added, shortlisted, purchased). Examples:
  - 0 products: *"Empty list, infinite possibilities."*
  - 3 products added: *"Three contenders enter. One will be chosen."*
  - 1 shortlisted: *"Getting closer — you've got a favorite!"*
  - All purchased: *"Mission complete. Your wallet needs a hug."*
  - Budget set, all products over budget: *"Your taste is expensive. We respect that."*
  This is the personality layer — makes the app feel alive, not just a spreadsheet. Generated server-side, cached, regenerated on list state change. Lightweight Gemini call with minimal context (list stats + category).
- **Flashlight hover effect.** Stripe-inspired radial gradient that follows the cursor across the card grid. Subtle — only visible on the card border. Ties all cards together as a cohesive surface.
- **New List as a card.** The "+ New List" dashed-border card sits in the grid, not in a separate button. It's always the last card. Clicking it opens a dialog/sheet for list creation.
- **Sidebar navigation.** Persistent sidebar (desktop) showing all lists. Current page highlighted. Collapsible. Mobile: bottom tab bar or hamburger. Mirrors Linear's sidebar pattern.

### Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Sidebar** | Custom component | `w-64` fixed left. Lists as nav items with emoji + name. Active state: `bg-accent text-accent-foreground`. Collapsible with `←` button. Mobile: hidden behind hamburger or swipe. |
| 2 | **Header bar** | Flex row | "Your Lists" as `text-2xl font-semibold`. Right side: view toggle (grid/list), theme toggle, new list button. |
| 3 | **View toggle** | shadcn `<ToggleGroup>` | Two options: grid icon, list icon. Persisted in URL via `nuqs` (`?view=grid`). |
| 4 | **List card** | shadcn `<Card>` | `rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer`. Click navigates to `/lists/[id]`. Contains all sub-elements below. |
| 5 | **Card — emoji/icon** | `<span>` | Category emoji at top-left. Auto-assigned based on list category or user-chosen. `text-2xl`. |
| 6 | **Card — AI hype title** | `<h3>` with edit affordance | `font-semibold text-lg text-foreground`. Truncated to 2 lines with `line-clamp-2`. Pencil icon on hover → inline edit or edit in creation dialog. Shows `✨` sparkle icon if AI-generated (not yet manually edited). |
| 7 | **Card — stats row** | Flex row | Product count, shortlisted count, purchased count. `text-sm text-muted-foreground`. Icons: package, star, checkmark. |
| 8 | **Card — AI comment bubble** | Styled `<p>` | `text-sm text-muted-foreground italic` with subtle `bg-muted/50 rounded-lg px-3 py-2` bubble. Prefixed with small `🤖` or `✨` icon. `line-clamp-2` on mobile. Has `ai-accent` left border (2px). |
| 9 | **Card — member avatars** | Avatar stack | Overlapping circles (`-ml-2` on each after first). Shows up to 3 avatars + "+N" badge. `ring-2 ring-background` for separation. |
| 10 | **Card — status badge** | shadcn `<Badge>` | Shows highest-priority status: "Purchased" (green), "Deciding" (amber), "Researching" (default). Based on `is_purchased` / `is_shortlisted` counts. |
| 11 | **New List card** | `<Card>` variant | Dashed border `border-dashed border-2 border-muted-foreground/30`. "+" icon centered. `hover:border-muted-foreground/60 hover:bg-accent/50` transition. |
| 12 | **Flashlight effect** | Mouse-tracking div | Radial gradient that follows `onMouseMove` across the grid container. Applied as a border glow on the nearest card. Uses CSS `background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), hsl(var(--ai-accent)/0.08), transparent 40%)`. |
| 13 | **Empty state** | Centered card | Illustrated empty state with icon, title, description, and CTA button. Includes a fun AI quip that rotates. |

### AI Features Detail

#### AI Hype Titles

**Trigger:** User creates a new list and provides a category or description.

**Prompt pattern:**
```
Generate a short, fun, slightly dramatic title for a purchase research list.
Category: {category}
Description: {description}
Requirements:
- Max 30 characters
- Memorable and slightly playful
- Don't use generic phrases like "Ultimate Guide"
- One title only, no quotes
Examples:
  "TV" → "The Great TV Showdown"
  "running shoes" → "Sole Search 2026"
  "coffee machine" → "Espresso Yourself"
  "sofa" → "Operation: Dream Couch"
  "air conditioner" → "The Big Chill"
```

**Implementation:**
- Called via server action at list creation time
- Fast Gemini Flash call (~200ms)
- Stored directly in `lists.name`
- User sees it immediately in the creation dialog as the pre-filled name
- Editable text field — user can accept, modify, or replace entirely
- If AI call fails, falls back to the user's raw category/description as the name
- A small `✨` icon next to the title indicates it's AI-generated (removed if user edits)

#### AI Comment Bubble

**Trigger:** Regenerated when list state changes (product added/removed, shortlisted, purchased, budget changed).

**Prompt pattern:**
```
Generate a short, positive, slightly funny one-liner comment about this purchase list.
List: {name}
Category: {category}
Stats: {product_count} products, {shortlisted_count} shortlisted, {purchased_count} purchased
Budget: {budget_min}-{budget_max} {currency}
Requirements:
- Max 60 characters
- Positive and encouraging, slightly witty
- React to the current state (empty list, making progress, purchased, over budget, etc.)
- One line only, no quotes, no emoji
```

**Implementation:**
- Called via background server action when list state changes
- Debounced — waits 2s after last change before regenerating (avoids spam during rapid edits)
- Stored in a new field: `lists.ai_comment text` (simple, cheap, cacheable)
- Falls back to a static pool of defaults if AI call fails:
  - `"Ready when you are."`
  - `"The hunt begins."`
  - `"Decisions, decisions..."`
- Displayed on the dashboard card and at the top of the list detail page
- Refreshed via Supabase Realtime — other list members see the update too

**Data model addition needed:**
```sql
alter table public.lists add column ai_comment text;
alter table public.lists add column ai_title_edited boolean default false;
```

### Animation Spec

#### Card Entry (Stagger)

```
Timeline (on page load / data fetch):
─────────────────────────────────────────────────────
  0ms     Card 1    opacity 0→1, y: 12→0, scale: 0.97→1
  60ms    Card 2    opacity 0→1, y: 12→0, scale: 0.97→1
  120ms   Card 3    opacity 0→1, y: 12→0, scale: 0.97→1
  ...     Card N    +60ms per card (caps at 6 cards, rest appear instantly)
─────────────────────────────────────────────────────
  Each element: duration 350ms, ease [0.25, 0.4, 0, 1]
```

#### Card Hover

```
Hover enter (150ms, ease-out):
  - Card: shadow-md → shadow-xl, y: 0 → -2px
  - Border: subtle glow from flashlight effect
  - AI comment: opacity 0.7 → 1

Hover exit (200ms, ease-in):
  - Reverse all above
```

#### Flashlight Effect

```
On mouse move over grid container:
  - Track cursor position via CSS custom properties (--mouse-x, --mouse-y)
  - Radial gradient overlay follows cursor
  - Only affects card borders (not fill)
  - 600px radius, hsl(var(--ai-accent) / 0.06)
  - Performance: GPU-accelerated, uses will-change: background
```

#### New Card Appearance (when a list is created)

```
New card animates in:
  0ms    opacity 0, scale 0.9, blur 8px
  400ms  opacity 1, scale 1, blur 0px
  Ease: spring(1, 80, 10)

"+ New List" card shifts right to accommodate (layout animation via Framer Motion)
```

### Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Page background | `bg-background` (white) | `bg-background` (near-black) |
| Card background | `bg-card` (white) | `bg-card` (#111 range) |
| Card border | `border-border` (zinc-200) | `border-border` (zinc-800) |
| Card hover shadow | `shadow-xl` (gray) | `shadow-xl shadow-black/40` |
| Flashlight glow | `hsl(ai-accent / 0.06)` | `hsl(ai-accent / 0.10)` — stronger in dark |
| AI comment bg | `bg-muted/50` | `bg-muted/30` |
| AI comment border | `border-l-2 border-ai-accent/30` | `border-l-2 border-ai-accent/50` |
| Sidebar | `bg-card border-r` | `bg-card border-r border-border` |
| New List card border | `border-muted-foreground/30` | `border-muted-foreground/20` |

### Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Sidebar hidden (hamburger or bottom tabs). Single column cards. AI comment truncated to 1 line. |
| Tablet (`640-1024px`) | Sidebar collapsible (default collapsed). 2-column card grid. |
| Desktop (`> 1024px`) | Sidebar visible. 3-column card grid. Flashlight effect active. |

### Accessibility

- Cards are focusable with `tabindex="0"` and navigate on Enter/Space
- Card content has proper heading hierarchy (`h3` for title)
- AI comment has `aria-label="AI comment: {text}"` for screen readers
- Avatar stack has `aria-label="{count} members"` with tooltip listing names
- View toggle is a proper `role="radiogroup"` with labeled options
- Sidebar nav uses `<nav>` with `aria-label="Lists navigation"`
- Empty state CTA is auto-focused for keyboard users
- AI-generated content is marked with `aria-description="Generated by AI"` so screen readers announce it

### References

- [Aceternity UI — Component Library](https://www.aceternity.com/components) — animated card components with Framer Motion
- [Hover.dev — Animated Cards](https://www.hover.dev/components/cards) — card hover effect patterns
- [Stripe Cards Hover Effect](https://stripegradient.com/) — flashlight border effect technique
- [Shadcn Studio — Bento Grid](https://shadcnstudio.com/blocks/bento-grid/bento-grid) — card grid layout blocks
- [Launch UI — Bento Grid](https://www.launchuicomponents.com/docs/sections/bento-grid) — responsive grid component
- [Bento Grid Design Guide (Landdding)](https://landdding.com/blog/blog-bento-grid-design-guide) — spacing and corner radius best practices
- [ibelick — Bento Grid with CSS/Tailwind](https://dev.to/ibelick/creating-bento-grid-layouts-with-css-tailwind-css-26mo) — implementation tutorial

---

## Page 3: List Detail (`/lists/[id]`)

> **This page has its own dedicated spec file due to its size.**
> See **[06a-page-list-detail.md](./06a-page-list-detail.md)** for the full design spec including:
> - Card grid view + table view with toggle
> - AI-suggested products (found by AI, not yet in user's list) with Add/Dismiss actions
> - AI Expert Opinion panel
> - All ASCII layouts, element breakdowns, animation specs, dark mode, responsive, and accessibility details

---

## Product Detail Sheet (opens from List Detail)

> **This component has its own dedicated spec file due to its size.**
> See **[06b-product-detail-sheet.md](./06b-product-detail-sheet.md)** for the full design spec including:
> - Right sheet (desktop) + bottom sheet (mobile) layouts
> - Accordion sections: AI Summary, Specs, Pros & Cons, Reviews
> - Inline comment thread with Realtime updates
> - Extraction in-progress and failed states
> - Product-to-product navigation (click-to-swap + keyboard shortcuts)
> - All ASCII layouts, element breakdowns, animation specs, dark mode, responsive, and accessibility details

---

## List Creation Flow (opens from Dashboard)

> **This flow has its own dedicated spec file.**
> See **[06c-list-creation-flow.md](./06c-list-creation-flow.md)** for the full design spec including:
> - Dialog (desktop) + bottom sheet (mobile) layouts
> - AI hype title generation with typewriter animation
> - Progressive disclosure for optional fields (budget, deadline, description)
> - All ASCII layouts, element breakdowns, animation specs, dark mode, responsive, and accessibility details

---

## Invite & Share Flow (opens from List Detail)

> **This flow has its own dedicated spec file.**
> See **[06d-invite-share-flow.md](./06d-invite-share-flow.md)** for the full design spec including:
> - Email invite + copy link sharing
> - Role management (owner/editor/viewer)
> - Inline member list with pending invites
> - Invite email design
> - All ASCII layouts, element breakdowns, animation specs, dark mode, responsive, and accessibility details

---

## Global Shell & Layout (wraps all authenticated pages)

> **This component has its own dedicated spec file.**
> See **[06e-global-shell.md](./06e-global-shell.md)** for the full design spec including:
> - Sidebar navigation (desktop, collapsible) + bottom tab bar (mobile)
> - Header bar with command palette (⌘K), theme toggle, user menu
> - Hamburger menu overlay (mobile)
> - Page transition animations
> - All ASCII layouts, element breakdowns, animation specs, dark mode, responsive, and accessibility details

---

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

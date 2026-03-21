# ShopIt — Design Research & Inspiration

Research collected from leading apps and design resources to inform ShopIt's UI/UX decisions.

---

## Apps We're Learning From

### Linear — The Gold Standard for Product Tools

Linear is the benchmark for "tool that feels like it was made by people who care." Everything about it feels fast, intentional, and polished.

**What we're borrowing:**
- **Keyboard-first, mouse-friendly.** Every action has a shortcut. ⌘K command palette for power users. But nothing requires the keyboard — mouse/touch works perfectly.
- **Subtle, purposeful animation.** Items don't just appear — they fade and slide in. But animations are fast (150-200ms) and never block interaction. Nothing bounces, nothing wiggles, nothing distracts.
- **Information density without clutter.** Linear packs a lot of data into small spaces using careful typography hierarchy, muted secondary text, and consistent spacing. ShopIt product cards should aim for this density.
- **Status as color.** Linear uses a small colored circle for issue status. Instantly scannable. We'll use similar visual markers for extraction status (pending/processing/completed/failed) and product status (shortlisted/purchased).
- **Monochromatic UI with selective color.** The interface is mostly grayscale. Color is used sparingly and intentionally — to highlight status, actions, or important state. This makes colored elements pop.
- **Sidebar navigation.** Clean sidebar with workspace/team hierarchy. Collapsible on mobile. We'll adapt this for lists navigation.

**Resources:**
- [Linear's design approach](https://linear.app/readme) — their README explains their design philosophy
- [Building Linear](https://linear.app/blog) — engineering blog with posts on animation, performance, and design decisions
- [Karri Saarinen (Linear CEO) on design](https://www.youtube.com/results?search_query=karri+saarinen+linear+design) — talks about why craft matters in dev tools

---

### Notion — Flexible, Block-Based, Collaborative

Notion proves that powerful tools can still feel approachable. Their design system handles everything from simple notes to complex databases.

**What we're borrowing:**
- **Progressive disclosure done right.** A Notion page starts as a blank canvas. Complexity is opt-in — you add a database, a toggle, a gallery. ShopIt should feel similarly: add a product, see the basics, dig into details on demand.
- **Hover-to-reveal actions.** Card actions (edit, delete, duplicate) appear on hover, hidden by default. Keeps the UI clean while maintaining discoverability. We'll use this for product card actions.
- **Typography as hierarchy.** Notion uses font weight and size (not color or boxes) to establish hierarchy. Page titles are large and bold, section headers are medium, body text is regular. Clean and scannable.
- **Collaborative presence.** Avatar stack showing who's viewing a page. Cursor positions in real-time. We'll use avatar stacks on list pages to show active collaborators.
- **Slash command / block insertion.** The `/` command palette for inserting content. Our ⌘K palette is inspired by this but adapted for navigation and actions rather than content insertion.
- **Empty states that guide.** Notion's empty states aren't just "nothing here" — they suggest what to do next. Our empty list state should guide users to paste their first URL.
- **Inline everything.** Properties, tags, and metadata are editable inline without opening a modal. For v1 we're using sheets/modals, but the inline-editing philosophy influences how we think about reducing friction.

**Resources:**
- [Notion's design principles](https://www.notion.com/about) — simplicity, power, beauty
- [Notion's engineering blog](https://www.notion.com/blog/topic/tech) — posts on performance, collaboration, and real-time sync
- [Notion design system on Figma Community](https://www.figma.com/community/search?resource_type=mixed&sort_by=relevancy&query=notion+design+system) — community recreations of Notion's components

---

### Airbnb Wishlists — The Direct UX Analog

Airbnb's wishlist feature is the closest existing pattern to what ShopIt does. Users save listings to named lists, share them with travel companions, and collaboratively narrow down choices.

**What we're borrowing:**
- **Heart/save interaction.** Tap the heart → item is saved. Simple, instant, satisfying. Our shortlist toggle should feel equally effortless.
- **Named lists as containers.** "Weekend in Goa", "Anniversary trip" — these map directly to our purchase lists ("New TV", "Kitchen Renovation").
- **Grid of cards with hero images.** Each listing shows a large photo, price, and key stats. Our product cards follow this pattern: product image, title, price, AI verdict.
- **Shared lists with avatars.** Show who else has access. Airbnb keeps this minimal — just an avatar stack, no complex permissions UI. We should too (for v1, roles are managed in settings, not on the main list page).
- **Map + list dual view.** Airbnb lets you toggle between map and list. We offer grid and table views — same concept, different data.

**Resources:**
- [Airbnb Design](https://airbnb.design/) — their design team's blog
- [Airbnb's design language system (DLS)](https://airbnb.design/building-a-visual-language/) — foundational post on how they think about design systems

---

### Google Shopping / Product Comparison UIs

Google Shopping is the closest comparison-focused product UI. Users see product cards with prices, ratings, and specs side-by-side.

**What we're borrowing:**
- **Product cards with key stats visible.** Price, rating, store/domain badge — all visible without clicking. Our cards should surface the same essential info.
- **Spec comparison tables.** When comparing products, Google Shopping shows a table with specs as rows and products as columns. This informs our table view.
- **Price range display.** "₹29,999 – ₹34,999" with context ("across 5 stores"). Our `price_min`/`price_max` + `price_note` follows this pattern.
- **Trust signals.** Star ratings, review counts, store badges. These small elements build confidence. We show rating, review count, and domain badge on every card.

---

### Other Relevant Apps

**Things 3 (Task Manager)**
- Master class in simplicity. Every interaction is one tap. No settings you need to configure. ShopIt should strive for this: paste a URL, see a product card. No configuration required.
- Beautiful use of whitespace and typography.

**Raindrop.io (Bookmark Manager)**
- Closest "save a URL and get a preview" pattern. Raindrop fetches metadata (title, image, description) from any URL — exactly what our ingestion pipeline does.
- Card grid layout with clean image previews.

**Arc Browser (Spaces + Easels)**
- Concept of "spaces" for different contexts maps to our lists.
- Beautiful dark mode implementation with desaturated colors.

**Apple Notes (Collaboration)**
- The simplest collaboration UX: share a note, other person can edit. No complex permissions. Our family sharing should feel this simple.

---

## Dark Mode Best Practices

Research compiled from UX design resources:

### Colors

| Principle | Implementation |
|-----------|---------------|
| **No pure black (#000)** | Use dark greys (#0a0a0a to #171717). Pure black kills depth and causes halation with white text. Material Design recommends #121212 as the baseline. |
| **No pure white text** | Use off-white (#fafafa, #e5e5e5) for body text. Pure white on dark backgrounds causes eye strain and text appears to bleed. |
| **Desaturate accent colors** | Reduce saturation by ~20% in dark mode. Saturated colors on dark backgrounds create optical vibrations. |
| **Elevation = lighter, not shadow** | In dark mode, higher-elevation surfaces are lighter (not darker with shadow). Cards sit "above" the background by being a lighter shade of grey. |
| **Maintain contrast ratios** | WCAG AA minimum: 4.5:1 for body text, 3:1 for large text. Test both themes with a contrast checker. |

### Implementation

| Approach | Details |
|----------|---------|
| **Semantic CSS tokens** | Define `--background`, `--foreground`, `--muted`, etc. Never use raw colors in components. |
| **`next-themes` for persistence** | Handles localStorage, system preference sync, and flash prevention. |
| **Tailwind `dark:` variant** | Use `dark:bg-card dark:text-card-foreground` when semantic tokens aren't sufficient. |
| **Image adaptation** | Slightly reduce brightness/contrast of product images in dark mode with `dark:brightness-90`. Prevents images from feeling like a flashlight in a dark room. |
| **Test on real screens** | OLED (true black pixels) vs LCD (backlit dark grey) render dark mode differently. Test both. |

**Resources:**
- [Dark Mode Design: A Practical Guide](https://www.uxdesigninstitute.com/blog/dark-mode-design-practical-guide/)
- [12 Principles of Dark Mode Design — Uxcel](https://uxcel.com/blog/12-principles-of-dark-mode-design-627)
- [Dark Mode UI Best Practices — Atmos](https://atmos.style/blog/dark-mode-ui-best-practices)
- [Mastering Dark UI Design — Muzli](https://medium.muz.li/mastering-the-art-of-dark-ui-design-9-essential-principles-and-techniques-a673b1328111)
- [Dark Mode Tips — Halo Lab](https://www.halo-lab.com/blog/dark-ui-design-11-tips-for-dark-mode-design)
- [Design Studio UX — Dark Mode Best Practices](https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/)

---

## Modern SaaS Design Principles

Key principles from leading SaaS design teams (2025):

### Progressive Disclosure (Jakob Nielsen)
Present core, frequently-used tools prominently. Tuck advanced functions into sub-menus, collapsible sections, or secondary views. Users should learn the product one layer at a time.

**Application to ShopIt:** Product cards show the essentials (title, price, image, verdict). Specs, full reviews, AI analysis, and comments are in the detail sheet. List settings (budget, priorities, members) are behind the gear icon.

### Familiarity & Consistency
Users bring mental models from other apps. Use familiar patterns — don't reinvent navigation, cards, or modals. Build a reusable component library so buttons, cards, inputs, and modals behave identically everywhere.

**Application to ShopIt:** shadcn/ui gives us battle-tested patterns. Our sidebar mimics Linear's. Our cards follow Airbnb/Google Shopping conventions. Our sheets behave like iOS/Android standard bottom sheets.

### Micro-Interactions as Feedback
Small animations that confirm actions: a button scale on press, a checkmark animation on completion, a subtle shake on error. These aren't decorative — they're communication.

**Application to ShopIt:** Shortlist toggle has a fill + scale animation. Extraction progress shows an animated shimmer. Comment submission shows a brief highlight on the new comment. Toast notifications confirm background actions.

### Speed as UX
Users perceive apps as faster when they use optimistic updates, skeleton loading, and smooth transitions — even if the actual network time is the same. The gap between action and feedback must be imperceptible.

**Application to ShopIt:** Every mutation is optimistic. Skeleton cards match the real layout. Server Components eliminate client-side fetch waterfalls. Realtime updates arrive without polling.

### Emotional Design
The best UX is functional AND sparks an emotional response. Users don't just want tools that work — they want tools that feel good to use. This is the difference between a spreadsheet and Linear.

**Application to ShopIt:** The satisfaction of pasting a URL and watching a beautiful product card materialize from a skeleton. The visual reward of shortlisting. The "aha" of reading an AI expert opinion that understands your priorities.

**Resources:**
- [Top UX Design Principles for SaaS Products — Impekable](https://www.impekable.com/top-ux-design-principles-for-saas-products-in-2025/)
- [SaaS UX Design Strategies — Webstacks](https://www.webstacks.com/blog/saas-ux-design)
- [Best Practices for SaaS UI/UX — SapientPro](https://sapient.pro/blog/designing-for-saas-best-practices)
- [SaaS UX Design Best Practices — Mouseflow](https://mouseflow.com/blog/saas-ux-design-best-practices/)
- [SaaS Design Trends 2026 — Jetbase](https://jetbase.io/blog/saas-design-trends-best-practices)

---

## Component-Driven Design (Atomic Design)

Brad Frost's Atomic Design methodology maps well to our component architecture:

| Level | Atomic Design | ShopIt Example |
|-------|--------------|----------------|
| **Atoms** | Smallest building blocks | `Button`, `Badge`, `Input`, `Skeleton`, `Avatar` |
| **Molecules** | Groups of atoms with a function | `PriceDisplay` (text + badge), `DomainBadge` (icon + text), `ShortlistButton` (button + icon + animation) |
| **Organisms** | Complex UI sections | `ProductCard` (image + title + price + actions), `CommentThread` (input + comment list), `ListHeader` (title + metadata + actions) |
| **Templates** | Page layouts without real data | `ListPageLayout` (header + filters + grid + CTA) |
| **Pages** | Templates with real data | `lists/[listId]/page.tsx` |

We don't strictly follow atomic naming, but the mental model guides how we decompose UI. Components at the "atom" level live in `components/ui/`. Everything else is organized by domain (lists, products, ai, collaboration).

**Resources:**
- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [Component-Driven Development](https://www.componentdriven.org/)

---

## shadcn/ui + Tailwind Design System Patterns

### Why shadcn/ui Over Traditional Component Libraries

| Traditional (MUI, Chakra) | shadcn/ui |
|--------------------------|-----------|
| Install as npm dependency | Copy source into your project |
| Styled their way, override to customize | Unstyled primitives, you style from scratch |
| Bundle the whole library | Only include components you use |
| Version updates can break your UI | You own the code, update when you want |
| Opinionated design | Design-agnostic — looks like whatever you want |

shadcn/ui is built on Radix UI primitives (accessible, composable, headless) and styled with Tailwind CSS. We get accessibility for free and full design control.

### Design Token Architecture

```
Tailwind config → CSS custom properties → Component classes
     ↓                    ↓                     ↓
  breakpoints        --background           bg-background
  spacing scale      --foreground           text-foreground
  font sizes         --primary              bg-primary
                     --muted                text-muted-foreground
                     --border               border-border
```

This three-layer system means:
1. Change a CSS variable → every component using that token updates
2. Swap between light/dark → just change the variable values
3. Want a new theme? New set of CSS variables, zero component changes

### Tailwind v4 Specifics

Tailwind v4 uses CSS-first configuration (no more `tailwind.config.js`). Theme values are defined directly in CSS:

```css
@theme {
  --color-primary: oklch(0.21 0.01 285);
  --color-primary-foreground: oklch(0.98 0 0);
  /* ... */
}
```

This aligns perfectly with our semantic token approach — everything lives in CSS, not JavaScript config files.

**Resources:**
- [shadcn/ui documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 docs](https://tailwindcss.com/docs)
- [Radix UI primitives](https://www.radix-ui.com/)

---

## UI Pattern Libraries for Reference

When implementing specific components, reference these pattern libraries:

| Resource | What It's For |
|----------|---------------|
| [Mobbin](https://mobbin.com/) | Real screenshots from top apps — search by pattern type (cards, lists, onboarding, etc.) |
| [Design Vault](https://designvault.io/) | Curated interaction patterns from production apps |
| [Page Flows](https://pageflows.com/) | Full user flows (signup, onboarding, settings) from real products |
| [UI Patterns](https://ui-patterns.com/) | Named patterns with explanations (empty states, progressive disclosure, etc.) |
| [30+ List UI Design Examples — Eleken](https://www.eleken.co/blog-posts/list-ui-design) | Specific list interface patterns relevant to our product grid |
| [DesignerUp — UX Design Patterns](https://designerup.co/blog/the-best-collections-of-real-ux-design-patterns/) | Curated collection of pattern libraries |

---

## Key Takeaways for ShopIt

1. **Study Linear's animation timing and information density.** They've solved the "data-rich but not cluttered" problem.
2. **Follow Notion's progressive disclosure.** Don't show everything at once — let users discover depth.
3. **Copy Airbnb's wishlist interaction model.** Heart to save, grid of cards, shared lists with avatars.
4. **Use dark grey, not black.** #121212 minimum, ideally #171717 for our background.
5. **Every color must be a semantic token.** No raw hex in components. Period.
6. **Animations under 300ms.** If the user notices the animation, it's too slow.
7. **Optimistic everything.** The UI should never wait for the server to confirm before showing the result.
8. **Mobile is the primary platform.** If it doesn't work beautifully on a phone, it doesn't ship.

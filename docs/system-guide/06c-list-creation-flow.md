# ShopIt — List Creation Flow

Detailed design spec for the List Creation flow — the dialog that opens when a user clicks "+ New List" on the Dashboard.

> **Note:** This is a dialog component, not a standalone page route. It opens over the Dashboard (`/`). See [06-pages.md](./06-pages.md) for the parent page spec.

---

## Overview

Creating a new list is the entry point for every purchase decision. The flow is intentionally lightweight — a focused dialog with just enough fields to get started. The magic moment: the user types a category like "TV" and watches the AI generate a fun title like "The Great TV Showdown" in real-time.

The dialog serves two goals:

1. **Fast start** — minimum friction to create a list. Only the category/description is truly needed; everything else is optional and can be set later in List Settings.
2. **AI personality injection** — the hype title generation is the user's first encounter with ShopIt's AI personality. It sets the tone: helpful, slightly playful, never corporate.

The flow has three states: **form entry**, **AI title generating** (brief loading), and **success** (redirect to new list).

---

## Layout — Dialog (Desktop)

```
         ┌──────── backdrop (bg-black/50) ────────┐
         │                                         │
         │    ╭───────────────────────────────╮    │
         │    │  Create a new list        [✕] │    │
         │    │  ─────────────────────────────│    │
         │    │                               │    │
         │    │  What are you shopping for?   │    │
         │    │  ┌───────────────────────────┐│    │
         │    │  │ e.g., TV, running shoes   ││    │
         │    │  └───────────────────────────┘│    │
         │    │                               │    │
         │    │  ✨ The Great TV Showdown      │    │
         │    │  ┌───────────────────────────┐│    │
         │    │  │ The Great TV Showdown  ✎ ││    │
         │    │  └───────────────────────────┘│    │
         │    │                               │    │
         │    │  ┌─ Optional details ────────┐│    │
         │    │  │                           ││    │
         │    │  │  Description              ││    │
         │    │  │  ┌───────────────────────┐││    │
         │    │  │  │ Looking for a 55-65"  │││    │
         │    │  │  └───────────────────────┘││    │
         │    │  │                           ││    │
         │    │  │  Budget range             ││    │
         │    │  │  ┌──────┐  ┌──────┐      ││    │
         │    │  │  │ ₹30K │──│ ₹50K │      ││    │
         │    │  │  └──────┘  └──────┘      ││    │
         │    │  │                           ││    │
         │    │  │  Need to buy by           ││    │
         │    │  │  ┌───────────────────────┐││    │
         │    │  │  │ 📅 Pick a date        │││    │
         │    │  │  └───────────────────────┘││    │
         │    │  │                           ││    │
         │    │  └───────────────────────────┘│    │
         │    │                               │    │
         │    │         ┌───────────────────┐ │    │
         │    │         │   Create List  →  │ │    │
         │    │         └───────────────────┘ │    │
         │    │                               │    │
         │    ╰───────────────────────────────╯    │
         │                                         │
         └─────────────────────────────────────────┘
```

**AI title generation inline state (replaces static title field):**
```
         │    │  ✨ ░░░░░░░░░░░░░░░░░░        │
         │    │     Generating title...        │
```

**Mobile (< 640px):** Dialog becomes a bottom sheet at `85vh` with drag handle. Same field layout, single column. "Optional details" section starts collapsed.

---

## Layout — AI Title Generation Sequence

```
Step 1: User types category         Step 2: AI generates (300ms debounce)
┌───────────────────────────┐       ┌───────────────────────────┐
│ What are you shopping for?│       │ What are you shopping for?│
│ ┌───────────────────────┐ │       │ ┌───────────────────────┐ │
│ │ TV                    │ │       │ │ TV                    │ │
│ └───────────────────────┘ │       │ └───────────────────────┘ │
│                           │       │                           │
│                           │       │  ✨ ░░░░░░░░░░░░░░        │
│                           │       │     Generating...         │
└───────────────────────────┘       └───────────────────────────┘

Step 3: Title appears               Step 4: User can edit
┌───────────────────────────┐       ┌───────────────────────────┐
│ What are you shopping for?│       │ What are you shopping for?│
│ ┌───────────────────────┐ │       │ ┌───────────────────────┐ │
│ │ TV                    │ │       │ │ TV                    │ │
│ └───────────────────────┘ │       │ └───────────────────────┘ │
│                           │       │                           │
│  ✨ The Great TV Showdown  │       │  List name               │
│  ┌───────────────────────┐│       │  ┌───────────────────────┐│
│  │The Great TV Showdown ✎││       │  │My TV Research       ✎││
│  └───────────────────────┘│       │  └───────────────────────┘│
└───────────────────────────┘       └───────────────────────────┘
```

---

## Design Decisions

### Decision 1: Dialog vs Sheet vs Full Page

**Chosen: Dialog (desktop) + bottom sheet (mobile)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Dialog + bottom sheet (Chosen)** | Fast, lightweight. Keeps dashboard visible behind overlay. Matches the "quick creation" mental model. Short form (1 required field) fits perfectly. | Limited space for many fields — but we only need a few. |
| **B. Right sheet** | More vertical space. Consistent with Product Detail Sheet. | Overkill for a short form. Side panel implies "viewing detail," not "creating something." |
| **C. Full page (`/lists/new`)** | Unlimited space. Deep-linkable. | Complete context switch for what should be a 5-second action. Back button needed. Heavy. |
| **D. Inline expansion** | No overlay. Card expands into a form. | Breaks grid layout. Complex animation. Feels experimental. |

NN/g recommends dialogs for short, focused tasks. Our form has 1 required field and 4 optional fields behind a collapsible — dialog is the right fit. On mobile, dialogs become bottom sheets (standard pattern per Material Design and Apple HIG).

### Decision 2: AI Title — Eager vs On-Submit vs Opt-In

**Chosen: Eager generation (debounced, as user types category)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Eager / debounced (Chosen)** | Delightful surprise — title appears as user types. Shows AI personality immediately. Makes the form feel alive. | Extra API call. Might feel intrusive if user already has a name in mind. |
| **B. On submit** | Title generated after form submit. No wasted API calls. | User never sees the magic moment — title just appears on the card after redirect. Less impactful. |
| **C. Opt-in button** | "✨ Generate title" button. User chooses when. Most respectful. | Extra click. Many users won't discover the feature. Feels like a side feature, not a core experience. |

The eager approach is what makes ShopIt feel different from a spreadsheet. 300ms debounce after the user stops typing the category field. Gemini Flash responds in ~200ms. Total perceived latency: ~500ms — fast enough to feel magical. If the user has already typed a custom name, the AI title becomes a suggestion they can accept or ignore.

### Decision 3: Optional Fields — Always Visible vs Progressive Disclosure

**Chosen: Collapsible "Optional details" section, collapsed by default**

| Option | Pros | Cons |
|--------|------|------|
| **A. Collapsible section (Chosen)** | Form looks simple on first glance (1 field + AI title). Power users expand for budget/deadline. Reduces cognitive load. | Optional fields are hidden — some users might not discover them. |
| **B. All fields visible** | Everything discoverable. No hidden state. | Form looks long and intimidating. Users might think all fields are required. |
| **C. Multi-step wizard** | Each step is simple. Guided flow. | Overkill for 5 fields. Feels slow. Users want to create and go. |

The collapsible section uses shadcn `Collapsible` with a "Optional details" trigger showing a chevron. Baymard research shows that progressive disclosure with vertically collapsed sections has only 8% content-overlooked rate. Users who care about budget/deadline will find them; users who just want to start fast aren't slowed down.

### Decision 4: Post-Creation — Redirect vs Stay

**Chosen: Redirect to new list page**

| Option | Pros | Cons |
|--------|------|------|
| **A. Redirect to `/lists/[id]` (Chosen)** | Natural next step — user just created a list, now they want to add products. Immediate engagement. | Can't rapidly create multiple lists (rare use case). |
| **B. Close dialog, stay on dashboard** | Can create multiple lists in a row. Low disruption. | User has to navigate to the list manually. Feels incomplete — "I created it, now what?" |
| **C. Redirect with toast** | Redirect + confirmation feedback. | Toast is redundant if the user is already on the new list page. |

Redirect happens after a brief 400ms success animation (checkmark morph on the button). The new list page opens empty with a prominent "Add your first product" prompt — seamless transition into the next step of the journey.

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Dialog container** | shadcn `<Dialog>` | Desktop: `<DialogContent className="max-w-md p-0">`. Mobile: replaced with `<Sheet side="bottom">` at `85vh` with drag handle. Uses `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`. |
| 2 | **Close button** | `<DialogClose>` | `<Button variant="ghost" size="icon">` with `X` icon. Top-right corner. Also closeable via `Escape` or overlay click. |
| 3 | **Title** | `<DialogTitle>` | "Create a new list" in `text-lg font-semibold`. |
| 4 | **Category input** | shadcn `<Input>` | `placeholder="e.g., TV, running shoes, espresso machine"`. `autoFocus`. Label: "What are you shopping for?" in `text-sm font-medium`. This is the primary input — visually prominent, `text-base` to prevent iOS zoom. Debounces at 300ms before triggering AI title generation. |
| 5 | **AI title loading** | Custom inline state | `✨` sparkle icon + skeleton shimmer (`w-48 h-5 animate-pulse bg-muted rounded`) + "Generating title..." in `text-xs text-muted-foreground`. Appears below category input after debounce fires. |
| 6 | **AI title display** | Inline badge | `✨` sparkle + generated title in `text-sm font-medium text-ai-accent`. Appears with fade-in when generation completes. e.g., `✨ The Great TV Showdown`. |
| 7 | **List name input** | shadcn `<Input>` | Pre-filled with AI-generated title. Label: "List name". `text-base`. Small `✎` pencil icon at right end (decorative — entire field is editable). When user edits, sets `ai_title_edited = true` locally. If AI generation hasn't happened yet (no category typed), this is an empty text field with `placeholder="Name your list"`. |
| 8 | **Optional details toggle** | shadcn `<Collapsible>` | Trigger: "Optional details" with `ChevronDown` icon that rotates on open. `text-sm text-muted-foreground hover:text-foreground`. Collapsed by default. |
| 9 | **Description textarea** | shadcn `<Textarea>` | `placeholder="Looking for a 55-65\" 4K TV for the living room..."`. Label: "Description". `rows={2}`. Optional. `text-sm`. |
| 10 | **Budget range** | Two shadcn `<Input type="number">` | Side by side in `grid grid-cols-2 gap-3`. Labels: "Min" and "Max". Currency prefix `₹` as `<InputAddon>` or via `pl-6` with absolute-positioned `₹` symbol. `placeholder="30,000"` / `placeholder="50,000"`. Both optional. |
| 11 | **Purchase by date** | shadcn `<DatePicker>` (Popover + Calendar) | Label: "Need to buy by". `placeholder="Pick a date"`. Calendar icon prefix. Optional. Min date: today. |
| 12 | **Create button** | shadcn `<Button>` | `w-full` at bottom. Text: "Create List →". Loading state: `<Loader2 className="animate-spin">` + "Creating...". Success state: checkmark icon morph + "Created!" (400ms, then redirect). `disabled` until category has a value. |
| 13 | **Form validation** | Zod schema | `category` or `name`: required (at least one must be non-empty). `budget_min` ≤ `budget_max` if both set. `purchase_by` ≥ today. All other fields optional. Inline error messages via `text-destructive text-xs` below fields. |
| 14 | **Drag handle (mobile)** | Custom div | `w-12 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-2`. Only shown on mobile bottom sheet. |

---

## Animation Spec

### Dialog Open

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Overlay fades in: opacity 0→0.50
  0ms     Dialog scales up: scale 0.95→1, opacity 0→1
  200ms   Complete
─────────────────────────────────────────────────────
  Easing: ease-out [0, 0, 0.2, 1]
  Focus moves to category input
```

Mobile bottom sheet uses the same spring animation as Product Detail Sheet: `y: 100%→0%`, `spring(1, 70, 14)`, 350ms.

### AI Title Generation

```
Timeline (after 300ms debounce from category input):
─────────────────────────────────────────────────────
  0ms     Loading skeleton appears: opacity 0→1, y: 4→0 (150ms)
          "Generating title..." text fades in
  ~200ms  Gemini Flash responds
  200ms   Skeleton fades out: opacity 1→0 (100ms)
  300ms   AI title text types in character by character:
          "The Great TV Showdown"
          ~20ms per character, total ~400ms for a 20-char title
          Sparkle ✨ icon pulses once (scale 1→1.3→1, 300ms)
  700ms   Name input field below auto-fills with the title
          Smooth value transition (no visual flash)
─────────────────────────────────────────────────────
```

The character-by-character reveal (typewriter effect) is the signature animation for this flow. It makes the AI feel like it's "thinking and writing," not just dumping a cached string. Implementation: `useEffect` with `setInterval` at 20ms, incrementing a character index into the response string. Or Framer Motion's `motion.span` with `variants` on each character.

### Category Change (Re-generation)

```
If user changes category after title was already generated:
─────────────────────────────────────────────────────
  0ms     Current AI title fades out: opacity 1→0 (150ms)
  150ms   Loading skeleton appears (same as above)
  ~350ms  New title types in
─────────────────────────────────────────────────────
```

Re-generation is debounced. Rapid typing doesn't spam the API.

### Optional Details Expand/Collapse

```
Expand:
  0ms     Chevron rotates: 0°→180° (200ms, ease-out)
  0ms     Content height: 0→auto (300ms, ease-out)
          Content opacity: 0→1 (200ms, +100ms delay)

Collapse:
  0ms     Content opacity: 1→0 (150ms)
  100ms   Content height: auto→0 (250ms, ease-in)
  0ms     Chevron rotates: 180°→0° (200ms, ease-in)
```

shadcn `Collapsible` + Framer Motion `AnimatePresence` for smooth height animation. Content doesn't jump.

### Submit Button States

```
Idle:
  "Create List →"

Loading (on submit):
  Text crossfades to "Creating..." with Loader2 spin icon
  Button opacity: 1→0.8 (prevents double-click feel)
  Duration: as long as server action takes (~300-600ms)

Success:
  "Creating..." morphs to "✓ Created!"
  Check icon: strokeDashoffset animation (draw-on, 300ms)
  Button bg: default → green-500 (200ms)
  After 400ms: dialog closes, redirect to /lists/[id]

Error:
  Button shakes: x: 0→-4→4→-4→4→0 (300ms, spring)
  Text reverts to "Create List →"
  Error toast appears below dialog
```

### Dialog Close (after success)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Dialog content: opacity 1→0, scale 1→0.95 (150ms)
  100ms   Overlay: opacity 0.50→0 (150ms)
  200ms   Router navigates to /lists/[id]
  200ms   New page content loads with standard page transition
─────────────────────────────────────────────────────
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Overlay | `bg-black/50` | `bg-black/60` |
| Dialog background | `bg-card` (white) | `bg-card` (#111 range) |
| Dialog border | `border-border` (zinc-200) | `border-border` (zinc-800) |
| Dialog shadow | `shadow-xl` | `shadow-xl shadow-black/40` |
| Input backgrounds | `bg-background` | `bg-muted/30` |
| Input borders | `border-input` (zinc-300) | `border-input` (zinc-700) |
| AI title text | `text-ai-accent` | `text-ai-accent` (slightly desaturated) |
| Sparkle icon | `text-ai-accent` | `text-ai-accent` |
| Loading skeleton | `bg-muted animate-pulse` | `bg-muted animate-pulse` |
| Collapsible trigger | `text-muted-foreground` | `text-muted-foreground` |
| Optional section bg | `bg-muted/20 rounded-lg p-4` | `bg-muted/10 rounded-lg p-4` |
| Create button | `bg-primary text-primary-foreground` | `bg-primary text-primary-foreground` |
| Success button bg | `bg-green-600` | `bg-green-500` |
| Error shake | `text-destructive` | `text-destructive` |
| Currency prefix (₹) | `text-muted-foreground` | `text-muted-foreground` |
| Drag handle (mobile) | `bg-muted-foreground/30` | `bg-muted-foreground/20` |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Bottom sheet at `85vh` with drag handle. Category input and name field full width. Budget inputs stack to `grid-cols-1` if viewport is very narrow (`< 380px`), otherwise `grid-cols-2`. Optional details section starts collapsed. Create button fixed at bottom with `pb-safe` for notched phones. Date picker uses native mobile date input (`type="date"`) for better UX. |
| Tablet (`640-1024px`) | Centered dialog at `max-w-md`. Same as desktop but touch-optimized — all tap targets ≥ 44px. |
| Desktop (`> 1024px`) | Centered dialog at `max-w-md`. Keyboard-focused — `autoFocus` on category input, `Enter` submits from any field, `Tab` navigates between fields. |

---

## Accessibility

- **Dialog** uses Radix Dialog internally — proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title. Focus trapped within dialog while open.
- **Close button** has `aria-label="Close create list dialog"`. Also closeable via `Escape`.
- **Category input** has `<Label htmlFor="category">` with visible label text "What are you shopping for?". `aria-describedby` links to a helper text element.
- **AI title loading** has `aria-live="polite"` region. Screen reader announces "Generating title..." then "Title generated: The Great TV Showdown".
- **List name input** has `<Label htmlFor="name">` with "List name" text. When pre-filled by AI, `aria-description="AI-generated title, editable"`.
- **Optional details** — `<Collapsible>` trigger has `aria-expanded`, `aria-controls` pointing to the content region. Keyboard: `Enter`/`Space` to toggle.
- **Budget inputs** have `aria-label="Minimum budget"` and `aria-label="Maximum budget"`. Grouped with `role="group"` and `aria-label="Budget range"`.
- **Date picker** — shadcn DatePicker uses Radix Popover + DayPicker. Keyboard navigable. `aria-label="Purchase deadline"`.
- **Create button** — loading: `aria-busy="true"`, `aria-label="Creating list"`. Success: `aria-label="List created"`. Error: `aria-invalid="true"` on the form, error message in `aria-live="assertive"` region.
- **Form validation** — inline errors use `aria-describedby` linking input to error message. `aria-invalid="true"` on invalid fields.
- **`prefers-reduced-motion`** — typewriter effect replaced with instant text appearance. Dialog opens without scale animation. Button success is instant color change, no morph.

---

## References

- [NN/g — Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) — when to use dialogs vs other patterns
- [LogRocket — Sheets vs Dialogs vs Snackbars](https://blog.logrocket.com/ux-design/sheets-dialogs-snackbars/) — choosing the right overlay pattern
- [LogRocket — Modal UX Design Patterns](https://blog.logrocket.com/ux-design/modal-ux-design-patterns-examples-best-practices/) — modal best practices and examples
- [Carbon Design System — Dialog Pattern](https://carbondesignsystem.com/patterns/dialog-pattern/) — IBM's dialog pattern guidelines
- [shadcn Dialog](https://ui.shadcn.com/docs/components/radix/dialog) — the Dialog component we use
- [shadcn Collapsible](https://ui.shadcn.com/docs/components/radix/collapsible) — for the optional details section
- [shadcn Date Picker](https://ui.shadcn.com/docs/components/date-picker) — calendar popover for purchase deadline
- [Baymard — Product Page UX 2025](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — progressive disclosure research (8% vs 27%)
- [Framer Motion — AnimatePresence](https://motion.dev/docs/react-animate-presence) — dialog enter/exit and content swap animations

---

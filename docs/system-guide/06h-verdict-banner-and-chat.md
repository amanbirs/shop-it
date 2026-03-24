# ShopIt -- Verdict Banner, Full Analysis & Chat Panel

Design spec for three interconnected components that surface the expert opinion inline on the list detail page and provide a conversational interface for follow-up questions.

> **Note:** This spec builds on [06g-expert-opinion-redesign.md](./06g-expert-opinion-redesign.md), which defines the opinion data model (verdict, picks, comparison, concerns) and the neutral-palette principle. The components described here redistribute that content into a persistent banner, an expandable analysis view, and a floating chat panel -- replacing the inline-below-grid placement from 06g.

---

## 1. Overview

The current expert opinion sits below the product grid as an inline section. It works for first-time viewing, but once a user has seen the verdict they do not scroll back down to reference it. The picks and verdict become invisible during normal grid browsing. This spec solves three problems:

**Problem 1: The verdict disappears.** After scrolling past it, the user must scroll back to remember what was recommended. The verdict banner solves this by placing a persistent, single-line summary between the list header and the URL input -- always visible regardless of scroll position, like a notification bar in Linear or a featured snippet in Google Search.

**Problem 2: Deep analysis requires scrolling to a different section.** The full opinion (picks, comparison, concerns) currently lives below the grid, disconnected from the header where the user manages the list. The full analysis view solves this by expanding inline from the verdict banner itself, keeping the user's context intact.

**Problem 3: Users have follow-up questions.** "Why not the Sony?" or "What if I increase my budget to 80K?" cannot be answered by a static opinion. The chat panel provides a lightweight, non-intrusive way to ask questions about the list without navigating away. It is labeled "Ask about this list" -- no AI branding, no chatbot framing. It feels like a contextual help panel, not a conversational AI product.

All three components use the app's neutral palette exclusively. No `--ai-accent`, no sparkle icons, no "AI" labels. They use `--foreground`, `--muted-foreground`, `--border`, `--card`, `--muted` -- the same tokens as the list header, product cards, and filter tabs. The goal is for these components to feel like they were always part of the page, not bolted-on AI features.

---

## 2. Layouts

### Layout -- Verdict Banner (Desktop)

Position: between the list header metadata row and the `AddProductForm` URL input. Always visible when an opinion exists. Full width of the content area.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                                  │
│  │ side │  The Great TV Showdown                            [Settings]     │
│  │ bar  │  Budget: 30K-50K  ·  By: Mar 30  ·  2 members                   │
│  │      │  [picture quality] [low input lag] [smart TV]                     │
│  │      │                                                                  │
│  │      │  ┌───────────────────────────────────────────────────────────┐   │
│  │      │  │  LG C3 OLED is the top pick.  Samsung S90C for value.   │   │
│  │      │  │  Best picture quality and lowest input lag in the group. │   │
│  │      │  │                         Full analysis  ·  Ask a question │   │
│  │      │  └───────────────────────────────────────────────────────────┘   │
│  │      │                                                                  │
│  │      │  ┌──────────────────────────────────────────────────────────┐   │
│  │      │  │  Paste a product URL...                          [Add]  │   │
│  │      │  └──────────────────────────────────────────────────────────┘   │
│  │      │                                                                  │
│  │      │  [All (6)] [Shortlisted (2)] [Purchased (0)]                    │
│  │      │                                                                  │
│  │      │  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │      │  │ product  │ │ product  │ │ product  │                        │
│  │      │  │ card     │ │ card     │ │ card     │                        │
│  │      │  └──────────┘ └──────────┘ └──────────┘                        │
│  │      │                                                                  │
│  └──────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Banner anatomy:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  {TopPickName} is the top pick.  {ValuePickName} for value.        │  <- line 1: picks summary
│  {one-line verdict summary, max ~80 chars}                         │  <- line 2: verdict text
│                              Full analysis  ·  Ask a question      │  <- line 3: action links
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- The banner uses `border-b border-border` on its bottom edge only -- no surrounding border, no background tint. It separates from the header above by inheriting the existing `space-y` rhythm.
- Line 1: Pick names are rendered as `font-medium text-foreground`. Clicking a pick name scrolls to that product in the grid and briefly highlights it (a 1.5s `ring-2 ring-ring` pulse). If both picks are the same product, only one name is shown: "{Name} is the top pick and best value."
- Line 2: The verdict summary in `text-sm text-muted-foreground`. Truncated to a single line on desktop with `line-clamp-1`. This is the `opinion.verdict` field, shortened. If the full verdict is longer than ~100 characters, the banner shows the first sentence only.
- Line 3: Two text links separated by a `middot`. "Full analysis" toggles the expanded analysis view. "Ask a question" opens the chat panel. Both are `text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`. No icons.
- Total height: ~72px on desktop (3 lines of text with `py-3`).
- The banner has a `border-b border-border` bottom separator and the same `px` as the rest of the content area.

### Layout -- Verdict Banner (Mobile, < 640px)

On mobile, the banner compresses. Line 1 and Line 2 merge into two lines, and the action links tuck into a single row.

```
┌───────────────────────────────┐
│                               │
│  Top pick: LG C3 OLED        │  <- pick name only (no value pick on this line)
│  Best picture quality and     │  <- verdict, wraps to 2 lines max
│  lowest input lag.            │
│  Full analysis · Ask          │  <- actions, abbreviated
│                               │
└───────────────────────────────┘
```

- "Value pick" line is dropped on mobile to save space. The value pick is visible in the full analysis view.
- "Ask a question" is shortened to "Ask" on mobile.
- The banner gains `py-2.5` and `text-sm` for the picks line, `text-xs` for the verdict line.
- Touch targets for the action links meet the 44px minimum by using `py-2` on the link row.

### Layout -- Full Analysis (Expanded)

When "Full analysis" is clicked, the analysis view expands directly below the verdict banner, pushing the URL input and grid down. It does not open in a side panel or modal. The expansion is inline, like toggling a collapsible section.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  LG C3 OLED is the top pick.  Samsung S90C for value.               │  │
│  │  Best picture quality and lowest input lag in the group.             │  │
│  │                              Hide analysis  ·  Ask a question       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Overview                                                             │  │
│  │  ─────────                                                            │  │
│  │  "The LG C3 OLED is the strongest overall pick -- it leads on        │  │
│  │   picture quality and input lag, your top two priorities. The         │  │
│  │   Samsung S90C comes close at a lower price point."                   │  │
│  │                                                                       │  │
│  │  ┌──────── Top pick ──────────────┐ ┌──── Best value ──────────────┐ │  │
│  │  │                                │ │                              │ │  │
│  │  │  ┌──────┐  LG C3 OLED         │ │  ┌──────┐  Samsung S90C     │ │  │
│  │  │  │ img  │  69,990 · amazon.in  │ │  │ img  │  74,990           │ │  │
│  │  │  │ 48px │  4.6 (3.2K reviews)  │ │  │ 48px │  4.3 (1.8K)      │ │  │
│  │  │  └──────┘                      │ │  └──────┘                    │ │  │
│  │  │  "Best picture quality and     │ │  "Best price-to-feature     │ │  │
│  │  │   lowest input lag."           │ │   ratio within budget."     │ │  │
│  │  │                  [View product]│ │                [View product]│ │  │
│  │  └────────────────────────────────┘ └──────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  > Comparison                                                   [v]  │  │
│  │  > Watch out for                                                [v]  │  │
│  │                                                                       │  │
│  │  Updated 2 hours ago                                                  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Paste a product URL...                                      [Add] │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
```

**Key details:**

- The "Full analysis" link text changes to "Hide analysis" when expanded.
- The analysis card uses `bg-card border rounded-lg p-6`. It is a standard Card surface -- the same visual treatment as a product card or settings section.
- "Overview" is a plain text section header: `text-sm font-medium text-foreground mb-2`. Not "AI Summary" or "Expert Analysis."
- The verdict quote is rendered as `text-base leading-relaxed text-muted-foreground` inside a `bg-muted/50 rounded-lg p-4` container (same as 06g spec).
- Pick cards are identical to the 06g spec: 48x48 thumbnail, name, price, rating, one-line reason, "View product" ghost link.
- Collapsible sections ("Comparison", "Watch out for") use the same shadcn `Collapsible` pattern as 06g.
- "Updated 2 hours ago" sits at the bottom in `text-xs text-muted-foreground`.
- On mobile, the analysis card goes full-width with `p-4` padding and pick cards stack vertically.

### Layout -- Chat Panel (Desktop)

A floating panel anchored to the bottom-right corner of the viewport, above the page content. Appears when "Ask a question" is clicked from the verdict banner.

```
                                          ┌──────────────────────────────┐
                                          │  Ask about this list    [x]  │
                                          │  ────────────────────────── │
                                          │                              │
                                          │  What would you like to      │
                                          │  know about these products?  │
                                          │                              │
                                          │  ────────────────────────── │
                                          │                              │
                                          │  Why is the LG C3 ranked     │
                                          │  higher than the Sony?       │
                                          │                        user  │
                                          │                              │
                                          │  The LG C3 leads on your     │
                                          │  top two priorities --       │
                                          │  picture quality and input   │
                                          │  lag. The Sony A80L has      │
                                          │  slightly better color       │
                                          │  accuracy but at a higher    │
                                          │  price point (89,990 vs      │
                                          │  69,990), which exceeds      │
                                          │  your stated budget.         │
                                          │                              │
                                          │  What if I increase my       │
                                          │  budget?                     │
                                          │                        user  │
                                          │                              │
                                          │  ────────────────────────── │
                                          │  ┌──────────────────────┐   │
                                          │  │ Ask a question...    │   │
                                          │  └──────────────────────┘   │
                                          │                              │
                                          └──────────────────────────────┘
```

**Panel anatomy:**

- Dimensions: `w-[360px] h-[480px]` fixed size. Anchored `bottom-6 right-6` (24px from viewport edges).
- Shadow: `shadow-lg` -- the same elevation as a dropdown menu or dialog overlay. This is a floating surface that sits above the page.
- Border: `border border-border rounded-xl`. Slightly more rounded than standard cards (`rounded-xl` vs `rounded-lg`) to visually distinguish it as a floating panel rather than inline content.
- Background: `bg-card`. Same as any card surface.
- Header: "Ask about this list" in `text-sm font-medium`. Close button is `text-muted-foreground hover:text-foreground`, an `X` icon (no text). The header has `border-b border-border px-4 py-3`.
- Message area: Scrollable `flex-1 overflow-y-auto px-4 py-3` container. Messages flow top to bottom.
- Input area: Fixed at the bottom. `border-t border-border px-4 py-3`. A single-line text input using the standard `<Input>` component with `placeholder="Ask a question..."`. No send button -- Enter submits. Shift+Enter for newlines (if supporting multi-line, use `<Textarea>` with `rows={1}` auto-grow).
- Welcome message: When no messages exist, a centered prompt reads "What would you like to know about these products?" in `text-sm text-muted-foreground`. This disappears after the first message.

**Message styling:**

Messages do not use chat bubbles. All text is left-aligned and uses the same typography as body text elsewhere in the app.

- **User messages**: `text-sm text-foreground font-medium` with a right-aligned "user" label in `text-xs text-muted-foreground`. The message text itself is left-aligned (not right-aligned like typical chat). The word "user" could be replaced with the user's first name if available.
- **Response messages**: `text-sm text-muted-foreground leading-relaxed`. No label, no avatar, no "AI" attribution. The response just appears below the user's message after a brief typing indicator (three dots, `animate-pulse`).
- **Message spacing**: `space-y-4` between messages. A thin `border-b border-border/50` separates each exchange (user message + response pair), not individual messages.
- **Typing indicator**: Three small dots in `text-muted-foreground animate-pulse`, same pattern as a loading state. Appears where the next response will render.

### Layout -- Chat Panel (Mobile, < 640px)

On mobile, the chat panel becomes a full-screen bottom sheet that slides up from the bottom edge.

```
┌───────────────────────────────┐
│  Ask about this list     [x]  │
│  ──────────────────────────── │
│                               │
│  What would you like to       │
│  know about these products?   │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│                               │
│  ──────────────────────────── │
│  ┌───────────────────────┐    │
│  │ Ask a question...     │    │
│  └───────────────────────┘    │
│                               │
└───────────────────────────────┘
```

- Full viewport height: `fixed inset-0 z-50 bg-card` -- same pattern as the mobile product detail overlay in `list-detail-content.tsx`.
- Close button returns to the list page. No animation on close (instant hide).
- The input area sits above the mobile keyboard when the input is focused. Uses `pb-safe` (safe area inset) to avoid iOS home indicator overlap.
- Message area fills the remaining space with `flex-1 overflow-y-auto`.

### Layout -- No Opinion State

When no expert opinion has been generated, the verdict banner area shows a single-line CTA instead. Same position (between header and URL input), same visual weight as the banner.

```
│                                                                           │
│  [priorities] [chips]                                                     │
│                                                                           │
│  Get a recommendation based on your priorities.     [Get recommendation]  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Paste a product URL...                                      [Add] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
```

- A single line of text with a button, all on one row using `flex items-center justify-between`.
- Text: "Get a recommendation based on your priorities." in `text-sm text-muted-foreground`.
- Button: `<Button variant="outline" size="sm">Get recommendation</Button>`. Not `variant="default"` -- outline is less aggressive for an optional feature. Disabled when `productCount < 2`, and the text changes to "Add at least 2 products to compare."
- No dashed borders, no background tint, no icons. Looks like a metadata row with an action.
- The "Ask a question" link is not shown in this state (no opinion to ask about).

### Layout -- Stale State

When products have changed since the opinion was generated, the verdict banner shows an inline staleness indicator.

```
│                                                                           │
│  LG C3 OLED is the top pick.  Samsung S90C for value.                    │
│  Best picture quality and lowest input lag. (outdated)    [Refresh]      │
│                                        Full analysis  ·  Ask a question  │
│                                                                           │
```

- The word "(outdated)" appears inline after the verdict text in `text-xs text-muted-foreground`. No amber coloring, no warning icon.
- A "Refresh" link appears at the end of the verdict line (or on the actions row on mobile) using `text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`. Clicking it triggers regeneration.
- While regenerating, the "Refresh" text changes to a `Loader2` spinner (16px, `animate-spin text-muted-foreground`) with no accompanying text.
- The full analysis view (if expanded) gains `opacity-60` during the stale state, matching the 06g pattern.
- After regeneration completes, the banner updates with the new verdict and the analysis view refreshes if open.

---

## 3. Design Decisions

### Decision 1: Banner Visual Treatment -- How to Differentiate Without Special Coloring

**Chosen: Typography hierarchy with structural separation**

| Option | Pros | Cons |
|--------|------|------|
| **A. Typography + position only (Chosen)** | The banner differentiates through placement (between header and input -- a privileged position), font weight (`font-medium` for pick names vs `text-muted-foreground` for surrounding text), and structural role (it is the only element between header and input). No colors needed. Matches Linear's notification bars which use plain text + position, never colored backgrounds. Feels native -- the user perceives it as part of the header, not a separate widget. | If the user does not notice the banner, there is no visual "callout." But the placement guarantees visibility -- it is above the fold, between two elements the user interacts with on every visit. |
| B. Subtle `bg-muted/30` background | Very light tint differentiates it from surrounding white/dark background. Does not scream "AI." | Still creates a visual "box" that separates the content. Even a 30% opacity background makes the section feel like a callout rather than a native page element. Goes against the "no special treatment" principle. |
| C. Left accent border (`border-l-2 border-foreground`) | Strong visual anchor. Used by some tools for important notices. | Creates the same "this is different" signal as colored borders. The eye is drawn to the border first, not the content. Over-indexes on visual distinction when we want integration. |
| D. Icon prefix (info icon, lightbulb, etc.) | Quick visual signal. Universally understood. | Icons add visual noise and imply "this is a special notice" rather than "this is part of the page." Conflicts with the design principle of icon-free attribution. |

The banner's differentiation comes entirely from its position in the page hierarchy and its content structure. Pick names in `font-medium` stand out against `text-muted-foreground` body text. The action links ("Full analysis", "Ask a question") signal interactivity. No background, no border, no icon is needed because the content itself communicates purpose.

### Decision 2: Chat Trigger Location -- Where to Place the Entry Point

**Chosen: Inline text link in the verdict banner**

| Option | Pros | Cons |
|--------|------|------|
| **A. Text link in verdict banner (Chosen)** | Contextually placed -- the user sees the verdict, has a question, clicks "Ask a question" right there. No floating UI elements that compete with the page content. Disappears when no opinion exists (no orphaned chat button). Matches the interaction model of "read the summary, then dig deeper." Linear-inspired: actions are inline text, not floating buttons. | Less discoverable than a persistent floating button. Users must scroll to the banner to find the chat trigger. But the banner is always visible (above the fold), so this is acceptable. |
| B. Floating action button (bottom-right, always visible) | Always discoverable. Users can open chat from anywhere on the page. Familiar Intercom/Drift pattern. | Competes with page content. A floating circle with an icon (chat bubble, message icon) screams "chatbot" -- exactly the AI branding we want to avoid. Adds permanent visual weight. Cannot be hidden when irrelevant (no opinion state). |
| C. Button in the list header actions row | Grouped with other list actions (settings, share). Logically consistent. | Too far from the opinion content. The user reads a verdict below and must look up to the header to ask about it. Breaks the reading flow. |
| D. Link inside the full analysis view | Deeply contextual -- the user has read the analysis and wants to follow up. | Only available when the analysis is expanded. Users who want to ask a quick question without reading the full analysis cannot find it. |

The chat trigger lives as a text link in the verdict banner's third line: `Full analysis  ·  Ask a question`. This pairs the two deepening actions together. Users scan the verdict (line 1-2), then see their options for going deeper (line 3). The chat panel opens from this link, and the link text changes to "Close chat" while the panel is open.

### Decision 3: Full Analysis Presentation -- Inline Expansion vs Separate View

**Chosen: Inline expansion from the verdict banner**

| Option | Pros | Cons |
|--------|------|------|
| **A. Inline expansion below banner (Chosen)** | The analysis pushes content down rather than covering it -- the user maintains page context. The banner serves as a persistent summary; the analysis expands when they want depth. Collapsing returns to the compact banner state. Matches the progressive disclosure philosophy: summary always visible, details on demand. Uses the same expand/collapse pattern as the collapsible sections within the analysis itself (recursive consistency). | Pushes the URL input and grid down, which could feel disruptive on shorter viewports. Mitigated by animating the expansion smoothly (200ms ease-out height transition). |
| B. Right side panel (like product detail) | Keeps the grid visible. Familiar panel pattern already used for product details. | Creates a visual conflict -- both the product detail panel (45% width) and the analysis panel would compete for right-side space. Users cannot view a product detail and the analysis simultaneously, which is a legitimate use case. Also, the opinion is about the list, not a single product, so a side panel feels wrong. |
| C. Modal / dialog overlay | Full focus on the analysis. No interference with page layout. | Breaks the user's page context. Closing the modal means the analysis is gone -- they cannot reference it while browsing the grid. Too heavy for "read a short summary and two pick cards." |
| D. Separate `/lists/[id]/analysis` page | Full-page treatment. Room for comprehensive analysis. | Over-engineered. The analysis content is 300-500 words max. A full page for that amount of content feels empty and disconnected from the list it analyzes. |

The inline expansion ensures the verdict banner acts as a toggle: compact summary by default, full analysis on demand, collapsible back to summary. The URL input and grid slide down with a smooth `height: auto` transition. When the detail panel is open on desktop, the analysis expansion is disabled (the banner shows "Full analysis" as non-interactive text in `text-muted-foreground/50` with `cursor-default`) -- the user is focused on a single product and the comparative analysis would be noise.

### Decision 4: Chat Message Styling -- Differentiating User and Response Without Colored Bubbles

**Chosen: Font weight + label differentiation**

| Option | Pros | Cons |
|--------|------|------|
| **A. Font weight + label (Chosen)** | User messages use `font-medium` (slightly bolder). Response messages use `font-normal text-muted-foreground` (lighter). A small `text-xs text-muted-foreground` label "you" appears right-aligned on user messages. Responses have no label. This creates visual separation through typographic weight alone -- the same technique Notion uses for distinguishing headings from body text. No colored backgrounds, no chat bubbles, no avatars. Clean, text-focused, editorial feel. | Subtler than typical chat UIs. Users accustomed to WhatsApp/iMessage may not immediately parse the conversation flow. Mitigated by the `border-b border-border/50` separator between exchange pairs. |
| B. Background-tinted bubbles (light grey for responses) | Familiar chat pattern. Immediate visual parsing of who said what. | Introduces colored backgrounds that make the panel feel like a "chatbot" -- exactly the framing we avoid. Even `bg-muted` on response messages creates a visual "other party" signal. |
| C. Left-aligned vs right-aligned messages | Standard chat layout. User on right, response on left. Instantly readable. | The right-alignment of user messages implies a two-party conversation with a bot. We want this to feel like a Q&A reference panel, not a chat with an AI. Keeping everything left-aligned makes it feel more like a document than a conversation. |
| D. Avatars (user avatar + app icon for responses) | Clear visual attribution. Matches modern chat UIs. | An app icon or abstract avatar for responses screams "you are chatting with a bot." Conflicts with the non-AI-branded design goal. User avatars add visual clutter in a 360px-wide panel. |

The font weight approach creates enough visual distinction for conversation flow while keeping the panel text-focused. Each exchange (user message + response) is separated by a `border-b border-border/50` hairline -- not between individual messages, but between complete Q&A pairs. This groups related content and makes the panel scannable.

### Decision 5: Mobile Adaptation -- How All Three Components Degrade

**Chosen: Banner compresses, analysis stacks, chat becomes bottom sheet**

| Option | Pros | Cons |
|--------|------|------|
| **A. Banner compresses + chat bottom sheet (Chosen)** | Banner: drops value pick name, shortens "Ask a question" to "Ask," allows verdict to wrap to 2 lines. Still fits in ~64px height. Analysis: pick cards stack vertically, collapsibles go full-width. Chat: full-screen bottom sheet (same pattern as mobile product detail overlay). Each component adapts independently using standard responsive patterns. No component is hidden on mobile -- everything is accessible. | The full-screen chat sheet is a larger commitment on mobile than the 360px desktop panel. Users must explicitly close it to return to the list. But this matches iOS conventions (Maps, Messages) where focused interaction takes full screen. |
| B. Hide banner on mobile, show only in analysis | Saves vertical space on small screens. | Defeats the purpose -- mobile is the primary use case (CLAUDE.md: "someone on their phone pasting a product URL"). Hiding the verdict on mobile means the most important information is invisible on the most important platform. |
| C. Swipe-up drawer for analysis + chat | iOS-native pattern. Space-efficient. Gesture-based. | Requires custom gesture handling that conflicts with native scroll. Complex to implement reliably across browsers. Framer Motion gesture support exists but adds bundle weight. |

Mobile breakpoints (matching the existing responsive strategy from 06g):

| Component | Desktop (>= 1024px) | Tablet (640-1023px) | Mobile (< 640px) |
|-----------|---------------------|---------------------|-------------------|
| Verdict banner | Full 3-line layout | Same as desktop | Compressed: top pick only, verdict wraps, "Ask" short label |
| Full analysis | Inline expansion, 2-col pick cards | Same as desktop | Inline expansion, 1-col pick cards |
| Chat panel | Floating 360x480 panel | Floating 360x480 panel | Full-screen bottom sheet |

---

## 4. Element Breakdown

| # | Element | Component | Tailwind Classes / Implementation |
|---|---------|-----------|-----------------------------------|
| 1 | **Verdict banner container** | `<div>` | `border-b border-border py-3 space-y-1`. No background. Sits between list header and `AddProductForm`. Conditionally rendered when `opinion` is non-null. |
| 2 | **Pick names line** | `<p>` | `text-sm`. Pick names: `<button class="font-medium text-foreground hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">`. Text between names: `text-muted-foreground`. Example: `{TopPick} is the top pick. {ValuePick} for value.` |
| 3 | **Verdict summary line** | `<p>` | `text-sm text-muted-foreground line-clamp-1`. Content: first sentence of `opinion.verdict`, max ~100 chars. Stale indicator `(outdated)` appended as `<span class="text-xs">` when stale. |
| 4 | **Banner action links** | `<div>` with links | `flex items-center gap-2 text-xs text-muted-foreground`. Links: `<button class="hover:text-foreground underline-offset-4 hover:underline transition-colors">`. Separator: `<span class="text-muted-foreground/50">&middot;</span>`. |
| 5 | **"Full analysis" toggle** | `<button>` | Same styling as #4 links. Text toggles between "Full analysis" and "Hide analysis". Sets `analysisOpen` state. `aria-expanded={analysisOpen}`. |
| 6 | **"Ask a question" trigger** | `<button>` | Same styling as #4 links. Text toggles between "Ask a question" / "Ask" (mobile) and "Close chat". Sets `chatOpen` state. |
| 7 | **Refresh link (stale)** | `<button>` | `text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`. Appears after verdict text when stale. During regeneration: replaced by `<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />`. |
| 8 | **No-opinion CTA row** | `<div>` | `flex items-center justify-between border-b border-border py-3`. Text: `<p class="text-sm text-muted-foreground">`. Button: `<Button variant="outline" size="sm">`. Disabled when `productCount < 2`. |
| 9 | **Analysis card container** | `<div>` | `bg-card border rounded-lg p-6 space-y-5`. Wraps the full analysis content. Uses Framer Motion `AnimatePresence` for enter/exit. |
| 10 | **Analysis overview label** | `<h3>` | `text-sm font-medium text-foreground`. Plain text "Overview". Not "AI Summary." |
| 11 | **Analysis verdict quote** | `<blockquote>` | `bg-muted/50 rounded-lg p-4 text-base leading-relaxed text-muted-foreground`. Full `opinion.verdict` text (untruncated). Identical to 06g spec Element #2. |
| 12 | **Pick cards grid** | CSS Grid | `grid grid-cols-1 sm:grid-cols-2 gap-4`. Two pick cards. Identical to 06g spec Elements #3-7. |
| 13 | **Pick card** | `<Card>` | Identical structure to 06g spec Element #4. Label: `text-xs font-medium text-muted-foreground uppercase tracking-wider`. Thumbnail: `w-12 h-12 rounded-md object-cover bg-muted`. Name: `text-sm font-medium`. Price: `text-sm text-muted-foreground`. Reason: `text-sm text-muted-foreground`. "View product" ghost button. |
| 14 | **Collapsible sections** | shadcn `<Collapsible>` | Identical to 06g spec Elements #8-9. "Comparison" and "Watch out for." Collapsed by default. Chevron rotation on expand. |
| 15 | **Analysis timestamp** | `<p>` | `text-xs text-muted-foreground mt-4`. "Updated {relativeTime}". No icon. |
| 16 | **Chat panel (desktop)** | `<div>` | `fixed bottom-6 right-6 z-50 w-[360px] h-[480px] bg-card border border-border rounded-xl shadow-lg flex flex-col`. Uses Framer Motion for enter/exit. |
| 17 | **Chat panel header** | `<div>` | `flex items-center justify-between px-4 py-3 border-b border-border shrink-0`. Title: `text-sm font-medium`. Close: `<button class="text-muted-foreground hover:text-foreground"><X class="h-4 w-4" /></button>`. |
| 18 | **Chat message area** | `<div>` | `flex-1 overflow-y-auto px-4 py-3 space-y-4`. Scrolls independently. Auto-scrolls to bottom on new messages. |
| 19 | **Chat welcome text** | `<p>` | `text-sm text-muted-foreground text-center py-8`. "What would you like to know about these products?" Hidden after first message. |
| 20 | **User message** | `<div>` | `space-y-1`. Text: `<p class="text-sm text-foreground font-medium leading-relaxed">`. Label: `<span class="text-xs text-muted-foreground block text-right">you</span>`. |
| 21 | **Response message** | `<div>` | `<p class="text-sm text-muted-foreground leading-relaxed">`. No label, no attribution. |
| 22 | **Exchange separator** | `<div>` | `border-b border-border/50`. Between each user+response pair, not between individual messages. |
| 23 | **Typing indicator** | `<div>` | `flex gap-1 py-2`. Three `<span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse">` with staggered `animation-delay` (0ms, 150ms, 300ms). |
| 24 | **Chat input area** | `<div>` | `border-t border-border px-4 py-3 shrink-0`. Contains standard `<Input placeholder="Ask a question..." class="bg-transparent border-0 focus-visible:ring-0 shadow-none text-sm" />`. Enter to submit. |
| 25 | **Mobile chat sheet** | `<div>` | `fixed inset-0 z-50 bg-card flex flex-col`. Same internal structure as desktop panel but full-screen. Close button navigates back. `pb-safe` for iOS safe area. |
| 26 | **Product highlight pulse** | CSS animation on target product | When a pick name is clicked in the banner, the target product card receives `ring-2 ring-ring` that fades out over 1.5s. Applied via a temporary className + `setTimeout`. |

---

## 5. Animation Spec

### Verdict Banner Entrance (First Load After Opinion Generated)

```typescript
// Stagger children of the banner container
<motion.div
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
>
  {/* Pick names line, verdict line, action links */}
</motion.div>
```

Subtle. 4px upward slide + fade. 200ms. No stagger between lines -- the banner is small enough to animate as a single unit. Respects `prefers-reduced-motion` by replacing with instant opacity change.

### Full Analysis Expand / Collapse

```typescript
// Analysis card container
<AnimatePresence>
  {analysisOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        height: { duration: 0.25, ease: "easeOut" },
        opacity: { duration: 0.15, ease: "easeOut" },
      }}
      style={{ overflow: "hidden" }}
    >
      {/* Analysis card content */}
    </motion.div>
  )}
</AnimatePresence>
```

Height animates from 0 to auto over 250ms. Opacity fades in over 150ms. The content is clipped with `overflow: hidden` during transition. On collapse, opacity fades out first (150ms), then height collapses (250ms). Same pattern as the collapsible sections inside the analysis.

### Chat Panel Open / Close (Desktop)

```typescript
// Floating chat panel
<AnimatePresence>
  {chatOpen && (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94], // ease-out quart
      }}
    >
      {/* Chat panel */}
    </motion.div>
  )}
</AnimatePresence>
```

The panel rises 16px from its final position + subtle scale-up (0.98 to 1.0) + fade. 200ms total. This gives a "surface emerging" feel without spring physics. On close, reverses. The custom easing curve is slightly softer than standard ease-out for a more refined feel.

### Chat Panel Open / Close (Mobile Bottom Sheet)

```typescript
// Full-screen mobile sheet
<AnimatePresence>
  {chatOpen && (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 300,
      }}
    >
      {/* Full-screen chat */}
    </motion.div>
  )}
</AnimatePresence>
```

Spring physics for mobile bottom sheet -- slides up from below the viewport. Damping 30 + stiffness 300 produces a quick, settled motion with minimal overshoot. Matches iOS sheet presentation conventions.

### Product Highlight Pulse (When Pick Name Clicked)

```typescript
// On the target product card
const [highlight, setHighlight] = useState(false)

// When scrolled into view:
setHighlight(true)
setTimeout(() => setHighlight(false), 1500)

// CSS class on the card:
className={cn(
  "transition-shadow duration-300",
  highlight && "ring-2 ring-ring shadow-md"
)}
```

Not a Framer Motion animation -- uses CSS transitions for the ring. The `ring-2 ring-ring` appears instantly, then the `transition-shadow duration-300` handles the smooth removal when `highlight` becomes false after 1.5s. `scrollIntoView({ behavior: "smooth", block: "center" })` handles the scroll.

### Typing Indicator Dots

```css
/* In globals.css or as inline animation-delay */
.typing-dot:nth-child(1) { animation-delay: 0ms; }
.typing-dot:nth-child(2) { animation-delay: 150ms; }
.typing-dot:nth-child(3) { animation-delay: 300ms; }
```

Standard pulse animation with staggered delays. Each dot is `h-1.5 w-1.5 rounded-full bg-muted-foreground/40`. The `animate-pulse` utility handles the opacity oscillation. Staggered delays create the classic "typing..." effect.

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```typescript
const prefersReducedMotion = usePrefersReducedMotion()

// Pass to Framer Motion:
transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
```

When reduced motion is preferred:
- Banner entrance: instant opacity (no y-translate)
- Analysis expand: instant show/hide (no height animation)
- Chat panel: instant show/hide (no y-translate or scale)
- Product highlight: ring appears and disappears instantly (no transition)
- Typing dots: static dots, no pulse

---

## 6. Dark Mode Adaptation

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Verdict banner text (picks) | `text-foreground` -- near-black `oklch(0.145 0 0)` | `text-foreground` -- near-white `oklch(0.985 0 0)` |
| Verdict summary text | `text-muted-foreground` -- grey `oklch(0.556 0 0)` | `text-muted-foreground` -- light grey `oklch(0.708 0 0)` |
| Banner bottom border | `border-border` -- light grey `oklch(0.922 0 0)` | `border-border` -- white at 10% `oklch(1 0 0 / 10%)` |
| Action link text | `text-muted-foreground` hover `text-foreground` | Same tokens, automatically adapted |
| Analysis card background | `bg-card` -- white `oklch(1 0 0)` | `bg-card` -- dark grey `oklch(0.205 0 0)` |
| Analysis card border | `border-border` -- light grey | `border-border` -- white at 10% |
| Verdict quote background | `bg-muted/50` -- near-white | `bg-muted/50` -- dark grey at 50% (~`oklch(0.269 0 0 / 50%)`) |
| Chat panel background | `bg-card` -- white | `bg-card` -- dark grey |
| Chat panel shadow | `shadow-lg` -- dark shadow | `shadow-lg` -- remains visible on dark surfaces due to rgba(0,0,0) |
| Chat panel border | `border-border` -- light grey | `border-border` -- white at 10% |
| User message text | `text-foreground font-medium` | Same tokens, near-white |
| Response message text | `text-muted-foreground` | Same tokens, light grey |
| Chat input background | `bg-transparent` (inherits card) | `bg-transparent` (inherits dark card) |
| Exchange separator | `border-border/50` -- subtle hairline | `border-border/50` -- subtle hairline at 5% white |
| Typing indicator dots | `bg-muted-foreground/40` -- grey at 40% | `bg-muted-foreground/40` -- light grey at 40% |
| Product highlight ring | `ring-ring` -- `oklch(0.708 0 0)` | `ring-ring` -- `oklch(0.556 0 0)` |
| No-opinion CTA text | `text-muted-foreground` | `text-muted-foreground` |

No special dark mode overrides are needed. Every element uses semantic tokens that automatically adapt through the CSS custom properties defined in `globals.css`. The chat panel shadow (`shadow-lg`) uses `rgba(0,0,0)` which works on both light and dark surfaces, though it is more subtle in dark mode. The panel's `border border-border` provides the primary edge definition in dark mode.

---

## 7. Responsive Behavior

| Breakpoint | Verdict Banner | Full Analysis | Chat Panel |
|-----------|----------------|---------------|------------|
| **Mobile (< 640px)** | Compressed: shows only top pick name, verdict wraps to 2 lines, "Ask" shortened. `py-2.5`. Total height ~72px. Bottom border maintained. | Inline expansion below banner. Pick cards stack to single column. Collapsibles full-width with `min-h-[44px]` touch targets. `p-4` padding. | Full-screen bottom sheet (`fixed inset-0 z-50`). Spring-animated slide up. `pb-safe` for iOS home indicator. Close button returns to list. |
| **Tablet (640px - 1023px)** | Same as desktop layout. Both pick names shown. | Same as desktop. Pick cards side-by-side. | Floating panel, same as desktop. `bottom-6 right-6`. |
| **Desktop (>= 1024px)** | Full 3-line layout: picks, verdict, actions. | Inline expansion. 2-col pick cards. `p-6` padding. | Floating panel `360x480px`, `bottom-6 right-6`. |
| **Detail panel open (any width)** | Banner remains visible (it is above the grid, not inside it). "Full analysis" link becomes non-interactive (`text-muted-foreground/50 cursor-default`). "Ask a question" remains active. | Expansion disabled (analysis is hidden). If analysis was open, it collapses when the detail panel opens. | Chat panel remains accessible. It floats above the detail panel. |

**Additional responsive notes:**

- The verdict banner does not collapse or hide at any breakpoint. It is always visible when an opinion exists, because it is the primary surface for the opinion's conclusion.
- The chat panel z-index (`z-50`) is above the mobile product detail overlay (`z-40`) but below modals (`z-60`), so the chat can be used while browsing products on mobile if needed.
- On mobile, the chat input uses `inputMode="text"` and does not auto-focus on open to avoid immediately triggering the keyboard. The user taps the input explicitly.
- The full analysis expansion on mobile pushes content below it. The user can scroll down to see the URL input and grid. A "Back to top" behavior is not needed -- the analysis itself is not long enough to require it.

---

## 8. Accessibility

### Verdict Banner

- **Semantic region**: `<section aria-label="Product recommendation summary">` wraps the entire banner.
- **Pick name buttons**: `<button>` elements (not `<a>`) because clicking them scrolls within the page rather than navigating. Each has `aria-label="Scroll to {product name}"`. Keyboard: Enter/Space triggers scroll + highlight.
- **Verdict text**: No special role. Standard `<p>` element. The text is supplementary to the pick names which are the actionable elements.
- **Action links**: `<button>` elements with `aria-label="Show full analysis"` and `aria-label="Open question panel"` respectively. `aria-expanded` on the analysis toggle reflects the current state.
- **Stale indicator**: The word "(outdated)" is sufficient for screen readers -- no additional `role="alert"` on the inline indicator. The "Refresh" button has `aria-label="Refresh product recommendation"`.

### Full Analysis View

- **Analysis container**: `<section aria-label="Full product analysis">`. Receives focus when expanded (`tabIndex={-1}` with `ref.focus()`) so screen reader users know new content has appeared.
- **Collapsible triggers**: Standard Radix `Collapsible` accessibility -- `aria-expanded`, `aria-controls`, Enter/Space to toggle. Already handled by shadcn.
- **Pick card links**: "View product" buttons have `aria-label="View {product name} details"`.
- **Transition**: The `AnimatePresence` height animation does not trap focus. Focus moves into the expanded content after animation completes.

### Chat Panel

- **Panel landmark**: `<aside aria-label="Ask about this list">`. Using `<aside>` because the chat is supplementary to the main list content.
- **Focus trap**: When the chat panel opens, focus moves to the input field. When closed, focus returns to the "Ask a question" trigger button. Uses `focus-trap-react` or equivalent to keep Tab within the panel while open.
- **Close button**: `aria-label="Close question panel"`. Keyboard: Escape closes the panel (same behavior as clicking close).
- **Message area**: `role="log" aria-live="polite"` on the message container. New messages are announced by screen readers without interrupting current speech.
- **User messages**: No special role needed. The "you" label provides attribution.
- **Response messages**: No special role. The `aria-live="polite"` on the parent ensures new responses are announced.
- **Typing indicator**: `aria-label="Generating response" role="status"` while visible. Screen readers announce "Generating response" once, then announce the response text when it appears.
- **Input**: Standard `<input>` or `<textarea>` with `aria-label="Ask a question about the products in this list"`. The placeholder text "Ask a question..." is not relied upon for accessibility -- the `aria-label` provides the accessible name.
- **Mobile sheet**: Same semantics as desktop panel. The full-screen overlay uses `aria-modal="true"` to indicate it captures focus. Background content is marked `aria-hidden="true"` while the sheet is open.

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| **Tab** | Banner | Cycles through pick name buttons, "Full analysis", "Ask a question" |
| **Enter / Space** | Pick name button | Scrolls to and highlights the product in the grid |
| **Enter / Space** | "Full analysis" | Toggles analysis expansion |
| **Enter / Space** | "Ask a question" | Opens chat panel, focuses input |
| **Escape** | Chat panel open | Closes chat panel, returns focus to trigger |
| **Enter** | Chat input focused | Submits the current message |
| **Shift + Enter** | Chat input focused | Inserts a newline (if using textarea) |
| **Tab** | Chat panel | Cycles through close button, message area, input |

### Color Independence

No information is conveyed through color alone in any of the three components:
- Pick names are identified by text content ("Top pick", "Best value"), not color coding.
- The stale state uses the word "(outdated)" + a "Refresh" link, not a color change.
- User vs response messages are differentiated by font weight and labels, not background colors.
- The product highlight pulse uses `ring-2` which is visible in both color and outline form, and the scroll-to behavior provides a non-visual cue.

---

## 9. Component Architecture

### New Components

```
components/ai/
  verdict-banner.tsx              # Persistent banner between header and URL input
  verdict-banner-cta.tsx          # No-opinion CTA row (replaces current below-grid CTA)
  full-analysis-view.tsx          # Expandable analysis card (reuses pick cards + collapsibles from 06g)
  chat-panel.tsx                  # Floating chat panel (desktop + mobile)
  chat-message.tsx                # Individual message (user or response)
  chat-input.tsx                  # Text input with submit handling
```

### Data Flow

```
list-detail-content.tsx
  |
  +-- VerdictBanner (or VerdictBannerCta if no opinion)
  |     |
  |     +-- Manages analysisOpen + chatOpen state
  |     +-- Pick name click -> scrolls to product + highlights
  |     +-- "Full analysis" -> toggles FullAnalysisView
  |     +-- "Ask a question" -> toggles ChatPanel
  |
  +-- FullAnalysisView (conditionally rendered, inline)
  |     |
  |     +-- ExpertOpinionVerdict (from 06g, reused)
  |     +-- ExpertOpinionPickCard x2 (from 06g, reused)
  |     +-- ExpertOpinionDetails (from 06g, reused - collapsibles)
  |
  +-- ChatPanel (conditionally rendered, floating/fixed)
  |     |
  |     +-- ChatMessage x N
  |     +-- ChatInput
  |
  +-- AddProductForm
  +-- ListFilters
  +-- ProductGrid
  +-- ProductDetailPanel
```

### State Management

The verdict banner, analysis view, and chat panel share state managed in `list-detail-content.tsx`:

```typescript
const [analysisOpen, setAnalysisOpen] = useState(false)
const [chatOpen, setChatOpen] = useState(false)
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null)
```

- `analysisOpen` and `chatOpen` are independent -- both can be true simultaneously (analysis expanded + chat panel visible).
- `chatMessages` persists for the session but is not saved to database (chat is ephemeral by design for v1).
- `highlightedProductId` is set when a pick name is clicked and cleared after 1.5s timeout.

---

## 10. What Changes From 06g

| Aspect | 06g (Current Plan) | This Spec (06h) |
|--------|---------------------|------------------|
| **Opinion position** | Inline below grid | Verdict banner between header and URL input (always visible) + expandable analysis |
| **Primary surface** | Verdict quote + pick cards below grid | One-line banner summarizing picks + verdict. Full content available via "Full analysis" |
| **Chat capability** | None | Floating chat panel for follow-up questions |
| **CTA position** | Centered below grid with heading + subtext | Single-line row between header and URL input with inline text + outline button |
| **Pick name interaction** | "View product" link inside pick card | Clickable pick names in banner that scroll to + highlight the product in the grid |
| **Stale indication** | Separate banner replacing attribution line | Inline "(outdated)" text + "Refresh" link in the verdict line |
| **Reused components** | -- | Pick cards, verdict quote, collapsible sections from 06g are reused inside the full analysis view |
| **Mobile chat** | -- | Full-screen bottom sheet |

Components from 06g that are **reused unchanged** in the full analysis view:
- `expert-opinion-verdict.tsx` (verdict quote block)
- `expert-opinion-pick-card.tsx` (pick cards with thumbnail, price, rating, reason)
- `expert-opinion-details.tsx` (collapsible comparison + concerns)
- `expert-opinion-skeleton.tsx` (loading skeleton)

Components from 06g that are **replaced**:
- `expert-opinion-cta.tsx` -> replaced by `verdict-banner-cta.tsx` (inline CTA row instead of centered block)
- `expert-opinion-stale-banner.tsx` -> replaced by inline stale indicator in the verdict banner

---

## 11. References

**Persistent Summary Bars and Notification Patterns:**
- [Linear -- How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) -- notification bars as thin, text-only strips without icons or colored backgrounds. Inspiration for the verdict banner's visual treatment.
- [Linear -- A Calmer Interface](https://linear.app/now/behind-the-latest-design-refresh) -- "Be gentle." Reduce visual noise. The banner should inform, not demand attention.
- [Google Search Featured Snippets](https://developers.google.com/search/docs/appearance/featured-snippets) -- structured answer extracted from content, shown at the top, no "AI generated" branding. The verdict banner follows this exact pattern: answer first, source details on demand.

**Inline Expansion and Progressive Disclosure:**
- [NN/g -- Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) -- show only what is needed, reveal complexity on request. The banner-to-analysis expansion is textbook progressive disclosure.
- [NN/g -- Accordions on Desktop](https://www.nngroup.com/articles/accordions-complex-content/) -- inline expansion is preferred over navigation when the expanded content is short and contextually tied to the trigger.
- [Apple HIG -- Disclosure Controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls) -- progressive disclosure patterns in native apps.

**Chat Panel and Conversational UI:**
- [NN/g -- Chat for Customer Support](https://www.nngroup.com/articles/chat-ux/) -- chat panels work best when contextual (about the current page), clearly scoped, and non-intrusive. The "Ask about this list" framing follows this guidance.
- [Notion AI Inline Integration](https://www.notion.so/product/ai) -- Notion embeds AI responses inline without chat bubbles, avatars, or "AI says" labels. Responses are styled as regular text content. Inspiration for the chat message styling.
- [Linear -- Contextual Actions](https://linear.app/method/build-what-matters) -- actions appear where they are relevant, not in a global toolbar. The chat trigger lives in the verdict banner because that is where questions arise.

**AI Feature Design (Non-Branded):**
- [Apple Intelligence Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/machine-learning) -- AI features should feel like natural extensions of the app, not separate modes.
- [NN/g -- AI Sparkles Icon Problem](https://www.nngroup.com/articles/ai-sparkles-icon-problem/) -- avoid sparkle icons; they are not universally understood and create a "this is AI" signal that can reduce trust.
- [NN/g -- AI Feature Transparency](https://www.nngroup.com/articles/ai-generated-content/) -- attribute AI content subtly; over-branding reduces perceived reliability.
- [Google -- Material Design AI Patterns](https://m3.material.io/) -- AI-generated content uses the same visual language as human-created content, differentiated by attribution text, not visual treatment.

**Card and Panel Design:**
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) -- Card component API and styling reference.
- [shadcn/ui Collapsible](https://ui.shadcn.com/docs/components/collapsible) -- Collapsible component for the analysis sections.
- [Radix -- Dialog / Focus Trap](https://www.radix-ui.com/primitives/docs/components/dialog) -- focus management patterns for the chat panel.
- [Mobbin -- Floating Chat Panels](https://mobbin.com/patterns/floating-chat) -- real-world examples of minimal floating chat widgets from production apps.

**Responsive and Mobile Patterns:**
- [Apple HIG -- Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) -- full-screen sheets on iPhone, modal on iPad. The chat panel follows this convention.
- [NN/g -- Mobile UX](https://www.nngroup.com/articles/mobile-ux/) -- touch targets, thumb zones, and mobile-first content hierarchy.

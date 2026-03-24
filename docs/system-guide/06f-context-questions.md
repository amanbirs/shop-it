# ShopIt — Context Questions

Detailed design spec for the Context Questions feature — an AI-driven contextual preference collection system that improves product recommendations by asking users targeted questions about their purchase intent.

> **Note:** This feature lives on the List Detail page (`/lists/[id]`) as a floating popup component, and in List Settings as an editable preferences section. See [06a-page-list-detail.md](./06a-page-list-detail.md) for the parent page spec.

---

## Overview

After product extraction completes, ShopIt quietly analyzes the products in a list and generates 1-3 contextual questions using Gemini. These questions surface patterns the AI detects in the product data — price variance, category-specific specs, use case ambiguity — and ask the user to clarify their preferences.

The feature serves two purposes:

1. **Better AI output** — answers feed directly into Expert Opinion prompts and future extraction enrichment. Instead of generic "best TV" recommendations, the AI knows "best TV for a bright living room where gaming matters more than movies."
2. **Passive preference building** — over time, answered questions build a rich preference profile per list. This data supplements `profiles.context` (global user context) with list-specific decision criteria that the user never had to think about upfront.

The design philosophy is **non-intrusive assistance**. Questions appear as a small card in the corner — not a modal, not a blocking step. The user can answer, dismiss, or ignore entirely. The feature should feel like a thoughtful colleague leaning over and asking "by the way, does it matter if this is wall-mountable?" — not a survey form demanding attention.

**Trigger conditions:**
- At least 2 products in the list have `extraction_status = 'completed'`
- No pending (unanswered, non-dismissed) questions already exist for this list
- The list has been active for at least 30 seconds in the current session (prevent flash on page load)
- Questions are generated server-side via a background Server Action after extraction completes

---

## Layout — Question Popup (Desktop)

The popup anchors to the bottom-right corner of the content area (not the viewport — it respects the sidebar). It floats above page content with a subtle shadow and does not overlap the URL input bar or filter tabs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                                  │
│  │ side │  The Great TV Showdown             [⊞] [≡]  [Get AI Opinion]    │
│  │ bar  │  ...                                                             │
│  │      │  ┌──────────────────────────────────────────────────────────┐    │
│  │      │  │  Paste a product URL...                          [Add]  │    │
│  │      │  └──────────────────────────────────────────────────────────┘    │
│  │      │                                                                  │
│  │      │  [All (6)] [Shortlisted (2)] [Purchased (0)]                    │
│  │      │                                                                  │
│  │      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │      │  │  product 1   │ │  product 2   │ │  product 3   │            │
│  │      │  └──────────────┘ └──────────────┘ └──────────────┘            │
│  │      │                                                                  │
│  │      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │      │  │  product 4   │ │  product 5   │ │  product 6   │            │
│  │      │  └──────────────┘ └──────────────┘ └──────────────┘            │
│  │      │                                                                  │
│  │      │                          ┌──────────────────────────────────┐    │
│  │      │                          │  ✨ Quick question          [✕]  │    │
│  │      │                          │                                  │    │
│  │      │                          │  How important is picture        │    │
│  │      │                          │  quality vs price for you?       │    │
│  │      │                          │                                  │    │
│  │      │                          │  ┌────────────────────────────┐  │    │
│  │      │                          │  │ Type your answer...        │  │    │
│  │      │                          │  └────────────────────────────┘  │    │
│  │      │                          │                                  │    │
│  │      │                          │  [Submit]     2 more questions   │    │
│  │      │                          │                                  │    │
│  │      │                          └──────────────────────────────────┘    │
│  │      │                                                                  │
│  └──────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Popup card detail:**

```
┌──────────────────────────────────────┐
│  ✨ Quick question              [✕]  │  ← header: sparkle icon + label + dismiss
│  ──────────────────────────────────  │
│                                      │
│  Will this TV be used primarily      │  ← question text
│  for gaming or movies?               │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Mostly gaming, but we watch  │    │  ← text input (auto-grows up to 3 lines)
│  │ movies on weekends too       │    │
│  └──────────────────────────────┘    │
│                                      │
│  [Submit]          2 more questions  │  ← submit button + queue indicator
│                                      │
└──────────────────────────────────────┘
```

**After answering (auto-advance transition):**

```
Step 1: Answer submitted         Step 2: Next question slides in
┌────────────────────────────┐   ┌────────────────────────────┐
│  ✨ Quick question    [✕]  │   │  ✨ Quick question    [✕]  │
│  ──────────────────────── │   │  ──────────────────────── │
│                            │   │                            │
│  ✓ Got it, thanks!         │   │  How sensitive are you     │
│                            │   │  to price differences in   │
│  ───── (auto-advance 800ms)│   │  the 70K-90K range?        │
│                            │   │                            │
│                            │   │  ┌──────────────────────┐  │
│                            │   │  │ Type your answer...   │  │
│                            │   │  └──────────────────────┘  │
│                            │   │                            │
│         1 more question    │   │  [Submit]  1 more question │
└────────────────────────────┘   └────────────────────────────┘
```

**All questions complete:**

```
┌────────────────────────────┐
│  ✨ All done!               │
│                            │
│  Your answers will improve │
│  AI recommendations for    │
│  this list.                │
│                            │
│  ── auto-dismiss in 3s ── │
└────────────────────────────┘
```

---

## Layout — Preferences Section (List Settings)

The preferences card lives inside the List Settings sheet or page, below budget/priorities and above the danger zone (archive/delete). It shows all context questions for this list — answered, dismissed, and any that are still pending.

```
┌─────────────────────────────────────────────────────────────────┐
│  List Settings                                             [✕] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ... (name, description, budget, priorities, members) ...       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ✨ Your Preferences                                            │
│  AI-generated questions to refine recommendations               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  How important is picture quality vs price?              │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Picture quality is the top priority. We'd       │    │   │
│  │  │ rather spend more for better OLED.          [✎] │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  Answered Mar 20                              [🗑]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Will this TV be used primarily for gaming or movies?    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Mostly gaming — low input lag matters.      [✎] │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  Answered Mar 20                              [🗑]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Dismissed ──                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  How large is the room where you'll place the TV?       │   │
│  │  (Dismissed)                          [Answer this]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ... (danger zone: archive list, delete list) ...               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Inline edit state (triggered by pencil icon):**

```
┌─────────────────────────────────────────────────────────────┐
│  How important is picture quality vs price?                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Picture quality is the top priority. We'd           │    │
│  │ rather spend more for better OLED.                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Save]  [Cancel]                                [🗑]      │
└─────────────────────────────────────────────────────────────┘
```

**Un-dismiss state (triggered by "Answer this"):**

```
┌─────────────────────────────────────────────────────────────┐
│  How large is the room where you'll place the TV?           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type your answer...                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Submit]  [Dismiss again]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile

On mobile, the popup transforms into a compact bottom bar that sits above the bottom tab navigation. It expands into a bottom sheet when tapped.

**Collapsed state (bottom bar):**

```
┌─────────────────────────────────┐
│                                 │
│    ... page content ...         │
│                                 │
│  ┌─────────────────────────────┐│
│  │ ✨ Quick question (3)    ▲  ││  ← tappable bar, tap to expand
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │  🏠    📋    ⊕    🔔    ⚙  ││  ← bottom tab bar
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Expanded state (bottom sheet at ~40vh):**

```
┌─────────────────────────────────┐
│                                 │
│    ... page content (dimmed) ...│
│                                 │
│  ╭─────────────────────────────╮│
│  │         ── handle ──        ││
│  │                             ││
│  │  ✨ Quick question     [✕]  ││
│  │  ──────────────────────── ││
│  │                             ││
│  │  How important is picture   ││
│  │  quality vs price?          ││
│  │                             ││
│  │  ┌───────────────────────┐  ││
│  │  │ Type your answer...   │  ││
│  │  └───────────────────────┘  ││
│  │                             ││
│  │  [Submit]  2 more questions ││
│  │                             ││
│  ╰─────────────────────────────╯│
│  ┌─────────────────────────────┐│
│  │  🏠    📋    ⊕    🔔    ⚙  ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

The bottom sheet is swipeable — drag down to collapse back to the bar, drag up to expand. Swipe away (drag fully down past threshold) dismisses the current question.

---

## Design Decisions

### Decision 1: Popup vs Toast vs Inline Banner

**Chosen: Floating popup card (bottom-right on desktop, bottom bar on mobile)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Floating popup card (Chosen)** | Non-blocking. User can ignore it entirely. Positioned out of the main workflow path (bottom-right corner). Familiar pattern from chat widgets and notification cards. Can persist across scroll without covering content. | Requires careful z-index management. Could be mistaken for a chat widget or ad. Needs distinct visual treatment to feel like part of the app. |
| **B. Toast notification with action** | Familiar pattern (Sonner). Auto-dismisses. Minimal screen real estate. | Too transient for a question that needs a typed answer. Toasts are for confirmations, not input collection. Small text input in a toast feels cramped. Users would need to notice and act quickly. |
| **C. Inline banner at top of product grid** | Impossible to miss. In the natural reading flow. | Pushes products down. Feels like a cookie banner. Intrusive for a feature that should be optional. Hard to dismiss without it feeling like you lost something. |
| **D. Modal dialog** | Full attention. Guaranteed visibility. | Blocks the entire workflow. Contradicts the non-intrusive design principle. Feels like a survey popup on a news site. Users develop modal fatigue. |
| **E. Collapsible sidebar section** | Persistent. Always accessible. | Only visible when sidebar is open. Competes with list navigation. Desktop-only pattern. |

The floating popup is the right pattern for optional, contextual prompts. It follows the same model as Intercom's product tours and Linear's changelog popover — present in the corner, easy to engage with, easy to ignore. The key difference from a chat widget is the `--ai-accent` color treatment and the sparkle icon, which signal "this is ShopIt's AI assistant, not customer support."

Research supports this: NN/g's work on [non-modal inline notifications](https://www.nngroup.com/articles/modal-nonmodal-dialog/) shows that non-modal prompts have higher completion rates than modals for non-critical tasks because they don't trigger the "close this immediately" reflex. Appcues' analysis of [in-app survey patterns](https://www.appcues.com/blog/in-app-surveys) found that bottom-anchored slideup prompts achieve 15-25% response rates compared to 5-10% for modal surveys.

### Decision 2: One Question at a Time vs All Questions at Once

**Chosen: One question at a time with queue indicator**

| Option | Pros | Cons |
|--------|------|------|
| **A. One at a time with queue indicator (Chosen)** | Low cognitive load — user focuses on one question. Fast to answer (no scrolling). The queue count ("2 more questions") sets expectations without overwhelming. Auto-advance creates a smooth flow for users who engage. | Takes longer to complete all questions if the user is willing to batch. Multiple popup appearances could feel nagging (mitigated by the auto-advance for engaged users). |
| **B. All questions in a scrollable list** | User sees the full scope upfront. Can answer in any order. One dismissal for the whole set. | Looks like a survey form. Higher cognitive load. Longer popup = more screen real estate. Users tend to abandon multi-question forms (form length inversely correlates with completion per Baymard research). |
| **C. Carousel / horizontal swipe** | Compact. Swipeable feels modern on mobile. | Discoverability issue — users may not realize there are more questions. Carousel patterns have poor completion rates for form-like content. |

One-at-a-time is the established pattern for contextual micro-surveys. Typeform proved that single-question-per-screen increases completion rates by 3.6x compared to traditional forms. The "2 more questions" indicator provides transparency without pressure. If the user dismisses one question, the next appears after a brief delay (not immediately, to avoid feeling relentless).

### Decision 3: Input Type — Free Text vs Structured Options

**Chosen: Free text input (single text field per question)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Free text (Chosen)** | Maximum flexibility — user can express nuance ("mostly gaming but we watch movies on weekends too"). AI can interpret natural language answers. No need to predict all possible options. Feels conversational, not clinical. | Requires more effort than tapping a button. Answers may be vague or unhelpful. AI must parse unstructured input. |
| **B. Multiple choice (predefined options)** | Fast to answer (one tap). Structured data, easy to process. | LLM would need to generate good options, which is hard for subjective questions. Forces binary thinking ("gaming OR movies" when the real answer is "both"). Feels like a quiz. |
| **C. Scale/slider (1-5 or low-high)** | Quantifiable. Extremely fast. | Loses all nuance. "How important is picture quality?" on a 1-5 scale tells the AI almost nothing useful compared to "Picture quality is top priority, we're coming from a 10-year-old LCD." |
| **D. Mixed (AI decides per question)** | Best of all worlds — simple questions get buttons, nuanced questions get text. | Complex to implement. Inconsistent UX within the same feature. AI must make good format decisions. |

Free text wins because the entire point of this feature is feeding rich context into LLM prompts. A scale of "4 out of 5" for price sensitivity is nearly useless. "We can stretch to 90K for a significant quality jump, but 70K is our sweet spot" is gold. The conversational tone of the popup encourages natural-language answers. The AI generating the questions is also generating prompts that expect natural-language responses.

### Decision 4: Dismissed Questions — Gone Forever vs Recoverable

**Chosen: Recoverable in List Settings, with "Answer this" option**

| Option | Pros | Cons |
|--------|------|------|
| **A. Recoverable in Settings (Chosen)** | No anxiety about dismissing — user knows they can come back. Settings page becomes a complete view of all AI questions for this list. Supports the "answer later" use case (e.g., user needs to check room measurements first). | Slightly more complex data model (need a `dismissed` status, not hard delete). Settings page has more content. |
| **B. Gone forever** | Simplest implementation. Clean data model. | Users may accidentally dismiss a question they meant to answer. Creates anxiety about the dismiss action. No way to build the preference profile later. |
| **C. Re-asked after N days** | Automatic recovery. No settings page needed. | Feels nagging. User already said "no" and the app is ignoring that. Bad pattern for trust. |

Recoverable dismissed questions follow the same soft-delete philosophy as the rest of ShopIt (lists use `archived_at`, not hard delete). The Settings page already exists for list configuration — adding a "Your Preferences" section is natural and gives users a complete view of how the AI understands their needs.

### Decision 5: Trigger Timing — Immediate vs Delayed vs On-Demand

**Chosen: Delayed appearance (30s after page load, only after 2+ products extracted)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Delayed appearance (Chosen)** | User has time to orient on the page before being prompted. Feels natural — the AI "thought about it" before asking. Prevents flash-of-popup on every page visit. The 30s delay ensures the user is actually engaging with the list, not just passing through. | Questions won't reach users who visit briefly. But brief visitors aren't the target — users actively comparing products are. |
| **B. Immediately after extraction** | Fastest path to getting answers. Questions are fresh when the product context is top of mind. | Feels aggressive. User just added a product and is likely still in "adding mode." Interrupts the flow. |
| **C. On-demand only (button in header)** | Zero interruption. User chooses when to engage. Most respectful. | Very low discoverability. Most users would never find or use it. Defeats the purpose of contextual prompting. |
| **D. On next page visit** | User has had time away. Fresh eyes. | Disconnect between product analysis and question timing. Questions feel random rather than contextual. |

The 30-second delay is borrowed from Intercom's tooltip patterns, where delayed triggers consistently outperform immediate triggers in engagement rate. The questions are generated server-side after extraction completes, but the popup only appears client-side after the delay threshold. If the user navigates away and comes back, the delay resets — the popup only shows when the user has been on the page continuously for 30 seconds.

---

## Data Model

### New table: `context_questions`

```sql
create table public.context_questions (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null references public.lists(id) on delete cascade,
  question        text not null,                        -- AI-generated question text
  answer          text,                                  -- user's answer (null = unanswered)
  status          text not null default 'pending'
                    check (status in ('pending', 'answered', 'dismissed')),
  triggered_by    uuid references public.products(id)   -- product that triggered the question
                    on delete set null,                  -- keep question even if product is removed
  generated_by    text default 'gemini-flash',          -- model that generated the question
  answered_at     timestamptz,                           -- when the user answered
  dismissed_at    timestamptz,                           -- when the user dismissed
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index for fetching questions per list (the primary query pattern)
create index idx_context_questions_list_id on public.context_questions(list_id);

-- Index for checking pending questions (used by the trigger condition)
create index idx_context_questions_list_status on public.context_questions(list_id, status);
```

**RLS policies:**

```sql
-- Users can read questions for lists they're a member of
create policy "Members can view context questions"
  on public.context_questions for select
  using (
    list_id in (
      select list_id from public.list_members
      where user_id = auth.uid()
    )
  );

-- Editors and owners can answer/dismiss questions
create policy "Editors can update context questions"
  on public.context_questions for update
  using (
    list_id in (
      select list_id from public.list_members
      where user_id = auth.uid()
      and role in ('owner', 'editor')
    )
  );

-- Only the system (service role) inserts questions — not individual users
-- Questions are generated by the Server Action using the service role client
```

**Why these decisions:**

- **`triggered_by` with `on delete set null`** — if a product is removed from the list, the question it inspired is still valuable. "How sensitive are you to price?" is relevant regardless of whether the specific product that had outlier pricing is still in the list.
- **`status` enum over boolean flags** — three states are mutually exclusive. A question can't be both answered and dismissed. An enum makes this constraint explicit. `pending` is the initial state when the AI generates the question.
- **Separate `answered_at` / `dismissed_at` timestamps** — useful for the Settings page ("Answered Mar 20") and for analytics (how quickly do users respond? do they come back to dismissed questions?).
- **`generated_by`** — future-proofing. If we switch from Gemini Flash to a different model or tune question generation, this tracks provenance.
- **No `user_id` on the answer** — questions belong to the list, not individual users. In a family collaboration context, any editor can answer. The question "Will this be used outdoors?" applies to the family's use case, not one person's opinion. If we later need per-user answers, we'd add a separate `context_answers` join table.

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Popup container** | Custom `<ContextQuestionPopup>` | Desktop: `position: fixed`, `bottom: 24px`, `right: 24px` (offset from sidebar). `w-[360px]`. `bg-card rounded-xl border border-border shadow-lg`. `z-50` (above page content, below dialogs). Mobile: replaced with bottom bar + sheet. Uses `<AnimatePresence>` for enter/exit. |
| 2 | **Popup header** | Flex row | Sparkle icon (`✨` or `<Sparkles>` from Lucide in `text-ai-accent`) + "Quick question" in `text-sm font-medium` + dismiss button at right end. `px-4 pt-4 pb-2`. |
| 3 | **Dismiss button (X)** | `<Button variant="ghost" size="icon">` | `<X>` icon, `h-7 w-7`, `text-muted-foreground hover:text-foreground`. Dismisses the current question (sets `status = 'dismissed'`). If more questions are queued, the next one slides in after a 1.5s delay. `aria-label="Dismiss this question"`. |
| 4 | **Separator** | `<Separator>` | `mx-4`, subtle line between header and question content. |
| 5 | **Question text** | `<p>` | `text-sm text-foreground leading-relaxed`. `px-4 py-3`. Rendered from `context_questions.question`. Max 2-3 sentences — the Server Action enforces question length limits. |
| 6 | **Answer input** | shadcn `<Textarea>` | `placeholder="Type your answer..."`. `rows={1}` with auto-grow up to `max-rows={3}`. `mx-4`. `text-sm`. `resize-none`. Focus ring uses `--ai-accent` color instead of default `--ring` to maintain the AI-feature visual language. |
| 7 | **Submit button** | shadcn `<Button size="sm">` | "Submit" text. `ml-4 mb-4`. Disabled when input is empty. Loading state: `<Loader2 className="animate-spin h-3 w-3">` + "Saving...". Success state: brief checkmark flash (200ms). |
| 8 | **Queue indicator** | `<span>` | "2 more questions" or "1 more question" in `text-xs text-muted-foreground`. Right-aligned, same row as submit button. `mr-4 mb-4`. Hidden when this is the last question. |
| 9 | **Success state** | Inline replacement | Question text area replaced with `✓ Got it, thanks!` in `text-sm text-muted-foreground` with a subtle check icon in `text-green-500`. Visible for 800ms before auto-advancing to the next question. |
| 10 | **Completion state** | Inline replacement | Entire popup content replaced with: sparkle + "All done!" in `text-sm font-medium` + "Your answers will improve AI recommendations for this list." in `text-xs text-muted-foreground`. Auto-dismisses after 3 seconds. |
| 11 | **Mobile collapsed bar** | Custom `<ContextQuestionBar>` | `position: fixed`, `bottom: env(safe-area-inset-bottom) + 56px` (above bottom tabs). `w-full`. `bg-card border-t border-border`. Flex row: sparkle + "Quick question" + badge count + chevron up. Tappable — opens the bottom sheet. `h-11`. |
| 12 | **Mobile bottom sheet** | shadcn `<Sheet side="bottom">` | `max-h-[40vh]` with drag handle. Same content as desktop popup. Drag-to-dismiss swipe gesture. `rounded-t-2xl`. |
| 13 | **Settings: Preferences card** | `<Card>` | Section header: sparkle + "Your Preferences" in `text-base font-semibold` + "AI-generated questions to refine recommendations" in `text-sm text-muted-foreground`. Inside the List Settings sheet, after priorities section. |
| 14 | **Settings: Answered question row** | Flex column inside `<Card>` | Question text in `text-sm font-medium`. Answer in `text-sm text-muted-foreground` inside a `bg-muted/30 rounded-md px-3 py-2` block. Pencil edit icon at right of answer. "Answered {date}" in `text-xs text-muted-foreground`. Delete button (`<Trash2>` icon, `text-muted-foreground hover:text-destructive`). Each row separated by `<Separator>`. |
| 15 | **Settings: Inline edit** | `<Textarea>` + buttons | Answer text becomes editable `<Textarea>`. Below: `<Button size="sm">Save</Button>` + `<Button variant="ghost" size="sm">Cancel</Button>`. Save calls `updateContextQuestion` Server Action. |
| 16 | **Settings: Dismissed section** | Collapsible group | "Dismissed" label in `text-xs text-muted-foreground uppercase tracking-wide` with a separator line. Each dismissed question shows question text + "(Dismissed)" badge in `text-xs bg-muted text-muted-foreground rounded-full px-2` + "Answer this" link in `text-xs text-ai-accent hover:underline`. |
| 17 | **Settings: Un-dismiss state** | Inline form | Dismissed question expands to show a `<Textarea>` + Submit/Dismiss-again buttons. Submit changes status from `dismissed` to `answered`. |
| 18 | **Settings: Delete confirmation** | Sonner toast or inline | No `AlertDialog` needed — deleting a preference answer is low stakes. Clicking delete removes the row with an undo toast: "Answer deleted. [Undo]" (5s window). The Server Action soft-deletes by setting `status = 'dismissed'` and clearing the answer, rather than hard deleting the row. |
| 19 | **Empty state (no questions yet)** | Inline in Settings card | "No questions yet. AI will generate questions as you add more products to this list." in `text-sm text-muted-foreground`. Centered with a subtle `<Sparkles>` icon above. |

---

## Animation Spec

### Popup Enter (Desktop)

```
Timeline (triggered 30s after page load, if pending questions exist):
─────────────────────────────────────────────────────
  0ms     Popup slides up from below viewport edge:
          y: 20→0, opacity: 0→1
          spring(1, 80, 12) — slightly bouncy, not rubbery
  300ms   Complete. Input is NOT auto-focused (non-intrusive).
          User must click into the input to start typing.
─────────────────────────────────────────────────────
  Easing: spring-based via Framer Motion
  Duration: ~300ms perceived
```

### Popup Exit (Dismiss or Completion)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Popup slides down and fades:
          y: 0→12, opacity: 1→0
  200ms   Complete. Element unmounted.
─────────────────────────────────────────────────────
  Easing: ease-in [0.4, 0, 1, 1]
```

### Question Transition (After Answer Submitted)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Submit button → spinner (instant)
  ~200ms  Server Action completes
  200ms   Input and question text crossfade to success state:
          "✓ Got it, thanks!" — opacity 0→1 (150ms)
          Check icon draws on (strokeDashoffset, 200ms)
  800ms   Success state fades out: opacity 1→0 (150ms)
  950ms   Next question content slides in from right:
          x: 16→0, opacity: 0→1 (250ms, ease-out)
          Queue indicator count decrements
  1200ms  Transition complete. Input area ready.
─────────────────────────────────────────────────────
```

### Question Transition (After Dismiss)

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Current question content fades out:
          opacity: 1→0 (150ms)
  150ms   Brief pause (no content visible in card)
  1500ms  Next question slides in from right:
          x: 16→0, opacity: 0→1 (250ms, ease-out)
          Queue indicator count decrements
─────────────────────────────────────────────────────
```

The 1.5-second delay between dismiss and next question prevents the feature from feeling relentless. If the user just said "I don't want this," showing another question immediately would feel pushy.

### All-Done Completion

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Last answer success state shows (same as above)
  800ms   Content transitions to completion state:
          Sparkle icon scales in: scale 0→1 (200ms, spring)
          "All done!" text: opacity 0→1 (200ms)
          Helper text: opacity 0→1 (200ms, +100ms delay)
  3000ms  Auto-dismiss begins (same as Popup Exit)
  3200ms  Popup fully removed
─────────────────────────────────────────────────────
```

### Mobile Bottom Bar Enter

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Bar slides up from bottom edge:
          y: 100%→0%, opacity: 0→1
          spring(1, 70, 14) — same spring as other bottom sheets
  350ms   Complete
─────────────────────────────────────────────────────
```

### Mobile Sheet Expand/Collapse

```
Expand (tap bar):
  0ms     Bar transforms into sheet bottom edge
          Sheet content: height 44px→40vh
          spring(1, 70, 14)
  350ms   Complete. Backdrop dims (opacity 0→0.3)

Collapse (drag down or tap backdrop):
  0ms     Sheet shrinks: height 40vh→44px
          spring(1, 70, 14)
  350ms   Back to collapsed bar state. Backdrop clears.
```

### Settings: Inline Edit Open

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Answer text becomes editable (border appears)
          Save/Cancel buttons slide in below:
          y: -4→0, opacity: 0→1 (150ms, ease-out)
  150ms   Complete. Textarea auto-focuses with cursor at end.
─────────────────────────────────────────────────────
```

### Settings: Answer Deleted

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Row fades out: opacity 1→0, height collapses
          (200ms, ease-in)
  200ms   Row removed from DOM, remaining rows shift up
          (layout animation via Framer Motion)
  200ms   Undo toast appears via Sonner
─────────────────────────────────────────────────────
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Popup background | `bg-card` (white) | `bg-card` (#111 range) |
| Popup border | `border-border` (zinc-200) | `border-border` (zinc-800) |
| Popup shadow | `shadow-lg` | `shadow-lg shadow-black/40` |
| Sparkle icon | `text-ai-accent` | `text-ai-accent` (slightly desaturated in dark theme per token definition) |
| "Quick question" header text | `text-foreground` with `font-medium` | `text-foreground` |
| Question text | `text-foreground` | `text-foreground` |
| Answer input background | `bg-background` | `bg-muted/30` |
| Answer input border | `border-input` (zinc-300) | `border-input` (zinc-700) |
| Answer input focus ring | `ring-ai-accent/50` | `ring-ai-accent/40` |
| Submit button | `bg-primary text-primary-foreground` | `bg-primary text-primary-foreground` |
| Queue indicator text | `text-muted-foreground` | `text-muted-foreground` |
| Success check icon | `text-green-600` | `text-green-500` |
| "Got it, thanks!" text | `text-muted-foreground` | `text-muted-foreground` |
| Completion sparkle | `text-ai-accent` | `text-ai-accent` |
| Mobile bar background | `bg-card border-t border-border` | `bg-card border-t border-border` |
| Mobile sheet backdrop | `bg-black/30` | `bg-black/40` |
| Settings: Answer block bg | `bg-muted/30` | `bg-muted/20` |
| Settings: Edit pencil icon | `text-muted-foreground` | `text-muted-foreground` |
| Settings: "Dismissed" label | `text-muted-foreground` | `text-muted-foreground` |
| Settings: "Answer this" link | `text-ai-accent` | `text-ai-accent` |
| Settings: Delete button hover | `hover:text-destructive hover:bg-destructive/10` | `hover:text-destructive hover:bg-destructive/10` |
| Undo toast | Sonner default theming | Sonner default theming |

All colors use semantic tokens. No raw hex values in component code. The `--ai-accent` token is the dominant color signal for this feature — it consistently marks AI-generated content across the app (same as AI verdicts, AI suggestions, and the sparkle on hype titles).

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Popup replaced with a bottom bar above the tab navigation. Tapping the bar opens a bottom sheet at `~40vh`. Sheet has a drag handle for swipe-to-collapse and swipe-to-dismiss. Input gets `text-base` (16px) to prevent iOS auto-zoom. Submit button is full-width. Queue indicator sits below the submit button (stacked layout). In Settings, the preferences card is full-width with no horizontal padding reduction — questions and answers stack vertically as on desktop. "Answer this" links have `min-h-[44px]` tap targets. |
| Tablet (`640-1024px`) | Desktop popup at `w-[340px]`, positioned `bottom: 20px, right: 20px`. Same behavior as desktop. Touch targets ≥ 44px on submit button and dismiss. Settings preferences card has the same layout as desktop. |
| Desktop (`> 1024px`) | Popup at `w-[360px]`, positioned `bottom: 24px, right: 24px`. Input can be typed into directly. `Tab` moves between input and submit. `Enter` submits (when input is focused and non-empty). `Escape` dismisses the current question. Settings preferences section shows the pencil edit icon on hover only (visible always on touch devices). |

**Sidebar interaction:** On desktop, the popup's `right` offset accounts for whether the sidebar is expanded (240px) or collapsed (64px). The popup is positioned relative to the content area, not the viewport. Implementation: the popup reads sidebar state from layout context and adjusts its `right` value, or it uses `position: fixed` within a content-area wrapper that already accounts for the sidebar.

---

## Accessibility

- **Popup container** has `role="complementary"` and `aria-label="AI-generated preference question"`. It is NOT a dialog — it does not trap focus or require dismissal. The user can continue interacting with the page behind it.
- **Popup enter** does not steal focus. The page content remains the active focus context. The popup is announced via `aria-live="polite"` region: "AI has a question about your preferences."
- **Dismiss button** has `aria-label="Dismiss this question"`. Keyboard accessible via `Tab` navigation (the popup is in the tab order, but at the end — after all page content).
- **Question text** is rendered as a `<p>` with `id` used for `aria-describedby` on the input, so screen readers associate the question with the answer field.
- **Answer input** has `aria-label="Your answer"` and `aria-describedby` pointing to the question text element. Focus ring is visible and meets WCAG 2.1 AA contrast ratio (the `--ai-accent` ring at 50% opacity against `bg-card` passes 3:1 for non-text elements).
- **Submit button** — loading: `aria-busy="true"`, `aria-label="Saving your answer"`. Success: announced via `aria-live="polite"` ("Answer saved"). The auto-advance to the next question is also announced: "Next question: {question text}".
- **Queue indicator** — purely visual, does not need ARIA. The information is conveyed through the live region announcements on transition.
- **Completion state** — announced via `aria-live="polite"`: "All questions answered. Your preferences have been saved."
- **Mobile bottom bar** has `role="button"` and `aria-label="Open preference questions ({count} pending)"`. `aria-expanded` toggles with sheet state.
- **Mobile bottom sheet** uses Radix Sheet internally — `role="dialog"` when expanded, `aria-modal="false"` (non-blocking). Focus moves into the sheet on expand, returns to the bar on collapse.
- **Settings: Inline edit** — pencil button has `aria-label="Edit your answer to: {question text}"`. The textarea gets focus with `aria-label="Edit answer"`. Save/Cancel have standard button roles.
- **Settings: Delete** — delete button has `aria-label="Delete your answer to: {question text}"`. The undo toast is announced via Sonner's built-in `aria-live` support.
- **Settings: "Answer this"** link has `aria-label="Answer dismissed question: {question text}"`.
- **`prefers-reduced-motion`** — popup appears instantly (no slide animation, just opacity fade 0→1 in 150ms). Question transitions use crossfade only (no x/y movement). Success check appears instantly (no draw-on animation). Mobile sheet opens/closes without spring (linear 200ms height change). Completion auto-dismiss timer remains the same (timing is not animation).
- **Keyboard shortcuts** — `Escape` when the popup input is focused dismisses the current question. This does NOT close the entire popup on the first press — it dismisses the question. If no more questions, the popup closes. This is distinct from the page-level `Escape` behavior (which might close a product detail panel). The popup's `Escape` handler stops event propagation.
- **Color contrast** — all text meets WCAG AA (4.5:1 for body text, 3:1 for large text and UI components). The `--ai-accent` purple on `bg-card` white meets 4.5:1. In dark mode, the desaturated `--ai-accent` on `bg-card` dark also meets 4.5:1 (verified against the token values in the theming spec).

---

## Component File Structure

```
components/
  ai/
    context-question-popup.tsx    -- floating popup (desktop) with AnimatePresence
    context-question-bar.tsx      -- mobile collapsed bottom bar
    context-question-sheet.tsx    -- mobile expanded bottom sheet
    context-question-card.tsx     -- single question display (shared between popup/sheet)
    context-question-input.tsx    -- auto-growing textarea with AI-accent focus ring
  settings/
    preferences-section.tsx       -- settings page preferences card
    preference-row.tsx            -- single answered question with inline edit
    dismissed-question-row.tsx    -- dismissed question with "Answer this" action
```

**Server Actions (in `lib/actions/`):**

```
lib/
  actions/
    context-questions.ts          -- generateContextQuestions, answerQuestion,
                                     dismissQuestion, updateAnswer, deleteAnswer,
                                     getListQuestions
  validators/
    context-questions.ts          -- Zod schemas: AnswerQuestionInput,
                                     DismissQuestionInput, UpdateAnswerInput
  ai/
    question-prompts.ts           -- Gemini prompt templates for question generation
```

---

## References

- [NN/g -- Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) -- when non-modal patterns outperform modals for non-critical interactions
- [NN/g -- Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/) -- progressive disclosure patterns for contextual information
- [Appcues -- In-App Survey Design Best Practices](https://www.appcues.com/blog/in-app-surveys) -- bottom-anchored slideup prompts achieve higher response rates than modals
- [Appcues -- Microsurvey Examples](https://www.appcues.com/blog/microsurveys) -- single-question-at-a-time patterns in SaaS products
- [Typeform -- One Question at a Time](https://www.typeform.com/blog/human-experience/one-question-at-a-time/) -- research showing 3.6x completion rate improvement with single-question flows
- [Baymard -- Checkout Form Design (Progressive Disclosure)](https://baymard.com/blog/checkout-flow-average-form-fields) -- form length vs completion rate research
- [Intercom -- Product Tours Best Practices](https://www.intercom.com/blog/product-tours/) -- delayed trigger patterns and non-blocking UI prompts
- [Linear -- UI Design Patterns](https://linear.app/now/how-we-redesigned-the-linear-ui) -- floating panels, non-intrusive overlays, and spring animations
- [Material Design -- Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview) -- mobile bottom sheet patterns, drag gestures, and accessibility
- [Apple HIG -- Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) -- iOS sheet behavior and swipe interactions
- [shadcn/ui -- Sheet](https://ui.shadcn.com/docs/components/radix/sheet) -- the Sheet component used for mobile bottom sheet
- [shadcn/ui -- Card](https://ui.shadcn.com/docs/components/card) -- card container for the popup and settings section
- [shadcn/ui -- Textarea](https://ui.shadcn.com/docs/components/textarea) -- text input for answers
- [Framer Motion -- AnimatePresence](https://motion.dev/docs/react-animate-presence) -- popup enter/exit and question transition animations
- [Sonner](https://sonner.emilkowal.dev/) -- toast notifications for undo-delete pattern

---

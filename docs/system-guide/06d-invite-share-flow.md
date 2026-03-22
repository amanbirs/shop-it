# ShopIt — Invite & Share Flow

Detailed design spec for inviting members to a purchase list — the dialog that opens from the List Detail page header or List Settings sheet.

> **Note:** This is a dialog component, not a standalone page route. It opens over the List Detail page (`/lists/[id]`). See [06a-page-list-detail.md](./06a-page-list-detail.md) for the parent page spec.

---

## Overview

ShopIt is built for family collaboration. The invite flow is how a solo purchase list becomes a shared decision. A user can invite family members by email — the invitee receives a magic link, clicks it, and lands directly in the shared list.

The flow supports two invite methods:

1. **Email invite** (primary) — enter an email, pick a role, send. Invitee gets a branded email with a "Join this list" CTA. On click, they're authenticated (or prompted to sign up) and dropped straight into the list.
2. **Copy link** (secondary) — generates a shareable link with an embedded invite token. Anyone with the link can join as the specified role. Useful for quick sharing via WhatsApp, iMessage, etc. — common in family contexts where email feels formal.

Three roles: **owner** (full control), **editor** (add/remove products, comment, shortlist — the default for family), **viewer** (read-only).

The dialog also shows current members with their roles, pending invites, and a way to remove members or change roles.

---

## Layout — Invite Dialog (Desktop)

```
         ┌──────── backdrop (bg-black/50) ────────┐
         │                                         │
         │    ╭───────────────────────────────╮    │
         │    │  Share "The Great TV           │    │
         │    │   Showdown"              [✕]  │    │
         │    │  ─────────────────────────────│    │
         │    │                               │    │
         │    │  Invite by email              │    │
         │    │  ┌──────────────────┐ ┌─────┐│    │
         │    │  │ mom@email.com    │ │Editor││    │
         │    │  └──────────────────┘ └─────┘│    │
         │    │              ┌──────────────┐ │    │
         │    │              │  Send Invite │ │    │
         │    │              └──────────────┘ │    │
         │    │                               │    │
         │    │  ── or share via link ──      │    │
         │    │  ┌──────────────────────────┐ │    │
         │    │  │ https://shopit.app/inv/  │ │    │
         │    │  │ abc123...       [📋 Copy]│ │    │
         │    │  └──────────────────────────┘ │    │
         │    │  Anyone with this link can    │    │
         │    │  join as Editor               │    │
         │    │                               │    │
         │    │  ─────────────────────────────│    │
         │    │  Members (3)                  │    │
         │    │                               │    │
         │    │  ○ Aman (you)       Owner  ── │    │
         │    │  ○ Priya            Editor [▾]│    │
         │    │  ○ mom@email.com    Pending···│    │
         │    │                               │    │
         │    ╰───────────────────────────────╯    │
         │                                         │
         └─────────────────────────────────────────┘
```

**Pending invite state:**
```
         │    │  ○ mom@email.com   Pending     │
         │    │    Invited 2 min ago  [Resend]  │
         │    │                      [Revoke]   │
```

**Mobile (< 640px):** Bottom sheet at `80vh` with drag handle. Same layout, single column. Member list scrollable within sheet.

---

## Design Decisions

### Decision 1: Invite Method — Email Only vs Email + Link

**Chosen: Email (primary) + Copy Link (secondary)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Email + Copy Link (Chosen)** | Email for formal invites with role control. Link for quick sharing via WhatsApp/iMessage — how families actually communicate. Covers both use cases. | Link sharing has security implications (anyone with the link can join). |
| **B. Email only** | Simpler. Tighter access control. | Families often share via chat, not email. Forcing email feels corporate. |
| **C. Link only** | Simplest. No email infrastructure needed. | No way to invite specific people. No pending invite tracking. No personalized invite email. |

The copy link inherits the role selected in the role dropdown at time of generation. Link can be revoked (invalidated) from the member list. Link expires after 7 days. This balances convenience with security — good enough for family-scale collaboration.

### Decision 2: Role Selection — Default Role

**Chosen: Editor as default**

| Option | Pros | Cons |
|--------|------|------|
| **A. Editor default (Chosen)** | Family members should be able to add products, comment, and shortlist by default. Matches the collaborative intent of the app. Less friction — inviter rarely needs to think about roles. | Slightly less secure. But for family use, editor is the right default. |
| **B. Viewer default** | Safest. Invitee can see but not modify. | Too restrictive for family collaboration. Inviter has to manually upgrade every member. Feels like a corporate permissions system. |
| **C. No default (force selection)** | Explicit choice every time. | Extra friction on every invite. Most families want editor. |

### Decision 3: Member Management — Inline vs Separate

**Chosen: Inline in the same dialog**

| Option | Pros | Cons |
|--------|------|------|
| **A. Inline (Chosen)** | One dialog for everything: invite, view members, change roles, remove. No navigation between multiple dialogs. | Dialog gets longer with many members. |
| **B. Separate "Manage Members" dialog** | Cleaner separation. Invite dialog stays short. | Two dialogs for related actions. User has to find the "manage" button separately. |

The member list sits below a `Separator` in the same dialog. For lists with many members (unlikely in family context — typically 2-5), the list scrolls within the dialog. The invite section stays pinned at the top.

### Decision 4: Invite Acceptance — Magic Link vs Account Required

**Chosen: Magic link (same as login flow)**

| Option | Pros | Cons |
|--------|------|------|
| **A. Magic link (Chosen)** | Consistent with the app's auth model. Invitee clicks link in email → authenticated → lands in the list. No password to remember. Works for non-tech-savvy family members. | Requires email access. |
| **B. Require existing account** | Simpler server logic. | Massive friction — invitee must sign up first, then come back and accept. Family members will give up. |

When an invitee clicks the magic link: if they have an account, they're signed in and redirected to the list. If they don't, an account is auto-created from the email and they land in the list with a brief welcome tooltip. The `list_members.joined_at` field is set at this point (was null while pending).

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **Dialog container** | shadcn `<Dialog>` | Desktop: `<DialogContent className="max-w-md p-0">`. Mobile: `<Sheet side="bottom">` at `80vh`. |
| 2 | **Title** | `<DialogTitle>` | `Share "{list.name}"` in `text-lg font-semibold`. List name truncated with `line-clamp-1` if long. |
| 3 | **Email input** | shadcn `<Input type="email">` | `placeholder="Email address"`. `autoFocus`. Validates email format on blur. Shows red border + error message for invalid emails. Supports Enter to submit (same as clicking Send Invite). |
| 4 | **Role dropdown** | shadcn `<Select>` | Options: "Editor" (default), "Viewer", "Owner". Each option has a one-line description: Editor = "Can add products, comment, shortlist". Viewer = "Can view only". Owner = "Full control". `w-[100px]` compact width. |
| 5 | **Send Invite button** | shadcn `<Button>` | "Send Invite". Loading state: `<Loader2 className="animate-spin">`. Success: briefly shows `✓ Sent` (1.5s, then reverts). Disabled if email is empty or invalid. |
| 6 | **Divider** | Flex row with separators | `<Separator>` + `<span className="text-muted-foreground text-xs">or share via link</span>` + `<Separator>`. Same pattern as login page divider. |
| 7 | **Invite link display** | Flex row | Truncated URL in `text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2`. Copy button: `<Button variant="ghost" size="icon">` with `Copy` icon. On click: icon morphs to `Check` for 2s, tooltip shows "Copied!". |
| 8 | **Link role note** | `<p>` | "Anyone with this link can join as {role}" in `text-xs text-muted-foreground`. Role reflects the dropdown selection. |
| 9 | **Link expiry note** | `<p>` | "Link expires in 7 days" in `text-xs text-muted-foreground`. If link has been generated, shows remaining time: "Expires in 5 days". |
| 10 | **Members section header** | Flex row | "Members ({count})" in `text-sm font-medium`. Below a `<Separator>`. |
| 11 | **Member row (joined)** | Flex row | `<Avatar>` (32px) + name in `text-sm font-medium` + "(you)" badge if current user in `text-xs text-muted-foreground` + role badge. Owner row: role shown as plain text, not editable (can't demote yourself). Other members: role is a `<Select>` dropdown (owner can change roles). |
| 12 | **Member row (pending)** | Flex row | `<Avatar>` placeholder (envelope icon on `bg-muted` circle) + email in `text-sm text-muted-foreground` + "Pending" badge in `text-xs bg-amber-500/10 text-amber-700 rounded-full px-2`. Below: "Invited {relative_time}" + "Resend" link + "Revoke" link in `text-xs`. |
| 13 | **Role change dropdown** | shadcn `<Select>` | Inline on each member row. Only visible to owners. Options: Editor, Viewer, Owner. Changing to Owner shows confirmation dialog ("This will make them an owner. You'll remain an owner too."). |
| 14 | **Remove member button** | `<Button variant="ghost" size="icon">` | `X` icon, `text-muted-foreground hover:text-destructive`. Only visible to owners (and only on non-owner rows). Triggers `AlertDialog` confirmation: "Remove {name} from this list?". |
| 15 | **Resend invite button** | `<Button variant="ghost" size="sm">` | "Resend" in `text-xs`. Triggers new invite email. Cooldown: disabled for 60s after sending, shows "Resent ✓" briefly. |
| 16 | **Revoke invite button** | `<Button variant="ghost" size="sm">` | "Revoke" in `text-xs text-destructive`. Removes the pending `list_members` row. Invalidates the invite link for this email. No confirmation dialog (low stakes — just cancels an unseen invite). |

---

## Animation Spec

### Dialog Open

Same as List Creation dialog: overlay fade + scale `0.95→1`, 200ms, ease-out. Focus moves to email input.

### Send Invite — Success

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Button text crossfades: "Send Invite" → spinner
  ~300ms  Server action completes
  300ms   Spinner → "✓ Sent" with check draw-on (200ms)
          Button bg flashes green-500/20 (200ms fade in, 800ms fade out)
  500ms   New pending member row slides into member list:
          opacity 0→1, y: -8→0 (200ms, ease-out)
          Brief highlight: bg-ai-accent/10 → transparent (600ms)
  1500ms  Button text reverts to "Send Invite"
          Email input clears, re-focuses
─────────────────────────────────────────────────────
```

### Copy Link

```
Timeline:
─────────────────────────────────────────────────────
  0ms     User clicks copy button
  0ms     Icon morphs: Copy → Check (instant)
          Button gets subtle green tint
  0ms     Tooltip appears: "Copied!" (fade in 100ms)
  2000ms  Icon morphs back: Check → Copy
          Tooltip fades out (150ms)
─────────────────────────────────────────────────────
```

### Member Removed

```
Timeline:
─────────────────────────────────────────────────────
  0ms     AlertDialog confirms removal
  0ms     Member row: opacity 1→0, x: 0→-20 (200ms, ease-in)
  200ms   Row collapses: height auto→0 (200ms, ease-in)
          Remaining rows shift up (layout animation)
  400ms   Member count updates in header
─────────────────────────────────────────────────────
```

### Role Changed

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Select closes with new value
  0ms     Role badge text crossfades (old → new, 150ms)
          Brief highlight on the member row: bg-muted/50 → transparent (400ms)
─────────────────────────────────────────────────────
```

### New Member Joins (Realtime — another user accepted invite)

```
Timeline (via Supabase Realtime subscription):
─────────────────────────────────────────────────────
  0ms     Pending row transforms:
          Email text → user's display name (crossfade 200ms)
          Envelope placeholder → real avatar (crossfade 200ms)
          "Pending" badge → role badge (crossfade 200ms)
          "Invited X ago" text fades out
          Brief celebration: bg-green-500/10 highlight (600ms)
─────────────────────────────────────────────────────
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Dialog background | `bg-card` (white) | `bg-card` (#111 range) |
| Overlay | `bg-black/50` | `bg-black/60` |
| Input backgrounds | `bg-background` | `bg-muted/30` |
| Invite link bg | `bg-muted` | `bg-muted/50` |
| Invite link text | `text-muted-foreground font-mono` | `text-muted-foreground font-mono` |
| "Pending" badge bg | `bg-amber-500/10 text-amber-700` | `bg-amber-500/15 text-amber-400` |
| Member row hover | `hover:bg-muted/50` | `hover:bg-muted/30` |
| Role dropdown | `bg-background border-input` | `bg-muted/30 border-input` |
| Remove button hover | `hover:text-destructive hover:bg-destructive/10` | `hover:text-destructive hover:bg-destructive/10` |
| Success flash (sent) | `bg-green-500/20` | `bg-green-500/15` |
| Realtime join highlight | `bg-green-500/10` | `bg-green-500/15` |
| Separator | `bg-border` (zinc-200) | `bg-border` (zinc-800) |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Bottom sheet at `80vh` with drag handle. Email input and role dropdown stack vertically (`flex-col`). Member list scrollable within sheet (max-height constrained). Invite link text truncated more aggressively. Copy button full-width below link. |
| Tablet (`640-1024px`) | Centered dialog at `max-w-md`. Email + role dropdown side by side. Touch-friendly targets ≥ 44px. |
| Desktop (`> 1024px`) | Centered dialog at `max-w-md`. Email + role dropdown + send button all in one row. Keyboard-focused — `Enter` sends invite, `Tab` navigates. |

---

## Accessibility

- **Dialog** uses Radix Dialog — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to dialog title. Focus trapped.
- **Email input** has `<Label>` with "Invite by email" text. `aria-describedby` links to validation error if present. `aria-invalid="true"` on invalid email.
- **Role dropdown** has `aria-label="Member role"`. Options have descriptive text read by screen readers.
- **Send Invite button** — loading: `aria-busy="true"`. Success: announced via `aria-live="polite"` region ("Invite sent to {email}").
- **Copy link button** has `aria-label="Copy invite link"`. Success announced via `aria-live="polite"` ("Link copied to clipboard").
- **Member list** uses `role="list"` with `role="listitem"` per member. Each row has `aria-label="{name}, {role}"`.
- **Pending members** have `aria-label="{email}, invite pending"`.
- **Role change dropdown** — only shown for owners. Has `aria-label="Change role for {name}"`. Role change announced via `aria-live="polite"`.
- **Remove button** has `aria-label="Remove {name} from list"`. Confirmation dialog is keyboard-accessible (Radix AlertDialog). Focus moves to cancel button by default.
- **Resend/Revoke links** have `aria-label="Resend invite to {email}"` / `aria-label="Revoke invite for {email}"`.
- **Realtime updates** — new member join announced via `aria-live="polite"` ("{name} joined the list").
- **`prefers-reduced-motion`** — row slide animations replaced with instant opacity changes. Copy icon change is instant.

---

## Invite Email Design

The invite email sent to the invitee is minimal and action-focused:

```
┌─────────────────────────────────────────┐
│                                         │
│  ◆ ShopIt                               │
│                                         │
│  {inviter_name} invited you to          │
│  "{list_name}"                          │
│                                         │
│  You've been invited to collaborate on  │
│  a purchase decision. Jump in to view   │
│  products, add your picks, and help     │
│  decide.                                │
│                                         │
│  ┌───────────────────────────────┐      │
│  │      Join This List  →        │      │
│  └───────────────────────────────┘      │
│                                         │
│  Role: Editor                           │
│  List: {list_name} · {product_count}    │
│        products                         │
│                                         │
│  ─────────────────────────────────      │
│  If you didn't expect this invite,      │
│  you can safely ignore this email.      │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:** Sent via Supabase Auth email hook or a custom edge function. Uses React Email for templating. The "Join This List" CTA is a magic link URL that authenticates and redirects to `/lists/[id]`.

---

## References

- [PageFlows — Invite Teammates User Flow](https://pageflows.com/resources/invite-teammates-user-flow/) — Airtable invite flow breakdown
- [SaaSFrame — 97 Invite Team Members Examples (2025)](https://www.saasframe.io/categories/invite-team-members) — real SaaS invite UI examples
- [NicelyDone — Invite Teammates Flows](https://nicelydone.club/flows/invite-teammates) — curated invite flow design library
- [Appcues — Onboarding Invited Users](https://www.appcues.com/blog/user-onboarding-strategies-invited-users) — Asana, HubSpot, Notion strategies for invited users
- [CloudSponge — InVision Invite Teardown](https://www.cloudsponge.com/blog/invision-teardown-knowing-your-users-creates-a-great-invitation-ux/) — collaboration invite flow analysis
- [shadcn Dialog](https://ui.shadcn.com/docs/components/radix/dialog) — dialog component
- [shadcn Select](https://ui.shadcn.com/docs/components/radix/select) — role selection dropdown
- [shadcn AlertDialog](https://ui.shadcn.com/docs/components/radix/alert-dialog) — confirmation for member removal
- [React Email](https://react.email/) — email templating for invite emails

---

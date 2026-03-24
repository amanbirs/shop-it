# Phase 8: Collaboration

## Checklist

- [x] Write migration: `invite_tokens` table + RLS (already in `20260323000001_create_tables.sql` + `20260323000002_add_rls_policies.sql`)
- [x] Deploy migration: included in Phase 2 push
- [x] Build Server Actions: `inviteMember`, `removeMember`, `updateRole`, `acceptInvite`, `resendInvite` (`lib/actions/members.ts`)
- [ ] Write tests for member actions
- [x] Build invite/share dialog (`components/collaboration/invite-member-dialog.tsx`) — email invite + copy link + member list
- [x] Build member list (`components/collaboration/member-list.tsx`) — role dropdown, remove button, pending state
- [x] Build member avatar stack (`components/collaboration/avatar-stack.tsx`)
- [x] Build invite link copy logic (in invite dialog)
- [x] Build comment Server Actions: `addComment`, `updateComment`, `deleteComment` (`lib/actions/comments.ts`)
- [ ] Write tests for comment actions
- [x] Build comment thread (`components/collaboration/comment-thread.tsx`) — threaded, with Realtime subscription
- [x] Build comment input (`components/collaboration/comment-input.tsx`) — Enter to submit, reply mode
- [x] Comment Realtime subscription (in comment-thread.tsx)
- [ ] Build dedicated `useRealtimeMembers` hook — deferred, using page refresh for now
- [x] Build invite acceptance route (`app/(auth)/invite/[token]/route.ts`) — built in Phase 10
- [x] Build list settings page placeholder (`app/(app)/lists/[listId]/settings/page.tsx`) — built in Phase 10
- [ ] Test: invite a member → they receive email → they join → appear in member list
- [ ] Test: role changes propagate
- [ ] Test: comments appear in Realtime for other users
- [ ] Test: viewer role cannot add products or comment
- **Note:** Comment thread not yet wired into product detail sheet — will add in a follow-up.

---

## Step 1: Member Server Actions

File: `lib/actions/members.ts`

### `inviteMember`
From `07-api-contracts.md`:
```
1. Auth check
2. inviteMemberSchema.safeParse(input)
3. Verify user is owner of the list
4. Check for CONFLICT: email already a member (joined or pending)
5. Check for VALIDATION_ERROR: inviting self
6. Look up profile by email — if exists, use their user_id; if not, create pending row with email
7. Insert list_members row with joined_at=null (pending)
8. Trigger invite email (via Supabase auth magic link or custom email)
9. revalidatePath(`/lists/${listId}`)
10. Return { success: true, data: { id, status: 'invited' } }
```

### `removeMember`
```
1. Auth + validate
2. Verify user is owner
3. Verify not removing self (owners must archive the list instead)
4. Delete list_members row
5. Revalidate
```

### `updateRole`
```
1. Auth + validate
2. Verify user is owner
3. Update role on list_members row
4. Revalidate
```

### `acceptInvite`
```
1. Auth check
2. Find pending list_members row matching user's email
3. Set joined_at = now()
4. Revalidate
```
This is typically called automatically when the invitee clicks the magic link, not via a manual UI button.

### `resendInvite`
```
1. Auth + validate
2. Verify owner
3. Verify member is pending (joined_at is null)
4. Rate limit: 1 resend per 60 seconds (check created_at or a cooldown field)
5. Trigger new invite email
```

## Step 2: Invite/Share Dialog

File: `components/collaboration/invite-member-dialog.tsx` — `'use client'`

From `06d-invite-share-flow.md`. Full spec there.

### Layout
Desktop: `<Dialog>` centered, `max-w-md`
Mobile: `<Sheet side="bottom">` at `80vh`

### Sections

**1. Email Invite (top)**
```
- Email input (autoFocus, validates on blur)
- Role dropdown: Editor (default), Viewer
- "Send Invite" button with loading/success states
```

**2. Share Link (middle)**
```
- Generated invite URL (truncated, in a monospace box)
- Copy button (icon morphs to Check for 2s on success)
- "Anyone with this link can join as {role}" note
- "Link expires in 7 days" note
```

**3. Member List (bottom, below Separator)**
```
Members ({count})

○ Aman (you)        Owner    ──
○ Priya             Editor   [▾ role dropdown]  [✕ remove]
○ mom@email.com     Pending  "Invited 2 min ago" [Resend] [Revoke]
```

### Invite Link Generation

**Token storage:** Add an `invite_tokens` table (migration in Phase 8):

```sql
create table public.invite_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  list_id    uuid not null references public.lists(id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor', 'viewer')),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,          -- set when someone redeems the link
  created_at timestamptz not null default now()
);

create index idx_invite_tokens_token on invite_tokens(token);

-- RLS: only list owners can create/view tokens
alter table public.invite_tokens enable row level security;

create policy "invite_tokens_select" on public.invite_tokens
  for select using (
    exists (
      select 1 from public.list_members
      where list_members.list_id = invite_tokens.list_id
        and list_members.user_id = auth.uid()
        and list_members.role = 'owner'
    )
  );

create policy "invite_tokens_insert" on public.invite_tokens
  for insert with check (created_by = auth.uid());
```

**Token generation:** Use `crypto.randomBytes(32).toString('hex')` (Node.js) or `gen_random_bytes(32)` (Postgres default). 64-character hex string.

**Token validation:** Check `expires_at > now()` and `used_at is null`.

**Build URL:**
```
https://your-app.vercel.app/invite/[token]
```

**Create an invite acceptance route:** `app/(auth)/invite/[token]/route.ts`
```
1. Look up token → verify not expired, not used
2. Find list_id, role from token row
3. If user is logged in → insert list_members row, set token.used_at, redirect to /lists/[id]
4. If not logged in → redirect to /login?returnTo=/invite/[token]
5. If token expired → show "This invite link has expired" error page
```

### Invite Email Mechanism

Use **Supabase Auth's `signInWithOtp`** with a custom redirect URL to handle invite emails:

```typescript
// When inviting, send a magic link that redirects to the invite acceptance route
await supabase.auth.signInWithOtp({
  email: inviteeEmail,
  options: {
    emailRedirectTo: `${APP_URL}/invite/${token}`,
  },
})
```

This means:
- New users get a magic link email → clicking it creates their account AND accepts the invite
- Existing users get a magic link email → clicking it signs them in AND accepts the invite
- No separate "invite email" template needed for v1 — Supabase Auth handles the email

For custom invite email branding (the design from `06d-invite-share-flow.md`), customize the Supabase Auth email template in **Authentication > Email Templates > Magic Link**.

## Step 3: Comment Server Actions

File: `lib/actions/comments.ts`

### `addComment`
```
1. Auth check
2. createCommentSchema.safeParse(input)
3. Verify editor+ on the product's list (viewers can't comment)
4. Insert comment row
5. No revalidation needed — Realtime handles it
6. Return { success: true, data: { id, content, createdAt } }
```

### `updateComment`
```
1. Auth check
2. Verify user is the comment author
3. Update content
```

### `deleteComment`
```
1. Auth check
2. Verify user is comment author OR list owner
3. Delete comment (cascade deletes replies via FK)
```

## Step 4: Comment Thread

File: `components/collaboration/comment-thread.tsx` — `'use client'`

From `06b-product-detail-sheet.md` — displayed at the bottom of the product detail sheet.

```
Comments (3)
────────────
○ Aman · 2h ago
  "I think this one has the best picture quality for the price"
    ↳ ○ Priya · 1h ago
      "Agreed, but worried about burn-in"

○ Mom · 30m ago
  "What about the Samsung one?"

[Type a comment...] [Send]
```

### Features
- **One level of threading only** (parent_id → reply). Replies are flat — clicking "Reply" on a reply creates a sibling reply to the same parent, not a nested thread. The `addComment` Server Action should enforce this: if `parentId` is provided, verify the parent comment's own `parent_id` is null (i.e., it's a top-level comment). If someone tries to reply to a reply, set `parent_id` to the grandparent (the top-level comment).
- Optimistic insert (comment appears immediately)
- Realtime updates via `useRealtimeComments`
- Edit own comments (inline)
- Delete own comments (or owner can delete any)

## Step 5: Comment Input

File: `components/collaboration/comment-input.tsx` — `'use client'`

```
- Textarea (auto-expanding)
- Send button (or Enter to submit, Shift+Enter for newline)
- Reply mode: shows "Replying to {name}" with cancel button
```

## Step 6: Realtime Hooks

### `useRealtimeComments`
File: `hooks/use-realtime-comments.ts`

```typescript
// Channel: product-comments-${productId}
// Listens: postgres_changes on comments, filter: product_id=eq.${productId}
// Events: INSERT, UPDATE, DELETE
// On INSERT: add comment to local state
// On UPDATE: update comment content
// On DELETE: remove comment from local state
// Cleanup: unsubscribe on unmount
```

### `useRealtimeMembers`
File: `hooks/use-realtime-members.ts`

```typescript
// Channel: list-members-${listId}
// Listens: postgres_changes on list_members, filter: list_id=eq.${listId}
// Events: INSERT, UPDATE, DELETE
// Powers: member joins, role changes, removals in the invite dialog
```

## Step 7: Member Avatar Stack

File: `components/collaboration/avatar-stack.tsx`

```
- Shows up to 3 overlapping avatars (-ml-2 offset)
- "+N" badge for additional members
- ring-2 ring-background for separation
- Used on list cards (dashboard) and list header
```

File: `components/collaboration/member-avatar.tsx`

```
- Avatar with image or initials fallback
- Optional online indicator (green dot)
- Sizes: sm (24px), md (32px), lg (40px)
```

## Step 8: List Settings Page

File: `app/(app)/lists/[listId]/settings/page.tsx`

### Sections
1. **List Details:** Edit name, description, category
2. **Budget & Deadline:** Edit budget_min/max, purchase_by date
3. **Priorities:** Reorderable chips/tags (list of priorities). For v1, a simple comma-separated input is fine; reorderable drag-and-drop is v2.
4. **Members:** Same member list as invite dialog (or link to invite dialog)
5. **Danger Zone:** Archive list (owner only), with confirmation dialog

## Test Checkpoint

1. **Invite flow (email):**
   - Open invite dialog → enter email → select role → Send
   - Check: pending member appears in member list
   - Check: invite email received (check Supabase Auth logs or email inbox)
   - Click magic link in email → redirected to list → member joins
   - Refresh invite dialog → member shows as joined with role
2. **Invite flow (link):**
   - Copy invite link → open in incognito → sign in → lands in list
3. **Role management:**
   - Change a member's role from Editor to Viewer
   - As that member: verify they can no longer add products or comment
4. **Remove member:**
   - Remove a member → they disappear from the list
   - That member can no longer see the list
5. **Comments:**
   - Add a comment on a product → appears in thread
   - Open same product in another browser → comment appears via Realtime
   - Reply to a comment → threaded reply shows indented
   - Delete a comment → disappears for all users
6. **Viewer restrictions:**
   - As a viewer: cannot add products, cannot comment, cannot shortlist
   - Can only view product details

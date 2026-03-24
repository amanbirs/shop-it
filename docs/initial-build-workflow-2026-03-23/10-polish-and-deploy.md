# Phase 10: Polish & Deploy

## Checklist

- [x] Dashboard card stagger animation (Framer Motion, 60ms between cards)
- [x] Build loading skeletons: dashboard (`app/(app)/loading.tsx`), list detail (`app/(app)/lists/[listId]/loading.tsx`)
- [ ] Accessibility audit (keyboard nav, ARIA, contrast)
- [ ] Mobile responsiveness audit at 375px
- [ ] Dark mode audit (both themes)
- [x] Error boundary: app-level (`app/(app)/error.tsx`), list-level (`app/(app)/lists/[listId]/error.tsx`)
- [x] 404 page (`app/not-found.tsx`)
- [x] Performance: `next.config.ts` allows all HTTPS image domains
- [x] Invite acceptance route (`app/(auth)/invite/[token]/route.ts`)
- [x] List settings page placeholder (`app/(app)/lists/[listId]/settings/page.tsx`)
- [x] Profile page placeholder (`app/(app)/profile/page.tsx`)
- [ ] Login stagger animation — already implemented in Phase 2
- [ ] Flashlight hover effect on dashboard cards
- [ ] `prefers-reduced-motion` support
- [ ] Update Supabase redirect URLs for production (manual)
- [ ] Deploy to Vercel production (manual)
- [ ] Smoke test production deployment
- [x] Update CLAUDE.md and system guide with deviations

---

## Step 1: Animation Pass

Go through each page spec and implement the animations that haven't been added yet. Reference the Animation Spec sections in each doc.

### Login Page (`06-pages.md`)
- Entry stagger reveal: logo → tagline → input → button → divider → OAuth (80ms between each, 400ms duration)
- State transition crossfade: email form ↔ "check your email" (AnimatePresence mode="wait")

### Dashboard (`06-pages.md`)
- Card entry stagger: 60ms between cards, scale 0.97→1 + y: 12→0 (cap at 6 cards)
- Card hover: shadow-md → shadow-xl, y: 0 → -2px (150ms ease-out)
- Flashlight effect: cursor-tracking radial gradient on card borders
- New card appearance: scale 0.9→1 + blur 8→0 (spring animation)

### List Detail (`06a-page-list-detail.md`)
- Product card appear via Realtime: fade in + scale (AnimatePresence)
- Filter tab transitions

### Product Detail Sheet (`06b-product-detail-sheet.md`)
- Sheet open: slide from right (desktop) / bottom (mobile) — spring(1, 70, 14)
- Accordion sections: smooth height animation
- Product-to-product navigation: content crossfade

### Create List Dialog (`06c-list-creation-flow.md`)
- Dialog open: scale 0.95→1 + overlay fade (200ms)
- AI title typewriter: ~20ms per character
- Collapsible expand/collapse: height animation + chevron rotation
- Submit button states: text crossfade → spinner → checkmark draw-on → green bg

### Invite Dialog (`06d-invite-share-flow.md`)
- Send invite success: button text → spinner → "✓ Sent" → green flash
- Copy link: icon morph Copy → Check (2s)
- Member removed: slide out + collapse
- New member join (Realtime): email → name crossfade + celebration highlight

### Global Shell (`06e-global-shell.md`)
- Sidebar collapse/expand: width transition 200ms + text fade
- Active nav indicator: sliding pill with layoutId
- Command palette: drop in y: -10→0 (150ms)
- Page transitions: content crossfade (100ms out, 200ms in)
- Mobile hamburger: sidebar slide from left, spring animation

### Reduced Motion
All animations should respect `prefers-reduced-motion`:
```typescript
const prefersReducedMotion = useReducedMotion() // from framer-motion
// Replace animations with instant state changes
```

## Step 2: Loading States

Ensure every data-dependent view has a proper loading state:

### Page-Level Loading
```
app/(app)/loading.tsx              — Dashboard skeleton
app/(app)/lists/[listId]/loading.tsx — List detail skeleton
```

### Component-Level Skeletons
- Product card skeleton (already built in Phase 6)
- List card skeleton (for dashboard)
- Expert opinion skeleton
- Comment thread skeleton
- Member list skeleton

### Inline Suspense Boundaries
Wrap data-fetching Server Components in `<Suspense fallback={<Skeleton />}>`:
```tsx
<Suspense fallback={<ProductGridSkeleton count={6} />}>
  <ProductGrid listId={listId} />
</Suspense>
```

## Step 3: Error Boundaries

### Error Pages
File: `app/(app)/error.tsx` — catches runtime errors in authenticated routes
File: `app/(app)/lists/[listId]/error.tsx` — catches errors on list pages

```tsx
'use client'
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### Error State Component
File: `components/common/error-state.tsx`

Reusable error display with retry button. Used inline when specific components fail.

### 404 Page
File: `app/not-found.tsx`

Clean 404 with link back to dashboard.

## Step 4: Accessibility Audit

Walk through every page spec's Accessibility section and verify:

### Global
- [ ] Skip link works (`Tab` → "Skip to main content" → focuses main area)
- [ ] All interactive elements have visible focus rings in both themes
- [ ] Color is never the only way to convey info (icons + text pair with color)
- [ ] `aria-live` regions announce dynamic content (AI titles, Realtime updates, toasts)

### Login Page
- [ ] Email input has visible label or `aria-label`
- [ ] Submit button has `aria-busy` during loading
- [ ] Focus trapped within card
- [ ] Tab order: email → submit → Google → Apple

### Sidebar
- [ ] `<aside>` with `role="navigation"` and `aria-label`
- [ ] Active item has `aria-current="page"`
- [ ] Collapsed items have `aria-label` with full list name
- [ ] Collapse button has `aria-expanded` state

### Command Palette
- [ ] `role="dialog"` with `aria-modal`
- [ ] Results use `role="listbox"` / `role="option"`
- [ ] Arrow keys navigate, Enter selects
- [ ] `aria-selected` on highlighted result

### Product Cards
- [ ] Focusable with `tabindex="0"`, navigate on Enter/Space
- [ ] Heading hierarchy (`h3` for title)
- [ ] AI content marked with `aria-description="Generated by AI"`

### Forms
- [ ] All inputs have `<Label>` with `htmlFor`
- [ ] Inline errors use `aria-describedby`
- [ ] Invalid fields have `aria-invalid="true"`

### Dialogs
- [ ] Focus trapped (Radix handles this)
- [ ] Escape closes
- [ ] Focus returns to trigger on close

### Keyboard Navigation
- [ ] Complete every flow with keyboard only
- [ ] `Cmd+K` opens command palette
- [ ] Escape closes modals/sheets/palette
- [ ] Arrow keys navigate product detail sheet

## Step 5: Mobile Responsiveness Audit

Test at these widths:
- **375px** (iPhone SE) — absolute minimum
- **390px** (iPhone 14)
- **414px** (iPhone 14 Plus)
- **768px** (iPad)

### Check each page:
- [ ] Login: card fills width with `mx-4`, no horizontal scroll
- [ ] Dashboard: single column cards, bottom tabs visible, no sidebar
- [ ] List Detail: single column products, URL input fits, filters scroll horizontally
- [ ] Product Sheet: full-screen bottom sheet, all sections readable
- [ ] Dialogs: bottom sheets with drag handles, fields don't overflow
- [ ] Header: hamburger visible, avatar visible, no text overflow

## Step 6: Dark Mode Audit

Toggle to dark mode and check every page against the Dark Mode Adaptation tables in each spec:

- [ ] No pure black backgrounds (should be #0a-#17 range)
- [ ] No pure white text (off-white only)
- [ ] AI accent colors properly desaturated
- [ ] Card elevation visible (cards slightly lighter than background)
- [ ] Images not blindingly bright (`dark:brightness-90` if needed)
- [ ] Shadows use `shadow-black/30` or similar in dark mode
- [ ] All borders use semantic `border-border` token

## Step 7: Performance Optimization

### Images
```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazon.in' },
      { protocol: 'https', hostname: '**.flipkart.com' },
      { protocol: 'https', hostname: '**.media-amazon.com' },
      // Add more as needed for common product sites
    ],
  },
}
```

Use `next/image` for product images with proper `width`/`height` to prevent layout shift.

### Bundle Size
- Verify Framer Motion is only imported in client components that need it
- Verify lucide-react icons are tree-shaken (import individually)
- No barrel exports (`index.ts` re-exports)

### Data Fetching
- Parallel fetches in Server Components: `Promise.all([fetchList, fetchProducts, fetchMembership])`
- Realtime subscriptions scoped to current list only
- Unsubscribe on unmount

## Step 8: Production Deployment

### Update Supabase for Production (Manual)

1. Go to Supabase dashboard → **Authentication > URL Configuration**
2. Update **Site URL** to your production Vercel URL (e.g., `https://shopit.vercel.app`)
3. Add production URL to **Redirect URLs**: `https://shopit.vercel.app/auth/callback`
4. If using Google OAuth, update the Google Cloud Console redirect URI to include the production URL

### Update Vercel Environment Variables (Manual)

1. Go to Vercel dashboard → your project → **Settings > Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Verify all other env vars are set for Production environment

### Deploy

```bash
git push origin main
```

Vercel auto-deploys on push. Or manually:

```bash
npx vercel --prod
```

### Post-Deploy Verification

1. Visit production URL → should redirect to `/login`
2. Log in via magic link → should work with production Supabase
3. Create a list → verify DB write works
4. Add a product → verify Edge Function triggers and extraction completes
5. Test on mobile device (real phone, not just browser resize)
6. Test in both light and dark mode
7. Run Lighthouse audit:
   - Performance: target > 90
   - Accessibility: target > 95
   - Best Practices: target > 95

## Step 9: Update Documentation

If any implementation deviated from the design specs during the build:

1. Update the relevant `docs/system-guide/` spec files to reflect what was actually built
2. Update `CLAUDE.md` if the project structure changed
3. The docs should always reflect the current state — not the original plan

---

## Done

At this point you have a fully functional ShopIt v1:
- Login via magic link
- Create and manage purchase lists with AI hype titles
- Paste product URLs → automatic scraping + AI extraction
- Product cards with specs, reviews, pros/cons, AI verdicts
- Shortlisting and purchase tracking
- Collaborative lists with email invites and role management
- Real-time comments on products
- AI Expert Opinion comparing products with personalized recommendations
- Dark/light theme, mobile-responsive, accessible
- Deployed on Vercel + Supabase

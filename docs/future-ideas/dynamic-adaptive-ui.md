# Dynamic / Data-Adaptive UI

> **Status: Exploration / v2+ consideration.**
> Originated from the [Product Detail Sheet spec](../06b-product-detail-sheet.md). Captures opportunities to make UI components adapt their layout, emphasis, and visible sections based on the actual data each product carries. The current spec uses a static template — every product gets the same layout. This doc asks: what if the UI were smarter?

---

## The Opportunity

Our data model is inherently variable. A TV has `specs: { screen_size: "65\"", refresh_rate: "120Hz", panel_type: "OLED" }`. A stroller has `specs: { weight_capacity: "25kg", fold_type: "one-hand", wheel_size: "12\"" }`. These have zero overlap — the data model already acknowledged this by making `specs` JSONB. But the UI currently treats them identically: same accordion, same layout, same visual weight.

Meanwhile, the industry is moving fast. [Gartner predicts 30% of all new apps will use AI-driven adaptive interfaces by 2026](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products). [Vercel's AI SDK 3.0 introduced Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) — streaming React Server Components from LLMs. [Google launched A2UI](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) for agent-driven, generative interfaces. The direction is clear: UIs that shape themselves around data, not data that fills a fixed template.

---

## What Varies Per Product (Data Analysis)

| Field | Variability | UI Impact |
|-------|------------|-----------|
| `specs` (JSONB) | **High** — keys differ by category. A laptop might have 20 specs, a book might have 3. | Spec table rows vary. A 3-spec product shouldn't show the same visual weight as a 20-spec product. |
| `pros[]` / `cons[]` | **Medium** — some products have 5+ pros, some have 0. Ratio varies (all pros? mixed? all cons?). | A product that's all-pros-no-cons could highlight differently than a contentious product with 5 cons. |
| `ai_verdict` | **Medium** — tone varies: "Best value", "Premium pick", "Risky — mixed reviews", null. | A "Risky" verdict should feel visually different than a "Best value" verdict. Color, icon, weight. |
| `ai_summary` | **Low** — always a paragraph. Length varies (50-300 words). | Long summaries could truncate with "Read more". Short ones display in full. |
| `ai_review_summary` | **Medium** — present or null depending on whether reviews existed on the source page. | If null, the "Reviews" accordion section has nothing meaningful. Why show it? |
| `scraped_reviews[]` | **Medium** — 0 to 10+ reviews. Some have ratings, some don't. | Zero reviews → hide the section entirely. Many reviews → show aggregate + expandable list. |
| `rating` / `review_count` | **Medium** — null for products without ratings on the source page. | No rating → hide the star display. High review count → emphasize social proof. |
| `price_min` / `price_max` | **Low-Medium** — single price vs range. `price_note` present or null. | Range products could show a price slider or "from ₹X" treatment. |
| `image_url` | **Low** — usually present, occasionally null. | Already handled (placeholder fallback). But quality/aspect ratio varies. |
| `category` | **Medium** — freeform text, often null. When present, could drive layout hints. | Category could trigger visual themes or spec groupings (see below). |

---

## Concrete Opportunities (Ranked by Impact vs Effort)

### Tier 1: Low Effort, High Impact (v1.1)

**1. Conditional Section Visibility**
Don't show empty sections. This is already partially described in the element breakdown ("Empty arrays: section hidden") but should be systematic:

```
Rules:
- pros.length === 0 && cons.length === 0 → hide Pros & Cons accordion item
- scraped_reviews.length === 0 && !ai_review_summary → hide Reviews accordion item
- Object.keys(specs).length === 0 → hide Specs accordion item
- !rating → hide rating badge row entirely
- !ai_verdict → hide verdict badge
- !price_note → hide price note line
```

This isn't "dynamic UI" in the generative sense — it's just good conditional rendering. But it means a product with only an AI summary and a price looks clean and focused, not like a skeleton with empty sections.

**2. Verdict-Aware Coloring**
The `ai_verdict` already carries sentiment. Use it:

```
Verdict contains "best" / "top" / "excellent" / "premium"
  → badge: bg-green-500/10 text-green-700 border-green-500/20
  → icon: Trophy or Sparkles

Verdict contains "risky" / "mixed" / "caution" / "avoid"
  → badge: bg-amber-500/10 text-amber-700 border-amber-500/20
  → icon: AlertTriangle

Verdict contains "value" / "budget" / "affordable"
  → badge: bg-blue-500/10 text-blue-700 border-blue-500/20
  → icon: BadgeDollarSign

Default / neutral
  → badge: bg-ai-accent/10 text-ai-accent (current styling)
  → icon: Sparkles
```

Implementation: a simple keyword-match function. Or better — have Gemini return a `verdict_sentiment` enum (`positive`, `neutral`, `caution`, `negative`) during extraction. One extra field, zero ambiguity.

**3. Spec Count-Aware Layout**
Adapt the specs section based on how many specs exist:

```
≤ 3 specs  → render inline as key: value pairs (no table, no accordion)
4-8 specs  → standard two-column table in accordion (current design)
9+ specs   → grouped table with category headers (if category hints available)
            OR searchable/filterable specs with a search input
```

### Tier 2: Medium Effort, High Impact (v2)

**4. Category-Driven Section Ordering**
If `category` is set, reorder accordion sections by relevance:

```
Electronics (TV, laptop, phone):
  1. Specs (most important — users compare specs)
  2. AI Summary
  3. Pros & Cons
  4. Reviews

Fashion / Home:
  1. AI Summary (visual/subjective — summary matters more)
  2. Pros & Cons
  3. Reviews
  4. Specs (less important — "material: cotton" is not a decision driver)

Books / Media:
  1. AI Summary (essentially a review)
  2. Reviews
  3. Specs (just ISBN, pages, publisher — minimal)
  → Pros & Cons likely empty, auto-hidden
```

Implementation: a `categoryConfig` map that returns section order + default-open sections. Falls back to current order when `category` is null.

**5. Pros/Cons Sentiment Visualization**
Instead of flat lists, visualize the balance:

```
Mostly positive (4 pros, 1 con):
  ████████░░ 80% positive — show a subtle green tint on the section

Balanced (3 pros, 3 cons):
  █████░░░░░ 50/50 — neutral presentation, maybe a "Divisive" label

Mostly negative (1 pro, 4 cons):
  ██░░░░░░░░ 20% positive — amber/caution tint, "Proceed with caution" note
```

This turns raw data into an instant visual signal. Users glance and know whether to dive deeper or skip.

**6. Review Confidence Signal**
Combine `rating`, `review_count`, and `scraped_reviews` to show confidence:

```
rating: 4.5, review_count: 10,000+, reviews: 8 scraped
  → "Highly rated" badge, strong confidence, reviews section prominent

rating: 4.5, review_count: 12, reviews: 2 scraped
  → "Limited reviews" note, lower confidence signal, don't over-emphasize

rating: null, review_count: null, reviews: 0
  → "No reviews yet" — section hidden, no false confidence
```

### Tier 3: High Effort, Transformative (v3 / Generative UI)

**7. AI-Composed Layout via Generative UI**
Use the Vercel AI SDK's Generative UI pattern: instead of rendering a fixed component tree, have the LLM compose the sheet layout as part of the extraction step.

```
During extraction, Gemini returns:
{
  ...existing fields...,
  "ui_hints": {
    "hero_emphasis": "image",        // or "specs" or "price"
    "primary_section": "specs",      // what to open by default
    "callout": "Price dropped 15% in the last week",
    "comparison_prompt": "Similar to Product X but with better battery",
    "visual_theme": "tech"           // drives subtle color/icon theming
  }
}
```

The sheet reads `ui_hints` and adapts: a fashion product gets a large hero image with specs minimized. A laptop gets specs front-and-center with the image smaller. A book gets the AI summary as the hero element, no image prominence.

This is the [Vercel Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) pattern applied to product detail — not streaming React components from the LLM (overkill for our case), but using AI-generated layout hints to drive conditional rendering.

**8. Cross-Product Contextual Callouts**
When the sheet opens, check the product against others in the same list:

```
"Cheapest in your list" → if price_min is lowest among list products
"Highest rated" → if rating is highest
"Most reviewed" → if review_count is highest
"Similar to {other product}" → if AI detects overlap (via embeddings or category match)
"Only option under ₹10,000" → if it's the sole product in a price bracket
```

These callouts appear as a small banner below the AI verdict. They're computed client-side from the list's product data — no extra API call. They make each product sheet contextually aware of its surroundings.

---

## Architecture Considerations

**Where the logic lives:**
- Tier 1 (conditional visibility, verdict coloring): Pure client-side. React conditional rendering. No schema changes.
- Tier 2 (category ordering, sentiment viz): Client-side with a config map. Optional: store `category` more reliably by having Gemini always extract it.
- Tier 3 (AI-composed hints): Requires schema change (`ui_hints jsonb` column or extending `specs`). Logic in the extraction pipeline (Gemini prompt includes layout hint instructions).

**Risk: Uncanny valley of personalization.**
[NN/g research](https://www.nngroup.com/articles/ecommerce-product-pages/) and [industry observation](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products) both warn that overly aggressive adaptation can feel jarring — users expect consistency. The sweet spot: **same structure, different emphasis**. The accordion sections are always there (when data exists). The order, default-open state, and visual weight shift — but the user always knows where to find things.

**Principle: Data-absent = section-absent, not section-empty.**
Never render a section with placeholder text like "No specs available." If there's no data, the section doesn't exist. This makes sparse products (e.g., a book with just a title and AI summary) feel intentionally minimal, not broken.

---

## Recommendation

Start with **Tier 1 in v1** (conditional visibility + verdict coloring + spec count layout). These are essentially free — just better conditional rendering. They make every product sheet feel "right" without any generative AI complexity.

Introduce **Tier 2 in v2** once `category` is reliably extracted. Category-driven ordering is the single highest-impact change for making sheets feel product-aware.

Explore **Tier 3 in v3** only if the product mix is diverse enough to justify it. For a family buying a TV, a stroller, and headphones in the same list, AI layout hints would make each sheet feel bespoke. For a list of 10 laptops, the consistency of a fixed layout is actually better.

---

## References

- [Vercel AI SDK 3.0 — Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) — streaming React Server Components from LLMs
- [Google A2UI — Agent-Driven Interfaces](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) — cross-platform generative UI for AI agents
- [Stan Vision — UX/UI Trends 2026: Generative UI & AI Personalization](https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products) — Gartner's 30% prediction, adaptive interface patterns
- [CREHLER — UX/UI Trends in E-Commerce for 2026](https://crehler.com/en/ux-ui-trends-in-e-commerce-for-2026/) — real-time adaptive layouts in e-commerce
- [Medium — AI-Driven Trends in UI/UX Design 2025-2026](https://medium.com/@designstudiouiux/ai-driven-trends-in-ui-ux-design-2025-2026-7cb03e5e5324) — AI personalization at UI component level
- [Veza Digital — AI in UX/UI Design Trends 2026](https://www.vezadigital.com/post/ai-ux-ui-design-trends) — emotionally intelligent and context-aware interfaces
- [ustwo — Data-Driven React](https://ustwo.com/blog/data-driven-react/) — JSON-driven component trees for dynamic layout composition
- [Baymard — Product Page UX Best Practices 2025](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — collapsed sections outperform tabs; layout varies by product type
- [Dynamic Yield — Product Detail Page](https://www.dynamicyield.com/glossary/product-detail-page/) — AI personalization on product pages at scale
- [NN/g — UX Guidelines for E-Commerce Product Pages](https://www.nngroup.com/articles/ecommerce-product-pages/) — product page information architecture

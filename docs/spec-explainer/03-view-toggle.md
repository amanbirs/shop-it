# Phase 3: View Toggle

## Goal

Extend the existing grid/table view system to support a third "specs" mode. This phase is UI-only — no AI data needed. The specs view can render an empty state until Phase 4 components are built.

**Depends on:** Nothing (can run in parallel with Phase 1 and 2)

---

## Tasks

### 3.1 Extend View State

**File:** `components/lists/list-detail-content.tsx` (modify)

Currently the view state is either implicit (grid-only in the current implementation) or uses a simple toggle. Extend to a 3-way union:

```typescript
type ViewMode = "grid" | "table" | "specs"
```

Sync with URL via `nuqs`:

```typescript
const [view, setView] = useQueryState("view", {
  defaultValue: "grid",
  parse: (v) => (["grid", "table", "specs"].includes(v) ? v as ViewMode : "grid"),
})
```

### 3.2 View Toggle Component

**File:** `components/lists/view-toggle.tsx` (new or modify existing)

Extend the existing `ToggleGroup` (or create if it doesn't exist):

```typescript
<ToggleGroup type="single" value={view} onValueChange={setView}>
  <ToggleGroupItem value="grid" aria-label="Grid view">
    <LayoutGrid className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="table" aria-label="Table view">
    <Table2 className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="specs" aria-label="Spec comparison view">
    <Columns3 className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

Icon choice: `Columns3` from Lucide — visually suggests a comparison table. Alternative: `FlaskConical` (analysis/science feel) or `BarChart3` (ratings).

Tooltips on each item with keyboard shortcut hints:

- Grid: "Grid view (G)"
- Table: "Table view (T)"
- Specs: "Spec comparison (S)"

### 3.3 Conditional Rendering

**File:** `components/lists/list-detail-content.tsx` (modify)

In the main content area, switch on view mode:

```typescript
{view === "grid" && (
  <ProductGrid products={filtered} ... />
)}
{view === "table" && (
  <ProductTable products={filtered} ... />
)}
{view === "specs" && (
  <SpecExplainerView
    specAnalysis={specAnalysis}
    products={products}
    list={list}
    isStale={isSpecAnalysisStale}
  />
)}
```

For now (before Phase 4), `SpecExplainerView` can be a placeholder that renders the empty state.

**Important:** When in specs view, the filter tabs (`All / Shortlisted / Purchased`) and the URL input should still be visible. The specs view analyzes all completed products regardless of filter state — but the URL input lets users add more products without switching views.

### 3.4 Keyboard Shortcuts

Add keyboard shortcuts for view switching (optional, nice to have):

- `G` → grid
- `T` → table
- `S` → specs

Only active when no input/textarea is focused. Follow existing keyboard shortcut patterns in the app.

---

## Tests

- View defaults to "grid" when no URL param
- Setting `?view=specs` renders the specs view
- Invalid view param falls back to "grid"
- Toggle updates URL param
- All three toggle states render correct active styling
- Filter tabs remain visible in specs view
- URL input remains visible in specs view

---

## Acceptance Criteria

- [ ] Three-way toggle renders with correct icons
- [ ] URL state syncs via nuqs
- [ ] Each view mode renders its content area
- [ ] Specs view shows placeholder/empty state (until Phase 4)
- [ ] Filter tabs and URL input visible in all views
- [ ] Keyboard shortcuts work (if implemented)
- [ ] All tests pass

# "Shopping is Boring" — Entertainment Mode

> **Status: Exploration / v2+ consideration.**
> What if we acknowledged that browsing product lists isn't always thrilling — and gave users a way to make it fun?

---

## The Idea

A persistent **"Shopping is Boring"** button lives in the UI. When clicked, it opens an entertainment panel on the right side of the screen, offering two modes:

1. **Music via Spotify Connect** — authenticate with Spotify and control playback without leaving the app.
2. **Mini-Games** — classic, familiar games that run in a side panel while the user browses.

The premise is tongue-in-cheek: we *know* comparison shopping can be tedious (waiting for products to process, reading through specs, going back and forth). Instead of pretending otherwise, we lean into it and give people something to do.

---

## Entertainment Panel

The panel slides in from the right, overlaying or pushing the main content (responsive — overlay on smaller screens, side-by-side on wide screens). It stays open across page navigations so music doesn't stop and game state isn't lost.

### Spotify Integration

- Uses the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) to turn the browser into a Spotify Connect device.
- OAuth2 flow: user clicks "Connect Spotify" → redirected to Spotify auth → token stored in session.
- Minimal player UI: album art, track name, play/pause, skip, volume. Not a full Spotify clone.
- Playback continues while the user browses products, adds to lists, opens product sheets, etc.
- If the user doesn't have Spotify Premium (required for Web Playback SDK), fall back to showing a "Browse on Spotify" link that opens the Spotify app.

### Mini-Games

Classic, instantly recognizable games — no learning curve, no onboarding. The kind of thing you'd play while waiting.

**Launch candidates:**

| Game | Why | Complexity |
|------|-----|------------|
| **Minesweeper** | Universally known. Perfect for "kill 30 seconds while a product processes." | Low — grid logic, mine placement, flood-fill reveal. |
| **Pac-Man** | Iconic. Fun in short bursts. | Medium — maze rendering, ghost AI, collision detection. Could use an open-source canvas implementation. |
| **Snake** | Dead simple. Runs in a tiny panel. | Low — canvas-based, minimal state. |
| **2048** | Addictive, touch-friendly, fits a small panel perfectly. | Low — grid transforms, tile merging. |
| **Tetris** | Classic time-killer. Well-suited to a side panel aspect ratio. | Medium — piece rotation, line clearing, increasing speed. |

**Implementation approach:**
- Games render in a `<canvas>` or pure DOM inside the side panel.
- Each game is a self-contained component with its own state — no interaction with the shopping app state.
- Keyboard controls scoped to the game panel (don't interfere with main app shortcuts).
- Game state persists in `localStorage` so high scores survive page refreshes.
- Start with Minesweeper and Snake (lowest effort, highest recognition), then add others incrementally.

---

## UX Flow

```
User is browsing a product list
  → Notices "Shopping is Boring 🎮" button in the toolbar / footer
  → Clicks it
  → Side panel slides open from the right
  → Panel shows two tabs: "Music" and "Games"
  → Music tab: "Connect Spotify" button (or player if already connected)
  → Games tab: Grid of game icons (Minesweeper, Snake, etc.)
  → User picks a game → game loads in the panel
  → User continues browsing products in the main area while playing
  → Panel can be collapsed/minimized to a small floating icon
  → Clicking the icon re-expands the panel (game state preserved)
```

---

## Why This Works

- **Acknowledges reality.** Shopping research *is* sometimes boring. Pretending it isn't is dishonest UX. Naming it directly ("Shopping is Boring") is disarming and memorable.
- **Increases session time.** Users stay on the app longer when they're entertained. More time = more products explored = more value from the tool.
- **Differentiation.** No product comparison tool has a built-in game panel. It's unexpected and delightful — the kind of thing people share with friends.
- **Low stakes.** The entertainment layer is fully optional and doesn't interfere with core functionality. It's additive, not intrusive.

---

## Technical Considerations

- **Spotify OAuth scope:** `streaming`, `user-read-playback-state`, `user-modify-playback-state`. Requires registering the app in the Spotify Developer Dashboard.
- **Bundle size:** Games should be lazy-loaded. A canvas-based Minesweeper is tiny (~5KB). Pac-Man with assets could be larger — consider dynamic imports.
- **Panel state management:** Panel open/closed state and active tab stored in a lightweight Zustand slice or React context. Independent from product state.
- **Accessibility:** Games need keyboard support. Spotify player needs proper ARIA labels. Panel must be dismissible via Escape key.
- **Mobile:** On narrow screens, the panel becomes a bottom sheet or full-screen overlay (games aren't practical in a 100px sliver). Music player could become a compact floating mini-player.

---

## Open Questions

- Should the button text rotate with playful variations? ("Shopping is Boring", "Need a break?", "Bored yet?")
- Do we track entertainment usage analytics? (e.g., "users who play games spend 2x longer on the app")
- Should games be themed to match the app's design system, or keep their retro look for charm?
- Could we integrate with more music services beyond Spotify (Apple Music, YouTube Music)?

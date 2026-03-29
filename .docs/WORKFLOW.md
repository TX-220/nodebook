# NodeBook — Workflow & Development

## Quick Reference

**Project:** NodeBook — Interactive Chrome extension that visualizes browser bookmarks as a D3.js-powered mind map with dual layout modes (gantt/mindmap), search, import/export, and performance-optimized animations.

**Tech Stack:**
- **Browser:** Chrome (Manifest v3)
- **Rendering:** D3.js v7 (bundled)
- **Styling:** CSS3 (dark theme, glassmorphism, GPU-accelerated animations)
- **Language:** ES6 modules (vanilla JavaScript, no build step required)
- **APIs:** Chrome Bookmarks API, Clipboard API

**Key Features:**
- Real-time hierarchical bookmark visualization
- Dual layout modes: Gantt (horizontal) and Mindmap (left/right branches)
- Search with 250ms debounce (performance-optimized)
- Solar system animation theme (sun pulse, flow-light, solar-flare)
- Import/export as JSON
- Inline bookmark editing
- Effects toggle (animations ON/OFF)
- Fullscreen mode

---

## Infrastructure

**Extension runs entirely in Chrome**—no external services or ports required.

- **Service Worker:** `background.js` — handles Chrome events, permissions
- **UI Host:** `popup.html` — embedded popup (~700px wide), or fullscreen via "OPEN IN FULL TAB"
- **Renderer:** D3.js canvas in `#mindmap` div, GPU-accelerated CSS filters & animations
- **Permissions Used:**
  - `bookmarks` — read/write Chrome bookmark tree
  - `clipboardWrite` — export to clipboard

**Performance Notes:**
- CSS `will-change` on animated elements (sun, flow-light links)
- Transitions target specific properties only (no `transition: all`)
- Search debounced 250ms to prevent tree walk spam
- Highlight DOM updates batched in `requestAnimationFrame`

---

## Setup Prerequisites

**Required:**
- Git (for cloning, version control)
- Chrome browser (v90+, any Chromium-based browser)
- Text editor (VS Code recommended for syntax highlighting, .gitignore support)

**Not required:**
- Node.js, npm, pnpm (vanilla JS, no build step)
- Environment variables or `.env` files
- Docker or external services

**Recommended:**
- Chrome DevTools (F12) for debugging background service worker and popup context
- Git configured locally (`git config --global user.email`, `git config --global user.name`)

---

## Environment Setup

### Clone the Repository

```bash
# Clone into local directory
git clone https://github.com/<your-username>/nodebook.git
cd nodebook

# Verify file structure
ls -la
# Output should include: js/, css/, *.html, manifest.json, d3.v7.min.js
```

### File Structure

```
bookmark-mindmap-v2/
├── .docs/
│   └── WORKFLOW.md          # This file
├── .git/                     # Git history
├── js/
│   ├── main.js              # App initialization & event handlers
│   ├── bookmarks.js         # Chrome Bookmarks API wrapper
│   ├── renderer.js          # D3.js mind map visualization
│   └── ui.js                # UI controller (buttons, search, modals)
├── css/
│   └── style.css            # Styling (dark theme, animations, filters)
├── manifest.json            # Extension metadata & permissions (Manifest v3)
├── popup.html               # Extension popup UI
├── background.js            # Service worker (minimal, event-only)
├── d3.v7.min.js             # D3.js library (bundled, 280KB minified)
├── icon{16,48,128}.png      # Extension icons
└── README.md                # (Create if needed for GitHub)
```

### No Additional Setup Required

- **No `package.json`** — this is vanilla JavaScript
- **No `.env` file** — all configuration is in source code (hardcoded colors, timings)
- **No build step** — files are used directly by Chrome

---

## Running the App

### Load the Extension in Chrome

1. **Open Extension Management:**
   ```
   chrome://extensions/
   ```
   Or: **Menu → More Tools → Extensions**

2. **Enable Developer Mode** (top-right toggle)

3. **Click "Load unpacked"** and select the project directory:
   ```
   /home/max/projects/bookmark-mindmap-v2
   ```
   (or wherever you cloned the nodebook repository)

4. **Extension appears in toolbar** — click icon to open popup

### Full-Screen Mode

Inside the popup, click **"✨ OPEN IN FULL TAB"** button to open the mind map in a dedicated tab (better for large bookmark sets).

### Reload After Changes

- **CSS/HTML changes:** Click reload icon next to extension in `chrome://extensions/`
- **JavaScript changes:** Click reload icon, then close/reopen popup or full tab
- **manifest.json changes:** Remove and re-load unpacked extension

### Keyboard Shortcuts (Popup)

- **Ctrl+F** (or Cmd+F on Mac) — Focus search input
- **Escape** — Clear search, reset highlighting
- **Scroll wheel** — Zoom in/out on mind map
- **Drag** — Pan the visualization

---

## Development Workflow

### Making Changes

1. **Edit files** in your editor (css/, js/, or HTML)
2. **Reload extension** in Chrome (icon next to extension name in `chrome://extensions/`)
3. **Test in popup** or click "OPEN IN FULL TAB" for larger viewport
4. **Commit and push:**
   ```bash
   git add .
   git commit -m "fix: improve search debounce performance"
   git push origin main
   ```

### Testing Search Performance

- Open **DevTools** (F12 in popup/full tab)
- Go to **Performance** tab
- **Record** 5 seconds of typing in search box
- Look for:
  - Reduced "Recalculate Style" duration
  - Fewer paint records (due to debounce + rAF batching)
  - Smooth frame rate (60 FPS target)

### Debugging Service Worker

- In `chrome://extensions/`, find this extension
- Click **"Service Worker"** link → opens DevTools for background context
- View logs, set breakpoints on `background.js`

---

## Version Control & GitHub

**Before pushing:**
- Verify version in `manifest.json` is updated
- Run local tests (search, expand/collapse, layout toggle, import/export)
- Check for hardcoded credentials (should be none)

**Commit message format:**
```
<type>: <description>

Examples:
- feat: add solar-flare animation to sun node
- fix: debounce search input to prevent tree walk spam
- perf: batch highlight DOM updates in requestAnimationFrame
- docs: add WORKFLOW.md with setup instructions
```

**Push to GitHub:**
```bash
git push origin main
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't load | Check manifest.json syntax (JSON validator), try reloading |
| Search freezes UI | Search debounce is working—type slower or wait 250ms |
| No bookmarks appear | Check Chrome Bookmarks Manager (`chrome://bookmarks`), reload extension |
| Animation stutters | Toggle "Effects: OFF" button, check DevTools Performance tab for long paint frames |
| Changes don't reflect | Reload extension icon in `chrome://extensions/`, close & reopen popup |

---

## Performance Optimizations (Implemented)

See `css/style.css` and `js/` for:
- **Transition targeting:** Specific properties only (not `transition: all`)
- **Will-change:** On animated elements to promote compositor layers
- **Search debounce:** 250ms prevents tree walk on every keystroke
- **rAF batching:** Highlight DOM updates batched with paint cycle
- **Blur removed:** From `.link-glow` filter (kept `drop-shadow` for visual effect)

---

## Support & Feedback

For issues or feature requests, open a GitHub issue in the main repository.

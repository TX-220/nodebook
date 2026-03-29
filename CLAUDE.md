# CLAUDE.md — NodeBook

This file provides context for Claude Code when working in this repository.

## Project

NodeBook is a Chrome extension (Manifest v3) that renders Chrome bookmarks as an interactive D3.js v7 mind map. There is no build step, no Node.js runtime, and no environment variables.

## Infrastructure

The extension runs entirely inside Chrome — no external services, no ports, no servers.

- **Service Worker:** `background.js` — listens for Chrome action events, opens popup in a full tab
- **UI Host:** `popup.html` — popup (~700px) or fullscreen via "OPEN IN FULL TAB" button
- **Renderer:** D3.js force/tree layout in the `#mindmap` div, GPU-accelerated via CSS `will-change`
- **Permissions:**
  - `bookmarks` — read/write the Chrome bookmark tree via `chrome.bookmarks.getTree()`
  - `clipboardWrite` — copy exported data to clipboard

**Module graph:**
```
popup.html
  └── js/main.js          (ES module entry, wires everything)
        ├── js/bookmarks.js   (Chrome API wrapper, data processing, search)
        ├── js/renderer.js    (D3.js tree/gantt renderer)
        └── js/ui.js          (buttons, search, modals, toasts)
```

D3.js is bundled as `d3.v7.min.js` and loaded as a plain `<script>` tag before the ES module entry.

## Running the App

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"** and select this project directory
4. Click the NodeBook icon in the Chrome toolbar to open the popup

After editing any file, click the reload icon next to the extension in `chrome://extensions/`. After editing `manifest.json`, remove and re-add the unpacked extension.

## Development Notes

- **No build step** — files are loaded directly by Chrome
- **No Node.js required** to run the extension; `npm run build` requires Node only to zip for distribution
- Stray DKIM/cloud-DNS files in the project root (`dkim.bat`, `transaction.yaml`, etc.) are gitignored and unrelated to this project
- The `.docs/WORKFLOW.md` has detailed performance, debugging, and git workflow notes
- Commit message format: `<type>: <description>` (feat / fix / perf / docs / refactor)

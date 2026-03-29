# NodeBook

A Chrome extension that visualizes your bookmarks as an interactive D3.js mind map.

![NodeBook](icon128.png)

## Features

- Real-time hierarchical visualization of your Chrome bookmarks
- Dual layout modes: **Gantt** (horizontal tree) and **Mindmap** (left/right branches)
- Search with 250ms debounce for smooth performance
- Solar system animation theme with **Effects toggle** (ON/OFF)
- Import bookmarks from Chrome HTML export files
- Export bookmark tree as JSON
- Fullscreen mode — open the map in a dedicated tab
- Inline bookmark editing

## Usage

1. Open Chrome Extensions (`chrome://extensions`)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this extension folder
4. Click the extension icon in the toolbar
5. The mind map will display your Chrome bookmarks as an interactive graph
6. Click nodes to expand/collapse folders, drag to explore the spatial layout

## Tech Stack

- **Chrome Manifest v3** — Permissions: `bookmarks`, `clipboardWrite`
- **D3.js v7** — bundled (`d3.v7.min.js`), no CDN dependency
- **ES6 modules** — `js/main.js`, `js/bookmarks.js`, `js/renderer.js`, `js/ui.js`
- **Vanilla JavaScript** — no build step, no Node.js required to run

## Project Structure

```
nodebook/
├── js/
│   ├── main.js          # App initialization & event wiring
│   ├── bookmarks.js     # Chrome Bookmarks API wrapper
│   ├── renderer.js      # D3.js mind map renderer
│   └── ui.js            # UI controller (search, modals, buttons)
├── css/
│   └── style.css        # Dark theme, glassmorphism, GPU animations
├── manifest.json        # Extension manifest (v3)
├── popup.html           # Extension popup UI
├── background.js        # Service worker (event-only)
├── d3.v7.min.js         # Bundled D3.js v7
├── icon16.png
├── icon48.png
└── icon128.png
```

## Development

No build step is required. Edit files directly and reload the extension in `chrome://extensions/`.

To package a distributable zip:

```bash
npm run build
```

To validate `manifest.json` syntax:

```bash
npm run validate
```

## Credits

- **Claude Code** - Core functionality and implementation
- **Gemini** - UI design and styling

## License

[MIT](LICENSE)

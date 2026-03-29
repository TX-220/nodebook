import { BookmarkService } from './bookmarks.js';
import { MindMapRenderer } from './renderer.js';
import { UIController } from './ui.js';

class App {
    constructor() {
        this.bookmarks = new BookmarkService();
        this.ui = new UIController({
            onSearch: (q) => this.handleSearch(q),
            onLayoutToggle: () => this.handleLayoutToggle(),
            onEffectsToggle: () => this.handleEffectsToggle(),
            onExpandAll: () => this.handleExpandAll(),
            onCollapseAll: () => this.handleCollapseAll(),
            onResetView: () => this.handleResetView(),
            onFullscreen: () => this.handleFullscreen(),
            onImport: () => this.handleImport(),
            onExport: (type) => this.handleExport(type)
        });

        this.renderer = new MindMapRenderer('#mindmap', (event, d) => this.handleNodeClick(event, d));
        this.layout = 'gantt';
        this.effectsEnabled = true;

        this.init();
    }

    async init() {
        try {
            this.ui.showLoading(true);
            const data = await this.bookmarks.load();
            this.ui.updateStats(this.bookmarks.stats);
            this.renderer.update(data);
            this.ui.showLoading(false);
        } catch (error) {
            console.error('App init failed:', error);
            this.ui.showToast('Failed to load bookmarks', 'error');
        }
    }

    handleNodeClick(event, d) {
        event.stopPropagation();

        if (d.data.isFolder) {
            d.data.collapsed = !d.data.collapsed;
            this.renderer.update(this.bookmarks.processedData);
        } else if (d.data.url) {
            chrome.tabs.create({ url: d.data.url });
        }
    }

    handleLayoutToggle() {
        this.layout = this.layout === 'gantt' ? 'mindmap' : 'gantt';
        this.renderer.setLayoutMode(this.layout);
        this.renderer.update(this.bookmarks.processedData);
        this.ui.updateLayoutLabel(this.layout);
    }

    handleEffectsToggle() {
        this.effectsEnabled = !this.effectsEnabled;
        document.body.classList.toggle('static-mode', !this.effectsEnabled);
        this.ui.updateEffectsLabel(this.effectsEnabled);
    }

    handleSearch(query) {
        const matches = this.bookmarks.search(query);
        this.renderer.highlight(matches);
    }

    handleExpandAll() {
        this.bookmarks.setAllCollapsed(false);
        this.renderer.update(this.bookmarks.processedData);
    }

    handleCollapseAll() {
        this.bookmarks.setAllCollapsed(true);
        this.renderer.update(this.bookmarks.processedData);
    }

    handleResetView() {
        this.renderer.centerView();
    }

    handleFullscreen() {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }

    handleImport() {
        this.ui.showToast('Select a file to import (HTML only)', 'info');
        // Trigger a hidden file input or open manager
        this.ui.showModal('Import Bookmarks', `
            <p>Select a Chrome HTML bookmark file.</p>
            <input type="file" id="modal-import-file" accept=".html">
            <button class="btn btn-primary" id="modal-import-btn" style="margin-top: 10px;">Process File</button>
        `);
    }

    handleExport(type) {
        if (type === 'json') {
            const blob = new Blob([JSON.stringify(this.bookmarks.processedData, null, 2)], { type: 'application/json' });
            this._download(blob, 'bookmarks.json');
        } else {
            // Placeholder for HTML export if needed
            this.ui.showToast('HTML export not implemented in this preview', 'info');
        }
    }

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', () => new App());

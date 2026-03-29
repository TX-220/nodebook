/**
 * UI Controller
 * Manages buttons, modals, and search interactions.
 */
export class UIController {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this._searchTimer = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => {
                    this.callbacks.onSearch(e.target.value);
                }, 250);
            });
        }

        // Action Buttons
        this._bind('layout-toggle-btn', () => this.callbacks.onLayoutToggle());
        this._bind('effects-toggle-btn', () => this.callbacks.onEffectsToggle());
        this._bind('expand-all-btn', () => this.callbacks.onExpandAll());
        this._bind('collapse-all-btn', () => this.callbacks.onCollapseAll());
        this._bind('reset-view-btn', () => this.callbacks.onResetView());
        this._bind('fullscreen-btn', () => this.callbacks.onFullscreen());

        // Settings / Export / Import
        this._bind('import-btn', () => this.callbacks.onImport());
        this._bind('export-json-btn', () => this.callbacks.onExport('json'));
        this._bind('export-html-btn', () => this.callbacks.onExport('html'));
        this._bind('open-manager-btn', () => chrome.tabs.create({ url: 'chrome://bookmarks' }));

        // Modal logic
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
    }

    _bind(id, callback) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', callback);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = show ? '1' : '0';
            setTimeout(() => {
                if (!show) overlay.classList.add('hidden');
                else overlay.classList.remove('hidden');
            }, show ? 0 : 500);
        }
    }

    updateStats(stats) {
        const statsEl = document.getElementById('stats');
        if (statsEl) {
            statsEl.textContent = `${stats.bookmarks} bookmarks | ${stats.folders} folders`;
        }
    }

    updateLayoutLabel(mode) {
        const btn = document.getElementById('layout-toggle-btn');
        if (btn) {
            const label = mode.charAt(0).toUpperCase() + mode.slice(1);
            btn.textContent = `Layout: ${label}`;
        }
    }

    updateEffectsLabel(enabled) {
        const btn = document.getElementById('effects-toggle-btn');
        if (btn) {
            btn.textContent = `Effects: ${enabled ? 'ON' : 'OFF'}`;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    showModal(title, contentHtml) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = overlay.querySelector('.modal-body');

        titleEl.textContent = title;
        bodyEl.innerHTML = contentHtml;
        overlay.classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
}

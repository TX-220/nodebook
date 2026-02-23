/**
 * Bookmarks Data Layer
 * Handles fetching, parsing, and searching bookmark data.
 */
export class BookmarkService {
    constructor() {
        this.rawTree = null;
        this.processedData = null;
        this.stats = { bookmarks: 0, folders: 0 };
    }

    /**
     * Loads the entire bookmark tree from Chrome.
     */
    async load() {
        return new Promise((resolve, reject) => {
            if (!chrome?.bookmarks) {
                reject(new Error("Chrome Bookmarks API is not available."));
                return;
            }

            chrome.bookmarks.getTree((results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    this.rawTree = results[0];
                    this.stats = { bookmarks: 0, folders: 0 };
                    this.processedData = this._processNode(this.rawTree);
                    resolve(this.processedData);
                }
            });
        });
    }

    /**
     * Recursively processes a bookmark node into a visualization-friendly format.
     */
    _processNode(node) {
        const isFolder = !node.url;

        if (isFolder) this.stats.folders++;
        else this.stats.bookmarks++;

        const processed = {
            id: node.id,
            title: node.title || (node.id === '0' ? 'Root' : 'Untitled'),
            url: node.url || null,
            isFolder: isFolder,
            collapsed: false, // Default state
            children: []
        };

        if (node.children) {
            processed.children = node.children
                .map(child => this._processNode(child))
                .filter(Boolean);
        }

        return processed;
    }

    /**
     * Searches the local processed data.
     */
    search(query, node = this.processedData, results = new Set()) {
        if (!query) return results;

        const q = query.toLowerCase();
        if (node.title.toLowerCase().includes(q) || (node.url && node.url.toLowerCase().includes(q))) {
            results.add(node.id);
        }

        if (node.children) {
            node.children.forEach(child => this.search(query, child, results));
        }

        return results;
    }

    /**
     * Toggles collapsed state globally.
     */
    setAllCollapsed(value, node = this.processedData) {
        if (node.isFolder) {
            node.collapsed = value;
        }
        if (node.children) {
            node.children.forEach(child => this.setAllCollapsed(value, child));
        }
    }
}

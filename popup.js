// Bookmark Mind Map - Main Logic v2.0
// Security: All text sanitized, no eval(), strict mode
// Features: Import, inline editing, error handling, GitMind-style horizontal layout
'use strict';

class BookmarkMindMap {
  constructor() {
    this.data = null;
    this.root = null;
    this.svg = null;
    this.g = null;
    this.zoom = null;
    this.totalBookmarks = 0;
    this.currentTransform = null;
    this.editingNode = null;

    // Performance: Track collapsed state
    this.collapsedNodes = new Set();

    // Cache all bookmark URLs for duplicate detection
    this.existingUrls = new Set();
  }

  start() {
    // Set d3 reference after class is fully constructed
    this.currentTransform = d3.zoomIdentity;
    this.init();
  }

  // --- Toast notifications ---

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `${type} show`;
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // --- Initialization ---

  async init() {
    try {
      console.log('[MindMap] Loading bookmarks...');
      await this.loadBookmarks();
      console.log('[MindMap] Bookmarks loaded. Total:', this.totalBookmarks);
      console.log('[MindMap] Data:', JSON.stringify(this.data).substring(0, 200));
      this.setupSVG();
      console.log('[MindMap] SVG setup complete');
      this.setupControls();
      console.log('[MindMap] Controls setup complete');
      this.render();
      console.log('[MindMap] Render complete');
      document.getElementById('loading').style.display = 'none';
    } catch (error) {
      console.error('Initialization failed:', error);
      console.error('Stack trace:', error.stack);
      document.getElementById('loading').textContent = 'Error: ' + error.message;
      this.showToast('Failed to load bookmarks: ' + error.message, 'error', 5000);
    }
  }

  async loadBookmarks() {
    return new Promise((resolve, reject) => {
      try {
        chrome.bookmarks.getTree((tree) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!tree || !Array.isArray(tree) || tree.length === 0) {
            reject(new Error('Invalid bookmark tree'));
            return;
          }

          this.data = this.processBookmarkTree(tree[0]);
          this.totalBookmarks = 0;
          this.existingUrls.clear();
          this.countBookmarks(this.data);
          this.updateStats();
          resolve();
        });
      } catch (error) {
        reject(new Error('Bookmarks API unavailable: ' + error.message));
      }
    });
  }

  processBookmarkTree(node) {
    const sanitize = (text) => {
      if (!text) return 'Untitled';
      return text.replace(/[<>]/g, '').substring(0, 200);
    };

    const processed = {
      id: node.id,
      title: sanitize(node.title || 'Root'),
      url: node.url || null,
      isFolder: !node.url,
      children: []
    };

    if (node.children && Array.isArray(node.children)) {
      processed.children = node.children
        .map(child => this.processBookmarkTree(child))
        .filter(child => child !== null);
    }

    return processed;
  }

  countBookmarks(node) {
    if (!node.isFolder && node.url) {
      this.totalBookmarks++;
      this.existingUrls.add(node.url);
    }
    if (node.children) {
      node.children.forEach(child => this.countBookmarks(child));
    }
  }

  updateStats() {
    const folderCount = this.countFolders(this.data);
    document.getElementById('stats').textContent =
      `${this.totalBookmarks} bookmarks \u2022 ${folderCount} folders`;
  }

  countFolders(node) {
    let count = node.isFolder ? 1 : 0;
    if (node.children) {
      node.children.forEach(child => {
        count += this.countFolders(child);
      });
    }
    return count;
  }

  // --- SVG Setup ---

  setupSVG() {
    const container = document.getElementById('mindmap');
    this.containerWidth = container.clientWidth;
    this.containerHeight = container.clientHeight;

    this.svg = d3.select('#mindmap')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    this.svg.on('mousedown', () => {
      container.classList.add('grabbing');
    });
    this.svg.on('mouseup', () => {
      container.classList.remove('grabbing');
    });

    // Main group - centered in viewport
    this.g = this.svg.append('g');
  }

  // --- Controls ---

  setupControls() {
    document.getElementById('search').addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    document.getElementById('expandAll').addEventListener('click', () => {
      this.expandAll();
    });

    document.getElementById('collapseAll').addEventListener('click', () => {
      this.collapseAll();
    });

    document.getElementById('resetView').addEventListener('click', () => {
      this.resetView();
    });

    document.getElementById('exportJSON').addEventListener('click', () => {
      this.exportJSON();
    });

    document.getElementById('exportHTML').addEventListener('click', () => {
      this.exportHTML();
    });

    document.getElementById('openManager').addEventListener('click', () => {
      try {
        chrome.tabs.create({ url: 'chrome://bookmarks' });
      } catch (error) {
        console.error('Failed to open bookmark manager:', error);
        this.showToast('Failed to open bookmark manager', 'error');
      }
    });

    // Import controls
    document.getElementById('importBtn').addEventListener('click', () => {
      this.showImportModal();
    });

    document.getElementById('importCancel').addEventListener('click', () => {
      this.hideImportModal();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      document.getElementById('importStart').disabled = !e.target.files.length;
    });

    document.getElementById('importStart').addEventListener('click', () => {
      this.startImport();
    });

    // Close import modal on overlay click
    document.getElementById('importModal').addEventListener('click', (e) => {
      if (e.target.id === 'importModal') {
        this.hideImportModal();
      }
    });

    // Context menu handling
    const contextMenu = document.getElementById('contextMenu');

    document.addEventListener('click', () => {
      contextMenu.style.display = 'none';
    });

    contextMenu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action && this.contextMenuTarget) {
        this.handleContextMenuAction(action, this.contextMenuTarget);
      }
      contextMenu.style.display = 'none';
    });

    // Close inline edit on click outside
    document.addEventListener('click', (e) => {
      if (this.editingNode && !e.target.classList.contains('inline-edit-input')) {
        this.cancelInlineEdit();
      }
    });

    // ESC to cancel inline edit
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editingNode) {
        this.cancelInlineEdit();
      }
    });
  }

  // --- Rendering (GitMind-style: root center, branches left & right) ---

  render() {
    this.g.selectAll('*').remove();

    // Determine visible children (respecting collapsed state)
    const getVisibleChildren = (d) => {
      if (this.collapsedNodes.has(d.id)) return null;
      return d.children && d.children.length > 0 ? d.children : null;
    };

    // Count visible leaves for a data subtree
    const countVisibleLeaves = (node) => {
      const kids = getVisibleChildren(node);
      if (!kids || kids.length === 0) return 1;
      let count = 0;
      for (const child of kids) count += countVisibleLeaves(child);
      return count;
    };

    const rootChildren = getVisibleChildren(this.data) || [];

    // Collect all positioned nodes and links as plain {x, y, data, depth} objects
    const allNodes = [];
    const allLinks = []; // each: {sx, sy, tx, ty}

    const nodeSpacingY = 32;
    const depthSpacingX = 220;

    // Layout one side of the tree and collect plain coordinate objects
    const layoutSide = (children, direction) => {
      if (children.length === 0) return;

      const sideData = { ...this.data, children: children };
      const root = d3.hierarchy(sideData, getVisibleChildren);
      const leafCount = Math.max(countVisibleLeaves(sideData), 2);
      const treeHeight = leafCount * nodeSpacingY;
      const treeDepth = depthSpacingX * Math.max(root.height, 1);

      // Use nodeSize instead of size for consistent per-node spacing
      // This prevents expanded subtrees from overlapping neighbors
      const treeLayout = d3.tree()
        .nodeSize([nodeSpacingY, depthSpacingX])
        .separation((a, b) => {
          if (a.parent === b.parent) return 1;
          // More space between nodes from different parents
          return 1.5;
        });
      treeLayout(root);

      // With nodeSize, root is at (0,0), d.x = vertical spread, d.y = depth
      // We want: horizontal = depth * direction, vertical = spread (already centered)
      const coordMap = new Map();
      root.each(d => {
        const finalX = d.y * direction;          // depth -> horizontal
        const finalY = d.x;                      // spread -> vertical (nodeSize centers at 0)
        coordMap.set(d, { x: finalX, y: finalY });
      });

      // Collect non-root nodes
      root.descendants().forEach(d => {
        if (d.depth === 0) return; // skip virtual root copy
        const pos = coordMap.get(d);
        allNodes.push({
          data: d.data,
          depth: d.depth,
          x: pos.x,
          y: pos.y,
          side: direction
        });
      });

      // Collect links (use root=(0,0) for depth-0 sources)
      root.links().forEach(l => {
        const srcPos = l.source.depth === 0
          ? { x: 0, y: 0 }
          : coordMap.get(l.source);
        const tgtPos = coordMap.get(l.target);
        allLinks.push({
          sx: srcPos.x, sy: srcPos.y,
          tx: tgtPos.x, ty: tgtPos.y
        });
      });
    };

    // Split root's children: first half right, second half left
    const mid = Math.ceil(rootChildren.length / 2);
    layoutSide(rootChildren.slice(0, mid), 1);   // right
    layoutSide(rootChildren.slice(mid), -1);      // left

    // Add root node at center
    allNodes.unshift({ data: this.data, depth: 0, x: 0, y: 0, side: 0 });

    // --- Draw links as smooth horizontal bezier curves ---
    this.g.selectAll('.link')
      .data(allLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        const mx = (d.sx + d.tx) / 2;
        return `M${d.sx},${d.sy} C${mx},${d.sy} ${mx},${d.ty} ${d.tx},${d.ty}`;
      });

    // --- Draw nodes ---
    const nodeGroups = this.g.selectAll('.node')
      .data(allNodes, d => d.data.id)
      .enter()
      .append('g')
      .attr('class', d => {
        const classes = ['node'];
        if (d.data.isFolder) classes.push('folder');
        if (d.depth === 0) classes.push('root');
        if (this.collapsedNodes.has(d.data.id)) classes.push('collapsed');
        return classes.join(' ');
      })
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => this.handleNodeClick(event, d))
      .on('dblclick', (event, d) => this.handleNodeDblClick(event, d))
      .on('contextmenu', (event, d) => this.handleContextMenu(event, d));

    nodeGroups.append('circle')
      .attr('r', d => d.depth === 0 ? 10 : 5);

    // Text labels: right-side nodes get text to the right, left-side to the left
    nodeGroups.append('text')
      .attr('dy', '0.35em')
      .attr('x', d => {
        if (d.depth === 0) return 0;
        return d.side > 0 ? 10 : -10;
      })
      .attr('text-anchor', d => {
        if (d.depth === 0) return 'middle';
        return d.side > 0 ? 'start' : 'end';
      })
      .text(d => d.data.title.substring(0, 50))
      .style('font-size', d => d.depth === 0 ? '15px' : '12px')
      .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal');

    this.centerView();
  }

  centerView() {
    const container = document.getElementById('mindmap');
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    this.svg.call(
      this.zoom.transform,
      d3.zoomIdentity.translate(cx, cy).scale(0.85)
    );
  }

  // --- Node interactions ---

  handleNodeClick(event, d) {
    event.stopPropagation();

    if (!d.data.isFolder && d.data.url) {
      try {
        chrome.tabs.create({ url: d.data.url });
      } catch (error) {
        console.error('Failed to open tab:', error);
        this.showToast('Failed to open bookmark', 'error');
      }
      return;
    }

    if (d.data.isFolder && d.data.children && d.data.children.length > 0) {
      if (this.collapsedNodes.has(d.data.id)) {
        this.collapsedNodes.delete(d.data.id);
      } else {
        this.collapsedNodes.add(d.data.id);
      }
      this.render();
    }
  }

  handleNodeDblClick(event, d) {
    event.stopPropagation();
    event.preventDefault();

    if (d.depth === 0) return;

    this.startInlineEdit(event, d);
  }

  // --- Inline editing ---

  startInlineEdit(event, d) {
    if (this.editingNode) {
      this.cancelInlineEdit();
    }

    this.editingNode = d;

    this.g.selectAll('.node')
      .filter(n => n.data.id === d.data.id)
      .classed('editing', true)
      .select('text')
      .style('visibility', 'hidden');

    const mindmap = document.getElementById('mindmap');
    const svgRect = this.svg.node().getBoundingClientRect();
    const mindmapRect = mindmap.getBoundingClientRect();

    const screenX = this.currentTransform.applyX(d.x) + svgRect.left - mindmapRect.left;
    const screenY = this.currentTransform.applyY(d.y) + svgRect.top - mindmapRect.top;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = d.data.title;

    // Position based on which side of root the node is on
    if (d.side >= 0) {
      input.style.left = (screenX + 10) + 'px';
    } else {
      input.style.left = (screenX - 160) + 'px';
    }
    input.style.top = (screenY - 12) + 'px';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveInlineEdit(input.value.trim());
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelInlineEdit();
      }
    });

    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    mindmap.appendChild(input);
    input.focus();
    input.select();
  }

  async saveInlineEdit(newTitle) {
    if (!this.editingNode) return;

    const nodeData = this.editingNode.data;

    if (!newTitle || newTitle === nodeData.title) {
      this.cancelInlineEdit();
      return;
    }

    const sanitized = newTitle.replace(/[<>]/g, '').substring(0, 200);

    try {
      await new Promise((resolve, reject) => {
        chrome.bookmarks.update(nodeData.id, { title: sanitized }, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result);
        });
      });

      nodeData.title = sanitized;
      this.showToast('Bookmark renamed', 'success');
    } catch (error) {
      console.error('Failed to rename bookmark:', error);
      this.showToast('Failed to rename: ' + error.message, 'error');
    }

    this.cleanupInlineEdit();
    this.render();
  }

  cancelInlineEdit() {
    if (!this.editingNode) return;
    this.cleanupInlineEdit();
    this.render();
  }

  cleanupInlineEdit() {
    const input = document.querySelector('.inline-edit-input');
    if (input) {
      input.remove();
    }

    if (this.editingNode) {
      this.g.selectAll('.node')
        .filter(n => n.data.id === this.editingNode.data.id)
        .classed('editing', false)
        .select('text')
        .style('visibility', 'visible');
    }

    this.editingNode = null;
  }

  // --- Search ---

  handleSearch(query) {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      this.g.selectAll('.node')
        .classed('highlight', false)
        .classed('dimmed', false);
      return;
    }

    const matches = new Set();
    this.findMatches(this.data, trimmed, matches);

    this.g.selectAll('.node')
      .classed('highlight', d => matches.has(d.data.id))
      .classed('dimmed', d => !matches.has(d.data.id));
  }

  findMatches(node, query, matches) {
    if (node.title.toLowerCase().includes(query)) {
      matches.add(node.id);
    }
    if (node.url && node.url.toLowerCase().includes(query)) {
      matches.add(node.id);
    }
    if (node.children) {
      node.children.forEach(child => this.findMatches(child, query, matches));
    }
  }

  // --- Expand / Collapse ---

  expandAll() {
    this.collapsedNodes.clear();
    this.render();
  }

  collapseAll() {
    this.collapseNode(this.data);
    this.render();
  }

  collapseNode(node) {
    if (node.children && node.children.length > 0) {
      this.collapsedNodes.add(node.id);
      node.children.forEach(child => this.collapseNode(child));
    }
  }

  resetView() {
    this.centerView();
  }

  // --- Context menu ---

  handleContextMenu(event, d) {
    event.preventDefault();
    event.stopPropagation();

    const contextMenu = document.getElementById('contextMenu');
    this.contextMenuTarget = d;

    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.style.display = 'block';
  }

  handleContextMenuAction(action, d) {
    switch (action) {
      case 'rename':
        this.startInlineEdit(null, d);
        break;

      case 'edit':
        try {
          chrome.tabs.create({ url: `chrome://bookmarks/?id=${d.data.id}` });
        } catch (error) {
          console.error('Failed to open bookmark manager:', error);
          this.showToast('Failed to open bookmark manager', 'error');
        }
        break;

      case 'delete':
        try {
          chrome.tabs.create({ url: `chrome://bookmarks/?id=${d.data.id}` });
        } catch (error) {
          console.error('Failed to open bookmark manager:', error);
          this.showToast('Failed to open bookmark manager', 'error');
        }
        break;

      case 'copy':
        if (d.data.url) {
          try {
            navigator.clipboard.writeText(d.data.url);
            this.showToast('URL copied to clipboard', 'success');
          } catch (error) {
            console.error('Failed to copy URL:', error);
            this.showToast('Failed to copy URL', 'error');
          }
        }
        break;

      case 'open-new':
        if (d.data.url) {
          try {
            chrome.tabs.create({ url: d.data.url });
          } catch (error) {
            console.error('Failed to open tab:', error);
            this.showToast('Failed to open bookmark', 'error');
          }
        }
        break;
    }
  }

  // --- Import ---

  showImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('importFile').value = '';
    document.getElementById('importStart').disabled = true;
    document.getElementById('importProgress').style.display = 'none';
  }

  hideImportModal() {
    document.getElementById('importModal').classList.remove('show');
  }

  async startImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) return;

    const duplicateMode = document.getElementById('duplicateMode').value;

    document.getElementById('importStart').disabled = true;
    document.getElementById('importCancel').disabled = true;

    const progressDiv = document.getElementById('importProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Reading file...';

    try {
      const htmlContent = await this.readFileAsText(file);

      progressText.textContent = 'Parsing bookmarks...';
      progressFill.style.width = '10%';

      const parsed = this.parseNetscapeBookmarks(htmlContent);

      if (!parsed || parsed.length === 0) {
        throw new Error('No bookmarks found in file. Ensure it is a valid Netscape/Chrome bookmark HTML export.');
      }

      const existingUrls = new Set();
      this.collectUrls(this.data, existingUrls);

      let toImport = parsed;
      let skipped = 0;
      if (duplicateMode === 'skip') {
        const result = this.filterDuplicates(parsed, existingUrls);
        toImport = result.items;
        skipped = result.skipped;
      }

      const totalItems = this.countImportItems(toImport);

      if (totalItems === 0) {
        this.showToast(`All ${skipped} bookmark(s) already exist. Nothing to import.`, 'info');
        this.hideImportModal();
        document.getElementById('importCancel').disabled = false;
        return;
      }

      progressText.textContent = `Importing ${totalItems} bookmarks...`;
      progressFill.style.width = '20%';

      const timestamp = new Date().toISOString().split('T')[0];
      const importFolder = await this.createBookmark({
        parentId: '1',
        title: `Imported ${timestamp}`
      });

      let imported = 0;
      const onProgress = () => {
        imported++;
        const pct = 20 + Math.floor((imported / totalItems) * 75);
        progressFill.style.width = pct + '%';
        progressText.textContent = `Imported ${imported} of ${totalItems}...`;
      };

      await this.importItems(toImport, importFolder.id, onProgress);

      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';

      await this.loadBookmarks();
      this.render();

      const msg = skipped > 0
        ? `Imported ${imported} bookmarks (${skipped} duplicates skipped)`
        : `Imported ${imported} bookmarks`;
      this.showToast(msg, 'success', 4000);

      setTimeout(() => this.hideImportModal(), 500);

    } catch (error) {
      console.error('Import failed:', error);
      this.showToast('Import failed: ' + error.message, 'error', 5000);
      progressText.textContent = 'Import failed';
      progressFill.style.width = '0%';
    } finally {
      document.getElementById('importCancel').disabled = false;
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  parseNetscapeBookmarks(html) {
    if (!html.includes('<DL>') && !html.includes('<dl>')) {
      throw new Error('Invalid bookmark file: missing <DL> structure');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const topDL = doc.querySelector('DL, dl');
    if (!topDL) {
      throw new Error('Invalid bookmark file: no bookmark list found');
    }

    return this.parseDL(topDL);
  }

  parseDL(dlElement) {
    const items = [];
    const children = dlElement.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName.toUpperCase();

      if (tagName === 'DT') {
        const h3 = child.querySelector(':scope > H3, :scope > h3');
        const a = child.querySelector(':scope > A, :scope > a');

        if (h3) {
          const title = (h3.textContent || '').trim();
          const subDL = child.querySelector(':scope > DL, :scope > dl');
          const folderChildren = subDL ? this.parseDL(subDL) : [];

          items.push({
            title: this.sanitizeImportText(title) || 'Untitled Folder',
            isFolder: true,
            children: folderChildren
          });
        } else if (a) {
          const title = (a.textContent || '').trim();
          const url = a.getAttribute('HREF') || a.getAttribute('href') || '';

          if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://'))) {
            items.push({
              title: this.sanitizeImportText(title) || url,
              url: url,
              isFolder: false
            });
          }
        }
      } else if (tagName === 'DL') {
        const nested = this.parseDL(child);
        items.push(...nested);
      }
    }

    return items;
  }

  sanitizeImportText(text) {
    if (!text) return '';
    return text.replace(/[<>]/g, '').substring(0, 200).trim();
  }

  collectUrls(node, urlSet) {
    if (node.url) {
      urlSet.add(node.url);
    }
    if (node.children) {
      node.children.forEach(child => this.collectUrls(child, urlSet));
    }
  }

  filterDuplicates(items, existingUrls) {
    let skipped = 0;
    const filtered = [];

    for (const item of items) {
      if (item.isFolder) {
        const result = this.filterDuplicates(item.children || [], existingUrls);
        skipped += result.skipped;
        filtered.push({
          ...item,
          children: result.items
        });
      } else if (item.url && existingUrls.has(item.url)) {
        skipped++;
      } else {
        filtered.push(item);
      }
    }

    return { items: filtered, skipped };
  }

  countImportItems(items) {
    let count = 0;
    for (const item of items) {
      if (item.isFolder) {
        count++;
        count += this.countImportItems(item.children || []);
      } else {
        count++;
      }
    }
    return count;
  }

  createBookmark(details) {
    return new Promise((resolve, reject) => {
      try {
        chrome.bookmarks.create(details, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result);
        });
      } catch (error) {
        reject(new Error('Bookmarks API error: ' + error.message));
      }
    });
  }

  async importItems(items, parentId, onProgress) {
    for (const item of items) {
      try {
        if (item.isFolder) {
          const folder = await this.createBookmark({
            parentId: parentId,
            title: item.title
          });
          onProgress();

          if (item.children && item.children.length > 0) {
            await this.importItems(item.children, folder.id, onProgress);
          }
        } else {
          await this.createBookmark({
            parentId: parentId,
            title: item.title,
            url: item.url
          });
          onProgress();
        }
      } catch (error) {
        console.error(`Failed to import "${item.title}":`, error);
      }
    }
  }

  // --- Export ---

  exportJSON() {
    try {
      const json = JSON.stringify(this.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('JSON exported', 'success');
    } catch (error) {
      console.error('Export JSON failed:', error);
      this.showToast('Export failed: ' + error.message, 'error');
    }
  }

  exportHTML() {
    try {
      const html = this.generateNetscapeHTML(this.data);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('HTML exported', 'success');
    } catch (error) {
      console.error('Export HTML failed:', error);
      this.showToast('Export failed: ' + error.message, 'error');
    }
  }

  generateNetscapeHTML(node, indent = 0) {
    const spaces = '    '.repeat(indent);
    let html = '';

    if (indent === 0) {
      html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
    }

    if (node.isFolder && node.children) {
      if (indent > 0) {
        html += `${spaces}<DT><H3>${this.escapeHTML(node.title)}</H3>\n`;
        html += `${spaces}<DL><p>\n`;
      }

      for (const child of node.children) {
        html += this.generateNetscapeHTML(child, indent + 1);
      }

      if (indent > 0) {
        html += `${spaces}</DL><p>\n`;
      }
    } else if (node.url) {
      html += `${spaces}<DT><A HREF="${this.escapeHTML(node.url)}">${this.escapeHTML(node.title)}</A>\n`;
    }

    if (indent === 0) {
      html += `</DL><p>\n`;
    }

    return html;
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new BookmarkMindMap();
  app.start();
});

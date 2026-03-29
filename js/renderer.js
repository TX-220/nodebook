/**
 * Mind Map Renderer
 * Uses D3.js to render the bookmark tree with smooth transitions.
 */
export class MindMapRenderer {
    constructor(containerId, onNodeClick) {
        this.container = d3.select(containerId);
        this.onNodeClick = onNodeClick;

        this.width = this.container.node().clientWidth;
        this.height = this.container.node().clientHeight;

        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        this.zoomGroup = this.svg.append("g");

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on("zoom", (event) => {
                this.zoomGroup.attr("transform", event.transform);
            });

        this.svg.call(this.zoom);

        this.tree = d3.tree().nodeSize([40, 220]);
        this.root = null;
        this.layoutMode = 'gantt'; // 'gantt' or 'mindmap'
        this._highlightRaf = null;
    }

    /**
     * Sets the layout mode and refreshes.
     */
    setLayoutMode(mode) {
        this.layoutMode = mode;
    }

    /**
     * Renders or updates the mind map with smooth transitions.
     */
    update(data) {
        if (!data) return;

        // Create hierarchy
        this.root = d3.hierarchy(data, d => d.collapsed ? null : d.children);

        // In mindmap mode, assign sides to root's children
        if (this.layoutMode === 'mindmap' && this.root.children) {
            this.root.children.forEach((child, i) => {
                const side = i % 2 === 0 ? 'right' : 'left';
                child.descendants().forEach(d => d.side = side);
            });
        } else {
            this.root.descendants().forEach(d => d.side = 'right');
        }

        this.root.x0 = this.height / 2;
        this.root.y0 = 0;

        // Compute the layout
        this.tree(this.root);

        const nodes = this.root.descendants();
        const links = this.root.links();

        // Normalize for fixed-depth and handle side switching
        nodes.forEach(d => {
            const factor = d.side === 'left' ? -1 : 1;
            d.y = d.depth * 220 * factor;
        });

        // --- Nodes ---
        const node = this.zoomGroup.selectAll("g.node")
            .data(nodes, d => d.data.id);

        // Enter new nodes at parent's previous position
        const nodeEnter = node.enter().append("g")
            .attr("class", d => {
                const lvl = d.depth;
                const lvlClass = lvl > 5 ? 'lvl-plus' : `lvl-${lvl}`;
                return `node ${lvlClass} ${d.data.isFolder ? 'folder' : 'link-node'} ${d.data.collapsed ? 'collapsed' : ''}`;
            })
            .attr("transform", d => `translate(${this.root.y0},${this.root.x0})`)
            .on("click", (event, d) => this.onNodeClick(event, d));

        nodeEnter.append("circle")
            .attr("r", 1e-6);

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", d => {
                const isParent = d.children || d._children;
                const isLeft = d.side === 'left';
                return (isParent ^ isLeft) ? -13 : 13;
            })
            .attr("text-anchor", d => {
                const isParent = d.children || d._children;
                const isLeft = d.side === 'left';
                return (isParent ^ isLeft) ? "end" : "start";
            })
            .text(d => d.data.title.length > 30 ? d.data.title.substring(0, 27) + "..." : d.data.title)
            .style("fill-opacity", 1e-6);

        // Update existing nodes
        const nodeUpdate = node.merge(nodeEnter).transition()
            .duration(400)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeUpdate.select("circle")
            .attr("r", d => d.depth === 0 ? 12 : 7) // Slightly larger for solar system feel
            .attr("cursor", "pointer");

        nodeUpdate.select("text")
            .attr("x", d => {
                const isParent = d.children || d._children;
                const isLeft = d.side === 'left';
                return (isParent ^ isLeft) ? -13 : 13;
            })
            .attr("text-anchor", d => {
                const isParent = d.children || d._children;
                const isLeft = d.side === 'left';
                return (isParent ^ isLeft) ? "end" : "start";
            })
            .style("fill-opacity", 1);

        nodeUpdate.attr("class", d => {
            const lvl = d.depth;
            const lvlClass = lvl > 5 ? 'lvl-plus' : `lvl-${lvl}`;
            return `node ${lvlClass} ${d.data.isFolder ? 'folder' : 'link-node'} ${d.data.collapsed ? 'collapsed' : ''}`;
        });

        // Exit nodes
        const nodeExit = node.exit().transition()
            .duration(400)
            .attr("transform", d => `translate(${this.root.y},${this.root.x})`)
            .remove();

        nodeExit.select("circle").attr("r", 1e-6);
        nodeExit.select("text").style("fill-opacity", 1e-6);

        // --- Links ---
        // Each link now has two paths: a base link and a glow link for the 'flow' effect
        const link = this.zoomGroup.selectAll("g.link-group")
            .data(links, d => d.target.data.id);

        const linkEnter = link.enter().insert("g", "g")
            .attr("class", "link-group");

        linkEnter.append("path")
            .attr("class", "link")
            .attr("d", d => {
                const o = { x: this.root.x0, y: this.root.y0 };
                return this._diagonal(o, o);
            });

        linkEnter.append("path")
            .attr("class", "link-glow")
            .attr("d", d => {
                const o = { x: this.root.x0, y: this.root.y0 };
                return this._diagonal(o, o);
            });

        // Update links
        const linkUpdate = link.merge(linkEnter);

        linkUpdate.select(".link").transition()
            .duration(400)
            .attr("d", d => this._diagonal(d.source, d.target));

        linkUpdate.select(".link-glow").transition()
            .duration(400)
            .attr("d", d => this._diagonal(d.source, d.target));

        // Exit links
        const linkExit = link.exit().transition()
            .duration(400)
            .remove();

        linkExit.selectAll("path")
            .attr("d", d => {
                const o = { x: this.root.x, y: this.root.y };
                return this._diagonal(o, o);
            });

        // Stash the old positions for transitions
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        if (!this.hasCentered) {
            this.centerView();
            this.hasCentered = true;
        }
    }

    /**
     * Centers the root node in the view.
     */
    centerView() {
        const transform = d3.zoomIdentity
            .translate(100, this.height / 2)
            .scale(0.8);

        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, transform);
    }

    /**
     * Creates a curved diagonal path between two points.
     */
    _diagonal(s, t) {
        return `M ${s.y} ${s.x}
                C ${(s.y + t.y) / 2} ${s.x},
                  ${(s.y + t.y) / 2} ${t.x},
                  ${t.y} ${t.x}`;
    }

    /**
     * Applies search highlighting, batched in requestAnimationFrame.
     */
    highlight(matchIds) {
        cancelAnimationFrame(this._highlightRaf);
        this._highlightRaf = requestAnimationFrame(() => {
            if (!matchIds || matchIds.size === 0) {
                this.zoomGroup.selectAll(".node")
                    .classed("highlight", false)
                    .classed("dimmed", false);
            } else {
                this.zoomGroup.selectAll(".node")
                    .classed("highlight", d => matchIds.has(d.data.id))
                    .classed("dimmed", d => !matchIds.has(d.data.id));
            }
        });
    }
}

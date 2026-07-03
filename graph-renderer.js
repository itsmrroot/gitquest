// =============================================
// GitQuest — js/graph-renderer.js
// SVG commit graph renderer
// =============================================

class GraphRenderer {
  constructor(svgElement, engine) {
    this.svg = svgElement;
    this.engine = engine;
    this.panX = 0;
    this.panY = 0;
    // Auto-center the graph in the viewport until the user manually pans it.
    this._autoCenter = true;
    // Shrink the main canvas graph a bit so it doesn't feel oversized; the
    // goal mini-map already fits itself via its own viewBox scaling.
    this._contentScale = engine ? 0.82 : 1;
    this.tooltip = document.getElementById('node-tooltip');
    this._prevCommits = null;
    this._setupPan();
  }

  _setupPan() {
    let drag = false, sx, sy, spx, spy;
    this.svg.addEventListener('mousedown', e => {
      if (e.target.classList.contains('commit-node') || e.target.tagName === 'polygon') return;
      drag = true; sx = e.clientX; sy = e.clientY; spx = this.panX; spy = this.panY;
    });
    window.addEventListener('mousemove', e => {
      if (!drag) return;
      this._autoCenter = false;
      this.panX = spx + (e.clientX - sx);
      this.panY = spy + (e.clientY - sy);
      const g = this.svg.querySelector('g.root');
      if (g) g.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this._contentScale})`);
    });
    window.addEventListener('mouseup', () => { drag = false; });

    // Touch panning (main canvas only; goal renderer has null engine)
    if (!this.engine) return;
    this.svg.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      spx = this.panX; spy = this.panY;
    }, { passive: true });
    this.svg.addEventListener('touchmove', e => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      this._autoCenter = false;
      this.panX = spx + (e.touches[0].clientX - sx);
      this.panY = spy + (e.touches[0].clientY - sy);
      const g = this.svg.querySelector('g.root');
      if (g) g.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this._contentScale})`);
    }, { passive: false });
  }

  /** Re-enable auto-centering, e.g. when a fresh challenge/reset loads a new graph. */
  recenter() {
    this._autoCenter = true;
  }

  _branchColor(name) {
    if (name === 'main' || name === 'master') return '#39d353';
    if (/^feature|^feat/.test(name)) return '#bc8cff';
    if (/^hotfix|^fix/.test(name)) return '#f85149';
    if (/^release/.test(name)) return '#f0883e';
    if (/^develop|^dev$/.test(name)) return '#58a6ff';
    // Stable palette by hash
    const pal = ['#58a6ff', '#bc8cff', '#f0883e', '#e3b341', '#f85149'];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return pal[h % pal.length];
  }

  render(stateOverride) {
    const state = stateOverride || (this.engine ? this.engine.getState() : null);
    if (!state) return;
    const { commits, branches, HEAD, headBranch, tags } = state;

    const isFirstRender = this._prevCommits === null;
    const prevIds = isFirstRender ? new Set() : this._prevCommits;
    this._prevCommits = new Set(Object.keys(commits));

    // ── LAYOUT ──
    // Topological sort (oldest first)
    const order = this._topoSort(commits);
    const xPos = {};
    order.forEach((id, i) => xPos[id] = i);

    // Lane assignment per branch
    const lane = {};
    const visited = new Set();
    let laneCount = 0;

    const assignLane = (startId, l) => {
      let cur = startId;
      while (cur && !visited.has(cur) && commits[cur]) {
        visited.add(cur);
        lane[cur] = l;
        cur = commits[cur].parents[0];
      }
    };

    // Assign main/master first
    const sortedBranches = Object.entries(branches).sort(([a], [b]) => {
      if (a === 'main' || a === 'master') return -1;
      if (b === 'main' || b === 'master') return 1;
      return 0;
    });

    for (const [, bid] of sortedBranches) {
      if (!visited.has(bid)) {
        assignLane(bid, laneCount++);
      }
    }

    // Remaining uncommitted
    for (const id of Object.keys(commits)) {
      if (!visited.has(id)) lane[id] = laneCount++;
    }

    const NODE_DX = 130;
    const NODE_DY = 95;
    const OFFSET_X = 55;
    const OFFSET_Y = 70;

    const pos = {};
    for (const id of Object.keys(commits)) {
      pos[id] = {
        x: OFFSET_X + (xPos[id] || 0) * NODE_DX,
        y: OFFSET_Y + (lane[id] || 0) * NODE_DY
      };
    }

    // ── AUTO-CENTER ──
    // Keep the graph centered in the visible canvas until the user drags it
    // themselves (see _setupPan), instead of always sitting pinned top-left.
    if (this._autoCenter) {
      const xs = Object.values(pos).map(p => p.x);
      const ys = Object.values(pos).map(p => p.y);
      if (xs.length) {
        const PAD_X = 70;    // node radius + label pill half-width
        const PAD_TOP = 95;  // room for stacked branch labels above a node
        const PAD_BOTTOM = 50; // room for the commit hash text below a node
        const minX = Math.min(...xs) - PAD_X;
        const maxX = Math.max(...xs) + PAD_X;
        const minY = Math.min(...ys) - PAD_TOP;
        const maxY = Math.max(...ys) + PAD_BOTTOM;
        const containerW = this.svg.clientWidth || 0;
        const containerH = this.svg.clientHeight || 0;
        if (containerW && containerH) {
          const s = this._contentScale;
          this.panX = containerW / 2 - s * (minX + maxX) / 2;
          this.panY = containerH / 2 - s * (minY + maxY) / 2;
        }
      }
    }

    // ── SVG BUILD ──
    this.svg.innerHTML = '';

    const ns = 'http://www.w3.org/2000/svg';
    const root = document.createElementNS(ns, 'g');
    root.classList.add('root');
    root.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this._contentScale})`);
    this.svg.appendChild(root);

    // Draw edges
    for (const [cid, commit] of Object.entries(commits)) {
      if (!pos[cid]) continue;
      commit.parents.forEach((pid, idx) => {
        if (!pos[pid]) return;
        const from = pos[cid];
        const to = pos[pid];
        const path = document.createElementNS(ns, 'path');
        let d;
        if (Math.abs(from.y - to.y) < 2) {
          d = `M${from.x},${from.y} L${to.x},${to.y}`;
        } else {
          const midX = (from.x + to.x) / 2;
          d = `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', idx === 0 ? '#3d444b' : '#58a6ff');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        if (idx > 0) path.setAttribute('stroke-dasharray', '6,3');
        root.appendChild(path);
      });
    }

    // Draw nodes + labels
    for (const [cid, commit] of Object.entries(commits)) {
      const p = pos[cid];
      if (!p) continue;
      const isHead = cid === HEAD;
      // Color: use branch color if this commit is a branch tip
      let color = '#e3b341';
      for (const [bn, bid] of Object.entries(branches)) {
        if (bid === cid) { color = this._branchColor(bn); break; }
      }

      // HEAD pulse ring
      if (isHead) {
        const ring = document.createElementNS(ns, 'circle');
        ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y);
        ring.setAttribute('r', '23'); ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', color); ring.setAttribute('stroke-width', '2.5');
        ring.classList.add('head-ring');
        root.appendChild(ring);
      }

      const isMerge = commit.parents.length > 1;
      let nodeEl;
      if (isMerge) {
        nodeEl = document.createElementNS(ns, 'polygon');
        const r = 20;
        nodeEl.setAttribute('points', `${p.x},${p.y - r} ${p.x + r},${p.y} ${p.x},${p.y + r} ${p.x - r},${p.y}`);
      } else {
        nodeEl = document.createElementNS(ns, 'circle');
        nodeEl.setAttribute('cx', p.x); nodeEl.setAttribute('cy', p.y);
        nodeEl.setAttribute('r', '18');
      }
      nodeEl.setAttribute('fill', color);
      nodeEl.setAttribute('stroke', isHead ? '#ffffff' : '#0d1117');
      nodeEl.setAttribute('stroke-width', isHead ? '4' : '2.5');
      nodeEl.classList.add('commit-node');
      if (!isFirstRender && !prevIds.has(cid)) nodeEl.classList.add('node-new');

      // Tooltip
      const msg = commit.message;
      nodeEl.addEventListener('mouseenter', e => {
        if (this.tooltip) {
          this.tooltip.style.display = 'block';
          this.tooltip.textContent = `${cid.slice(0, 7)}: ${msg}`;
          this.tooltip.style.left = (e.clientX + 14) + 'px';
          this.tooltip.style.top = (e.clientY - 36) + 'px';
        }
      });
      nodeEl.addEventListener('mousemove', e => {
        if (this.tooltip) {
          this.tooltip.style.left = (e.clientX + 14) + 'px';
          this.tooltip.style.top = (e.clientY - 36) + 'px';
        }
      });
      nodeEl.addEventListener('mouseleave', () => {
        if (this.tooltip) this.tooltip.style.display = 'none';
      });
      root.appendChild(nodeEl);

      // Commit ID text
      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', p.x); txt.setAttribute('y', p.y + 38);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#8b949e'); txt.setAttribute('font-size', '15');
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('font-family', 'JetBrains Mono, monospace');
      txt.textContent = cid.slice(0, 7);
      root.appendChild(txt);
    }

    // Draw branch labels (above nodes) — stack multiple labels per commit
    const branchesByCommit = {};
    for (const [bname, bid] of Object.entries(branches)) {
      if (!pos[bid]) continue;
      if (!branchesByCommit[bid]) branchesByCommit[bid] = [];
      if (bname === headBranch) branchesByCommit[bid].unshift(bname);
      else branchesByCommit[bid].push(bname);
    }

    const NODE_R  = 18;  // circle radius
    const LABEL_H = 26;  // pill height
    const LABEL_GAP = 5; // gap between stacked pills
    const STEM_GAP = 8;  // gap between node top and first label bottom

    // Read panel background from CSS so inactive pills can mask edge lines
    const panelBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-panel').trim() || '#161b22';

    for (const [bid, names] of Object.entries(branchesByCommit)) {
      const p = pos[bid];
      const activeColor = this._branchColor(names[0]); // active branch is always first

      // Draw centered stem line: from node top up to bottom of lowest label
      const stemBottom = p.y - NODE_R;
      const stemTop    = p.y - NODE_R - STEM_GAP;
      const stem = document.createElementNS(ns, 'line');
      stem.setAttribute('x1', p.x); stem.setAttribute('y1', stemBottom);
      stem.setAttribute('x2', p.x); stem.setAttribute('y2', stemTop);
      stem.setAttribute('stroke', activeColor);
      stem.setAttribute('stroke-width', '1.5');
      root.appendChild(stem);

      // Draw each label pill, bottom-to-top (i=0 closest to node)
      for (let i = 0; i < names.length; i++) {
        const bname = names[i];
        const isActive = bname === headBranch;
        const color = this._branchColor(bname);
        const labelText = isActive ? `● ${bname}` : bname;
        const w = Math.max(labelText.length * 10 + 20, 50);

        // labelBottom = top-of-node minus stem gap minus stacking offset
        const labelBottom = p.y - NODE_R - STEM_GAP - i * (LABEL_H + LABEL_GAP);
        const rectY = labelBottom - LABEL_H;
        const textY = labelBottom - LABEL_H / 2 + 3.5; // vertical center + baseline offset

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', p.x - w / 2);
        rect.setAttribute('y', rectY);
        rect.setAttribute('width', w);
        rect.setAttribute('height', LABEL_H);
        rect.setAttribute('rx', '4');
        // Solid background on ALL pills so they mask the graph edge behind them
        rect.setAttribute('fill', isActive ? color : panelBg);
        rect.setAttribute('stroke', color);
        rect.setAttribute('stroke-width', '1.5');
        root.appendChild(rect);

        const lbl = document.createElementNS(ns, 'text');
        lbl.setAttribute('x', p.x);
        lbl.setAttribute('y', textY);
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('fill', isActive ? '#0d1117' : color);
        lbl.setAttribute('font-size', '14');
        lbl.setAttribute('font-weight', '700');
        lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
        lbl.textContent = labelText;
        root.appendChild(lbl);
      }
    }

    // Draw tags
    for (const [tname, tid] of Object.entries(tags)) {
      const p = pos[tid];
      if (!p) continue;
      const tl = document.createElementNS(ns, 'text');
      tl.setAttribute('x', p.x); tl.setAttribute('y', p.y + 60);
      tl.setAttribute('text-anchor', 'middle');
      tl.setAttribute('fill', '#e3b341'); tl.setAttribute('font-size', '14');
      tl.setAttribute('font-family', 'JetBrains Mono, monospace');
      tl.textContent = `🏷 ${tname}`;
      root.appendChild(tl);
    }

    // Draw detached HEAD label
    if (!headBranch && HEAD && pos[HEAD]) {
      const p = pos[HEAD];
      const hl = document.createElementNS(ns, 'text');
      hl.setAttribute('x', p.x); hl.setAttribute('y', p.y - 28);
      hl.setAttribute('text-anchor', 'middle');
      hl.setAttribute('fill', '#f0883e'); hl.setAttribute('font-size', '15');
      hl.setAttribute('font-weight', '700');
      hl.setAttribute('font-family', 'JetBrains Mono, monospace');
      hl.textContent = 'HEAD (detached)';
      root.appendChild(hl);
    }
  }

  _topoSort(commits) {
    const visited = new Set();
    const result = [];
    const visit = (id) => {
      if (!id || visited.has(id) || !commits[id]) return;
      visited.add(id);
      (commits[id].parents || []).forEach(p => visit(p));
      result.push(id);
    };
    Object.keys(commits).forEach(id => visit(id));
    return result;
  }
}

window.GraphRenderer = GraphRenderer;

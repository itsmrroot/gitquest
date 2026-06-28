// =============================================
// GitQuest — js/graph-renderer.js
// Animated SVG commit graph renderer
// =============================================

class GraphRenderer {
  constructor(svgElement, engine) {
    this.svg = svgElement;
    this.engine = engine;
    this.nodePositions = {};
    this.animationQueue = [];
    this.colors = {
      main:    '#39d353',
      master:  '#39d353',
      develop: '#58a6ff',
      feature: '#bc8cff',
      hotfix:  '#f85149',
      release: '#f0883e',
      default: '#e3b341',
      merge:   '#58a6ff',
      remote:  '#bc8cff'
    };
    this.tooltip = document.getElementById('node-tooltip');
    this._setupPan();
    this.offsetX = 60;
    this.offsetY = 40;
    this.panX = 0;
    this.panY = 0;
  }

  _setupPan() {
    let dragging = false, startX, startY, startPanX, startPanY;
    this.svg.addEventListener('mousedown', e => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startPanX = this.panX; startPanY = this.panY;
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this.panX = startPanX + (e.clientX - startX);
      this.panY = startPanY + (e.clientY - startY);
      this.svg.querySelector('g.root').setAttribute(
        'transform', `translate(${this.panX},${this.panY})`
      );
    });
    window.addEventListener('mouseup', () => dragging = false);
  }

  render() {
    const state = this.engine.getState();
    const { commits, branches, HEAD, headBranch, tags } = state;

    // Layout: topological sort
    const layout = this._computeLayout(commits, branches);
    this.nodePositions = layout.positions;

    // Clear & rebuild SVG
    this.svg.innerHTML = '';
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    root.classList.add('root');
    root.setAttribute('transform', `translate(${this.panX},${this.panY})`);
    this.svg.appendChild(root);

    // Draw edges first (behind nodes)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.classList.add('edges');
    root.appendChild(edgeGroup);

    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.classList.add('nodes');
    root.appendChild(nodeGroup);

    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.classList.add('labels');
    root.appendChild(labelGroup);

    // Draw edges
    for (const [cid, commit] of Object.entries(commits)) {
      const pos = layout.positions[cid];
      if (!pos) continue;
      for (const parent of commit.parents) {
        const parentPos = layout.positions[parent];
        if (!parentPos) continue;
        const isMerge = commit.parents.length > 1;
        this._drawEdge(edgeGroup, pos, parentPos, isMerge, commit.parents.indexOf(parent));
      }
    }

    // Draw nodes
    for (const [cid, commit] of Object.entries(commits)) {
      const pos = layout.positions[cid];
      if (!pos) continue;
      const isHead = cid === HEAD;
      const branchColor = this._getBranchColor(cid, branches);
      this._drawNode(nodeGroup, labelGroup, commit, pos, isHead, branchColor, HEAD);
    }

    // Draw branch labels
    for (const [bname, bid] of Object.entries(branches)) {
      const pos = layout.positions[bid];
      if (!pos) continue;
      const isActive = bname === headBranch;
      const color = this._getBranchColorByName(bname);
      this._drawBranchLabel(labelGroup, bname, pos, isActive, color);
    }

    // Draw tags
    for (const [tname, tid] of Object.entries(tags)) {
      const pos = layout.positions[tid];
      if (!pos) continue;
      this._drawTag(labelGroup, tname, pos);
    }

    // Draw HEAD pointer if detached
    if (!headBranch && HEAD) {
      const pos = layout.positions[HEAD];
      if (pos) this._drawHEAD(labelGroup, pos);
    }
  }

  _computeLayout(commits, branches) {
    // BFS from all branch tips to build ordered layers
    const inDegree = {};
    const children = {};
    for (const [id, c] of Object.entries(commits)) {
      inDegree[id] = inDegree[id] || 0;
      children[id] = children[id] || [];
      for (const p of c.parents) {
        inDegree[p] = (inDegree[p] || 0);
        children[p] = children[p] || [];
        children[p].push(id);
        inDegree[id]++;
      }
    }

    // Track lanes (Y positions) per branch
    const branchLane = {};
    const commitLane = {};
    let laneCount = 0;

    // Assign lanes based on branch tips
    const processed = new Set();

    const assignLane = (startId, lane) => {
      let cur = startId;
      while (cur && !processed.has(cur)) {
        processed.add(cur);
        commitLane[cur] = lane;
        const c = commits[cur];
        if (!c) break;
        // Continue along first parent
        cur = c.parents[0];
        if (cur && !processed.has(cur)) continue;
        break;
      }
    };

    // Get tips sorted (main first)
    const tips = Object.entries(branches).sort(([a], [b]) => {
      if (a === 'main' || a === 'master') return -1;
      if (b === 'main' || b === 'master') return 1;
      return a.localeCompare(b);
    });

    for (const [bname, bid] of tips) {
      let lane = laneCount++;
      branchLane[bname] = lane;
      assignLane(bid, lane);
    }

    // Assign remaining (unreachable from branches, e.g. detached commits)
    for (const id of Object.keys(commits)) {
      if (!processed.has(id)) {
        commitLane[id] = laneCount++;
        processed.add(id);
      }
    }

    // Assign X based on topological order (oldest leftmost)
    const order = this._topologicalSort(commits);
    const xMap = {};
    order.forEach((id, i) => xMap[id] = i);

    const nodeW = 90, nodeH = 70;
    const positions = {};
    for (const [id] of Object.entries(commits)) {
      const x = this.offsetX + (xMap[id] || 0) * nodeW;
      const y = this.offsetY + (commitLane[id] || 0) * nodeH;
      positions[id] = { x, y };
    }

    return { positions };
  }

  _topologicalSort(commits) {
    const visited = new Set();
    const result = [];
    const visit = (id) => {
      if (visited.has(id) || !commits[id]) return;
      visited.add(id);
      for (const p of commits[id].parents) visit(p);
      result.push(id);
    };
    for (const id of Object.keys(commits)) visit(id);
    return result;
  }

  _drawEdge(group, from, to, isMerge, parentIdx) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    let d;
    if (dy === 0) {
      // Same lane, straight line
      d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    } else {
      // Curved line for merges/branches
      const cx1 = from.x - Math.abs(dx) * 0.5;
      const cy1 = from.y;
      const cx2 = to.x + Math.abs(dx) * 0.5;
      const cy2 = to.y;
      d = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
    }

    path.setAttribute('d', d);
    path.setAttribute('stroke', isMerge && parentIdx > 0 ? '#58a6ff' : '#30363d');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    if (isMerge && parentIdx > 0) {
      path.setAttribute('stroke-dasharray', '6,3');
    }
    group.appendChild(path);
  }

  _drawNode(nodeGroup, labelGroup, commit, pos, isHead, color, HEAD) {
    const isMerge = commit.parents.length > 1;

    if (isHead) {
      // Pulsing ring for HEAD
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', pos.x);
      ring.setAttribute('cy', pos.y);
      ring.setAttribute('r', 10);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', color);
      ring.setAttribute('stroke-width', '2');
      ring.setAttribute('opacity', '0.6');
      ring.classList.add('head-ring');
      nodeGroup.appendChild(ring);
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', isMerge ? 9 : 7);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', isHead ? '#fff' : '#0d1117');
    circle.setAttribute('stroke-width', isHead ? '2' : '1.5');
    circle.classList.add('commit-node');
    circle.dataset.id = commit.id;

    // Merge node: diamond shape via polygon
    if (isMerge) {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const r = 8;
      const pts = `${pos.x},${pos.y-r} ${pos.x+r},${pos.y} ${pos.x},${pos.y+r} ${pos.x-r},${pos.y}`;
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', color);
      poly.setAttribute('stroke', isHead ? '#fff' : '#0d1117');
      poly.setAttribute('stroke-width', '1.5');
      poly.classList.add('commit-node');
      poly.dataset.id = commit.id;
      nodeGroup.appendChild(poly);
    } else {
      nodeGroup.appendChild(circle);
    }

    // Commit ID label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + 20);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#8b949e');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.textContent = commit.id.slice(0, 7);
    labelGroup.appendChild(text);

    // Tooltip hover
    circle.addEventListener('mouseenter', (e) => {
      if (this.tooltip) {
        this.tooltip.style.display = 'block';
        this.tooltip.textContent = `${commit.id.slice(0,7)}: ${commit.message}`;
        this.tooltip.style.left = (e.clientX + 10) + 'px';
        this.tooltip.style.top = (e.clientY - 30) + 'px';
      }
    });
    circle.addEventListener('mouseleave', () => {
      if (this.tooltip) this.tooltip.style.display = 'none';
    });
  }

  _drawBranchLabel(group, name, pos, isActive, color) {
    const xOffset = 0;
    const yOffset = -20;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    label.setAttribute('x', pos.x + xOffset);
    label.setAttribute('y', pos.y + yOffset + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', isActive ? '#000' : color);
    label.setAttribute('font-size', '9');
    label.setAttribute('font-family', 'JetBrains Mono, monospace');
    label.setAttribute('font-weight', '700');
    label.textContent = isActive ? `● ${name}` : name;

    const w = name.length * 6 + 16;
    rect.setAttribute('x', pos.x + xOffset - w/2);
    rect.setAttribute('y', pos.y + yOffset - 8);
    rect.setAttribute('width', w);
    rect.setAttribute('height', 14);
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', isActive ? color : 'transparent');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', '1');

    group.appendChild(rect);
    group.appendChild(label);
  }

  _drawTag(group, name, pos) {
    const yOffset = 16;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + yOffset + 10);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#e3b341');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.textContent = `🏷 ${name}`;
    group.appendChild(text);
  }

  _drawHEAD(group, pos) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y - 20);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#f0883e');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.setAttribute('font-weight', '700');
    text.textContent = 'HEAD';
    group.appendChild(text);
  }

  _getBranchColor(commitId, branches) {
    for (const [name, bid] of Object.entries(branches)) {
      if (bid === commitId) return this._getBranchColorByName(name);
    }
    return '#e3b341';
  }

  _getBranchColorByName(name) {
    if (name === 'main' || name === 'master') return '#39d353';
    if (name.startsWith('feature') || name.startsWith('feat')) return '#bc8cff';
    if (name.startsWith('hotfix') || name.startsWith('fix')) return '#f85149';
    if (name.startsWith('release')) return '#f0883e';
    if (name === 'develop' || name === 'dev') return '#58a6ff';
    // hash-based color from palette
    const palette = ['#58a6ff', '#bc8cff', '#f0883e', '#e3b341', '#39d353', '#f85149'];
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return palette[hash % palette.length];
  }
}

window.GraphRenderer = GraphRenderer;

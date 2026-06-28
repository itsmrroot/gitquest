// =============================================
// GitQuest — js/app.js
// Main application controller
// =============================================

class GitQuestApp {
  constructor() {
    this.engine = new GitEngine();
    this.renderer = null;
    this.currentChallenge = null;
    this.currentTier = null;
    this.xp = parseInt(localStorage.getItem('gq_xp') || '0');
    this.completedChallenges = JSON.parse(localStorage.getItem('gq_completed') || '[]');
    this.cmdHistory = [];
    this.histIdx = -1;
    this.mode = 'learn';
    this.aiHistory = [];
    this.hintIdx = 0;
    this.cmdsThisChallenge = [];
    this.setupCommitCount = 0;
  }

  init() {
    // Renderer
    const svg = document.getElementById('git-canvas');
    if (svg) {
      this.renderer = new GraphRenderer(svg, this.engine);
      this.engine.on('graph-update', () => this.renderer.render());
      this.renderer.render();
    }

    this._buildSidebar();
    this._bindEvents();
    this._updateXP();

    // Load first challenge
    if (TIERS && TIERS.length && TIERS[0].challenges.length) {
      this._loadChallenge(TIERS[0], TIERS[0].challenges[0]);
    }

    this._log('info', 'Welcome to GitQuest! ✨');
    this._log('info', 'Type git commands below. Check the Mission panel on the right →');
    this._focusInput();
  }

  // ── SIDEBAR ──
  _buildSidebar() {
    const el = document.getElementById('challenge-list');
    if (!el) return;
    el.innerHTML = '';

    TIERS.forEach(tier => {
      const done = tier.challenges.filter(c => this.completedChallenges.includes(c.id)).length;
      const pct = Math.round(done / tier.challenges.length * 100);

      const header = document.createElement('div');
      header.className = 'tier-header';
      header.innerHTML = `<span>${tier.name}</span><span style="margin-left:auto;font-size:11px;opacity:0.6">${done}/${tier.challenges.length}</span>`;
      el.appendChild(header);

      const bar = document.createElement('div');
      bar.className = 'tier-progress';
      bar.innerHTML = `<div class="tier-progress-bar" style="width:${pct}%"></div>`;
      el.appendChild(bar);

      const list = document.createElement('div');
      list.style.padding = '0 8px 8px';

      tier.challenges.forEach((ch, idx) => {
        const isCompleted = this.completedChallenges.includes(ch.id);
        const prevDone = idx === 0 || this.completedChallenges.includes(tier.challenges[idx - 1].id);
        const isLocked = !isCompleted && !prevDone;
        const isActive = this.currentChallenge?.id === ch.id;

        const item = document.createElement('div');
        item.className = 'challenge-item' +
          (isCompleted ? ' completed' : '') +
          (isLocked ? ' locked' : '') +
          (isActive ? ' active' : '');

        const dotClass = isCompleted ? 'done' : isActive ? 'current' : '';
        item.innerHTML = `
          <div class="challenge-dot ${dotClass}"></div>
          <div class="challenge-info">
            <div class="challenge-name">${ch.name}</div>
            <div class="challenge-meta">${ch.difficulty}${isLocked ? ' 🔒' : ''}</div>
          </div>
          <div class="challenge-xp">+${ch.xp}XP</div>
        `;

        if (!isLocked) {
          item.addEventListener('click', () => this._loadChallenge(tier, ch));
        }
        list.appendChild(item);
      });

      el.appendChild(list);
    });
  }

  // ── CHALLENGE LOADING ──
  _loadChallenge(tier, challenge) {
    this.currentChallenge = challenge;
    this.currentTier = tier;
    this.cmdsThisChallenge = [];
    this.hintIdx = 0;

    // Reset engine and run setup
    this.engine.reset();
    this.setupCommitCount = 0;
    for (const cmd of (challenge.setup || [])) {
      this.engine.execute(cmd);
      this.setupCommitCount++;
    }
    this.renderer?.render();

    this._buildSidebar();
    this._renderMission(challenge);

    const out = document.getElementById('terminal-output');
    if (out) out.innerHTML = '';
    this._log('info', `▶ Challenge: ${challenge.name}`);
    this._focusInput();
  }

  _renderMission(ch) {
    const panel = document.getElementById('mission-content');
    if (!panel) return;

    const diffClass = {
      beginner: 'diff-beginner', easy: 'diff-easy', medium: 'diff-medium',
      hard: 'diff-hard', expert: 'diff-expert'
    }[ch.difficulty] || 'diff-beginner';

    panel.innerHTML = `
      <div class="mission-title">${ch.name}</div>
      <div class="mission-difficulty ${diffClass}">● ${ch.difficulty} · ${ch.xp} XP</div>
      <p class="mission-desc">${ch.description}</p>

      <div class="mission-goal">
        <div class="mission-goal-title">🎯 Objectives</div>
        ${ch.goals.map(g => `
          <div class="goal-item" id="goal-${g.id}">
            <div class="goal-check" id="check-${g.id}"></div>
            <span>${g.text}</span>
          </div>
        `).join('')}
      </div>

      ${ch.concept ? `<div class="concept-box">💡 <strong>Concept:</strong> ${ch.concept}</div>` : ''}

      <button class="hint-btn" onclick="window.app._showHint()">💡 Show Hint (${ch.hints?.length || 0} available)</button>
      <div class="hint-box" id="hint-box"></div>
      <button class="ask-ai-btn" onclick="window.app._askAI()">✨ Ask AI Tutor about this challenge</button>
      <div class="ai-response" id="mission-ai"></div>
    `;
  }

  _showHint() {
    const ch = this.currentChallenge;
    if (!ch?.hints?.length) return;
    const box = document.getElementById('hint-box');
    if (!box) return;
    box.style.display = 'block';
    box.textContent = '💡 ' + ch.hints[this.hintIdx % ch.hints.length];
    this.hintIdx++;
  }

  async _askAI() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const box = document.getElementById('mission-ai');
    if (!box) return;
    box.style.display = 'block';
    box.textContent = 'Thinking...';

    const state = this.engine.getState();
    const prompt = `You are a Git expert tutor inside an interactive learning app.
Challenge: "${ch.name}" — ${ch.description}
Goals: ${ch.goals.map(g => g.text).join('; ')}
Student's recent commands: ${this.cmdsThisChallenge.slice(-5).join(', ') || 'none yet'}
Current branches: ${Object.keys(state.branches).join(', ')}
Current HEAD branch: ${state.headBranch || 'detached'}

Give a helpful, specific 3-sentence explanation. Use backtick code formatting. End with one concrete command they should try.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await resp.json();
      box.textContent = data.content?.find(b => b.type === 'text')?.text || 'No response.';
    } catch(e) {
      box.textContent = 'AI unavailable right now.';
    }
  }

  // ── EVENTS ──
  _bindEvents() {
    const input = document.getElementById('cmd-input');
    if (!input) return;

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        this._hideAC();
        this._handleCmd(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.histIdx < this.cmdHistory.length - 1) {
          this.histIdx++;
          input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.histIdx];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.histIdx > 0) { this.histIdx--; input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.histIdx]; }
        else { this.histIdx = -1; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const first = document.querySelector('#autocomplete .ac-item');
        if (first) { input.value = first.dataset.cmd; this._hideAC(); }
      } else if (e.key === 'Escape') {
        this._hideAC();
      }
    });

    input.addEventListener('input', () => this._showAC(input.value));

    // Mode tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.mode === 'sandbox') this._sandbox();
        else this._learnMode();
      });
    });

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        document.querySelectorAll('.panel-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${t}-content`)?.classList.add('active');
      });
    });

    document.getElementById('btn-clear')?.addEventListener('click', () => {
      const out = document.getElementById('terminal-output');
      if (out) out.innerHTML = '';
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (this.currentChallenge) this._loadChallenge(this.currentTier, this.currentChallenge);
      else { this.engine.reset(); this.renderer?.render(); document.getElementById('terminal-output').innerHTML = ''; this._log('info', 'Repo reset.'); }
    });

    document.getElementById('ai-send')?.addEventListener('click', () => this._sendChat());
    document.getElementById('ai-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendChat(); }
    });

    // Quick AI questions
    document.querySelectorAll('.quick-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        const inp = document.getElementById('ai-input');
        if (inp) { inp.value = q; this._sendChat(); }
      });
    });
  }

  // ── COMMAND HANDLER ──
  _handleCmd(raw) {
    const input = raw.trim();
    if (!input) return;

    this.cmdHistory.push(input);
    this.histIdx = -1;
    this.cmdsThisChallenge.push(input);

    const branch = this.engine.headBranch || '(detached)';
    this._logRaw(`<span class="term-prompt">${this._esc(branch)} $</span> <span class="term-cmd">${this._esc(input)}</span>`);

    const result = this.engine.execute(input);
    if (result.msg) {
      this._log(result.ok ? 'out' : 'err', result.msg);
    }

    const out = document.getElementById('terminal-output');
    if (out) out.scrollTop = out.scrollHeight;

    // Update prompt
    const pl = document.getElementById('prompt-branch');
    if (pl) pl.textContent = this.engine.headBranch || '(detached)';

    if (this.mode === 'learn' && this.currentChallenge) {
      this._checkGoals();
    }
  }

  _checkGoals() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const state = this.engine.getState();
    const history = this.cmdsThisChallenge;
    let allDone = true;

    ch.goals.forEach(goal => {
      let passed = false;
      try { passed = goal.check(state, history, this.setupCommitCount); } catch(e) {}
      const chk = document.getElementById(`check-${goal.id}`);
      if (chk) {
        if (passed) { chk.classList.add('done'); chk.textContent = '✓'; }
        else allDone = false;
      } else if (!passed) { allDone = false; }
    });

    if (allDone && !this.completedChallenges.includes(ch.id)) {
      setTimeout(() => this._complete(ch), 400);
    }
  }

  _complete(ch) {
    this.completedChallenges.push(ch.id);
    this.xp += ch.xp;
    localStorage.setItem('gq_xp', this.xp);
    localStorage.setItem('gq_completed', JSON.stringify(this.completedChallenges));
    this._updateXP();
    this._buildSidebar();
    this._showSuccess(ch);
  }

  _showSuccess(ch) {
    const overlay = document.getElementById('success-overlay');
    if (!overlay) return;
    overlay.querySelector('.success-title').textContent = '🎉 Challenge Complete!';
    overlay.querySelector('.success-sub').textContent = ch.name;
    overlay.querySelector('.xp-earned').textContent = `+${ch.xp} XP`;
    overlay.classList.add('show');

    overlay.querySelector('.next-btn').onclick = () => {
      overlay.classList.remove('show');
      this._nextChallenge();
    };
    overlay.querySelector('.retry-btn').onclick = () => {
      overlay.classList.remove('show');
    };
  }

  _nextChallenge() {
    for (const tier of TIERS) {
      for (let i = 0; i < tier.challenges.length; i++) {
        if (!this.completedChallenges.includes(tier.challenges[i].id)) {
          this._loadChallenge(tier, tier.challenges[i]);
          return;
        }
      }
    }
    this._log('success', '🧙 You completed ALL challenges! You are a Git Wizard!');
  }

  _sandbox() {
    this.mode = 'sandbox';
    this.currentChallenge = null;
    this.engine.reset();
    this.renderer?.render();
    document.getElementById('terminal-output').innerHTML = '';
    this._log('info', '🏖️  Sandbox mode — free exploration, no goals!');
    const panel = document.getElementById('mission-content');
    if (panel) panel.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">🏖️</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px">Sandbox Mode</div>
        <div style="font-size:13px;line-height:1.7">No objectives. No limits.<br>Experiment freely with any git commands!</div>
      </div>`;
  }

  _learnMode() {
    this.mode = 'learn';
    const first = TIERS?.[0]?.challenges?.[0];
    if (first) this._loadChallenge(TIERS[0], first);
  }

  _updateXP() {
    const el = document.getElementById('xp-count');
    if (el) el.textContent = this.xp.toLocaleString() + ' XP';
    const levels = [
      { min: 0, name: 'Rookie' }, { min: 500, name: 'Contributor' },
      { min: 1200, name: 'Maintainer' }, { min: 2500, name: 'Architect' }, { min: 4000, name: 'Git Wizard' }
    ];
    const lvl = [...levels].reverse().find(l => this.xp >= l.min) || levels[0];
    const badge = document.getElementById('level-badge');
    if (badge) badge.textContent = lvl.name;
  }

  // ── TERMINAL ──
  _log(type, text) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const div = document.createElement('div');
    div.className = `term-${type}`;
    div.textContent = text;
    out.appendChild(div);
  }

  _logRaw(html) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
  }

  _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── AUTOCOMPLETE ──
  _showAC(val) {
    const ac = document.getElementById('autocomplete');
    if (!ac) return;
    if (!val || !val.startsWith('git ')) { this._hideAC(); return; }

    const CMDS = [
      ['git commit -m ""', 'Create a commit'],
      ['git commit --amend', 'Edit last commit'],
      ['git branch', 'List branches'],
      ['git branch ', 'Create branch'],
      ['git checkout -b ', 'Create + switch'],
      ['git checkout ', 'Switch branch/commit'],
      ['git switch ', 'Switch branch'],
      ['git merge ', 'Merge a branch'],
      ['git merge --no-ff ', 'Merge (no fast-forward)'],
      ['git rebase ', 'Rebase onto branch'],
      ['git log', 'View history'],
      ['git log --oneline', 'Compact history'],
      ['git status', 'Show status'],
      ['git add .', 'Stage all'],
      ['git reset --hard HEAD~1', 'Hard reset 1 commit'],
      ['git reset --soft HEAD~1', 'Soft reset 1 commit'],
      ['git revert HEAD', 'Revert last commit'],
      ['git cherry-pick ', 'Apply commit'],
      ['git tag ', 'Create tag'],
      ['git stash', 'Stash changes'],
      ['git stash pop', 'Pop stash'],
      ['git remote add origin ', 'Add remote'],
      ['git push origin main', 'Push to remote'],
    ];

    const matches = CMDS.filter(([cmd]) => cmd.startsWith(val) && cmd.trim() !== val.trim());
    if (!matches.length) { this._hideAC(); return; }

    ac.innerHTML = matches.slice(0, 7).map(([cmd, desc]) =>
      `<div class="ac-item" data-cmd="${this._esc(cmd)}">
        <span>${this._esc(cmd)}</span><span class="ac-desc">${this._esc(desc)}</span>
      </div>`
    ).join('');

    ac.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', () => {
        const inp = document.getElementById('cmd-input');
        if (inp) inp.value = item.dataset.cmd;
        this._hideAC();
        inp?.focus();
      });
    });

    ac.style.display = 'block';
  }

  _hideAC() {
    const ac = document.getElementById('autocomplete');
    if (ac) ac.style.display = 'none';
  }

  _focusInput() {
    document.getElementById('cmd-input')?.focus();
  }

  // ── AI CHAT ──
  async _sendChat() {
    const inp = document.getElementById('ai-input');
    const btn = document.getElementById('ai-send');
    const msgs = document.getElementById('ai-chat-messages');
    if (!inp || !msgs) return;
    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    if (btn) btn.disabled = true;
    this.aiHistory.push({ role: 'user', content: text });
    this._renderChat(msgs);

    const loading = document.createElement('div');
    loading.className = 'ai-msg assistant';
    loading.innerHTML = '<div class="msg-label">GitQuest AI</div><span style="opacity:0.5">Thinking...</span>';
    msgs.appendChild(loading);
    msgs.scrollTop = msgs.scrollHeight;

    const state = this.engine.getState();
    const sys = `You are an expert Git tutor in GitQuest, an interactive git learning app.
Current state: branches=${Object.keys(state.branches).join(',')}, HEAD=${state.headBranch || 'detached'}.
${this.currentChallenge ? `Current challenge: "${this.currentChallenge.name}"` : 'Sandbox mode.'}
Be concise (2-4 sentences), friendly, use \`code\` backtick formatting. Be specific and helpful.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: sys,
          messages: this.aiHistory
        })
      });
      const data = await resp.json();
      const reply = data.content?.find(b => b.type === 'text')?.text || 'No response.';
      this.aiHistory.push({ role: 'assistant', content: reply });
      loading.remove();
      this._renderChat(msgs);
    } catch(e) {
      loading.remove();
      const err = document.createElement('div');
      err.className = 'ai-msg assistant';
      err.textContent = 'AI unavailable. Check your connection.';
      msgs.appendChild(err);
    }

    if (btn) btn.disabled = false;
    msgs.scrollTop = msgs.scrollHeight;
  }

  _renderChat(container) {
    container.innerHTML = this.aiHistory.map(m => `
      <div class="ai-msg ${m.role}">
        <div class="msg-label">${m.role === 'user' ? 'You' : 'GitQuest AI'}</div>
        ${this._fmtAI(m.content)}
      </div>`).join('');
  }

  _fmtAI(text) {
    return this._esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new GitQuestApp();
  window.app.init();
});
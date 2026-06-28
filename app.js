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
    this.historyIdx = -1;
    this.currentMode = 'learn'; // learn | sandbox
    this.aiChatHistory = [];
    this.hintIndex = 0;
    this.setupInitialCommits = 0;
    this.commandsSinceLoad = [];
  }

  init() {
    // Setup SVG renderer
    const svg = document.getElementById('git-canvas');
    if (svg) {
      this.renderer = new GraphRenderer(svg, this.engine);
      this.engine.on('graph-update', () => this.renderer.render());
      this.renderer.render();
    }

    this._buildSidebar();
    this._bindEvents();
    this._updateXPDisplay();

    // Load first challenge
    const first = TIERS[0]?.challenges[0];
    if (first) this._loadChallenge(TIERS[0], first);

    // Welcome message
    this._termPrint('info', 'Welcome to GitQuest! Type git commands below.');
    this._termPrint('info', 'Type "git help" for available commands. Start with the challenge on the right!');
    this._termPrint('', '');
    this._focusInput();
  }

  _buildSidebar() {
    const sidebar = document.getElementById('challenge-list');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    TIERS.forEach(tier => {
      const tierCompleted = tier.challenges.filter(c => this.completedChallenges.includes(c.id)).length;
      const pct = Math.round(tierCompleted / tier.challenges.length * 100);

      // Tier header
      const header = document.createElement('div');
      header.className = 'tier-header';
      header.innerHTML = `<span class="tier-icon">${tier.name.split(' ')[0]}</span><span>${tier.name.split(' ').slice(1).join(' ')}</span><span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${tierCompleted}/${tier.challenges.length}</span>`;
      sidebar.appendChild(header);

      // Progress bar
      const prog = document.createElement('div');
      prog.className = 'tier-progress';
      prog.innerHTML = `<div class="tier-progress-bar" style="width:${pct}%"></div>`;
      sidebar.appendChild(prog);

      // Challenge items
      const list = document.createElement('div');
      list.className = 'challenge-list';
      list.style.padding = '0 8px 8px';

      tier.challenges.forEach((ch, idx) => {
        const isCompleted = this.completedChallenges.includes(ch.id);
        const isLocked = !isCompleted && idx > 0 && !this.completedChallenges.includes(tier.challenges[idx - 1]?.id);

        const item = document.createElement('div');
        item.className = `challenge-item${isCompleted ? ' completed' : ''}${isLocked ? ' locked' : ''}${this.currentChallenge?.id === ch.id ? ' active' : ''}`;
        item.dataset.id = ch.id;
        item.innerHTML = `
          <div class="challenge-dot ${isCompleted ? 'done' : this.currentChallenge?.id === ch.id ? 'active' : ''}"></div>
          <div class="challenge-info">
            <div class="challenge-name">${ch.name}</div>
            <div class="challenge-meta">${ch.difficulty}</div>
          </div>
          <div class="challenge-xp">+${ch.xp} XP</div>
        `;
        if (!isLocked) {
          item.addEventListener('click', () => this._loadChallenge(tier, ch));
        }
        list.appendChild(item);
      });

      sidebar.appendChild(list);
    });
  }

  _loadChallenge(tier, challenge) {
    this.currentChallenge = challenge;
    this.currentTier = tier;
    this.commandsSinceLoad = [];
    this.hintIndex = 0;

    // Reset engine and run setup commands
    this.engine.reset();
    this.setupInitialCommits = 0;
    for (const cmd of (challenge.setup || [])) {
      this.engine.execute(cmd);
      this.setupInitialCommits++;
    }
    this.renderer?.render();

    // Update sidebar
    this._buildSidebar();

    // Update right panel - mission
    this._renderMission(challenge);

    // Clear terminal
    document.getElementById('terminal-output').innerHTML = '';
    this._termPrint('info', `Challenge loaded: ${challenge.name}`);
    this._termPrint('', '');

    this._focusInput();
  }

  _renderMission(ch) {
    const panel = document.getElementById('mission-content');
    if (!panel) return;

    const diffClass = {
      beginner: 'diff-beginner',
      easy: 'diff-easy',
      medium: 'diff-medium',
      hard: 'diff-hard',
      expert: 'diff-expert'
    }[ch.difficulty] || 'diff-beginner';

    panel.innerHTML = `
      <div class="mission-title">${ch.name}</div>
      <div class="mission-difficulty ${diffClass}">● ${ch.difficulty} · ${ch.xp} XP</div>
      <div class="mission-desc">${ch.description}</div>

      <div class="mission-goal">
        <div class="mission-goal-title">🎯 Objectives</div>
        ${ch.goals.map(g => `
          <div class="goal-item" id="goal-${g.id}">
            <div class="goal-check" id="check-${g.id}"></div>
            <div>${g.text}</div>
          </div>
        `).join('')}
      </div>

      ${ch.concept ? `
        <div style="background:var(--bg-panel);border:1px solid rgba(88,166,255,0.2);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--accent-blue);line-height:1.5;">
          💡 <strong>Concept:</strong> ${ch.concept}
        </div>
      ` : ''}

      <button class="hint-btn" onclick="app._showHint()">
        💡 Get a Hint (${ch.hints?.length || 0} available)
      </button>
      <div class="hint-box" id="hint-box"></div>

      <button class="ask-ai-btn" onclick="app._askAI()">
        ✨ Ask AI Tutor about this challenge
      </button>
      <div class="ai-response" id="mission-ai-response"></div>
    `;
  }

  _showHint() {
    const ch = this.currentChallenge;
    if (!ch?.hints?.length) return;
    const box = document.getElementById('hint-box');
    if (!box) return;
    box.style.display = 'block';
    box.textContent = ch.hints[this.hintIndex % ch.hints.length];
    this.hintIndex++;
  }

  async _askAI() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const box = document.getElementById('mission-ai-response');
    if (!box) return;

    box.style.display = 'block';
    box.classList.add('loading');
    box.textContent = 'Thinking...';

    const state = this.engine.getState();
    const prompt = `You are a senior Git expert teaching a student. They are working on this challenge:
Challenge: "${ch.name}"
Description: "${ch.description}"
Current goal: ${ch.goals.map(g => g.text).join(', ')}
The student has typed these commands so far: ${this.commandsSinceLoad.join(', ') || 'none yet'}
Current branches: ${Object.keys(state.branches).join(', ')}
Current HEAD: ${state.headBranch || 'detached at ' + state.HEAD}

Give a helpful, encouraging explanation in 3-4 sentences. Be specific about what git command(s) would help right now and why. Use inline code formatting with backticks. End with a concrete next step.`;

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
      const text = data.content?.find(b => b.type === 'text')?.text || 'No response received.';
      box.classList.remove('loading');
      box.textContent = text;
    } catch (e) {
      box.classList.remove('loading');
      box.textContent = 'AI tutor unavailable. Check console for errors.';
    }
  }

  _bindEvents() {
    // Input
    const input = document.getElementById('cmd-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._handleCommand(input.value);
        input.value = '';
        this._hideAutocomplete();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIdx < this.cmdHistory.length - 1) {
          this.historyIdx++;
          input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIdx > 0) {
          this.historyIdx--;
          input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
        } else {
          this.historyIdx = -1;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this._autocomplete(input);
      } else if (e.key === 'Escape') {
        this._hideAutocomplete();
      }
    });

    input.addEventListener('input', () => this._showAutocomplete(input.value));

    // Mode tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'sandbox') this._enterSandbox();
        else if (mode === 'learn') this._enterLearn();
      });
    });

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${target}-content`)?.classList.add('active');
      });
    });

    // Terminal clear button
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      document.getElementById('terminal-output').innerHTML = '';
    });

    // Terminal reset button
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (this.currentChallenge) {
        this._loadChallenge(this.currentTier, this.currentChallenge);
      } else {
        this.engine.reset();
        this.renderer?.render();
        document.getElementById('terminal-output').innerHTML = '';
        this._termPrint('info', 'Repository reset.');
      }
    });

    // AI chat
    document.getElementById('ai-send')?.addEventListener('click', () => this._sendAIChat());
    document.getElementById('ai-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendAIChat();
      }
    });
  }

  _handleCommand(raw) {
    const input = raw.trim();
    if (!input) return;

    this.cmdHistory.push(input);
    this.historyIdx = -1;
    this.commandsSinceLoad.push(input);

    // Echo to terminal
    const branch = this.engine.headBranch || '(HEAD detached)';
    this._termPrint('prompt', `${branch} $ ${input}`);

    const result = this.engine.execute(input);

    if (result.msg) {
      this._termPrint(result.ok ? 'out' : 'err', result.msg);
    }

    // Scroll terminal
    const out = document.getElementById('terminal-output');
    if (out) out.scrollTop = out.scrollHeight;

    // Check goals
    if (this.currentChallenge && this.currentMode === 'learn') {
      this._checkGoals();
    }
  }

  _checkGoals() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const state = this.engine.getState();
    const history = this.commandsSinceLoad;
    let allDone = true;

    ch.goals.forEach(goal => {
      let passed = false;
      try {
        passed = goal.check(state, history, this.setupInitialCommits);
      } catch(e) {}

      const check = document.getElementById(`check-${goal.id}`);
      if (check) {
        if (passed) {
          check.classList.add('done');
          check.textContent = '✓';
        } else {
          allDone = false;
        }
      } else {
        if (!passed) allDone = false;
      }
    });

    if (allDone && !this.completedChallenges.includes(ch.id)) {
      setTimeout(() => this._completeChallenge(ch), 500);
    }
  }

  _completeChallenge(ch) {
    this.completedChallenges.push(ch.id);
    this.xp += ch.xp;
    localStorage.setItem('gq_xp', this.xp);
    localStorage.setItem('gq_completed', JSON.stringify(this.completedChallenges));

    this._updateXPDisplay();
    this._buildSidebar();
    this._showSuccessOverlay(ch);
  }

  _showSuccessOverlay(ch) {
    const overlay = document.getElementById('success-overlay');
    if (!overlay) return;

    const messages = [
      '🎉 Challenge Complete!',
      '⚡ Git Mastery Unlocked!',
      '🔥 You\'re on Fire!',
      '✨ Commit to Excellence!'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    overlay.querySelector('.success-title').textContent = msg;
    overlay.querySelector('.success-sub').textContent = ch.name;
    overlay.querySelector('.xp-earned').textContent = `+${ch.xp} XP`;
    overlay.style.display = 'flex';

    // Next challenge
    const btn = overlay.querySelector('.next-btn');
    btn.onclick = () => {
      overlay.style.display = 'none';
      this._loadNextChallenge();
    };

    overlay.querySelector('.retry-btn').onclick = () => {
      overlay.style.display = 'none';
    };
  }

  _loadNextChallenge() {
    for (const tier of TIERS) {
      for (let i = 0; i < tier.challenges.length; i++) {
        const ch = tier.challenges[i];
        if (!this.completedChallenges.includes(ch.id)) {
          this._loadChallenge(tier, ch);
          return;
        }
      }
    }
    this._termPrint('success', '🎉 You completed ALL challenges! You are a Git Wizard!');
  }

  _enterSandbox() {
    this.currentMode = 'sandbox';
    this.currentChallenge = null;
    this.engine.reset();
    this.renderer?.render();
    document.getElementById('terminal-output').innerHTML = '';
    this._termPrint('info', '🏖️  Sandbox mode: Free exploration! Type any git commands.');
    this._termPrint('info', 'No objectives — just experiment and learn!');

    const panel = document.getElementById('mission-content');
    if (panel) {
      panel.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
          <div style="font-size:36px;margin-bottom:12px">🏖️</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px">Sandbox Mode</div>
          <div style="font-size:13px;line-height:1.6">Free exploration — no goals, no limits.<br>Experiment with any git commands!</div>
        </div>
      `;
    }
  }

  _enterLearn() {
    this.currentMode = 'learn';
    const first = TIERS[0]?.challenges[0];
    if (first) this._loadChallenge(TIERS[0], first);
  }

  _updateXPDisplay() {
    const xpEl = document.getElementById('xp-count');
    if (xpEl) xpEl.textContent = this.xp.toLocaleString() + ' XP';

    // Determine level
    const levels = [
      { min: 0, name: 'Rookie' },
      { min: 500, name: 'Contributor' },
      { min: 1200, name: 'Maintainer' },
      { min: 2500, name: 'Architect' },
      { min: 4000, name: 'Git Wizard' }
    ];
    const lvl = [...levels].reverse().find(l => this.xp >= l.min) || levels[0];
    const badge = document.getElementById('level-badge');
    if (badge) badge.textContent = lvl.name;
  }

  // ── TERMINAL ──
  _termPrint(type, text) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const div = document.createElement('div');
    if (type === 'prompt') {
      div.innerHTML = text.replace(/^(.+\$ )(.*)/, (_, prompt, cmd) =>
        `<span class="term-prompt">${this._esc(prompt)}</span><span class="term-cmd">${this._esc(cmd)}</span>`
      );
    } else {
      div.className = `term-${type}`;
      div.textContent = text;
    }
    out.appendChild(div);
  }

  _esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── AUTOCOMPLETE ──
  _showAutocomplete(val) {
    const ac = document.getElementById('autocomplete');
    if (!ac || !val.startsWith('git ')) { this._hideAutocomplete(); return; }

    const GIT_CMDS = [
      ['git commit -m ""', 'Create a new commit'],
      ['git branch', 'List/create branches'],
      ['git checkout', 'Switch branches or commits'],
      ['git checkout -b', 'Create and switch to branch'],
      ['git switch', 'Switch branches (modern)'],
      ['git merge', 'Merge a branch'],
      ['git rebase', 'Rebase onto a branch'],
      ['git log', 'View commit history'],
      ['git status', 'Show working tree status'],
      ['git add', 'Stage changes'],
      ['git reset', 'Reset HEAD'],
      ['git reset --hard', 'Hard reset (dangerous!)'],
      ['git reset --soft', 'Soft reset (keep staged)'],
      ['git revert HEAD', 'Safely undo last commit'],
      ['git cherry-pick', 'Apply specific commit'],
      ['git tag', 'Create/list tags'],
      ['git stash', 'Stash changes'],
      ['git stash pop', 'Apply stash'],
      ['git remote add origin', 'Add remote'],
      ['git push origin main', 'Push to remote'],
    ];

    const matches = GIT_CMDS.filter(([cmd]) => cmd.startsWith(val) && cmd !== val);
    if (!matches.length) { this._hideAutocomplete(); return; }

    ac.innerHTML = matches.slice(0, 6).map(([cmd, desc]) =>
      `<div class="ac-item" onclick="document.getElementById('cmd-input').value='${cmd.replace(/"/g,"'")}';app._hideAutocomplete()">
        <span>${cmd}</span><span class="ac-desc">${desc}</span>
      </div>`
    ).join('');
    ac.style.display = 'block';
  }

  _hideAutocomplete() {
    const ac = document.getElementById('autocomplete');
    if (ac) ac.style.display = 'none';
  }

  _autocomplete(input) {
    const first = document.querySelector('.ac-item');
    if (first) {
      const cmd = first.querySelector('span:first-child').textContent;
      input.value = cmd;
      this._hideAutocomplete();
    }
  }

  _focusInput() {
    document.getElementById('cmd-input')?.focus();
  }

  // ── AI CHAT (right panel) ──
  async _sendAIChat() {
    const inputEl = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    const msgsEl = document.getElementById('ai-chat-messages');
    if (!inputEl || !msgsEl) return;

    const userMsg = inputEl.value.trim();
    if (!userMsg) return;

    inputEl.value = '';
    sendBtn.disabled = true;

    // Add user msg
    this.aiChatHistory.push({ role: 'user', content: userMsg });
    this._renderChatMessages(msgsEl);

    // Add loading indicator
    const loadingId = 'ai-loading-' + Date.now();
    const loadEl = document.createElement('div');
    loadEl.id = loadingId;
    loadEl.className = 'ai-msg assistant';
    loadEl.innerHTML = '<div class="msg-label">GitQuest AI</div><span style="opacity:0.5">Thinking...</span>';
    msgsEl.appendChild(loadEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    // Build context
    const state = this.engine.getState();
    const systemPrompt = `You are an expert Git tutor inside GitQuest, an interactive Git learning app. 
Current repo state: branches=${Object.keys(state.branches).join(',')}, HEAD=${state.headBranch || 'detached'}.
${this.currentChallenge ? `Current challenge: "${this.currentChallenge.name}"` : 'User is in sandbox mode.'}
Be concise (2-4 sentences), use \`code\` formatting, be encouraging and specific. Don't use markdown headers.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: this.aiChatHistory
        })
      });
      const data = await resp.json();
      const reply = data.content?.find(b => b.type === 'text')?.text || 'No response.';

      this.aiChatHistory.push({ role: 'assistant', content: reply });
      document.getElementById(loadingId)?.remove();
      this._renderChatMessages(msgsEl);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    } catch(e) {
      document.getElementById(loadingId)?.remove();
      const errEl = document.createElement('div');
      errEl.className = 'ai-msg assistant';
      errEl.textContent = 'AI tutor unavailable right now.';
      msgsEl.appendChild(errEl);
    }

    sendBtn.disabled = false;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  _renderChatMessages(container) {
    container.innerHTML = this.aiChatHistory.map(msg => `
      <div class="ai-msg ${msg.role}">
        <div class="msg-label">${msg.role === 'user' ? 'You' : 'GitQuest AI'}</div>
        ${this._formatAIText(msg.content)}
      </div>
    `).join('');
  }

  _formatAIText(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GitQuestApp();
  app.init();
});

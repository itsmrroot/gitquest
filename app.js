// =============================================
// GitQuest — js/app.js
// Main application controller (with i18n + theme)
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
    this._initTheme();
    this._initLang();

    const svg = document.getElementById('git-canvas');
    if (svg) {
      this.renderer = new GraphRenderer(svg, this.engine);
      this.engine.on('graph-update', () => this.renderer.render());
      this.renderer.render();
    }

    this._buildSidebar();
    this._bindEvents();
    this._updateXP();
    this._applyI18n();

    if (TIERS && TIERS.length && TIERS[0].challenges.length) {
      this._loadChallenge(TIERS[0], TIERS[0].challenges[0]);
    }

    this._log('info', t('welcome'));
    this._log('info', t('welcomeSub'));
    this._focusInput();
  }

  // ══════════════════════════════════════
  // THEME
  // ══════════════════════════════════════
  _initTheme() {
    const saved = localStorage.getItem('gq_theme') || 'dark';
    this._setTheme(saved, false);
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      this._setTheme(cur === 'dark' ? 'light' : 'dark', true);
    });
  }

  _setTheme(theme, rerender) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gq_theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (rerender) this.renderer?.render();
  }

  // ══════════════════════════════════════
  // LANGUAGE
  // ══════════════════════════════════════
  _initLang() {
    const dropdown = document.getElementById('lang-dropdown');
    if (!dropdown) return;

    const currentCode = localStorage.getItem('gq_lang') || 'en';
    dropdown.innerHTML = '';

    Object.entries(LANGUAGES).forEach(([code, lang]) => {
      const opt = document.createElement('div');
      opt.className = 'lang-option' + (code === currentCode ? ' active' : '');
      opt.innerHTML = `<span class="lang-flag">${lang.flag}</span><span>${lang.name}</span>`;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setLang(code);
        document.getElementById('lang-picker')?.classList.remove('open');
      });
      dropdown.appendChild(opt);
    });

    this._updateLangBtn(currentCode);
    document.documentElement.dir = (LANGUAGES[currentCode]?.dir) || 'ltr';
    document.documentElement.lang = currentCode;

    document.getElementById('lang-current-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('lang-picker')?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('lang-picker')?.classList.remove('open');
    });
  }

  _setLang(code) {
    localStorage.setItem('gq_lang', code);
    this._updateLangBtn(code);
    document.documentElement.dir = (LANGUAGES[code]?.dir) || 'ltr';
    document.documentElement.lang = code;

    document.querySelectorAll('.lang-option').forEach((opt, i) => {
      opt.classList.toggle('active', Object.keys(LANGUAGES)[i] === code);
    });

    this._applyI18n();

    if (this.currentChallenge) {
      this._renderMission(this.currentChallenge);
    } else if (this.mode === 'sandbox') {
      this._renderSandboxPanel();
    }
  }

  _updateLangBtn(code) {
    const lang = LANGUAGES[code] || LANGUAGES.en;
    const flag = document.getElementById('lang-flag');
    const name = document.getElementById('lang-name');
    if (flag) flag.textContent = lang.flag;
    if (name) name.textContent = code.toUpperCase();
  }

  _applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val) el.placeholder = val;
    });
    // Quick question buttons
    document.querySelectorAll('.quick-q').forEach(btn => {
      const qi = btn.getAttribute('data-qi');
      const qf = btn.getAttribute('data-qf');
      if (qi) btn.textContent = t(qi);
      btn.onclick = () => {
        const inp = document.getElementById('ai-input');
        if (inp) inp.value = t(qf);
        this._sendChat();
      };
    });
  }

  // ══════════════════════════════════════
  // SIDEBAR
  // ══════════════════════════════════════
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
        if (!isLocked) item.addEventListener('click', () => this._loadChallenge(tier, ch));
        list.appendChild(item);
      });

      el.appendChild(list);
    });
  }

  // ══════════════════════════════════════
  // CHALLENGE
  // ══════════════════════════════════════
  _loadChallenge(tier, challenge) {
    this.currentChallenge = challenge;
    this.currentTier = tier;
    this.cmdsThisChallenge = [];
    this.hintIdx = 0;

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
    this._log('info', `▶ ${challenge.name}`);
    this._focusInput();
  }

  _renderMission(ch) {
    const panel = document.getElementById('mission-content');
    if (!panel) return;

    const diffClass = {
      beginner: 'diff-beginner', easy: 'diff-easy', medium: 'diff-medium',
      hard: 'diff-hard', expert: 'diff-expert'
    }[ch.difficulty] || 'diff-beginner';

    const hintLabel = t('showHint') || '💡 Show Hint';
    const askLabel = t('askAI') || '✨ Ask AI Tutor';
    const objLabel = t('objectives') || '🎯 Objectives';
    const conceptLabel = t('concept') || 'Concept';

    panel.innerHTML = `
      <div class="mission-title">${ch.name}</div>
      <div class="mission-difficulty ${diffClass}">● ${ch.difficulty} · ${ch.xp} XP</div>
      <p class="mission-desc">${ch.description}</p>
      <div class="mission-goal">
        <div class="mission-goal-title">${objLabel}</div>
        ${ch.goals.map(g => `
          <div class="goal-item" id="goal-${g.id}">
            <div class="goal-check" id="check-${g.id}"></div>
            <span>${g.text}</span>
          </div>
        `).join('')}
      </div>
      ${ch.concept ? `<div class="concept-box">💡 <strong>${conceptLabel}:</strong> ${ch.concept}</div>` : ''}
      <button class="hint-btn" id="hint-btn-main">${hintLabel} (${ch.hints?.length || 0})</button>
      <div class="hint-box" id="hint-box"></div>
      <button class="ask-ai-btn" id="ask-ai-btn-main">${askLabel}</button>
      <div class="ai-response" id="mission-ai"></div>
    `;

    document.getElementById('hint-btn-main')?.addEventListener('click', () => this._showHint());
    document.getElementById('ask-ai-btn-main')?.addEventListener('click', () => this._askAI());
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
    box.textContent = t('thinkingMsg') || 'Thinking...';

    const state = this.engine.getState();
    const langName = window.currentLang().name;
    const prompt = `You are a Git expert tutor inside GitQuest, an interactive learning app. Respond in ${langName}.
Challenge: "${ch.name}" — ${ch.description}
Goals: ${ch.goals.map(g => g.text).join('; ')}
Student commands so far: ${this.cmdsThisChallenge.slice(-5).join(', ') || 'none'}
Branches: ${Object.keys(state.branches).join(', ')} | HEAD: ${state.headBranch || 'detached'}
Give a helpful 3-sentence explanation in ${langName}. Use backtick code formatting. End with one concrete command to try.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await resp.json();
      box.textContent = data.content?.find(b => b.type === 'text')?.text || 'No response.';
    } catch (e) {
      box.textContent = t('aiUnavailable') || 'AI unavailable.';
    }
  }

  // ══════════════════════════════════════
  // EVENTS
  // ══════════════════════════════════════
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
        if (this.histIdx > 0) {
          this.histIdx--;
          input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.histIdx];
        } else { this.histIdx = -1; input.value = ''; }
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
        const target = tab.dataset.tab;
        document.querySelectorAll('.panel-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${target}-content`)?.classList.add('active');
      });
    });

    document.getElementById('btn-clear')?.addEventListener('click', () => {
      const out = document.getElementById('terminal-output');
      if (out) out.innerHTML = '';
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (this.currentChallenge) this._loadChallenge(this.currentTier, this.currentChallenge);
      else {
        this.engine.reset(); this.renderer?.render();
        const out = document.getElementById('terminal-output');
        if (out) out.innerHTML = '';
        this._log('info', t('repoReset'));
      }
    });

    document.getElementById('ai-send')?.addEventListener('click', () => this._sendChat());
    document.getElementById('ai-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendChat(); }
    });
  }

  // ══════════════════════════════════════
  // COMMAND HANDLING
  // ══════════════════════════════════════
  _handleCmd(raw) {
    const input = raw.trim();
    if (!input) return;

    this.cmdHistory.push(input);
    this.histIdx = -1;
    this.cmdsThisChallenge.push(input);

    const branch = this.engine.headBranch || '(detached)';
    this._logRaw(`<span class="term-prompt">${this._esc(branch)} $</span> <span class="term-cmd">${this._esc(input)}</span>`);

    const result = this.engine.execute(input);
    if (result.msg) this._log(result.ok ? 'out' : 'err', result.msg);

    const out = document.getElementById('terminal-output');
    if (out) out.scrollTop = out.scrollHeight;

    const pl = document.getElementById('prompt-branch');
    if (pl) pl.textContent = this.engine.headBranch || '(detached)';

    if (this.mode === 'learn' && this.currentChallenge) this._checkGoals();
  }

  _checkGoals() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const state = this.engine.getState();
    const history = this.cmdsThisChallenge;
    let allDone = true;

    ch.goals.forEach(goal => {
      let passed = false;
      try { passed = goal.check(state, history, this.setupCommitCount); } catch (e) { }
      const chk = document.getElementById(`check-${goal.id}`);
      if (chk) {
        if (passed) { chk.classList.add('done'); chk.textContent = '✓'; }
        else { chk.classList.remove('done'); chk.textContent = ''; allDone = false; }
      } else if (!passed) allDone = false;
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
    overlay.querySelector('.success-title').textContent = t('challengeComplete');
    overlay.querySelector('.success-sub').textContent = ch.name;
    overlay.querySelector('.xp-earned').textContent = `+${ch.xp} ${t('xpEarned') || 'XP'}`;
    overlay.querySelector('.next-btn').textContent = t('nextChallenge');
    overlay.querySelector('.retry-btn').textContent = t('keepExploring');
    overlay.classList.add('show');

    overlay.querySelector('.next-btn').onclick = () => {
      overlay.classList.remove('show');
      this._nextChallenge();
    };
    overlay.querySelector('.retry-btn').onclick = () => overlay.classList.remove('show');
  }

  _nextChallenge() {
    for (const tier of TIERS) {
      for (const ch of tier.challenges) {
        if (!this.completedChallenges.includes(ch.id)) {
          this._loadChallenge(tier, ch);
          return;
        }
      }
    }
    this._log('success', t('alreadyCompleted'));
  }

  _sandbox() {
    this.mode = 'sandbox';
    this.currentChallenge = null;
    this.engine.reset();
    this.renderer?.render();
    const out = document.getElementById('terminal-output');
    if (out) out.innerHTML = '';
    this._log('info', t('sandboxMode'));
    this._renderSandboxPanel();
  }

  _renderSandboxPanel() {
    const panel = document.getElementById('mission-content');
    if (panel) panel.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">🏖️</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px">${t('sandboxTitle')}</div>
        <div style="font-size:13px;line-height:1.7">${(t('sandboxDesc') || '').replace(/\n/g, '<br>')}</div>
      </div>`;
  }

  _learnMode() {
    this.mode = 'learn';
    const first = TIERS?.[0]?.challenges?.[0];
    if (first) this._loadChallenge(TIERS[0], first);
  }

  // ══════════════════════════════════════
  // XP & LEVEL
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // TERMINAL
  // ══════════════════════════════════════
  _log(type, text) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const div = document.createElement('div');
    div.className = `term-${type}`;
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  _logRaw(html) {
    const out = document.getElementById('terminal-output');
    if (!out) return;
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
  }

  _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ══════════════════════════════════════
  // AUTOCOMPLETE
  // ══════════════════════════════════════
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
        if (inp) { inp.value = item.dataset.cmd; inp.focus(); }
        this._hideAC();
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

  // ══════════════════════════════════════
  // AI CHAT
  // ══════════════════════════════════════
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
    loading.innerHTML = `<div class="msg-label">${t('ai') || 'GitQuest AI'}</div><span style="opacity:0.5">${t('thinkingMsg') || 'Thinking...'}</span>`;
    msgs.appendChild(loading);
    msgs.scrollTop = msgs.scrollHeight;

    const state = this.engine.getState();
    const langName = window.currentLang().name;
    const sys = `You are an expert Git tutor in GitQuest. Respond in ${langName}.
Repo state: branches=${Object.keys(state.branches).join(',')}, HEAD=${state.headBranch || 'detached'}.
${this.currentChallenge ? `Challenge: "${this.currentChallenge.name}"` : 'Sandbox mode.'}
Be concise (2-4 sentences), use \`code\` backtick formatting, be encouraging and specific.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
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
    } catch (e) {
      loading.remove();
      const err = document.createElement('div');
      err.className = 'ai-msg assistant';
      err.textContent = t('aiUnavailable') || 'AI unavailable.';
      msgs.appendChild(err);
    }

    if (btn) btn.disabled = false;
    msgs.scrollTop = msgs.scrollHeight;
  }

  _renderChat(container) {
    container.innerHTML = this.aiHistory.map(m => `
      <div class="ai-msg ${m.role}">
        <div class="msg-label">${m.role === 'user' ? (t('you') || 'You') : (t('ai') || 'GitQuest AI')}</div>
        ${this._fmtAI(m.content)}
      </div>`).join('');
  }

  _fmtAI(text) {
    return this._esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GitQuestApp();
  window.app.init();
});

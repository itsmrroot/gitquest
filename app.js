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
    this.undoStack = []; // stores snapshots for undo
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

    const goalSvg = document.getElementById('goal-svg');
    if (goalSvg) {
      this.goalRenderer = new GraphRenderer(goalSvg, null);
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
    this._buildSidebar();
    if (this.currentChallenge) this._renderMission(this.currentChallenge);
    else if (this.mode === 'sandbox') this._renderSandboxPanel();
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
      const val = t(el.getAttribute('data-i18n'));
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const val = t(el.getAttribute('data-i18n-placeholder'));
      if (val) el.placeholder = val;
    });
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
            <div class="challenge-meta">${t('diff_' + ch.difficulty) || ch.difficulty}${isLocked ? ' 🔒' : ''}</div>
          </div>
          <div class="challenge-xp">+${ch.xp}XP</div>`;
        if (!isLocked) item.addEventListener('click', () => {
          this._loadChallenge(tier, ch);
          this._closeSidebar();
        });
        list.appendChild(item);
      });
      el.appendChild(list);
    });
  }

  // ══════════════════════════════════════
  // CHALLENGE
  // ══════════════════════════════════════
  _loadChallenge(tier, challenge, skipIntro) {
    // Show intro first (unless skipIntro=true or already seen)
    const seen = JSON.parse(localStorage.getItem('gq_seen_intros') || '[]');
    if (!skipIntro && !seen.includes(challenge.id)) {
      this._pendingChallenge = { tier, challenge };
      this._showIntro(tier, challenge);
      return;
    }

    this.currentChallenge = challenge;
    this.currentTier = tier;
    this.cmdsThisChallenge = [];
    this.hintIdx = 0;
    this.undoStack = [];

    this.engine.reset();
    this.setupCommitCount = 0;
    for (const cmd of (challenge.setup || [])) {
      this.engine.execute(cmd);
      this.setupCommitCount++;
    }
    this.renderer?.render();
    this._buildSidebar();
    this._renderMission(challenge);
    this._showGoalPanel(challenge.id);

    const out = document.getElementById('terminal-output');
    if (out) out.innerHTML = '';
    this._log('info', `▶ ${challenge.name}`);
    this._focusInput();

    // Close any open modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
  }

  // ══════════════════════════════════════
  // INTRO DIALOG (learnGitBranching style)
  // ══════════════════════════════════════
  _showIntro(tier, challenge) {
    const modal = document.getElementById('modal-intro');
    if (!modal) { this._loadChallenge(tier, challenge, true); return; }

    const intro = (window.CHALLENGE_INTROS || {})[challenge.id];
    const diffColors = {
      beginner: { bg: 'rgba(57,211,83,0.12)', color: 'var(--accent)' },
      easy:     { bg: 'rgba(88,166,255,0.12)', color: 'var(--accent-blue)' },
      medium:   { bg: 'rgba(240,136,62,0.12)', color: 'var(--accent-orange)' },
      hard:     { bg: 'rgba(248,81,73,0.12)', color: 'var(--accent-red)' },
      expert:   { bg: 'rgba(188,140,255,0.12)', color: 'var(--accent-purple)' }
    };
    const dc = diffColors[challenge.difficulty] || diffColors.beginner;

    // Header
    const tierEl = document.getElementById('intro-tier');
    const titleEl = document.getElementById('intro-title');
    if (tierEl) tierEl.textContent = tier.name;
    if (titleEl) titleEl.textContent = challenge.name;

    // Difficulty badge
    const diffEl = document.getElementById('intro-diff');
    if (diffEl) {
      diffEl.textContent = '● ' + (t('diff_' + challenge.difficulty) || challenge.difficulty) + ' · ' + challenge.xp + ' XP';
      diffEl.style.background = dc.bg;
      diffEl.style.color = dc.color;
    }

    // Body
    const body = document.getElementById('intro-body');
    if (body) {
      let html = '';

      if (intro?.whatYouLearn) {
        html += `<div class="intro-what-you-learn">
          <strong>${t('whatYouLearn')}</strong>
          ${intro.whatYouLearn}
        </div>`;
      }

      if (intro?.description) {
        html += `<div class="intro-description">${intro.description}</div>`;
      } else {
        html += `<div class="intro-description">${challenge.description}</div>`;
      }

      if (intro?.prereqs) {
        html += `<div class="intro-prereqs">
          <strong>${t('prerequisites')}</strong>
          ${intro.prereqs}
        </div>`;
      }

      if (intro?.firstHint) {
        html += `<div class="intro-first-hint">
          <strong>${t('firstStepHint')}</strong>
          ${intro.firstHint}
        </div>`;
      }

      if (intro?.tip) {
        html += `<div class="intro-first-hint" style="border-color:rgba(88,166,255,0.25);background:rgba(88,166,255,0.07);color:var(--accent-blue)">
          <strong>${t('proTip')}</strong>
          ${intro.tip}
        </div>`;
      }

      html += `<div class="intro-goals-preview">
        <div class="intro-goals-title">${t('yourObjectives')}</div>
        ${challenge.goals.map((g, i) => `
          <div class="intro-goal-row">
            <div class="intro-goal-num">${i+1}</div>
            <span>${g.text}</span>
          </div>`).join('')}
      </div>`;

      body.innerHTML = html;
    }

    // Wire Start button
    const startBtn = document.getElementById('intro-start');
    if (startBtn) {
      startBtn.onclick = () => {
        // Mark as seen
        const seen = JSON.parse(localStorage.getItem('gq_seen_intros') || '[]');
        if (!seen.includes(challenge.id)) {
          seen.push(challenge.id);
          localStorage.setItem('gq_seen_intros', JSON.stringify(seen));
        }
        modal.style.display = 'none';
        modal.classList.remove('show');
        this._loadChallenge(tier, challenge, true);
      };
    }

    // Close button
    document.getElementById('intro-close').onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    };

    // Prev/Next navigation
    const allChallenges = [];
    TIERS.forEach(tier_ => tier_.challenges.forEach(c => allChallenges.push({ tier: tier_, challenge: c })));
    const curIdx = allChallenges.findIndex(x => x.challenge.id === challenge.id);

    const prevBtn = document.getElementById('intro-prev');
    const nextBtn = document.getElementById('intro-next');
    if (prevBtn) {
      prevBtn.disabled = curIdx <= 0;
      prevBtn.onclick = () => {
        if (curIdx > 0) {
          const prev = allChallenges[curIdx - 1];
          this._pendingChallenge = prev;
          this._showIntro(prev.tier, prev.challenge);
        }
      };
    }
    if (nextBtn) {
      nextBtn.disabled = curIdx >= allChallenges.length - 1;
      nextBtn.onclick = () => {
        if (curIdx < allChallenges.length - 1) {
          const next = allChallenges[curIdx + 1];
          this._pendingChallenge = next;
          this._showIntro(next.tier, next.challenge);
        }
      };
    }

    modal.style.display = 'flex';
    modal.classList.add('show');
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
      <div class="mission-difficulty ${diffClass}">● ${t('diff_' + ch.difficulty) || ch.difficulty} · ${ch.xp} XP</div>
      <p class="mission-desc">${ch.description}</p>
      <div class="mission-goal">
        <div class="mission-goal-title">${t('objectives') || '🎯 Objectives'}</div>
        ${ch.goals.map(g => `
          <div class="goal-item" id="goal-${g.id}">
            <div class="goal-check" id="check-${g.id}"></div>
            <span>${g.text}</span>
          </div>`).join('')}
      </div>
      ${ch.concept ? `<div class="concept-box">💡 <strong>${t('concept')}:</strong> ${ch.concept}</div>` : ''}
      <button class="hint-btn" id="hint-btn-main">${t('showHint') || '💡 Show Hint'} (${ch.hints?.length || 0})</button>
      <div class="hint-box" id="hint-box"></div>
      <button class="ask-ai-btn" id="ask-ai-btn-main">${t('askAI') || '✨ Ask AI Tutor'}</button>
      <div class="ai-response" id="mission-ai"></div>
    `;
    document.getElementById('hint-btn-main')?.addEventListener('click', () => this._showHint());
    document.getElementById('ask-ai-btn-main')?.addEventListener('click', () => this._askAIInline());
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

  // Inline AI in mission panel
  async _askAIInline() {
    const ch = this.currentChallenge;
    if (!ch) return;
    const box = document.getElementById('mission-ai');
    if (!box) return;

    if (!this._getGeminiKey()) {
      box.style.display = 'block';
      box.innerHTML = `<span style="color:var(--accent-yellow)">${t('addApiKey').replace('{tab}', `<strong>${t('aiTutor')}</strong>`)}</span>`;
      return;
    }

    box.style.display = 'block';
    box.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';

    const state = this.engine.getState();
    const langName = window.currentLang().name;
    const sys = `You are a Git expert tutor inside GitQuest. Respond in ${langName}. Be concise, use backtick code formatting, be encouraging.`;
    const prompt = `Challenge: "${ch.name}" — ${ch.description}
Goals: ${ch.goals.map(g => g.text).join('; ')}
Student commands so far: ${this.cmdsThisChallenge.slice(-5).join(', ') || 'none yet'}
Branches: ${Object.keys(state.branches).join(', ')} | HEAD: ${state.headBranch || 'detached'}
Give a helpful 3-sentence explanation. End with one concrete command to try next.`;

    try {
      const text = await this._callGemini(prompt, sys);
      box.innerHTML = this._fmtAI(text || 'No response.');
    } catch(e) {
      box.innerHTML = `<span style="color:var(--accent-red)">AI error: ${this._esc(e.message)}</span>`;
    }
  }

  // ══════════════════════════════════════
  // TOOLBAR
  // ══════════════════════════════════════
  _bindToolbar() {
    document.getElementById('tool-levels')?.addEventListener('click', () => {
      this._toggleSidebar();
      // When expanding sidebar on desktop, scroll it back to the top
      if (window.innerWidth > 1024 && !document.getElementById('app')?.classList.contains('sidebar-collapsed')) {
        document.getElementById('sidebar')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('tool-objective')?.addEventListener('click', () => {
      this._showObjective();
    });

    document.getElementById('tool-solution')?.addEventListener('click', () => {
      this._showSolution();
    });

    document.getElementById('tool-undo')?.addEventListener('click', () => {
      this._undoCmd();
    });

    document.getElementById('tool-reset')?.addEventListener('click', () => {
      if (this.currentChallenge) this._loadChallenge(this.currentTier, this.currentChallenge);
      else {
        this.engine.reset(); this.renderer?.render();
        const out = document.getElementById('terminal-output');
        if (out) out.innerHTML = '';
        this._log('info', t('repoReset'));
      }
    });

    document.getElementById('tool-help')?.addEventListener('click', () => {
      document.getElementById('modal-help')?.classList.add('show');
    });

    this._bindGoalPanel();
    this._bindMobileNav();

    document.getElementById('tool-reset-all')?.addEventListener('click', () => {
      document.getElementById('modal-reset-all')?.classList.add('show');
    });

    document.getElementById('reset-all-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-reset-all')?.classList.remove('show');
    });

    document.getElementById('reset-all-confirm')?.addEventListener('click', () => {
      // Wipe all GitQuest localStorage keys
      ['gq_xp', 'gq_completed', 'gq_seen_intros'].forEach(k => localStorage.removeItem(k));
      // Reset in-memory state
      this.xp = 0;
      this.completedChallenges = [];
      this.currentChallenge = null;
      this.currentTier = null;
      this.engine.reset();
      this.renderer?.render();
      // Rebuild sidebar
      this._buildSidebar();
      // Switch to sandbox / clear terminal
      const out = document.getElementById('terminal-output');
      if (out) out.innerHTML = '';
      this._log('success', t('progressReset'));
      this._updateXP();
      document.getElementById('modal-reset-all')?.classList.remove('show');
      document.getElementById('goal-panel')?.style.setProperty('display', 'none');
      document.getElementById('goal-reopen')?.style.setProperty('display', 'none');
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('show');
      });
    });
  }

  _showObjective() {
    const ch = this.currentChallenge;
    const modal = document.getElementById('modal-objective');
    const content = document.getElementById('objective-content');
    if (!modal || !content) return;

    if (!ch) {
      content.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px">${t('selectFirst')}</div>`;
    } else {
      content.innerHTML = `
        <div class="objective-desc">${ch.description}</div>
        <div class="objective-goals">
          ${ch.goals.map((g, i) => {
            const state = this.engine.getState();
            let passed = false;
            try { passed = g.check(state, this.cmdsThisChallenge, this.setupCommitCount); } catch(e){}
            return `
              <div class="objective-goal-item">
                <div class="obj-num" style="${passed ? 'background:var(--accent);color:#000;border-color:var(--accent)' : ''}">${passed ? '✓' : i+1}</div>
                <span style="${passed ? 'color:var(--accent)' : ''}">${g.text}</span>
              </div>`;
          }).join('')}
        </div>
        ${ch.concept ? `<div class="concept-callout">💡 <strong>${t('keyConcept')}:</strong> ${ch.concept}</div>` : ''}
      `;
    }
    modal.classList.add('show');
  }

  _showSolution() {
    const ch = this.currentChallenge;
    const modal = document.getElementById('modal-solution');
    const content = document.getElementById('solution-content');
    if (!modal || !content) return;

    if (!ch) {
      content.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px">${t('selectFirst')}</div>`;
    } else {
      const steps = ch.hints || [];
      content.innerHTML = `
        <div class="solution-warn">${t('trySolving')}</div>
        <div class="solution-steps">
          ${steps.map((hint, i) => `
            <div class="solution-step" onclick="window.app._pasteCmd('${hint.replace(/'/g,"\\'")}')">
              <span class="step-num">${i+1}</span>
              <span class="step-cmd">${this._esc(hint)}</span>
              <span class="step-copy">${t('clickToPaste')} ↗</span>
            </div>`).join('')}
        </div>
        <div class="solution-footer">${t('clickStepToPaste')}</div>
      `;
    }
    modal.classList.add('show');
  }

  _pasteCmd(cmd) {
    const inp = document.getElementById('cmd-input');
    if (inp) {
      inp.value = cmd;
      inp.focus();
    }
    document.getElementById('modal-solution')?.classList.remove('show');
  }

  _undoCmd() {
    if (this.undoStack.length === 0) {
      this._log('err', t('nothingToUndo'));
      return;
    }
    const snapshot = this.undoStack.pop();
    this.engine.commits = snapshot.commits;
    this.engine.branches = snapshot.branches;
    this.engine.HEAD = snapshot.HEAD;
    this.engine.headBranch = snapshot.headBranch;
    this.engine.tags = snapshot.tags;
    this.engine.staging = snapshot.staging;
    this.renderer?.render();

    this.cmdsThisChallenge.pop();
    this._log('info', t('undidCmd'));

    const pl = document.getElementById('prompt-branch');
    if (pl) pl.textContent = this.engine.headBranch || '(detached)';

    if (this.mode === 'learn' && this.currentChallenge) this._checkGoals();
  }

  _saveSnapshot() {
    // Deep copy current engine state
    this.undoStack.push({
      commits: JSON.parse(JSON.stringify(this.engine.commits)),
      branches: { ...this.engine.branches },
      HEAD: this.engine.HEAD,
      headBranch: this.engine.headBranch,
      tags: { ...this.engine.tags },
      staging: [...this.engine.staging]
    });
    // Cap undo stack at 20
    if (this.undoStack.length > 20) this.undoStack.shift();
  }

  // ══════════════════════════════════════
  // EVENTS
  // ══════════════════════════════════════
  _bindEvents() {
    this._bindToolbar();

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

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.mode === 'sandbox') this._sandbox();
        else this._learnMode();
      });
    });

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

    // Show key setup if no Gemini key is stored yet
    if (!this._getGeminiKey()) {
      this._renderKeySetup();
    } else {
      this._setAIStatus('online');
    }
  }

  // ══════════════════════════════════════
  // COMMAND HANDLING
  // ══════════════════════════════════════
  _handleCmd(raw) {
    const input = raw.trim();
    if (!input) return;

    // Intercept undo before it reaches the engine
    if (input === 'undo' || input === 'git undo') {
      this.cmdHistory.push(input);
      this.histIdx = -1;
      const branch = this.engine.headBranch || '(detached)';
      this._logRaw(`<span class="term-prompt">${this._esc(branch)} $</span> <span class="term-cmd">${this._esc(input)}</span>`);
      this._undoCmd();
      return;
    }

    // Save snapshot only for state-changing commands (skip read-only ones)
    const sub = input.split(/\s+/)[1];
    const readOnly = new Set(['log', 'status', 'diff', 'help']);
    if (!readOnly.has(sub)) this._saveSnapshot();

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
      try { passed = goal.check(state, history, this.setupCommitCount); } catch(e){}
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
    document.getElementById('goal-panel')?.style.setProperty('display', 'none');
    document.getElementById('goal-reopen')?.style.setProperty('display', 'none');
  }

  _bindGoalPanel() {
    const panel   = document.getElementById('goal-panel');
    const handle  = document.getElementById('goal-drag-handle');
    const reopen  = document.getElementById('goal-reopen');
    if (!panel) return;

    // ── Minimise / expand ──
    document.getElementById('goal-toggle')?.addEventListener('click', () => {
      const body = document.getElementById('goal-panel-body');
      const btn  = document.getElementById('goal-toggle');
      if (!body) return;
      const collapsed = body.style.display === 'none';
      body.style.display = collapsed ? 'block' : 'none';
      if (btn) btn.textContent = collapsed ? '−' : '+';
    });

    // ── Close → show re-open badge ──
    document.getElementById('goal-close')?.addEventListener('click', () => {
      panel.style.display = 'none';
      if (reopen && this.currentChallenge) reopen.style.display = 'flex';
    });

    reopen?.addEventListener('click', () => {
      reopen.style.display = 'none';
      panel.style.display = 'block';
    });

    // ── Drag ──
    if (!handle) return;
    let dragging = false, ox = 0, oy = 0;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('.goal-panel-btn')) return;
      dragging = true;
      handle.style.cursor = 'grabbing';
      // Switch to fixed so it can roam freely over the whole viewport
      const rect = panel.getBoundingClientRect();
      panel.style.position = 'fixed';
      panel.style.left     = rect.left + 'px';
      panel.style.top      = rect.top  + 'px';
      panel.style.right    = 'auto';
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      let x = e.clientX - ox;
      let y = e.clientY - oy;
      // Keep inside viewport
      x = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  x));
      y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, y));
      panel.style.left = x + 'px';
      panel.style.top  = y + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.style.cursor = '';
    });
  }

  _showGoalPanel(challengeId) {
    const panel   = document.getElementById('goal-panel');
    const notEl   = document.getElementById('goal-note');
    const goalSvg = document.getElementById('goal-svg');
    if (!panel || !goalSvg) return;

    const goal = (window.GOAL_GRAPHS || {})[challengeId];
    if (!goal) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';
    document.getElementById('goal-reopen')?.style.setProperty('display', 'none');
    if (notEl) notEl.textContent = goal.note || '';

    // Size the SVG to fit the goal graph
    const commitCount = Object.keys(goal.commits).length;
    const branchCount = Object.keys(goal.branches).length;
    // Natural graph extents matching renderer constants (OFFSET_X=50, NODE_DX=100, OFFSET_Y=50, NODE_DY=72)
    const vbW = Math.max(130, commitCount * 100 + 30);
    const vbH = Math.max(110, (branchCount - 1) * 72 + 100);
    // Scale to fill 294px content area; floor at 0.25 so large graphs remain legible
    const CONTENT_W = 294;
    const scale = Math.max(0.25, Math.min(1.3, CONTENT_W / vbW));
    goalSvg.style.width  = Math.round(vbW * scale) + 'px';
    goalSvg.style.height = Math.round(vbH * scale) + 'px';
    goalSvg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

    // Reset pan so goal graph is always fully visible
    if (this.goalRenderer) {
      this.goalRenderer.panX = 0;
      this.goalRenderer.panY = 0;
      this.goalRenderer.render(goal);
    }
  }

  _renderSandboxPanel() {
    const panel = document.getElementById('mission-content');
    if (panel) panel.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">🏖️</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px">${t('sandboxTitle')}</div>
        <div style="font-size:13px;line-height:1.7">${(t('sandboxDesc') || '').replace(/\n/g,'<br>')}</div>
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
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      ['git undo', 'Undo last command'],
      ['undo', 'Undo last command'],
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
  // GEMINI API
  // ══════════════════════════════════════
  _getGeminiKey() {
    return localStorage.getItem('gq_gemini_key') || '';
  }

  _getGeminiModel() {
    return localStorage.getItem('gq_gemini_model') || '';
  }

  async _fetchAvailableModels(key) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const all = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({ id: m.name.replace('models/', ''), label: m.displayName || m.name.replace('models/', '') }));
    // Sort preferred models first
    const PREF = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    all.sort((a, b) => {
      const ai = PREF.indexOf(a.id), bi = PREF.indexOf(b.id);
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
    return all;
  }

  async _callGemini(userPrompt, systemPrompt, history = []) {
    const key = this._getGeminiKey();
    if (!key) throw new Error('No API key set.');

    const model = this._getGeminiModel();
    if (!model) throw new Error('No model selected. Re-open the AI Tutor tab to connect again.');

    // Convert chat history to Gemini format (role: 'user'|'model')
    const contents = [
      ...history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents
        })
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  // ══════════════════════════════════════
  // AI CHAT (right panel)
  // ══════════════════════════════════════
  _setAIStatus(state) {
    const dot = document.querySelector('.ai-dot');
    if (!dot) return;
    dot.className = 'ai-dot' + (state === 'loading' ? ' loading' : state === 'error' ? ' error' : '');
    const label = document.querySelector('.ai-status span:last-child');
    if (label) {
      label.textContent = state === 'loading' ? t('thinkingMsg') :
                          state === 'error'   ? t('aiUnavailable') :
                          t('poweredBy');
    }
  }

  _renderKeySetup() {
    const panel = document.getElementById('ai-chat-content');
    if (!panel) return;
    const existing = panel.querySelector('.key-setup');
    if (existing) return;

    const key = this._getGeminiKey();
    const setup = document.createElement('div');
    setup.className = 'key-setup';
    setup.innerHTML = `
      <div class="key-setup-icon">🤖</div>
      <div class="key-setup-title">Connect AI Tutor</div>
      <div class="key-setup-desc">Paste your <strong>free</strong> Google Gemini API key below.<br>Get one at <a class="key-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com</a> — no credit card needed.</div>
      <input class="key-input" id="gemini-key-input" type="password" placeholder="AIzaSy..." value="${this._esc(key)}" spellcheck="false" />
      <div id="model-row" style="display:none">
        <div class="model-label">Available models for your key</div>
        <select class="model-select" id="gemini-model-select"></select>
      </div>
      <button class="key-save-btn" id="key-save-btn">✓ Connect</button>
      ${key ? '<button class="key-clear-btn" id="key-clear-btn">✕ Remove Key</button>' : ''}
      <div id="key-status" class="key-note">🔒 Key stored only in your browser. Models are auto-detected from your account.</div>
    `;
    panel.insertBefore(setup, panel.firstChild);

    const saveBtn = document.getElementById('key-save-btn');
    const statusEl = document.getElementById('key-status');
    const modelRow = document.getElementById('model-row');
    const modelSel = document.getElementById('gemini-model-select');
    let detectedModels = [];

    saveBtn?.addEventListener('click', async () => {
      const val = document.getElementById('gemini-key-input')?.value.trim();
      if (!val) { statusEl.textContent = '⚠️ Paste your API key first.'; return; }

      // If models not yet detected, detect first
      if (!detectedModels.length) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⟳ Detecting models…';
        statusEl.textContent = '';
        try {
          detectedModels = await this._fetchAvailableModels(val);
          if (!detectedModels.length) throw new Error('No generateContent-capable models found for this key.');

          modelSel.innerHTML = detectedModels
            .map((m, i) => `<option value="${m.id}" ${i === 0 ? 'selected' : ''}>${m.label}${i === 0 ? ' ✅' : ''}</option>`)
            .join('');
          modelRow.style.display = 'block';
          saveBtn.textContent = '✓ Save & Connect';
          saveBtn.disabled = false;
          statusEl.textContent = `Found ${detectedModels.length} model(s). Top pick selected.`;
        } catch(e) {
          saveBtn.textContent = '✓ Connect';
          saveBtn.disabled = false;
          statusEl.innerHTML = `<span style="color:var(--accent-red)">Error: ${this._esc(e.message)}</span>`;
        }
        return;
      }

      // Second click: save
      const sel = modelSel?.value || detectedModels[0]?.id || '';
      if (!sel) return;
      localStorage.setItem('gq_gemini_key', val);
      localStorage.setItem('gq_gemini_model', sel);
      setup.remove();
      this._setAIStatus('online');
      const msgs = document.getElementById('ai-chat-messages');
      if (msgs) {
        const note = document.createElement('div');
        note.className = 'ai-msg assistant';
        note.innerHTML = `<div class="msg-label">GitQuest AI</div>✅ Connected via <strong>${sel}</strong>. Ask me anything about Git!`;
        msgs.appendChild(note);
        msgs.scrollTop = msgs.scrollHeight;
      }
    });

    document.getElementById('key-clear-btn')?.addEventListener('click', () => {
      localStorage.removeItem('gq_gemini_key');
      localStorage.removeItem('gq_gemini_model');
      setup.remove();
      this._renderKeySetup();
    });
  }

  async _sendChat() {
    const inp = document.getElementById('ai-input');
    const btn = document.getElementById('ai-send');
    const msgs = document.getElementById('ai-chat-messages');
    if (!inp || !msgs) return;
    const text = inp.value.trim();
    if (!text) return;

    if (!this._getGeminiKey()) {
      this._renderKeySetup();
      document.querySelectorAll('.panel-tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(x => x.classList.remove('active'));
      document.querySelector('.panel-tab[data-tab="ai-chat"]')?.classList.add('active');
      document.getElementById('ai-chat-content')?.classList.add('active');
      return;
    }

    inp.value = '';
    if (btn) btn.disabled = true;
    this._setAIStatus('loading');

    this.aiHistory.push({ role: 'user', content: text });
    this._renderChat(msgs);

    const loading = document.createElement('div');
    loading.className = 'ai-msg assistant';
    loading.innerHTML = `<div class="msg-label">${t('ai') || 'GitQuest AI'}</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(loading);
    msgs.scrollTop = msgs.scrollHeight;

    const state = this.engine.getState();
    const langName = window.currentLang().name;
    const sys = `You are an expert Git tutor inside GitQuest, an interactive Git learning platform. Respond in ${langName}.
Current repo: branches=[${Object.keys(state.branches).join(', ')}], HEAD=${state.headBranch || 'detached HEAD'}.
${this.currentChallenge ? `Active challenge: "${this.currentChallenge.name}" — ${this.currentChallenge.description}` : 'User is in sandbox mode (free exploration).'}
Be concise (2-4 sentences max), use backtick code formatting for commands, be encouraging and specific. Never use markdown headers.`;

    try {
      // Pass all history except the last user message (already appended above)
      const historyWithoutLast = this.aiHistory.slice(0, -1);
      const reply = await this._callGemini(text, sys, historyWithoutLast);
      this.aiHistory.push({ role: 'assistant', content: reply || 'No response received.' });
      loading.remove();
      this._renderChat(msgs);
      this._setAIStatus('online');
    } catch(e) {
      loading.remove();
      this.aiHistory.pop(); // remove the failed user message from history
      const err = document.createElement('div');
      err.className = 'ai-msg assistant';
      err.innerHTML = `<div class="msg-label">GitQuest AI</div><span style="color:var(--accent-red)">Error: ${this._esc(e.message)}</span>`;
      msgs.appendChild(err);
      this._setAIStatus('error');
      if (e.message.includes('API_KEY') || e.message.includes('400') || e.message.includes('401')) {
        this._renderKeySetup();
      }
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
    container.scrollTop = container.scrollHeight;
  }

  _fmtAI(text) {
    return this._esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  // ══════════════════════════════════════
  // MOBILE / RESPONSIVE
  // ══════════════════════════════════════
  _bindMobileNav() {
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      this._closeSidebar();
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._showMobilePanel(btn.dataset.panel);
      });
    });
  }

  _toggleSidebar() {
    if (window.innerWidth > 1024) {
      document.getElementById('app')?.classList.toggle('sidebar-collapsed');
      return;
    }
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar?.classList.contains('open')) {
      this._closeSidebar();
    } else {
      sidebar?.classList.add('open');
      overlay?.classList.add('show');
    }
  }

  _closeSidebar() {
    if (window.innerWidth > 1024) {
      document.getElementById('app')?.classList.add('sidebar-collapsed');
      return;
    }
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }

  _showMobilePanel(panel) {
    const rightPanel = document.getElementById('right-panel');
    this._closeSidebar();
    switch (panel) {
      case 'graph':
        rightPanel?.classList.remove('open');
        break;
      case 'challenges':
        this._toggleSidebar();
        break;
      case 'mission':
        rightPanel?.classList.add('open');
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
        document.querySelector('.panel-tab[data-tab="mission"]')?.classList.add('active');
        document.getElementById('mission-content')?.classList.add('active');
        break;
      case 'ai':
        rightPanel?.classList.add('open');
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
        document.querySelector('.panel-tab[data-tab="ai-chat"]')?.classList.add('active');
        document.getElementById('ai-chat-content')?.classList.add('active');
        break;
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GitQuestApp();
  window.app.init();
});

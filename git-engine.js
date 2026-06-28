// =============================================
// GitQuest — js/git-engine.js
// Core Git simulation engine
// =============================================

class GitEngine {
  constructor() {
    this.commits = {};
    this.branches = {};
    this.HEAD = null;
    this.headBranch = null;
    this.remotes = {};
    this.staging = [];
    this.tags = {};
    this.stash = [];
    this.commandHistory = [];
    this._listeners = {};
    this._init();
  }

  reset() {
    this.commits = {};
    this.branches = {};
    this.HEAD = null;
    this.headBranch = null;
    this.remotes = {};
    this.staging = [];
    this.tags = {};
    this.stash = [];
    this.commandHistory = [];
    this._init();
  }

  _init() {
    const c0 = this._createCommit('Initial commit', [], 'C0');
    this.branches['main'] = c0.id;
    this.headBranch = 'main';
    this.HEAD = c0.id;
  }

  _createCommit(message, parents, forcedId) {
    const id = forcedId || this._genId();
    const commit = { id, message, parents: parents || [], timestamp: Date.now() };
    this.commits[id] = commit;
    return commit;
  }

  _genId() {
    const chars = 'abcdef0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ── EXECUTE ──
  execute(rawInput) {
    const input = rawInput.trim();
    if (!input) return { ok: true, msg: '' };
    this.commandHistory.push(input);

    const tokens = this._tokenize(input);
    if (!tokens.length || tokens[0] !== 'git') {
      return { ok: false, msg: `Command not found: ${tokens[0] || ''}. Use git commands.` };
    }

    const sub = tokens[1];
    if (!sub) return { ok: false, msg: 'Usage: git <command>' };

    // Parse flags and positional args
    const flags = {};
    const positional = [];
    for (let i = 2; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === '--no-ff') { flags['no-ff'] = true; }
      else if (t === '--amend') { flags.amend = true; }
      else if (t === '--hard') { flags.hard = true; }
      else if (t === '--soft') { flags.soft = true; }
      else if (t === '--mixed') { flags.mixed = true; }
      else if (t === '--oneline') { flags.oneline = true; }
      else if (t === '-b') { flags.b = true; }
      else if (t === '-B') { flags.B = true; }
      else if (t === '-c') { flags.c = true; }
      else if (t === '-d') { flags.d = true; }
      else if (t === '-D') { flags.D = true; }
      else if (t === '-v') { flags.v = true; }
      else if (t === '-m') { flags.m = tokens[++i] || ''; }
      else if (t.startsWith('--message=')) { flags.m = t.slice(10); }
      else if (t.startsWith('-n')) { flags.n = parseInt(t.slice(2)) || 10; }
      else if (!t.startsWith('-')) { positional.push(t); }
    }

    try {
      switch (sub) {
        case 'init': return this._gitInit();
        case 'commit': return this._gitCommit(positional, flags);
        case 'branch': return this._gitBranch(positional, flags);
        case 'checkout': return this._gitCheckout(positional, flags);
        case 'switch': return this._gitSwitch(positional, flags);
        case 'merge': return this._gitMerge(positional, flags);
        case 'rebase': return this._gitRebase(positional, flags);
        case 'log': return this._gitLog(positional, flags);
        case 'status': return this._gitStatus();
        case 'add': return this._gitAdd(positional);
        case 'reset': return this._gitReset(positional, flags);
        case 'revert': return this._gitRevert(positional);
        case 'cherry-pick': return this._gitCherryPick(positional);
        case 'tag': return this._gitTag(positional, flags);
        case 'stash': return this._gitStash(positional);
        case 'diff': return { ok: true, msg: '(Sandbox: no real files)\ndiff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new' };
        case 'remote': return this._gitRemote(positional, flags);
        case 'push': return this._gitPush(positional);
        case 'pull': return { ok: true, msg: 'Already up to date. (Sandbox)' };
        case 'fetch': return { ok: true, msg: 'Fetched from remote. (Sandbox)' };
        case 'clone': return { ok: true, msg: 'Cloned into sandbox.' };
        case 'help': return this._gitHelp();
        default:
          return { ok: false, msg: `git: '${sub}' is not a git command. Try 'git help'.` };
      }
    } catch (e) {
      return { ok: false, msg: `Fatal: ${e.message}` };
    }
  }

  _tokenize(input) {
    // Handle quoted strings
    const tokens = [];
    let cur = '', inQ = false, qChar = '';
    for (const ch of input) {
      if (inQ) {
        if (ch === qChar) inQ = false;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        inQ = true; qChar = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (cur) tokens.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  _resolveRef(ref) {
    if (!ref) return null;
    if (ref === 'HEAD') return this.HEAD;
    // HEAD~N
    const headTildeMatch = ref.match(/^HEAD~(\d+)$|^HEAD~$/);
    if (headTildeMatch) {
      const n = parseInt(headTildeMatch[1] || '1');
      let cid = this.HEAD;
      for (let i = 0; i < n; i++) {
        cid = this.commits[cid]?.parents[0] || null;
        if (!cid) break;
      }
      return cid;
    }
    if (this.branches[ref]) return this.branches[ref];
    if (this.tags[ref]) return this.tags[ref];
    if (this.commits[ref]) return ref;
    // Partial hash match
    const match = Object.keys(this.commits).find(k => k.startsWith(ref));
    return match || null;
  }

  // ── GIT COMMANDS ──

  _gitInit() {
    this.reset();
    this._emit('graph-update');
    return { ok: true, msg: 'Initialized empty Git repository.' };
  }

  _gitCommit(positional, flags) {
    // Handle: git commit -m "msg" or git commit --amend
    let message = flags.m || null;

    // Fallback: look for message in positional after stripping -m
    if (!message && positional.length > 0) {
      message = positional.join(' ');
    }
    if (!message) message = 'Update';

    if (flags.amend) {
      const c = this.commits[this.HEAD];
      if (!c) return { ok: false, msg: 'Nothing to amend.' };
      const newId = this._genId();
      const amended = { ...c, id: newId, message: flags.m || c.message };
      this.commits[newId] = amended;
      delete this.commits[this.HEAD];
      if (this.headBranch) this.branches[this.headBranch] = newId;
      this.HEAD = newId;
      this._emit('graph-update');
      return { ok: true, msg: `[${this.headBranch || 'HEAD'} ${newId}] ${message} (amended)` };
    }

    const newC = this._createCommit(message, [this.HEAD]);
    if (this.headBranch) this.branches[this.headBranch] = newC.id;
    this.HEAD = newC.id;
    this.staging = [];
    this._emit('graph-update');
    return { ok: true, msg: `[${this.headBranch || 'HEAD'} ${newC.id}] ${message}` };
  }

  _gitBranch(positional, flags) {
    // Delete
    if (flags.d || flags.D) {
      const name = positional[0];
      if (!name) return { ok: false, msg: 'Branch name required.' };
      if (name === this.headBranch) return { ok: false, msg: `Cannot delete checked-out branch '${name}'.` };
      if (!this.branches[name] && !flags.D) return { ok: false, msg: `Branch '${name}' not found.` };
      delete this.branches[name];
      this._emit('graph-update');
      return { ok: true, msg: `Deleted branch ${name}.` };
    }
    // Rename: git branch -m [<old>] <new>
    // Tokenizer consumes the token after -m as flags.m, so:
    //   "git branch -m old new" → flags.m='old', positional=['new']
    //   "git branch -m new"     → flags.m='new', positional=[]  (rename current)
    if ('m' in flags) {
      let old, neu;
      if (positional.length >= 1) {
        old = flags.m || this.headBranch;
        neu = positional[0];
      } else {
        old = this.headBranch;
        neu = flags.m;
      }
      if (!neu) return { ok: false, msg: 'New branch name required.' };
      if (!this.branches[old]) return { ok: false, msg: `Branch '${old}' not found.` };
      this.branches[neu] = this.branches[old];
      delete this.branches[old];
      if (this.headBranch === old) this.headBranch = neu;
      this._emit('graph-update');
      return { ok: true, msg: `Renamed branch '${old}' to '${neu}'.` };
    }
    // Create
    if (positional.length > 0) {
      const name = positional[0];
      const startPoint = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
      if (!startPoint) return { ok: false, msg: 'Invalid start point.' };
      if (this.branches[name]) return { ok: false, msg: `Branch '${name}' already exists. Use -B to force.` };
      this.branches[name] = startPoint;
      this._emit('graph-update');
      return { ok: true, msg: `Created branch '${name}'.` };
    }
    // List
    const list = Object.keys(this.branches)
      .map(b => `  ${b === this.headBranch ? '* ' : '  '}${b}`)
      .join('\n');
    return { ok: true, msg: list || '  (no branches)' };
  }

  _gitCheckout(positional, flags) {
    // Create + switch
    if (flags.b || flags.B) {
      const name = positional[0];
      if (!name) return { ok: false, msg: 'Branch name required.' };
      const start = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
      if (!start) return { ok: false, msg: 'Invalid start point.' };
      if (flags.B) delete this.branches[name];
      if (!this.branches[name]) this.branches[name] = start;
      this.headBranch = name;
      this.HEAD = this.branches[name];
      this._emit('graph-update');
      return { ok: true, msg: `Switched to${flags.b ? ' new' : ''} branch '${name}'` };
    }
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Usage: git checkout <branch|commit>' };

    // Try branch first
    if (this.branches[target]) {
      this.headBranch = target;
      this.HEAD = this.branches[target];
      this._emit('graph-update');
      return { ok: true, msg: `Switched to branch '${target}'` };
    }
    // Try commit ref
    const resolved = this._resolveRef(target);
    if (resolved) {
      this.headBranch = null;
      this.HEAD = resolved;
      this._emit('graph-update');
      return { ok: true, msg: `HEAD is now at ${resolved.slice(0, 7)} (detached HEAD)` };
    }
    return { ok: false, msg: `error: pathspec '${target}' did not match any known ref` };
  }

  _gitSwitch(positional, flags) {
    if (flags.c || flags.C) {
      return this._gitCheckout(positional, { b: true });
    }
    return this._gitCheckout(positional, flags);
  }

  _gitMerge(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Branch name required.' };
    const targetId = this._resolveRef(target);
    if (!targetId) return { ok: false, msg: `Branch '${target}' not found.` };
    if (targetId === this.HEAD) return { ok: true, msg: 'Already up to date.' };

    // Fast-forward?
    if (!flags['no-ff'] && this._isAncestor(this.HEAD, targetId)) {
      if (this.headBranch) this.branches[this.headBranch] = targetId;
      this.HEAD = targetId;
      this._emit('graph-update');
      return { ok: true, msg: `Fast-forward. HEAD -> ${targetId.slice(0, 7)}` };
    }

    // Merge commit
    const mc = this._createCommit(
      `Merge branch '${target}' into ${this.headBranch || 'HEAD'}`,
      [this.HEAD, targetId]
    );
    if (this.headBranch) this.branches[this.headBranch] = mc.id;
    this.HEAD = mc.id;
    this._emit('graph-update');
    return { ok: true, msg: `Merge made by 'ort' strategy.` };
  }

  _gitRebase(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Target branch required.' };
    const targetId = this._resolveRef(target);
    if (!targetId) return { ok: false, msg: `Branch '${target}' not found.` };
    if (targetId === this.HEAD) return { ok: true, msg: 'Already up to date.' };

    // Collect commits to replay (from HEAD back to LCA)
    const toReplay = this._getCommitsSince(targetId, this.HEAD).reverse();
    if (!toReplay.length) return { ok: true, msg: 'Already up to date.' };

    let base = targetId;
    for (const cid of toReplay) {
      const orig = this.commits[cid];
      const nc = this._createCommit(orig.message, [base]);
      base = nc.id;
    }

    if (this.headBranch) this.branches[this.headBranch] = base;
    this.HEAD = base;
    this._emit('graph-update');
    return { ok: true, msg: `Successfully rebased '${this.headBranch || 'HEAD'}' onto '${target}'.` };
  }

  _gitLog(positional, flags) {
    const limit = flags.n || 10;
    const lines = [];
    let cur = this.HEAD, count = 0;
    while (cur && count < limit) {
      const c = this.commits[cur];
      if (!c) break;
      const refs = [];
      Object.entries(this.branches).forEach(([n, id]) => {
        if (id === cur) refs.push(n === this.headBranch ? `HEAD -> ${n}` : n);
      });
      Object.entries(this.tags).forEach(([n, id]) => { if (id === cur) refs.push(`tag: ${n}`); });
      const refStr = refs.length ? ` (${refs.join(', ')})` : '';
      if (flags.oneline) {
        lines.push(`${cur.slice(0, 7)}${refStr} ${c.message}`);
      } else {
        lines.push(`commit ${cur}${refStr}\n  ${c.message}`);
      }
      cur = c.parents[0];
      count++;
    }
    return { ok: true, msg: lines.join('\n') || '(no commits)' };
  }

  _gitStatus() {
    const branch = this.headBranch || `HEAD detached at ${this.HEAD ? this.HEAD.slice(0, 7) : '?'}`;
    let msg = `On branch ${branch}\n`;
    if (this.staging.length > 0) {
      msg += `\nChanges to be committed:\n  ${this.staging.join('\n  ')}`;
    } else {
      msg += 'nothing to commit, working tree clean';
    }
    return { ok: true, msg };
  }

  _gitAdd(positional) {
    const f = positional[0] || '.';
    this.staging.push(f === '.' ? 'all changes' : f);
    return { ok: true, msg: `Staged: ${f}` };
  }

  _gitReset(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Usage: git reset [--soft|--mixed|--hard] <ref>' };
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown ref: '${target}'` };
    const mode = flags.hard ? 'hard' : flags.soft ? 'soft' : 'mixed';
    if (this.headBranch) this.branches[this.headBranch] = resolved;
    this.HEAD = resolved;
    if (mode !== 'soft') this.staging = [];
    this._emit('graph-update');
    return { ok: true, msg: `HEAD is now at ${resolved.slice(0, 7)} (${mode} reset)` };
  }

  _gitRevert(positional) {
    const target = positional[0] || 'HEAD';
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown ref: '${target}'` };
    const orig = this.commits[resolved];
    const rc = this._createCommit(`Revert "${orig?.message || resolved}"`, [this.HEAD]);
    if (this.headBranch) this.branches[this.headBranch] = rc.id;
    this.HEAD = rc.id;
    this._emit('graph-update');
    return { ok: true, msg: `Reverted. New commit: ${rc.id}` };
  }

  _gitCherryPick(positional) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Commit ref required.' };
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown ref: '${target}'` };
    const orig = this.commits[resolved];
    const nc = this._createCommit(orig?.message || 'Cherry-pick', [this.HEAD]);
    if (this.headBranch) this.branches[this.headBranch] = nc.id;
    this.HEAD = nc.id;
    this._emit('graph-update');
    return { ok: true, msg: `[${this.headBranch} ${nc.id}] ${orig?.message}` };
  }

  _gitTag(positional, flags) {
    if (flags.d) {
      const name = positional[0];
      if (!name) return { ok: false, msg: 'Tag name required.' };
      delete this.tags[name];
      this._emit('graph-update');
      return { ok: true, msg: `Deleted tag '${name}'.` };
    }
    const name = positional[0];
    if (!name) {
      return { ok: true, msg: Object.keys(this.tags).join('\n') || '(no tags)' };
    }
    const target = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
    this.tags[name] = target;
    this._emit('graph-update');
    return { ok: true, msg: `Tagged '${name}' at ${target?.slice(0, 7)}` };
  }

  _gitStash(positional) {
    const sub = positional[0];
    if (!sub || sub === 'push' || sub === 'save') {
      this.stash.unshift({ staging: [...this.staging] });
      this.staging = [];
      return { ok: true, msg: 'Saved working directory state to stash.' };
    }
    if (sub === 'pop' || sub === 'apply') {
      const s = this.stash[0];
      if (!s) return { ok: false, msg: 'No stash entries.' };
      this.staging = [...(s.staging || [])];
      if (sub === 'pop') this.stash.shift();
      return { ok: true, msg: `Applied stash@{0}` };
    }
    if (sub === 'list') {
      return { ok: true, msg: this.stash.map((_, i) => `stash@{${i}}: WIP on ${this.headBranch}`).join('\n') || '(empty stash)' };
    }
    if (sub === 'drop') {
      this.stash.shift();
      return { ok: true, msg: 'Dropped stash@{0}' };
    }
    return { ok: false, msg: `Unknown stash subcommand: ${sub}` };
  }

  _gitRemote(positional, flags) {
    const sub = positional[0];
    if (!sub || flags.v) {
      const list = Object.entries(this.remotes).map(([n, r]) => `${n}\t${r.url} (fetch)\n${n}\t${r.url} (push)`).join('\n');
      return { ok: true, msg: list || '(no remotes)' };
    }
    if (sub === 'add') {
      const name = positional[1], url = positional[2];
      if (!name || !url) return { ok: false, msg: 'Usage: git remote add <name> <url>' };
      this.remotes[name] = { url, branches: {} };
      return { ok: true, msg: `Remote '${name}' added.` };
    }
    if (sub === 'remove' || sub === 'rm') {
      const name = positional[1];
      if (!name) return { ok: false, msg: 'Remote name required.' };
      delete this.remotes[name];
      return { ok: true, msg: `Remote '${name}' removed.` };
    }
    return { ok: true, msg: Object.keys(this.remotes).join('\n') || '(no remotes)' };
  }

  _gitPush(positional) {
    const remote = positional[0] || 'origin';
    const branch = positional[1] || this.headBranch || 'main';
    if (!this.remotes[remote]) return { ok: false, msg: `Remote '${remote}' not found. Run: git remote add ${remote} <url>` };
    this.remotes[remote].branches = this.remotes[remote].branches || {};
    this.remotes[remote].branches[branch] = this.HEAD;
    return { ok: true, msg: `Pushed '${branch}' to ${remote}.` };
  }

  _gitHelp() {
    return {
      ok: true, msg: `Available commands:
  commit, branch, checkout, switch, merge, rebase
  log, status, add, reset, revert, cherry-pick
  tag, stash, diff, remote, push, pull, fetch` };
  }

  // ── HELPERS ──
  _isAncestor(potentialAncestor, descendant) {
    const visited = new Set();
    const queue = [descendant];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur)) continue;
      if (cur === potentialAncestor) return true;
      visited.add(cur);
      (this.commits[cur]?.parents || []).forEach(p => queue.push(p));
    }
    return false;
  }

  _getCommitsSince(base, tip) {
    const result = [];
    const visited = new Set();
    const queue = [tip];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || cur === base || visited.has(cur)) continue;
      visited.add(cur);
      result.push(cur);
      (this.commits[cur]?.parents || []).forEach(p => queue.push(p));
    }
    return result;
  }

  getState() {
    return {
      commits: this.commits,
      branches: this.branches,
      HEAD: this.HEAD,
      headBranch: this.headBranch,
      tags: this.tags
    };
  }

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }
}

window.GitEngine = GitEngine;

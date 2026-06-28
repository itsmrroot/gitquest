// =============================================
// GitQuest — js/git-engine.js
// Core Git simulation engine
// =============================================

class GitEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.commits = {};
    this.branches = {};
    this.HEAD = null;
    this.headBranch = null; // null = detached
    this.remotes = {};
    this.staging = [];
    this.workingTree = [];
    this.tags = {};
    this.stash = [];
    this.commandHistory = [];
    this.eventListeners = {};

    // Init with first commit
    this._init();
  }

  _init() {
    const c0 = this._createCommit('Initial commit', null, 'C0');
    this.branches['main'] = c0.id;
    this.headBranch = 'main';
    this.HEAD = c0.id;
  }

  _createCommit(message, parentIds, forcedId = null) {
    const id = forcedId || this._genId();
    const parentArray = parentIds
      ? (Array.isArray(parentIds) ? parentIds : [parentIds])
      : [];
    const commit = {
      id,
      message,
      parents: parentArray,
      timestamp: Date.now(),
      branch: this.headBranch || 'detached'
    };
    this.commits[id] = commit;
    return commit;
  }

  _genId() {
    const chars = 'abcdef0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ── COMMAND PARSING ──
  execute(rawInput) {
    const input = rawInput.trim();
    if (!input) return { ok: false, msg: '' };

    this.commandHistory.push(input);
    this._emit('command', { input });

    const parts = this._parseArgs(input);
    const cmd = parts[0];
    const subCmd = parts[1];
    const args = parts.slice(2);
    const flags = {};

    // Extract flags
    const positional = parts.slice(1).filter(p => {
      if (p.startsWith('--')) { flags[p.slice(2)] = true; return false; }
      if (p.startsWith('-') && p.length === 2) { flags[p.slice(1)] = true; return false; }
      return true;
    });

    try {
      if (cmd !== 'git') return { ok: false, msg: `Command not found: ${cmd}. Use git commands.` };

      switch (subCmd) {
        case 'init':        return this._gitInit(positional, flags);
        case 'commit':      return this._gitCommit(positional, flags);
        case 'branch':      return this._gitBranch(positional, flags);
        case 'checkout':    return this._gitCheckout(positional, flags);
        case 'switch':      return this._gitSwitch(positional, flags);
        case 'merge':       return this._gitMerge(positional, flags);
        case 'rebase':      return this._gitRebase(positional, flags);
        case 'log':         return this._gitLog(positional, flags);
        case 'status':      return this._gitStatus(positional, flags);
        case 'add':         return this._gitAdd(positional, flags);
        case 'reset':       return this._gitReset(positional, flags);
        case 'revert':      return this._gitRevert(positional, flags);
        case 'cherry-pick': return this._gitCherryPick(positional, flags);
        case 'tag':         return this._gitTag(positional, flags);
        case 'stash':       return this._gitStash(positional, flags);
        case 'diff':        return this._gitDiff(positional, flags);
        case 'remote':      return this._gitRemote(positional, flags);
        case 'push':        return this._gitPush(positional, flags);
        case 'pull':        return this._gitPull(positional, flags);
        case 'fetch':       return this._gitFetch(positional, flags);
        case 'clone':       return { ok: true, msg: 'Cloned repo into current sandbox.' };
        case 'help':        return this._gitHelp();
        default:
          return { ok: false, msg: `git: '${subCmd}' is not a git command. See 'git help'.` };
      }
    } catch(e) {
      return { ok: false, msg: `Error: ${e.message}` };
    }
  }

  _parseArgs(input) {
    // Handle quoted args
    const parts = [];
    let cur = '', inQ = false, qChar = '';
    for (const ch of input) {
      if (inQ) {
        if (ch === qChar) inQ = false;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        inQ = true; qChar = ch;
      } else if (ch === ' ') {
        if (cur) parts.push(cur);
        cur = '';
      } else cur += ch;
    }
    if (cur) parts.push(cur);
    return parts;
  }

  _currentCommit() { return this.commits[this.HEAD]; }

  _resolveRef(ref) {
    if (ref === 'HEAD') return this.HEAD;
    if (ref === 'HEAD~1' || ref === 'HEAD~') {
      const c = this._currentCommit();
      return c?.parents[0] || null;
    }
    if (ref.startsWith('HEAD~')) {
      let n = parseInt(ref.slice(5));
      let cid = this.HEAD;
      while (n-- > 0 && cid) {
        cid = this.commits[cid]?.parents[0];
      }
      return cid;
    }
    if (this.branches[ref]) return this.branches[ref];
    if (this.commits[ref]) return ref;
    return null;
  }

  // ── GIT COMMANDS ──

  _gitInit() {
    this.reset();
    this._emit('graph-update');
    return { ok: true, msg: 'Initialized empty Git repository.' };
  }

  _gitCommit(positional, flags) {
    const msgIdx = positional.indexOf('-m') + 1 || positional.indexOf('--message') + 1;
    let message = msgIdx > 0 ? positional[msgIdx] : null;
    if (!message) {
      // Try to extract message from flags
      message = flags.message || flags.m || 'Update files';
    }
    // If amend
    if (flags.amend) {
      const c = this._currentCommit();
      if (!c) return { ok: false, msg: 'Nothing to amend.' };
      c.message = message || c.message;
      c.id = this._genId();
      this.commits[c.id] = c;
      delete this.commits[this.HEAD];
      if (this.headBranch) this.branches[this.headBranch] = c.id;
      this.HEAD = c.id;
      this._emit('graph-update');
      return { ok: true, msg: `[${this.headBranch || 'HEAD'} ${c.id}] ${c.message}` };
    }
    const newCommit = this._createCommit(message, this.HEAD);
    if (this.headBranch) {
      this.branches[this.headBranch] = newCommit.id;
    }
    this.HEAD = newCommit.id;
    this.staging = [];
    this._emit('graph-update');
    return { ok: true, msg: `[${this.headBranch || 'HEAD'} ${newCommit.id}] ${message}` };
  }

  _gitBranch(positional, flags) {
    if (flags.d || flags['delete']) {
      const name = positional[1] || positional[0];
      if (!name) return { ok: false, msg: 'Branch name required.' };
      if (name === this.headBranch) return { ok: false, msg: `Cannot delete checked out branch '${name}'.` };
      if (!this.branches[name]) return { ok: false, msg: `Branch '${name}' not found.` };
      delete this.branches[name];
      this._emit('graph-update');
      return { ok: true, msg: `Deleted branch ${name}.` };
    }
    if (flags.D) {
      const name = positional[1] || positional[0];
      if (!name) return { ok: false, msg: 'Branch name required.' };
      if (name === this.headBranch) return { ok: false, msg: `Cannot delete checked out branch '${name}'.` };
      delete this.branches[name];
      this._emit('graph-update');
      return { ok: true, msg: `Deleted branch ${name} (force).` };
    }
    if (flags.m || flags.move) {
      const [oldName, newName] = positional;
      if (!oldName || !newName) return { ok: false, msg: 'Usage: git branch -m <old> <new>' };
      if (!this.branches[oldName]) return { ok: false, msg: `Branch '${oldName}' not found.` };
      this.branches[newName] = this.branches[oldName];
      delete this.branches[oldName];
      if (this.headBranch === oldName) this.headBranch = newName;
      this._emit('graph-update');
      return { ok: true, msg: `Renamed branch '${oldName}' to '${newName}'.` };
    }
    const newBranch = positional[0];
    if (!newBranch) {
      // List branches
      const list = Object.keys(this.branches).map(b =>
        `  ${b === this.headBranch ? '* ' : '  '}${b}`
      ).join('\n');
      return { ok: true, msg: list || '  (no branches)' };
    }
    const startPoint = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
    if (!startPoint) return { ok: false, msg: `Invalid start point.` };
    if (this.branches[newBranch]) return { ok: false, msg: `Branch '${newBranch}' already exists.` };
    this.branches[newBranch] = startPoint;
    this._emit('graph-update');
    return { ok: true, msg: `Created branch '${newBranch}'.` };
  }

  _gitCheckout(positional, flags) {
    if (flags.b || flags.B) {
      const name = positional[0];
      if (!name) return { ok: false, msg: 'Branch name required.' };
      const start = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
      if (flags.B && this.branches[name]) delete this.branches[name];
      if (!this.branches[name]) this.branches[name] = start;
      this.headBranch = name;
      this.HEAD = this.branches[name];
      this._emit('graph-update');
      return { ok: true, msg: `Switched to ${flags.B ? '' : 'new '}branch '${name}'` };
    }
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Usage: git checkout <branch|commit>' };

    if (this.branches[target]) {
      this.headBranch = target;
      this.HEAD = this.branches[target];
      this._emit('graph-update');
      return { ok: true, msg: `Switched to branch '${target}'` };
    }
    const resolved = this._resolveRef(target);
    if (resolved) {
      this.headBranch = null; // detached HEAD
      this.HEAD = resolved;
      this._emit('graph-update');
      return { ok: true, msg: `HEAD is now at ${resolved.slice(0,7)}` };
    }
    return { ok: false, msg: `pathspec '${target}' did not match any known refs` };
  }

  _gitSwitch(positional, flags) {
    if (flags.c || flags['create']) {
      positional.unshift('-b');
      return this._gitCheckout(positional.filter(p => p !== '-b'), { b: true });
    }
    return this._gitCheckout(positional, flags);
  }

  _gitMerge(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Branch name required.' };
    const targetId = this._resolveRef(target);
    if (!targetId) return { ok: false, msg: `Branch '${target}' not found.` };

    if (targetId === this.HEAD) return { ok: true, msg: 'Already up to date.' };

    // Fast-forward check
    if (this._isAncestor(this.HEAD, targetId)) {
      // Fast forward
      if (this.headBranch) this.branches[this.headBranch] = targetId;
      this.HEAD = targetId;
      this._emit('graph-update');
      return { ok: true, msg: `Fast-forward merge. HEAD -> ${targetId.slice(0,7)}` };
    }

    if (flags['no-ff'] || !this._isAncestor(targetId, this.HEAD)) {
      // Three-way merge commit
      const mergeCommit = this._createCommit(
        `Merge branch '${target}' into ${this.headBranch || 'HEAD'}`,
        [this.HEAD, targetId]
      );
      if (this.headBranch) this.branches[this.headBranch] = mergeCommit.id;
      this.HEAD = mergeCommit.id;
      this._emit('graph-update');
      return { ok: true, msg: `Merge made by 'recursive' strategy.` };
    }

    const mergeCommit = this._createCommit(
      `Merge branch '${target}'`,
      [this.HEAD, targetId]
    );
    if (this.headBranch) this.branches[this.headBranch] = mergeCommit.id;
    this.HEAD = mergeCommit.id;
    this._emit('graph-update');
    return { ok: true, msg: `Merge made by 'ort' strategy.` };
  }

  _gitRebase(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Target branch required.' };
    const targetId = this._resolveRef(target);
    if (!targetId) return { ok: false, msg: `Branch '${target}' not found.` };

    if (targetId === this.HEAD) return { ok: true, msg: 'Already up to date.' };

    // Get commits to replay
    const toReplay = this._getCommitsSince(targetId, this.HEAD);
    if (toReplay.length === 0) {
      return { ok: true, msg: 'Already up to date.' };
    }

    // Replay commits on top of target
    let current = targetId;
    for (const commitId of toReplay.reverse()) {
      const original = this.commits[commitId];
      const newC = this._createCommit(original.message, current);
      current = newC.id;
    }

    if (this.headBranch) this.branches[this.headBranch] = current;
    this.HEAD = current;
    this._emit('graph-update');
    return { ok: true, msg: `Successfully rebased '${this.headBranch}' onto '${target}'.` };
  }

  _gitLog(positional, flags) {
    let commits = [];
    let cur = this.HEAD;
    const limit = flags.n ? parseInt(flags.n) : 10;
    let count = 0;
    while (cur && count < limit) {
      commits.push(this.commits[cur]);
      cur = this.commits[cur]?.parents[0];
      count++;
    }
    const lines = commits.map(c => {
      const branchLabels = Object.entries(this.branches)
        .filter(([,id]) => id === c.id)
        .map(([name]) => name === this.headBranch ? `HEAD -> ${name}` : name)
        .join(', ');
      return `commit ${c.id}${branchLabels ? ` (${branchLabels})` : ''}\n  ${c.message}`;
    });
    return { ok: true, msg: lines.join('\n\n') };
  }

  _gitStatus() {
    const branch = this.headBranch || `HEAD detached at ${this.HEAD?.slice(0,7)}`;
    let msg = `On branch ${branch}\n`;
    if (this.staging.length > 0) {
      msg += `\nChanges to be committed:\n  ${this.staging.join('\n  ')}`;
    } else {
      msg += '\nnothing to commit, working tree clean';
    }
    return { ok: true, msg };
  }

  _gitAdd(positional) {
    const file = positional[0] || '.';
    this.staging.push(file === '.' ? 'all changes' : file);
    return { ok: true, msg: `Changes staged: ${file}` };
  }

  _gitReset(positional, flags) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Usage: git reset [--soft|--mixed|--hard] <commit>' };
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown ref: ${target}` };

    const mode = flags.hard ? 'hard' : flags.soft ? 'soft' : 'mixed';
    if (this.headBranch) this.branches[this.headBranch] = resolved;
    this.HEAD = resolved;
    if (mode === 'hard') this.staging = [];
    this._emit('graph-update');
    return { ok: true, msg: `HEAD is now at ${resolved.slice(0,7)} (${mode} reset)` };
  }

  _gitRevert(positional) {
    const target = positional[0] || 'HEAD';
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown ref: ${target}` };
    const original = this.commits[resolved];
    const revertCommit = this._createCommit(
      `Revert "${original?.message || resolved}"`,
      this.HEAD
    );
    if (this.headBranch) this.branches[this.headBranch] = revertCommit.id;
    this.HEAD = revertCommit.id;
    this._emit('graph-update');
    return { ok: true, msg: `Reverted commit ${resolved.slice(0,7)}. New commit: ${revertCommit.id}` };
  }

  _gitCherryPick(positional) {
    const target = positional[0];
    if (!target) return { ok: false, msg: 'Commit hash required.' };
    const resolved = this._resolveRef(target);
    if (!resolved) return { ok: false, msg: `Unknown commit: ${target}` };
    const original = this.commits[resolved];
    const newC = this._createCommit(original?.message || 'Cherry-picked commit', this.HEAD);
    if (this.headBranch) this.branches[this.headBranch] = newC.id;
    this.HEAD = newC.id;
    this._emit('graph-update');
    return { ok: true, msg: `[${this.headBranch} ${newC.id}] ${original?.message}` };
  }

  _gitTag(positional, flags) {
    const name = positional[0];
    if (!name) {
      const list = Object.keys(this.tags).join('\n') || '(no tags)';
      return { ok: true, msg: list };
    }
    const target = positional[1] ? this._resolveRef(positional[1]) : this.HEAD;
    if (flags.d) {
      delete this.tags[name];
      this._emit('graph-update');
      return { ok: true, msg: `Deleted tag '${name}'` };
    }
    this.tags[name] = target;
    this._emit('graph-update');
    return { ok: true, msg: `Created tag '${name}' at ${target?.slice(0,7)}` };
  }

  _gitStash(positional) {
    const sub = positional[0];
    if (!sub || sub === 'push' || sub === 'save') {
      this.stash.unshift({ message: 'stash@{0}: WIP', staging: [...this.staging] });
      this.staging = [];
      return { ok: true, msg: 'Saved working directory state.' };
    }
    if (sub === 'pop' || sub === 'apply') {
      const s = this.stash.shift();
      if (!s) return { ok: false, msg: 'No stash entries found.' };
      this.staging = [...(s.staging || [])];
      return { ok: true, msg: `Applied stash: ${s.message}` };
    }
    if (sub === 'list') {
      return { ok: true, msg: this.stash.map((s,i) => `stash@{${i}}: ${s.message}`).join('\n') || '(empty)' };
    }
    if (sub === 'drop') {
      this.stash.shift();
      return { ok: true, msg: 'Dropped stash@{0}' };
    }
    return { ok: false, msg: `Unknown stash subcommand: ${sub}` };
  }

  _gitDiff() {
    return { ok: true, msg: '(No actual files in sandbox — showing conceptual diff)\ndiff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old content\n+new content' };
  }

  _gitRemote(positional, flags) {
    const sub = positional[0];
    if (!sub) {
      return { ok: true, msg: Object.keys(this.remotes).join('\n') || '(no remotes)' };
    }
    if (sub === 'add') {
      const [,name, url] = positional;
      if (!name || !url) return { ok: false, msg: 'Usage: git remote add <name> <url>' };
      this.remotes[name] = { url, branches: {} };
      return { ok: true, msg: `Remote '${name}' added.` };
    }
    if (sub === 'remove' || sub === 'rm') {
      const name = positional[1];
      delete this.remotes[name];
      return { ok: true, msg: `Remote '${name}' removed.` };
    }
    if (sub === 'show' || sub === '-v') {
      return { ok: true, msg: Object.entries(this.remotes).map(([n,r]) => `${n}\t${r.url}`).join('\n') || '(no remotes)' };
    }
    return { ok: true, msg: Object.keys(this.remotes).join('\n') };
  }

  _gitPush(positional, flags) {
    const remote = positional[0] || 'origin';
    const branch = positional[1] || this.headBranch || 'main';
    if (!this.remotes[remote]) {
      return { ok: false, msg: `Remote '${remote}' not found. Add it with 'git remote add'.` };
    }
    this.remotes[remote].branches[branch] = this.HEAD;
    this._emit('graph-update');
    return { ok: true, msg: `Pushed '${branch}' to ${remote}.` };
  }

  _gitFetch(positional) {
    const remote = positional[0] || 'origin';
    if (!this.remotes[remote]) return { ok: false, msg: `Remote '${remote}' not found.` };
    return { ok: true, msg: `Fetched from ${remote}. (Sandbox: no actual remote)` };
  }

  _gitPull(positional, flags) {
    const remote = positional[0] || 'origin';
    const branch = positional[1] || this.headBranch;
    return { ok: true, msg: `Pulled from ${remote}/${branch}. Already up to date. (Sandbox)` };
  }

  _gitHelp() {
    const msg = `
Available git commands:
  commit, branch, checkout, switch, merge, rebase
  log, status, add, reset, revert, cherry-pick
  tag, stash, diff, remote, push, pull, fetch

Use 'git <command> --help' for details.
    `.trim();
    return { ok: true, msg };
  }

  // ── GRAPH HELPERS ──

  _isAncestor(potentialAncestor, descendant) {
    const visited = new Set();
    const queue = [descendant];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === potentialAncestor) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const c = this.commits[cur];
      if (c) c.parents.forEach(p => queue.push(p));
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
      const c = this.commits[cur];
      if (c) c.parents.forEach(p => queue.push(p));
    }
    return result;
  }

  getAllCommits() {
    return Object.values(this.commits);
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

  // ── EVENT SYSTEM ──
  on(event, cb) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(cb);
  }

  _emit(event, data) {
    (this.eventListeners[event] || []).forEach(cb => cb(data));
  }
}

window.GitEngine = GitEngine;

// =============================================
// GitQuest — goal-graphs.js
// Target graph state for each challenge
// Used by the "Goal To Reach" mini-panel
// =============================================

window.GOAL_GRAPHS = {

  // ── ROOKIE ────────────────────────────────
  c01: {
    note: 'Make one commit on main.',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Your first commit' }
    },
    branches: { main: 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c02: {
    note: 'Create a branch called "feature".',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Setup' }
    },
    branches: { main: 'C0', feature: 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c03: {
    note: 'Switch HEAD to the feature branch.',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Setup' }
    },
    branches: { main: 'C0', feature: 'C0' },
    HEAD: 'C0', headBranch: 'feature', tags: {}
  },

  c04: {
    note: 'Make 2 commits on feature, main stays behind.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'Setup' },
      C1: { id: 'C1', parents: ['C0'], message: 'commit 1' },
      C2: { id: 'C2', parents: ['C1'], message: 'commit 2' }
    },
    branches: { main: 'C0', feature: 'C2' },
    HEAD: 'C2', headBranch: 'feature', tags: {}
  },

  c05: {
    note: 'Merge feature into main (merge commit).',
    commits: {
      C0: { id: 'C0', parents: [],          message: 'Setup' },
      C1: { id: 'C1', parents: ['C0'],      message: 'Feature A' },
      C2: { id: 'C2', parents: ['C1'],      message: 'Feature B' },
      M:  { id: 'M',  parents: ['C0', 'C2'], message: 'Merge branch feature' }
    },
    branches: { main: 'M', feature: 'C2' },
    HEAD: 'M', headBranch: 'main', tags: {}
  },

  // ── CONTRIBUTOR ───────────────────────────
  c06: {
    note: 'Rebase feature onto main (linear history).',
    commits: {
      C0:  { id: 'C0',  parents: [],     message: 'Base' },
      C2:  { id: 'C2',  parents: ['C0'], message: 'Main update' },
      "C1'": { id: "C1'", parents: ['C2'], message: 'Feature (rebased)' }
    },
    branches: { main: 'C2', feature: "C1'" },
    HEAD: "C1'", headBranch: 'feature', tags: {}
  },

  c07: {
    note: 'Detach HEAD by checking out a commit directly.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'C1' },
      C1: { id: 'C1', parents: ['C0'], message: 'C2' },
      C2: { id: 'C2', parents: ['C1'], message: 'C3' }
    },
    branches: { main: 'C2' },
    HEAD: 'C1', headBranch: null, tags: {}
  },

  c08: {
    note: 'Reset main back past 2 mistake commits.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'Good ✓' },
      C1: { id: 'C1', parents: ['C0'], message: 'Mistake 1' },
      C2: { id: 'C2', parents: ['C1'], message: 'Mistake 2' }
    },
    branches: { main: 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c09: {
    note: 'Revert adds a new "undo" commit — history intact.',
    commits: {
      C0: { id: 'C0', parents: [],       message: 'Feature' },
      C1: { id: 'C1', parents: ['C0'],  message: 'Bug introduced' },
      "C1'": { id: "C1'", parents: ['C1'], message: 'Revert "Bug"' }
    },
    branches: { main: "C1'" },
    HEAD: "C1'", headBranch: 'main', tags: {}
  },

  c10: {
    note: 'Cherry-pick copies the good commit onto main.',
    commits: {
      C0:  { id: 'C0',  parents: [],      message: 'Base' },
      C1:  { id: 'C1',  parents: ['C0'], message: 'Wild idea' },
      C2:  { id: 'C2',  parents: ['C1'], message: 'Good bug fix' },
      "C2'": { id: "C2'", parents: ['C0'], message: 'Good bug fix' }
    },
    branches: { main: "C2'", experiment: 'C2' },
    HEAD: "C2'", headBranch: 'main', tags: {}
  },

  // ── MAINTAINER ────────────────────────────
  c11: {
    note: 'Tag the release commit with v1.0.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'v1.0 features' },
      C1: { id: 'C1', parents: ['C0'], message: 'Release prep' }
    },
    branches: { main: 'C1' },
    tags: { 'v1.0': 'C1' },
    HEAD: 'C1', headBranch: 'main'
  },

  c12: {
    note: 'Stash changes, then pop them back.',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Main feature' }
    },
    branches: { main: 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c13: {
    note: 'Merge feature back with --no-ff merge commit.',
    commits: {
      C0: { id: 'C0', parents: [],           message: 'Production' },
      C1: { id: 'C1', parents: ['C0'],       message: 'Feature 1' },
      C2: { id: 'C2', parents: ['C1'],       message: 'Feature 2' },
      M:  { id: 'M',  parents: ['C0', 'C2'], message: 'Merge --no-ff' }
    },
    branches: { main: 'M', feature: 'C2' },
    HEAD: 'M', headBranch: 'main', tags: {}
  },

  c14: {
    note: 'Add origin remote and push main.',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Local work' }
    },
    branches: { main: 'C0', 'origin/main': 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c15: {
    note: 'Squash messy commits into a clean one.',
    commits: {
      C0:  { id: 'C0',  parents: [],     message: 'Base' },
      "C1'": { id: "C1'", parents: ['C0'], message: 'Squashed commit' }
    },
    branches: { main: "C1'" },
    HEAD: "C1'", headBranch: 'main', tags: {}
  },

  // ── ARCHITECT ─────────────────────────────
  c16: {
    note: 'Create develop, feature/*, and release/* branches.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'Initial' },
      C1: { id: 'C1', parents: ['C0'], message: 'develop' },
      C2: { id: 'C2', parents: ['C1'], message: 'feature work' },
      C3: { id: 'C3', parents: ['C1'], message: 'release prep' }
    },
    branches: { main: 'C0', develop: 'C1', 'feature/auth': 'C2', 'release/1.0': 'C3' },
    HEAD: 'C2', headBranch: 'feature/auth', tags: {}
  },

  c17: {
    note: 'Branch hotfix from main, fix, merge back.',
    commits: {
      C0: { id: 'C0', parents: [],           message: 'v1.0' },
      C1: { id: 'C1', parents: ['C0'],       message: 'develop work' },
      C2: { id: 'C2', parents: ['C0'],       message: 'Fix critical bug' },
      M:  { id: 'M',  parents: ['C0', 'C2'], message: 'Merge hotfix → main' }
    },
    branches: { main: 'M', develop: 'C1', 'hotfix/bug': 'C2' },
    HEAD: 'M', headBranch: 'main', tags: {}
  },

  c18: {
    note: 'Amend rewrites the last commit in place.',
    commits: {
      C0: { id: 'C0', parents: [], message: 'Fixed message ✓' }
    },
    branches: { main: 'C0' },
    HEAD: 'C0', headBranch: 'main', tags: {}
  },

  c19: {
    note: 'Navigate history to find the buggy commit.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'v1 (good)' },
      C1: { id: 'C1', parents: ['C0'], message: 'v2 (good)' },
      C2: { id: 'C2', parents: ['C1'], message: 'v3 ← bug!' },
      C3: { id: 'C3', parents: ['C2'], message: 'v4' },
      C4: { id: 'C4', parents: ['C3'], message: 'v5' }
    },
    branches: { main: 'C4' },
    HEAD: 'C2', headBranch: null, tags: {}
  },

  // ── GIT WIZARD ────────────────────────────
  c20: {
    note: 'Merge all 3 feature branches into main.',
    commits: {
      C0: { id: 'C0', parents: [],            message: 'Base' },
      C1: { id: 'C1', parents: ['C0'],        message: 'B1' },
      C2: { id: 'C2', parents: ['C0'],        message: 'B2' },
      C3: { id: 'C3', parents: ['C0'],        message: 'B3' },
      M1: { id: 'M1', parents: ['C0', 'C1'], message: 'Merge branch1' },
      M2: { id: 'M2', parents: ['M1', 'C2'], message: 'Merge branch2' },
      M3: { id: 'M3', parents: ['M2', 'C3'], message: 'Merge branch3' }
    },
    branches: { main: 'M3', branch1: 'C1', branch2: 'C2', branch3: 'C3' },
    HEAD: 'M3', headBranch: 'main', tags: {}
  },

  c21: {
    note: 'Reset accident → recover commits via log/checkout.',
    commits: {
      C0: { id: 'C0', parents: [],      message: 'Important A' },
      C1: { id: 'C1', parents: ['C0'], message: 'Important B' },
      C2: { id: 'C2', parents: ['C1'], message: 'Important C' }
    },
    branches: { main: 'C2' },
    HEAD: 'C2', headBranch: 'main', tags: {}
  },

  c22: {
    note: '6+ branches, 10+ commits, 2+ merge commits.',
    commits: {
      C0: { id: 'C0', parents: [],            message: 'Project start' },
      C1: { id: 'C1', parents: ['C0'],        message: 'develop init' },
      C2: { id: 'C2', parents: ['C1'],        message: 'feature/auth' },
      C3: { id: 'C3', parents: ['C2'],        message: 'auth done' },
      C4: { id: 'C4', parents: ['C1'],        message: 'feature/ui' },
      C5: { id: 'C5', parents: ['C0'],        message: 'hotfix' },
      C6: { id: 'C6', parents: ['C0', 'C5'], message: 'hotfix → main' },
      C7: { id: 'C7', parents: ['C1', 'C3'], message: 'auth → develop' },
      C8: { id: 'C8', parents: ['C7'],        message: 'release/2.0' },
      C9: { id: 'C9', parents: ['C6', 'C8'], message: 'release → main' }
    },
    branches: {
      main: 'C9', develop: 'C7', 'feature/auth': 'C3',
      'feature/ui': 'C4', 'hotfix/crash': 'C5', 'release/2.0': 'C8'
    },
    HEAD: 'C9', headBranch: 'main', tags: {}
  }
};

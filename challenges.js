// =============================================
// GitQuest — js/challenges.js
// Full curriculum from Beginner to Expert
// =============================================

const TIERS = [
  {
    id: 'rookie',
    name: '🌱 Rookie',
    color: '#39d353',
    challenges: [
      {
        id: 'c01',
        name: 'Your First Commit',
        difficulty: 'beginner',
        xp: 50,
        description: 'Every Git story starts with a commit. Commits are snapshots of your project at a point in time. Think of them as save points in a video game.',
        setup: [],
        goals: [
          { id: 'g1', text: 'Run git commit to create a commit', check: (s, history) => history.some(h => h.startsWith('git commit')) }
        ],
        hints: [
          'Try: git commit -m "My first commit"',
          'The -m flag lets you add a message to describe the commit'
        ],
        concept: 'Commits are the backbone of Git. Each commit has a unique hash (ID), a message, and a parent.'
      },
      {
        id: 'c02',
        name: 'Create a Branch',
        difficulty: 'beginner',
        xp: 60,
        description: 'Branches let you work on features without affecting the main codebase. They\'re like parallel universes for your code.',
        setup: ['git commit -m "Setup"'],
        goals: [
          { id: 'g1', text: 'Create a branch named "feature"', check: (s) => !!s.branches['feature'] }
        ],
        hints: [
          'Try: git branch feature',
          'Or create and switch at once: git checkout -b feature'
        ],
        concept: 'A branch is just a pointer to a commit. Creating one is instant and cheap in Git.'
      },
      {
        id: 'c03',
        name: 'Switch Branches',
        difficulty: 'beginner',
        xp: 60,
        description: 'You\'ve created branches, now learn to navigate between them. The active branch is called HEAD.',
        setup: ['git commit -m "Setup"', 'git branch feature'],
        goals: [
          { id: 'g1', text: 'Switch to the feature branch', check: (s) => s.headBranch === 'feature' }
        ],
        hints: [
          'Try: git checkout feature',
          'Or modern: git switch feature'
        ],
        concept: 'HEAD tells Git where you currently are. When you switch branches, HEAD moves with you.'
      },
      {
        id: 'c04',
        name: 'Commit on a Branch',
        difficulty: 'beginner',
        xp: 80,
        description: 'Make commits on a branch to diverge from main. This is how feature development works.',
        setup: ['git commit -m "Setup"', 'git checkout -b feature'],
        goals: [
          { id: 'g1', text: 'Make 2 commits on feature branch', check: (s, h, initialCount) => {
            const featureTip = s.branches['feature'];
            // Count commits reachable from feature but not main
            return featureTip !== s.branches['main'];
          }}
        ],
        hints: [
          'git commit -m "Feature work"',
          'Make 2 commits total on the feature branch'
        ],
        concept: 'Each commit on a branch advances that branch\'s pointer forward, creating a divergent history.'
      },
      {
        id: 'c05',
        name: 'Merge Branches',
        difficulty: 'beginner',
        xp: 100,
        description: 'Bring your feature work back into main with a merge. This combines the histories of two branches.',
        setup: ['git commit -m "Setup"', 'git checkout -b feature', 'git commit -m "Feature A"', 'git commit -m "Feature B"', 'git checkout main'],
        goals: [
          { id: 'g1', text: 'Merge feature into main', check: (s, h) => h.some(cmd => cmd === 'git merge feature') }
        ],
        hints: [
          'Make sure you are on main first: git checkout main',
          'Then: git merge feature'
        ],
        concept: 'Merging integrates changes from one branch into another. Git creates a new "merge commit" with two parents.'
      }
    ]
  },
  {
    id: 'contributor',
    name: '🔧 Contributor',
    color: '#58a6ff',
    challenges: [
      {
        id: 'c06',
        name: 'Rebase Your Branch',
        difficulty: 'easy',
        xp: 120,
        description: 'Rebase moves your branch onto the tip of another branch, creating a cleaner linear history.',
        setup: ['git commit -m "Base"', 'git checkout -b feature', 'git commit -m "Feature"', 'git checkout main', 'git commit -m "Main update"', 'git checkout feature'],
        goals: [
          { id: 'g1', text: 'Rebase feature onto main', check: (s, h) => h.some(cmd => cmd === 'git rebase main') }
        ],
        hints: [
          'Make sure you are on feature: git checkout feature',
          'Then: git rebase main',
          'This replays your feature commits on top of main'
        ],
        concept: 'Rebase rewrites commit history. Your commits get new hashes but the same changes. Never rebase public/shared branches!'
      },
      {
        id: 'c07',
        name: 'Detach HEAD',
        difficulty: 'easy',
        xp: 100,
        description: 'You can check out a specific commit (not a branch) to enter "detached HEAD" state. Useful for inspecting history.',
        setup: ['git commit -m "C1"', 'git commit -m "C2"', 'git commit -m "C3"'],
        goals: [
          { id: 'g1', text: 'Enter detached HEAD state', check: (s) => s.headBranch === null }
        ],
        hints: [
          'Checkout a specific commit hash: git checkout <hash>',
          'Look at git log to find a commit hash',
          'Try: git checkout HEAD~1'
        ],
        concept: 'In detached HEAD state, commits won\'t belong to any branch. Create a branch here to save your work!'
      },
      {
        id: 'c08',
        name: 'Reset the Clock',
        difficulty: 'easy',
        xp: 130,
        description: 'git reset moves a branch pointer back in history. There are 3 modes: --soft, --mixed, and --hard.',
        setup: ['git commit -m "Good"', 'git commit -m "Mistake 1"', 'git commit -m "Mistake 2"'],
        goals: [
          { id: 'g1', text: 'Reset back 2 commits', check: (s, h) => h.some(cmd => cmd.includes('git reset') && cmd.includes('HEAD~2')) }
        ],
        hints: [
          'git reset HEAD~2 resets 2 commits back (--mixed mode)',
          'git reset --hard HEAD~2 also discards working changes',
          'git reset --soft HEAD~2 keeps changes staged'
        ],
        concept: '--soft keeps changes staged. --mixed unstages them. --hard deletes them entirely. Never hard-reset public commits!'
      },
      {
        id: 'c09',
        name: 'Revert Safely',
        difficulty: 'easy',
        xp: 120,
        description: 'Unlike reset, revert creates a new commit that undoes a previous one — safe to use on shared branches.',
        setup: ['git commit -m "Feature"', 'git commit -m "Bug introduced"'],
        goals: [
          { id: 'g1', text: 'Revert the last commit', check: (s, h) => h.some(cmd => cmd.includes('git revert')) }
        ],
        hints: [
          'git revert HEAD — reverts the most recent commit',
          'This adds a NEW commit, it doesn\'t remove the old one'
        ],
        concept: 'Revert is the safe undo for public history. It adds a new commit rather than rewriting history.'
      },
      {
        id: 'c10',
        name: 'Cherry Pick',
        difficulty: 'easy',
        xp: 140,
        description: 'Apply a specific commit from another branch without merging the whole thing. Like plucking a cherry!',
        setup: ['git commit -m "Base"', 'git checkout -b experiment', 'git commit -m "Wild idea"', 'git commit -m "Good bug fix"', 'git checkout main'],
        goals: [
          { id: 'g1', text: 'Cherry-pick a commit onto main', check: (s, h) => h.some(cmd => cmd.includes('git cherry-pick')) }
        ],
        hints: [
          'First git log to see commit hashes on experiment branch',
          'git checkout main, then git cherry-pick <hash>',
          'Or cherry-pick HEAD~1 relative to experiment tip'
        ],
        concept: 'Cherry-pick is perfect for backporting hotfixes or grabbing specific commits from a long-running branch.'
      }
    ]
  },
  {
    id: 'maintainer',
    name: '⚙️ Maintainer',
    color: '#f0883e',
    challenges: [
      {
        id: 'c11',
        name: 'Tag a Release',
        difficulty: 'medium',
        xp: 150,
        description: 'Tags mark specific commits as important milestones — usually releases. They\'re permanent bookmarks.',
        setup: ['git commit -m "v1.0 features"', 'git commit -m "Release prep"'],
        goals: [
          { id: 'g1', text: 'Create a tag named "v1.0"', check: (s) => !!s.tags['v1.0'] }
        ],
        hints: [
          'git tag v1.0 — creates a lightweight tag at HEAD',
          'git tag -a v1.0 -m "Release 1.0" — creates annotated tag',
          'git tag to list all tags'
        ],
        concept: 'Two types: lightweight (just a pointer) and annotated (full object with metadata). Use annotated for releases.'
      },
      {
        id: 'c12',
        name: 'Stash Your Work',
        difficulty: 'medium',
        xp: 160,
        description: 'Need to switch tasks but not ready to commit? Stash temporarily shelves your changes.',
        setup: ['git commit -m "Main feature"'],
        goals: [
          { id: 'g1', text: 'Stash your changes', check: (s, h) => h.some(cmd => cmd.startsWith('git stash')) },
          { id: 'g2', text: 'Pop the stash back', check: (s, h) => h.some(cmd => cmd.includes('stash pop') || cmd.includes('stash apply')) }
        ],
        hints: [
          'git stash — saves current changes',
          'git stash list — see all stashes',
          'git stash pop — restore and remove from stash'
        ],
        concept: 'Stash is a stack of saved states. You can have multiple stashes and apply them selectively with git stash apply stash@{N}.'
      },
      {
        id: 'c13',
        name: 'Feature Branch Workflow',
        difficulty: 'medium',
        xp: 200,
        description: 'Practice the real-world Git Flow: branch from main, develop, then merge back with --no-ff.',
        setup: ['git commit -m "Production ready"'],
        goals: [
          { id: 'g1', text: 'Create a feature branch', check: (s) => Object.keys(s.branches).some(b => b !== 'main') },
          { id: 'g2', text: 'Make 2+ commits on feature', check: (s, h) => h.filter(cmd => cmd.startsWith('git commit')).length >= 3 },
          { id: 'g3', text: 'Merge back with --no-ff', check: (s, h) => h.some(cmd => cmd.includes('merge') && cmd.includes('no-ff')) }
        ],
        hints: [
          'git checkout -b feature/login',
          'Make commits on the feature branch',
          'git checkout main && git merge --no-ff feature/login'
        ],
        concept: '--no-ff (no fast-forward) always creates a merge commit, preserving feature branch history in the log.'
      },
      {
        id: 'c14',
        name: 'Add a Remote',
        difficulty: 'medium',
        xp: 170,
        description: 'Remotes are shared repositories (e.g., GitHub). Learn to add one and push your work.',
        setup: ['git commit -m "Local work"'],
        goals: [
          { id: 'g1', text: 'Add a remote named "origin"', check: (s, h) => h.some(cmd => cmd.includes('remote add origin')) },
          { id: 'g2', text: 'Push to origin', check: (s, h) => h.some(cmd => cmd.startsWith('git push')) }
        ],
        hints: [
          'git remote add origin https://github.com/you/repo.git',
          'git push origin main',
          'git remote -v to verify remotes'
        ],
        concept: 'origin is the conventional name for your main remote. You can have multiple remotes (e.g., upstream for open source).'
      },
      {
        id: 'c15',
        name: 'Interactive Rebase',
        difficulty: 'medium',
        xp: 220,
        description: 'Clean up messy commits before sharing. Squash, reorder, edit, or drop commits.',
        setup: ['git commit -m "WIP"', 'git commit -m "oops typo"', 'git commit -m "fix typo"', 'git commit -m "more work"'],
        goals: [
          { id: 'g1', text: 'Run a rebase command', check: (s, h) => h.some(cmd => cmd.includes('rebase')) }
        ],
        hints: [
          'git rebase -i HEAD~3 opens interactive rebase for last 3 commits',
          'In real git: pick=keep, squash=combine, drop=remove, edit=amend',
          'In GitQuest: git rebase HEAD~3 simulates this'
        ],
        concept: 'Interactive rebase is a powerful history editor. Always do it on local-only commits. The golden rule: never rewrite public history!'
      }
    ]
  },
  {
    id: 'architect',
    name: '🏛️ Architect',
    color: '#f85149',
    challenges: [
      {
        id: 'c16',
        name: 'Gitflow Workflow',
        difficulty: 'hard',
        xp: 300,
        description: 'Implement the complete Gitflow model with main, develop, feature, release, and hotfix branches.',
        setup: ['git commit -m "Initial"'],
        goals: [
          { id: 'g1', text: 'Create develop branch', check: (s) => !!s.branches['develop'] },
          { id: 'g2', text: 'Create a feature branch from develop', check: (s, h) => Object.keys(s.branches).some(b => b.startsWith('feature/') || b.startsWith('feat/')) },
          { id: 'g3', text: 'Create a release branch', check: (s) => Object.keys(s.branches).some(b => b.startsWith('release/') || b === 'release') }
        ],
        hints: [
          'Gitflow: main (stable) → develop (integration) → feature/* → develop → release/* → main',
          'git checkout -b develop main',
          'git checkout -b feature/auth develop',
          'git checkout -b release/1.0 develop'
        ],
        concept: 'Gitflow is a strict branching model. Great for scheduled releases. For continuous delivery, consider GitHub Flow (simpler).'
      },
      {
        id: 'c17',
        name: 'Hotfix Workflow',
        difficulty: 'hard',
        xp: 280,
        description: 'A critical bug is in production! Branch from main, fix it, merge back to both main AND develop.',
        setup: ['git commit -m "v1.0"', 'git checkout -b develop', 'git commit -m "Ongoing work"', 'git checkout main'],
        goals: [
          { id: 'g1', text: 'Create hotfix branch from main', check: (s) => Object.keys(s.branches).some(b => b.startsWith('hotfix')) },
          { id: 'g2', text: 'Commit the fix', check: (s, h) => h.filter(c => c.startsWith('git commit')).length >= 2 },
          { id: 'g3', text: 'Merge hotfix into main', check: (s, h) => h.some(cmd => cmd.includes('merge') && cmd.includes('hotfix')) }
        ],
        hints: [
          'git checkout -b hotfix/critical-bug main',
          'git commit -m "Fix the bug"',
          'git checkout main && git merge hotfix/critical-bug',
          'git checkout develop && git merge hotfix/critical-bug'
        ],
        concept: 'Hotfixes bypass the normal flow. They go directly to main (with a tag) and must also be merged into develop to not lose the fix.'
      },
      {
        id: 'c18',
        name: 'Amend a Commit',
        difficulty: 'hard',
        xp: 250,
        description: 'Fix your last commit before pushing — change its message or add forgotten files.',
        setup: ['git commit -m "typo in mesage"'],
        goals: [
          { id: 'g1', text: 'Amend the last commit', check: (s, h) => h.some(cmd => cmd.includes('--amend')) }
        ],
        hints: [
          'git commit --amend -m "Fixed: proper message"',
          'This rewrites the last commit with a new message/content',
          'WARNING: Never amend already-pushed commits!'
        ],
        concept: 'Amend creates a new commit replacing the last one. The old commit is abandoned. This is fine locally but dangerous on shared branches.'
      },
      {
        id: 'c19',
        name: 'Bisect a Bug',
        difficulty: 'hard',
        xp: 300,
        description: 'git bisect uses binary search to find which commit introduced a bug. Simulate the workflow.',
        setup: ['git commit -m "v1"', 'git commit -m "v2"', 'git commit -m "bug introduced"', 'git commit -m "v4"', 'git commit -m "v5"'],
        goals: [
          { id: 'g1', text: 'Create 5+ commits to bisect', check: (s, h) => h.filter(c => c.startsWith('git commit')).length >= 3 },
          { id: 'g2', text: 'Navigate history with checkout', check: (s, h) => h.some(cmd => cmd.includes('checkout HEAD~')) }
        ],
        hints: [
          'Real git bisect: git bisect start → git bisect bad → git bisect good <hash>',
          'In GitQuest: navigate commits with git checkout HEAD~N',
          'Bisect halves the search space each step: O(log n) efficiency!'
        ],
        concept: 'git bisect automates binary search across your commit history. It can run a test script automatically with git bisect run <script>.'
      }
    ]
  },
  {
    id: 'wizard',
    name: '🧙 Git Wizard',
    color: '#bc8cff',
    challenges: [
      {
        id: 'c20',
        name: 'The Octopus Merge',
        difficulty: 'expert',
        xp: 400,
        description: 'Merge 3 or more branches simultaneously — the "octopus merge" strategy. Only works without conflicts.',
        setup: ['git commit -m "Base"', 'git checkout -b branch1', 'git commit -m "B1"', 'git checkout main', 'git checkout -b branch2', 'git commit -m "B2"', 'git checkout main', 'git checkout -b branch3', 'git commit -m "B3"', 'git checkout main'],
        goals: [
          { id: 'g1', text: 'Create 3 divergent branches', check: (s) => Object.keys(s.branches).filter(b => b !== 'main').length >= 3 },
          { id: 'g2', text: 'Merge all into main', check: (s, h) => h.filter(cmd => cmd.includes('merge')).length >= 3 }
        ],
        hints: [
          'Create branch1, branch2, branch3 from main with commits',
          'git checkout main',
          'git merge branch1 && git merge branch2 && git merge branch3'
        ],
        concept: 'Octopus merges are used in Linux kernel development. They merge feature branches without intermediate merge commits.'
      },
      {
        id: 'c21',
        name: 'Reflog Rescue',
        difficulty: 'expert',
        xp: 450,
        description: 'You accidentally lost commits with a hard reset. Use git reflog to recover them.',
        setup: ['git commit -m "Important work A"', 'git commit -m "Important work B"', 'git commit -m "Important work C"'],
        goals: [
          { id: 'g1', text: 'Simulate a hard reset "accident"', check: (s, h) => h.some(cmd => cmd.includes('reset') && cmd.includes('hard')) },
          { id: 'g2', text: 'Recover with git log or checkout', check: (s, h) => h.some(cmd => cmd.includes('checkout') || cmd.includes('log')) }
        ],
        hints: [
          'First: git reset --hard HEAD~3 (simulate the accident)',
          'In real git: git reflog shows ALL HEAD movements',
          'git checkout <lost-hash> or git reset --hard <hash> to recover',
          'Commits stay in reflog for 90 days by default!'
        ],
        concept: 'Reflog is Git\'s safety net. It records every HEAD movement. Deleted branches, lost commits — reflog can almost always recover them.'
      },
      {
        id: 'c22',
        name: 'Commit Graph Master',
        difficulty: 'expert',
        xp: 500,
        description: 'Build a complex branching structure: main, develop, 2 features, a hotfix, and a release. A real open-source project graph.',
        setup: ['git commit -m "Project start"'],
        goals: [
          { id: 'g1', text: 'Have 6+ branches at once', check: (s) => Object.keys(s.branches).length >= 6 },
          { id: 'g2', text: 'Make 10+ total commits', check: (s) => Object.keys(s.commits).length >= 10 },
          { id: 'g3', text: 'Have at least 2 merge commits', check: (s) => Object.values(s.commits).filter(c => c.parents.length > 1).length >= 2 }
        ],
        hints: [
          'main → develop → feature/auth → develop (merge)',
          'main → hotfix/crash → main + develop (merge both)',
          'develop → release/2.0 → main (tag v2.0)'
        ],
        concept: 'Real projects have complex graphs. Tools like git log --graph --oneline --all visualize the full picture. You are now a Git Wizard!'
      }
    ]
  }
];

window.TIERS = TIERS;
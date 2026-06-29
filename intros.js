// =============================================
// GitQuest — js/intros.js
// Per-challenge intro dialogs
// Each challenge gets a rich explanation shown
// BEFORE the user starts, learnGitBranching style
// =============================================

const CHALLENGE_INTROS = {

  // ── ROOKIE ──────────────────────────────────

  c01: {
    whatYouLearn: 'How to create your first Git commit — the most fundamental operation in Git.',
    description: `Git tracks changes to your files through <strong>commits</strong>. Think of a commit as a photograph of your project at a specific moment in time — a save point you can always return to.

Every commit has a unique ID (called a hash), an author, a timestamp, and a message describing what changed. Commits are the backbone of everything in Git.`,
    prereqs: null,
    firstHint: `Type <code>git commit -m "My first commit"</code> and press Enter. The <code>-m</code> flag lets you write a message describing what you changed.`,
    tip: '💡 Good commit messages are short but descriptive — like "Add login button" not "stuff".'
  },

  c02: {
    whatYouLearn: 'How to create a branch — Git\'s most powerful feature for parallel development.',
    description: `Imagine you want to add a new feature to your app, but you don\'t want to break the working code. That\'s what <strong>branches</strong> are for.

A branch is just a lightweight pointer to a specific commit. Creating a branch is instant and costs almost nothing. You can have dozens of branches and switch between them freely.`,
    prereqs: 'You should know how to make a commit (Challenge 1).',
    firstHint: `Try <code>git branch feature</code> to create a branch named "feature". You can name branches anything you want — common names are <code>feature/login</code>, <code>bugfix/crash</code>, <code>develop</code>.`,
    tip: '💡 The branch you\'re currently on is shown in your terminal prompt and highlighted in the graph with a filled label.'
  },

  c03: {
    whatYouLearn: 'How to navigate between branches with checkout and switch.',
    description: `Creating a branch is only half the story — you also need to <strong>switch to it</strong> to work on it. The <code>git checkout</code> command (or the newer <code>git switch</code>) moves you from one branch to another.

When you switch branches, Git updates your working files to match that branch\'s state. The special pointer <strong>HEAD</strong> always points to where you currently are.`,
    prereqs: 'You should know how to create a branch (Challenge 2).',
    firstHint: `Type <code>git checkout feature</code> to switch to the feature branch. You\'ll see the graph update — the HEAD pointer moves to feature. Alternatively, the modern way is <code>git switch feature</code>.`,
    tip: '💡 The active branch label has a filled background in the graph. HEAD shows you exactly where you are.'
  },

  c04: {
    whatYouLearn: 'How committing on a branch diverges history from main.',
    description: `Now that you\'re on a branch, committing will advance <em>that</em> branch\'s pointer — leaving main exactly where it was. This creates <strong>divergent history</strong>, which is the whole point of branches.

The graph will visually split: main stays back, while your feature branch moves forward. This is how multiple developers can work on different things simultaneously without interfering with each other.`,
    prereqs: 'You should know how to switch branches (Challenge 3).',
    firstHint: `You\'re already on the feature branch. Just run <code>git commit -m "Feature work"</code> twice. Watch the graph — the feature branch moves forward while main stays put!`,
    tip: '💡 Each commit on a branch is a new node in the graph. The branch label (pointer) moves to the newest commit automatically.'
  },

  c05: {
    whatYouLearn: 'How to merge a branch back into main — combining two histories.',
    description: `Once your feature is done, you want to bring those changes back into <code>main</code>. This is called a <strong>merge</strong>.

Git is smart about merging — it finds the common ancestor of both branches and combines the changes. If both branches touched the same lines, you\'ll get a merge conflict (not simulated here, but important to know about!).

The merge creates a new <strong>merge commit</strong> with two parent pointers, forming a diamond shape in the graph.`,
    prereqs: 'You should know how to commit on a branch (Challenge 4).',
    firstHint: `First switch back to main with <code>git checkout main</code>, then run <code>git merge feature</code>. The feature branch changes will be incorporated into main.`,
    tip: '💡 Always merge INTO the branch you want to update. So if you want main to have feature\'s changes: checkout main, then merge feature.'
  },

  // ── CONTRIBUTOR ──────────────────────────────

  c06: {
    whatYouLearn: 'How rebase creates a cleaner, linear history compared to merge.',
    description: `<strong>Rebase</strong> is an alternative to merge. Instead of creating a merge commit, rebase "replays" your commits on top of the target branch — as if you had branched off from there in the first place.

The result is a perfectly linear history with no merge commits. This is popular in teams that want a clean, readable commit log. But beware: <strong>never rebase commits that have been pushed to a shared remote!</strong> It rewrites history.`,
    prereqs: 'You should know how to merge branches (Challenge 5).',
    firstHint: `Make sure you\'re on the feature branch (<code>git checkout feature</code>), then run <code>git rebase main</code>. Your feature commits will be replayed on top of main\'s latest commit.`,
    tip: '💡 Rebase vs Merge: rebase = cleaner history but rewrites commits. Merge = preserves history but adds a merge commit. Both are valid — teams pick one style.'
  },

  c07: {
    whatYouLearn: 'What "detached HEAD" means and how to inspect specific commits.',
    description: `Normally, HEAD points to a branch, which points to a commit. But you can check out a <em>specific commit directly</em> — this puts you in <strong>detached HEAD state</strong>.

In this state, you\'re looking at a snapshot of history. You can explore and even make commits, but those commits won\'t belong to any branch — they\'ll be "floating". To save your work from a detached HEAD, create a new branch!`,
    prereqs: 'You should know how to navigate branches (Challenge 3).',
    firstHint: `Run <code>git log --oneline</code> to see commit hashes, then <code>git checkout HEAD~1</code> to detach HEAD one commit back. Or pick a specific hash from the log output.`,
    tip: '💡 Detached HEAD isn\'t dangerous, just unusual. If you accidentally make commits in this state, run <code>git checkout -b rescue-branch</code> to save them!'
  },

  c08: {
    whatYouLearn: 'How git reset moves branch pointers back in time — and the 3 reset modes.',
    description: `<strong>git reset</strong> moves the current branch pointer backward to a previous commit. It has three modes that control what happens to your changes:

<strong>--soft</strong>: moves the pointer, keeps changes staged.
<strong>--mixed</strong> (default): moves the pointer, unstages changes.
<strong>--hard</strong>: moves the pointer, <em>deletes</em> the changes entirely.

⚠️ Hard reset permanently discards uncommitted work and should never be used on commits that others have already pulled!`,
    prereqs: 'You should understand commits and branches.',
    firstHint: `Try <code>git reset HEAD~2</code> to move back 2 commits (mixed mode — changes kept but unstaged). Or try <code>git reset --hard HEAD~2</code> to fully erase those commits.`,
    tip: '💡 The commits you reset past aren\'t immediately deleted — they stay in Git\'s reflog for 90 days. So you can often recover from an accidental reset!'
  },

  c09: {
    whatYouLearn: 'How git revert safely undoes commits without rewriting history.',
    description: `Unlike <code>git reset</code>, which moves the branch pointer backward, <strong>git revert</strong> creates a <em>new commit</em> that undoes a previous one. The original commit stays in history — you\'re just adding an "undo" commit on top.

This is the safe way to undo changes on a branch that others might be using. It\'s transparent: anyone looking at the log can see exactly what happened and when it was undone.`,
    prereqs: 'You should understand git reset (Challenge 8).',
    firstHint: `Run <code>git revert HEAD</code> to create a new commit that reverses the most recent commit. A new commit node will appear in the graph.`,
    tip: '💡 Rule of thumb: Use <code>revert</code> on public/shared branches. Use <code>reset</code> only on private local commits before pushing.'
  },

  c10: {
    whatYouLearn: 'How to apply a single specific commit from one branch to another.',
    description: `<strong>Cherry-pick</strong> lets you grab one (or more) specific commits from anywhere in history and apply them to your current branch — without merging everything else.

This is incredibly useful for scenarios like: a hotfix was made on a feature branch and you need it on main now, or a useful experimental commit should be pulled into production.`,
    prereqs: 'You should be comfortable with branches and commits.',
    firstHint: `First run <code>git log --oneline</code> to see the commits on the experiment branch, then <code>git cherry-pick &lt;hash&gt;</code> while on main. A copy of that commit appears on main!`,
    tip: '💡 Cherry-picking creates a new commit with the same changes but a different hash. The original commit remains on its branch unchanged.'
  },

  // ── MAINTAINER ──────────────────────────────

  c11: {
    whatYouLearn: 'How to mark important commits with tags — permanent bookmarks for releases.',
    description: `<strong>Tags</strong> are like branch labels that never move. While a branch pointer advances with every new commit, a tag always points to the exact commit it was created on.

Tags are most commonly used to mark release versions: <code>v1.0</code>, <code>v2.3.1</code>, etc. There are two types: <em>lightweight</em> (just a pointer) and <em>annotated</em> (a full Git object with author, date, and message — use this for releases).`,
    prereqs: 'You should understand commits and branches.',
    firstHint: `Run <code>git tag v1.0</code> to create a lightweight tag at HEAD. You\'ll see it appear in the graph. To create an annotated tag: <code>git tag -a v1.0 -m "Version 1.0 release"</code>.`,
    tip: '💡 Use annotated tags for real releases — they include who made the tag and when. Run <code>git tag</code> to list all tags.'
  },

  c12: {
    whatYouLearn: 'How to temporarily shelve work-in-progress with git stash.',
    description: `You\'re in the middle of a feature when an urgent bug report comes in. You\'re not ready to commit your half-finished work. Enter <strong>git stash</strong>.

Stash saves your changes in a special temporary area (a stack), cleans your working directory, and lets you switch contexts. When you\'re done with the urgent work, pop the stash to restore exactly where you left off.`,
    prereqs: 'You should understand commits and branches.',
    firstHint: `Run <code>git stash</code> to save your current changes. Then run <code>git stash pop</code> to restore them. You can see all stashes with <code>git stash list</code>.`,
    tip: '💡 Stash is a stack — you can stash multiple times. <code>git stash pop</code> restores the most recent one. Use <code>git stash apply stash@{2}</code> to restore a specific stash.'
  },

  c13: {
    whatYouLearn: 'The complete feature branch workflow used by professional teams.',
    description: `The <strong>feature branch workflow</strong> is the most popular Git workflow in professional teams:

1. Start from <code>main</code> (always clean and deployable)
2. Create a feature branch with a descriptive name
3. Make commits as you work
4. Merge back with <code>--no-ff</code> to preserve branch history
5. Delete the feature branch

The <code>--no-ff</code> flag (no fast-forward) forces a merge commit even when a fast-forward is possible, keeping feature groups visible in the log.`,
    prereqs: 'You should know how to branch and merge (Challenges 2-5).',
    firstHint: `Create your feature branch: <code>git checkout -b feature/login</code>. Make some commits, then switch back: <code>git checkout main</code>. Finally merge: <code>git merge --no-ff feature/login</code>.`,
    tip: '💡 The <code>--no-ff</code> flag creates a merge commit even when Git could fast-forward. This keeps your history readable — you can see "here\'s where the feature lived".'
  },

  c14: {
    whatYouLearn: 'How to connect your local repo to a remote (like GitHub) and push your work.',
    description: `So far everything has been local. In real projects, you work with <strong>remotes</strong> — shared repositories hosted on services like GitHub, GitLab, or Bitbucket.

A remote is just another copy of the repository. The convention is to name your primary remote <code>origin</code>. Once added, you can <code>push</code> your local commits there and <code>pull</code> changes from teammates.`,
    prereqs: 'You should be comfortable with commits, branches, and merges.',
    firstHint: `Add a remote with <code>git remote add origin https://github.com/you/repo.git</code>. Then push your work with <code>git push origin main</code>. Verify remotes with <code>git remote -v</code>.`,
    tip: '💡 "origin" is just a conventional name — you can call your remote anything. Open source projects often have two remotes: <code>origin</code> (your fork) and <code>upstream</code> (the original).'
  },

  c15: {
    whatYouLearn: 'How to clean up and polish your commit history before sharing it.',
    description: `Before pushing to a shared branch, it\'s common to clean up a messy commit history. <strong>Interactive rebase</strong> lets you rewrite, reorder, squash, or drop commits.

Common operations:
<strong>pick</strong> — keep the commit as-is
<strong>squash</strong> — combine with the previous commit
<strong>edit</strong> — stop and amend this commit
<strong>drop</strong> — delete the commit entirely

In GitQuest we simulate this with <code>git rebase HEAD~N</code>.`,
    prereqs: 'You should understand rebase (Challenge 6).',
    firstHint: `Try <code>git rebase HEAD~3</code> to rebase the last 3 commits. In real Git, add the <code>-i</code> flag for interactive mode. In GitQuest, this replays the commits cleanly on the current branch.`,
    tip: '💡 The golden rule: NEVER interactive-rebase commits that have already been pushed to a shared branch. It rewrites history and will cause problems for teammates.'
  },

  // ── ARCHITECT ──────────────────────────────

  c16: {
    whatYouLearn: 'The complete Gitflow branching model — the industry standard for versioned releases.',
    description: `<strong>Gitflow</strong> is a branching strategy with specific roles for each branch:

<strong>main</strong> — always production-ready, tagged with version numbers
<strong>develop</strong> — integration branch for features
<strong>feature/*</strong> — individual features branch off develop
<strong>release/*</strong> — prepare a new release (bug fixes only)
<strong>hotfix/*</strong> — emergency fixes directly from main

It\'s more complex than GitHub Flow but excellent for projects with scheduled releases.`,
    prereqs: 'You should know all basic branching operations (Challenges 2-13).',
    firstHint: `Start with <code>git checkout -b develop main</code>, then <code>git checkout -b feature/auth develop</code>, then <code>git checkout -b release/1.0 develop</code>. Build the structure step by step.`,
    tip: '💡 Gitflow is powerful but complex. For continuous delivery, GitHub Flow (just main + feature branches) is simpler and works great for most teams.'
  },

  c17: {
    whatYouLearn: 'How to handle emergency production bugs with a hotfix branch.',
    description: `A critical bug is live in production right now. You can\'t wait for the next release cycle. Enter the <strong>hotfix workflow</strong>.

The hotfix branches directly off <code>main</code> (not develop!), gets fixed as quickly as possible, then merges back into BOTH <code>main</code> AND <code>develop</code>. This ensures the fix is in production immediately and also doesn\'t get lost when the next feature release happens.`,
    prereqs: 'You should understand Gitflow basics (Challenge 16).',
    firstHint: `Branch from main: <code>git checkout -b hotfix/critical-bug main</code>. Fix it with a commit. Then merge into main: <code>git checkout main && git merge hotfix/critical-bug</code>. Don\'t forget develop too!`,
    tip: '💡 After merging a hotfix, always tag main with a new patch version: <code>git tag v1.0.1</code>. And delete the hotfix branch when done: <code>git branch -d hotfix/critical-bug</code>.'
  },

  c18: {
    whatYouLearn: 'How to fix mistakes in your last commit before anyone sees them.',
    description: `You just committed and noticed a typo in the commit message. Or you forgot to include a file. <strong>git commit --amend</strong> lets you rewrite your most recent commit — changing the message, adding files, or both.

The amended commit gets a completely new hash. The old commit is abandoned (though it lingers in reflog for a while). This is totally safe as long as you haven\'t pushed yet!`,
    prereqs: 'You should understand commits.',
    firstHint: `Run <code>git commit --amend -m "Fixed: proper message here"</code> to replace the last commit with a new one that has the correct message. The graph will show the commit node refreshed.`,
    tip: '💡 ⚠️ Never amend a commit that\'s already been pushed to a shared branch. Your teammates will have the old commit hash and your amended history will conflict with theirs.'
  },

  c19: {
    whatYouLearn: 'How git bisect uses binary search to pinpoint exactly which commit introduced a bug.',
    description: `You know a bug exists now that didn\'t exist 200 commits ago. How do you find which commit introduced it? Checking each one would take forever.

<strong>git bisect</strong> uses binary search: you mark a good commit and a bad commit, then Git checks out the midpoint. You test it, mark it good or bad, and Git narrows it down. In log₂(200) ≈ 8 steps, you\'ve found the guilty commit!`,
    prereqs: 'You should understand commits and history navigation.',
    firstHint: `Simulate by navigating history: run <code>git log --oneline</code> to see the commits, then use <code>git checkout HEAD~2</code> to jump back and inspect. In real Git: <code>git bisect start → git bisect bad → git bisect good &lt;hash&gt;</code>.`,
    tip: '💡 You can automate bisect with a test script: <code>git bisect run npm test</code>. Git will automatically mark commits good/bad based on the exit code!'
  },

  // ── WIZARD ──────────────────────────────────

  c20: {
    whatYouLearn: 'How to merge multiple branches simultaneously with an octopus merge.',
    description: `The <strong>octopus merge</strong> is a special strategy that merges three or more branches in a single commit. The resulting merge commit has multiple parents — one for each merged branch.

This is used famously in the Linux kernel to integrate work from many subsystem maintainers at once. It only works when there are no conflicts between branches. If there are conflicts, you must merge one branch at a time.`,
    prereqs: 'You should be very comfortable with branching and merging.',
    firstHint: `Create 3 branches (branch1, branch2, branch3) each with one commit off main. Then checkout main and merge them sequentially: <code>git merge branch1</code>, <code>git merge branch2</code>, <code>git merge branch3</code>.`,
    tip: '💡 Real octopus merges use <code>git merge branch1 branch2 branch3</code> all at once. The commit graph will show a node with 3+ incoming edges — it looks like an octopus!'
  },

  c21: {
    whatYouLearn: 'How to recover "lost" commits using git reflog — Git\'s safety net.',
    description: `You just did <code>git reset --hard HEAD~3</code> and realized those commits had important work. Are they gone forever?

<strong>No!</strong> Git never immediately deletes commits. The <strong>reflog</strong> records every movement of HEAD — every checkout, reset, commit, merge. Even "deleted" commits stay in reflog for 90 days. You can always get them back with <code>git checkout &lt;hash&gt;</code> or <code>git reset --hard &lt;hash&gt;</code>.`,
    prereqs: 'You should understand git reset (Challenge 8).',
    firstHint: `First simulate losing commits: <code>git reset --hard HEAD~3</code>. Then in real Git you\'d run <code>git reflog</code> to find the lost hash. In GitQuest: use <code>git log</code> or <code>git checkout</code> to navigate to past states.`,
    tip: '💡 Reflog is local only — it\'s not pushed to remotes. But as long as you have your local repo, you can almost always recover anything. Commits are only truly gone after <code>git gc</code> runs (usually after 90 days).'
  },

  c22: {
    whatYouLearn: 'Master-level challenge: build a full real-world project commit graph from scratch.',
    description: `You\'ve learned every major Git concept. Now put it all together. Real open-source projects have complex graphs with many branches, merge commits, tags, and parallel development tracks.

Your mission: create a graph that looks like a real production repository with multiple contributors working in parallel. You\'ll need <strong>develop</strong>, <strong>feature branches</strong>, <strong>hotfix</strong>, a <strong>release</strong>, and meaningful <strong>tags</strong>.

If you can complete this challenge, you are a genuine <strong>Git Wizard</strong>. 🧙`,
    prereqs: 'All previous challenges should be completed.',
    firstHint: `Start with: <code>git checkout -b develop</code>, then branch features off develop, merge them back, create a release branch, tag main with a version, and handle a hotfix. Think like a team of 3 developers!`,
    tip: '💡 Run <code>git log --oneline</code> frequently to count your commits. The Objective panel shows your live progress on all 3 goals.'
  }
};

window.CHALLENGE_INTROS = CHALLENGE_INTROS;

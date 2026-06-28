# ⎇ GitQuest — Master Git from Beginner to Wizard

> The most powerful interactive Git learning platform. Visual, AI-powered, and built for real-world mastery.

![GitQuest Screenshot](assets/screenshot.png)

## 🚀 Live Demo

**[▶ Play GitQuest](https://your-username.github.io/gitquest)**

---

## ✨ Why GitQuest?

While LearnGitBranching is great for visualizing branching, GitQuest goes further:

| Feature | LearnGitBranching | GitQuest |
|---|---|---|
| Visual commit graph | ✅ | ✅ |
| Interactive terminal | ✅ | ✅ |
| Structured levels | ✅ | ✅ |
| AI-powered tutor | ❌ | ✅ |
| Real-world workflows | Partial | ✅ |
| Hint system | Basic | ✅ Multi-level hints |
| XP & progression | ❌ | ✅ |
| Named level tiers | ❌ | ✅ 5 tiers |
| Cheat sheet | ❌ | ✅ Always accessible |
| Sandbox mode | ✅ | ✅ |
| Dark terminal aesthetic | ❌ | ✅ |
| Autocomplete | ❌ | ✅ |

---

## 📚 Curriculum — 22 Challenges Across 5 Tiers

### 🌱 Rookie (Beginner)
1. Your First Commit
2. Create a Branch
3. Switch Branches
4. Commit on a Branch
5. Merge Branches

### 🔧 Contributor (Easy)
6. Rebase Your Branch
7. Detach HEAD
8. Reset the Clock
9. Revert Safely
10. Cherry Pick

### ⚙️ Maintainer (Medium)
11. Tag a Release
12. Stash Your Work
13. Feature Branch Workflow
14. Add a Remote
15. Interactive Rebase

### 🏛️ Architect (Hard)
16. Gitflow Workflow
17. Hotfix Workflow
18. Amend a Commit
19. Bisect a Bug

### 🧙 Git Wizard (Expert)
20. The Octopus Merge
21. Reflog Rescue
22. Commit Graph Master

---

## 🏗️ Architecture

```
gitquest/
├── index.html          # Main HTML shell
├── css/
│   └── style.css       # All styles (dark terminal theme)
├── js/
│   ├── git-engine.js   # Full Git simulation engine
│   ├── graph-renderer.js  # SVG commit graph with animations
│   ├── challenges.js   # All 22 challenges + curriculum data
│   └── app.js          # Main app controller
└── assets/
    └── screenshot.png
```

**100% client-side** — no backend, no build step. Just open `index.html`.

---

## 🧠 Git Commands Supported

```
git commit [-m message] [--amend]
git branch [name] [-d] [-D] [-m old new]
git checkout [-b] [branch|commit]
git switch [-c] [branch]
git merge [--no-ff] <branch>
git rebase <branch>
git log [--oneline] [-n N]
git status
git add <file|.>
git reset [--soft|--mixed|--hard] <ref>
git revert <ref>
git cherry-pick <hash>
git tag [name] [ref] [-d]
git stash [push|pop|list|drop]
git diff
git remote [add|remove|show|-v]
git push [remote] [branch]
git pull [remote] [branch]
git fetch [remote]
git help
```

**Relative refs supported:** `HEAD`, `HEAD~1`, `HEAD~N`, branch names, commit hashes.

---

## 🤖 AI Tutor

GitQuest embeds Claude (Anthropic) as a real-time AI tutor that:
- Knows your **current challenge and objectives**
- Knows your **current repo state** (branches, HEAD)
- Tracks your **command history** to give contextual advice
- Answers any Git question in the AI Chat tab

To enable: set your Anthropic API key via the Claude.ai interface (no config needed when using GitQuest within claude.ai).

---

## 🚀 Getting Started

### Option 1: Direct open
```bash
git clone https://github.com/your-username/gitquest.git
cd gitquest
open index.html   # Mac
# or: start index.html  (Windows)
# or: xdg-open index.html  (Linux)
```

### Option 2: Local server
```bash
cd gitquest
python3 -m http.server 8080
# Open: http://localhost:8080
```

### Option 3: GitHub Pages
1. Fork this repo
2. Go to Settings → Pages → Deploy from `main` branch
3. Done! Live at `https://your-username.github.io/gitquest`

---

## 🎨 Design

- **Theme**: Dark terminal meets modern GitHub UI
- **Accent**: Git green (`#39d353`) — the color of a successful push
- **Font**: JetBrains Mono for code, Inter for UI
- **Graph**: SVG-based animated commit graph with pan/zoom
- **No frameworks**: Vanilla JS + CSS custom properties

---

## 🛠️ Extending GitQuest

### Adding a Challenge
Edit `js/challenges.js` and add to the appropriate tier:

```javascript
{
  id: 'c23',
  name: 'Your Challenge Name',
  difficulty: 'medium',  // beginner|easy|medium|hard|expert
  xp: 200,
  description: 'What the student will learn...',
  setup: ['git commit -m "Initial"'],  // Commands run at load
  goals: [
    {
      id: 'g1',
      text: 'Description of goal for the UI',
      check: (state, commandHistory) => {
        // Return true when goal is achieved
        return commandHistory.some(cmd => cmd.includes('git merge'));
      }
    }
  ],
  hints: [
    'First hint (shown first)',
    'Second hint (shown after first)',
  ],
  concept: 'Key Git concept explained in one paragraph.'
}
```

### Adding Git Commands
Edit the `execute()` switch in `js/git-engine.js` and add a `_git<Command>()` method.

---

## 🤝 Contributing

1. Fork the repo
2. Create your branch: `git checkout -b feature/awesome-challenge`
3. Commit: `git commit -m "Add: awesome challenge"`
4. Push: `git push origin feature/awesome-challenge`
5. Open a Pull Request

### Ideas welcome:
- New challenges (especially Git internals, worktrees, submodules)
- Improved graph layout algorithm
- Mobile support
- i18n / translations
- Dark/light theme toggle
- Progress export/import

---

## 📄 License

MIT License — use it, fork it, learn from it.

---

## 🙏 Credits

Inspired by [LearnGitBranching](https://github.com/pcottle/learnGitBranching) by Peter Cottle.

Built with ❤️ using vanilla JS, SVG, and the Anthropic Claude API.

---

*"The best way to learn Git is to use Git. The second best way is GitQuest."*

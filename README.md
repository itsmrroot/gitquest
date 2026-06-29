# ⎇ GitQuest — Master Git from Beginner to Wizard

> The most powerful interactive Git learning platform. Visual, multi-language, and built for real-world mastery.


## 🚀 Live Demo

**[▶ Play GitQuest](https://itsmrroot.github.io/gitquest/)**

---

## ✨ Why GitQuest?

While LearnGitBranching is great for visualizing branching, GitQuest goes further:

| Feature | LearnGitBranching | GitQuest |
|---|---|---|
| Visual commit graph | ✅ | ✅ |
| Interactive terminal | ✅ | ✅ |
| Structured levels | ✅ | ✅ |
| Sandbox mode | ✅ | ✅ |
| Real-world workflows | Partial | ✅ Gitflow, Hotfix, etc. |
| Hint system | Basic | ✅ Multi-level hints |
| XP & progression | ❌ | ✅ 5 levels, XP badges |
| Named level tiers | ❌ | ✅ 5 tiers |
| Cheat sheet | ❌ | ✅ Always accessible |
| Challenge intro dialog | ❌ | ✅ What you'll learn + prereqs |
| Goal-to-Reach panel | ❌ | ✅ Draggable target graph |
| Undo command | ❌ | ✅ `git undo` / `undo` |
| Multi-language support | ❌ | ✅ 10 languages |
| Dark/light theme | ❌ | ✅ |
| Autocomplete | ❌ | ✅ |
| Challenge unlock system | ❌ | ✅ Sequential progression |
| Progress persistence | ❌ | ✅ localStorage |

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
├── style.css           # All styles (dark terminal theme)
├── git-engine.js       # Full Git simulation engine
├── graph-renderer.js   # SVG commit graph with pan support
├── challenges.js       # All 22 challenges + curriculum data
├── goal-graphs.js      # Target graph states for each challenge
├── intros.js           # Challenge intro dialog content
├── i18n.js             # 10-language translations
└── app.js              # Main app controller
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
git undo  (also: undo)
git help
```

**Relative refs supported:** `HEAD`, `HEAD~1`, `HEAD~N`, branch names, commit hashes.

---

## 🎯 Goal-to-Reach Panel

Each challenge shows a **draggable floating panel** with the target commit graph — the exact state you need to reach to complete the challenge. It auto-scales to fit the full graph, regardless of complexity. You can minimize, close, or drag it anywhere on screen.

---

## 🗂️ Challenge Intro Dialog

When you open a challenge for the first time, GitQuest shows a full intro card with:
- What you'll learn
- Prerequisites
- First-step hint
- A preview of all objectives

You can also navigate between challenges directly from the intro without losing your place.

---

## ↩ Undo

Made a mistake? Type `git undo` (or just `undo`) to roll back the last state-changing command. The undo stack holds up to 20 steps and resets when you load a new challenge.

---

## 🌍 Multi-language Support

GitQuest is fully translated into **10 languages**: English, German, French, Spanish, Portuguese, Arabic, Japanese, Chinese, Hindi, and Turkish. The entire UI adapts to the selected language.

---

## 🚀 Getting Started

### Option 1: Direct open
```bash
git clone https://github.com/itsmrroot/gitquest.git
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
3. Done! Live at `https://itsmrroot.github.io/gitquest/`

---

## 🎨 Design

- **Theme**: Dark terminal meets modern GitHub UI (dark/light toggle)
- **Accent**: Git green (`#39d353`) — the color of a successful push
- **Font**: JetBrains Mono for code, Inter for UI
- **Graph**: SVG-based commit graph with pan support
- **No frameworks**: Vanilla JS + CSS custom properties

---

## 🛠️ Extending GitQuest

### Adding a Challenge
Edit `challenges.js` and add to the appropriate tier:

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

Then add a matching target graph in `goal-graphs.js` and an intro entry in `intros.js`.

### Adding Git Commands
Edit the `execute()` switch in `git-engine.js` and add a `_git<Command>()` method.

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
- Progress export/import

---

## 📄 License

MIT License — use it, fork it, learn from it.

---

## 🙏 Credits

Inspired by [LearnGitBranching](https://github.com/pcottle/learnGitBranching) by Peter Cottle.

Built with ❤️ using vanilla JS and SVG.

---

*"The best way to learn Git is to use Git. The second best way is GitQuest."*

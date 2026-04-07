# הקוטב הצפוני — Kotev Tzfoni

Business website + Telegram-powered gallery management for **Itzik Drori**, an AC & electrical technician serving the central Israel region.

---

## What It Is

A bilingual (Hebrew/English, full RTL) static website showcasing services, about section, project gallery, and contact info. The gallery is managed entirely through a Telegram bot — no CMS, no admin panel, no hosting backend needed.

**Live site:** Deployed via GitHub Pages / Vercel (auto-deploys on push to `main`)

---

## Project Structure

```
Kotev_tzfoni/
├── index.html          # Main single-page website (Hebrew default, EN toggle)
├── project.html        # Individual project gallery page
├── script.js           # Frontend JS: language toggle, gallery rendering, animations
├── style.css           # All styling (dark theme, RTL, responsive)
├── favicon.svg
├── assets/
│   └── img/
│       ├── *.jpg                    # Site-wide images (logo, Itzik's photo, etc.)
│       └── projects/
│           ├── gallery.json         # ← Single source of truth for all projects
│           └── <project-slug>/      # One folder per project
│               ├── 001.jpg
│               ├── 002.jpg
│               └── ...
└── bot/
    ├── gallery-bot.js  # Telegram bot (Node.js, zero dependencies)
    └── README.md       # Bot setup instructions
```

---

## How the Gallery Works

The site reads `assets/img/projects/gallery.json` at load time and renders all projects dynamically. Each entry in the JSON looks like:

```json
{
  "name": "התקנת מזגן — תל אביב",
  "slug": "התקנת-מזגן-תל-אביב-3821",
  "date": "2026-03-27",
  "cover": "projects/התקנת-מזגן-תל-אביב-3821/001.jpg",
  "photos": [
    "projects/התקנת-מזגן-תל-אביב-3821/001.jpg",
    "projects/התקנת-מזגן-תל-אביב-3821/002.jpg"
  ]
}
```

---

## Telegram Bot — Gallery Manager

The bot (`bot/gallery-bot.js`) lets Itzik upload project photos directly from his phone via Telegram. When he finishes, the bot commits the new images + updated `gallery.json` to GitHub and the site auto-deploys.

### Flow

```
/start or tap menu
    ↓
📸 פרויקט חדש  →  Send project name as text
    ↓
Send photos (one by one or batch)
    ↓
Tap "סיום ועדכון אתר"
    ↓
Bot writes images to assets/img/projects/<slug>/
Bot updates gallery.json
Bot runs: git add -A && git commit && git push
    ↓
Site auto-deploys (~30 seconds)
```

### Bot Commands (inline buttons)

| Button | Action |
|--------|--------|
| 📸 פרויקט חדש | Start a new project — bot asks for a name |
| Send photos | Photos are saved sequentially (001.jpg, 002.jpg…) |
| ✅ סיום ועדכון אתר | Finalize project, push to GitHub, update website |
| 📂 ניהול פרויקטים | List all projects with delete buttons |
| 🗑 Delete | Removes project folder + gallery.json entry, pushes |
| ❌ בטל | Cancel current project (deletes local files, no push) |

### Running the Bot

```bash
cd bot/

# Required environment variables
export BOT_TOKEN=your_telegram_bot_token
export REPO_PATH=/path/to/Kotev_tzfoni     # defaults to parent directory
export ALLOWED_USERS=123456789,987654321   # Telegram user IDs (comma-separated)

node gallery-bot.js
```

**No npm install needed** — the bot uses only Node.js built-ins (`https`, `fs`, `path`, `child_process`).

### Getting Your Telegram User ID

Send a message to [@userinfobot](https://t.me/userinfobot) on Telegram — it will reply with your numeric user ID. Add it to `ALLOWED_USERS`.

---

## Website Features

- **Bilingual** — Hebrew (RTL) by default, English toggle stored in localStorage
- **Single-page** — Services, About Itzik, Gallery, Contact — all on one scroll
- **Floating call button** — always-visible `054-950-6888`
- **Dynamic gallery** — reads `gallery.json`, renders project cards and lightbox
- **Responsive** — mobile-first, works on any device
- **No framework** — pure HTML/CSS/JS, fast load, no build step

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS |
| Fonts | Google Fonts (Heebo) |
| Icons | Font Awesome 6 |
| Gallery data | `gallery.json` (flat file, no DB) |
| Bot | Node.js (zero dependencies) |
| Hosting | GitHub Pages / Vercel (auto-deploy on push) |
| Deployment trigger | Telegram bot → `git push` |

---

## Contact

**Itzik Drori** — AC & Electrical Technician  
📞 054-950-6888  
📍 Central Israel region  

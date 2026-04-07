# הקוטב הצפוני — Kotev Tzfoni

> A professional business website for an AC & electrical technician, with a Telegram bot that lets him publish project photos directly from his phone — no admin panel, no CMS, no tech knowledge required.

---

## The Problem It Solves

Itzik is a one-man operation. He finishes an AC installation job, takes a few photos with his phone, and wants them on his website the same day. He doesn't know how to use a CMS. He doesn't want to log in anywhere. He just wants to send photos to Telegram.

**Solution:** A Telegram bot that acts as his entire content management system. Send photos → tap "done" → website updates in 30 seconds.

---

## What It Is

A bilingual (Hebrew/English, full RTL) static website for **Itzik Drori**, AC & electrical technician serving the central Israel region. The site showcases his services, bio, project gallery, and contact info.

The gallery is managed entirely through a Telegram bot — no CMS, no admin panel, no backend server needed.

**Live site:** Auto-deploys on every `git push` to `main` (Vercel/GitHub Pages)

---

## How It Works — The Big Picture

```
Itzik finishes a job
    ↓
Opens Telegram, taps "New Project"
    ↓
Types the project name
    ↓
Sends photos one by one (or batch)
    ↓
Taps "Done — Update Website"
    ↓
Bot saves images to the repo
Bot writes an entry to gallery.json
Bot does: git add → git commit → git push
    ↓
Vercel detects the push → rebuilds → site live in ~30s
    ↓
Itzik's customers see the new project immediately
```

The website has **no server, no database, no login page**. It's a static HTML file that reads `gallery.json` and renders everything client-side. The "backend" is just Git.

---

## Project Structure

```
Kotev_tzfoni/
├── index.html          # Main single-page website (Hebrew RTL, English toggle)
├── project.html        # Individual project lightbox/gallery view
├── script.js           # Language toggle, gallery rendering, animations, particles
├── style.css           # All styles — dark theme, RTL, responsive, mobile-first
├── favicon.svg
│
├── assets/
│   └── img/
│       ├── itzik.jpg              # Itzik's profile photo (About section)
│       ├── logo-badge.jpg         # Brand badge
│       ├── logo-workers.jpg       # Workers logo
│       └── projects/
│           ├── gallery.json       # ← THE master list of all projects
│           └── <project-slug>/    # One folder per project, auto-created by bot
│               ├── 001.jpg
│               ├── 002.jpg
│               └── ...
│
└── bot/
    ├── gallery-bot.js  # Telegram bot — full gallery CMS (Node.js, zero deps)
    └── README.md       # Bot setup instructions
```

---

## Gallery Data Format

`gallery.json` is the only "database". The site reads it at page load and renders everything from it. The bot writes to it automatically — Itzik never touches it manually.

```json
[
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
]
```

New projects are prepended (newest first). Each project gets a unique slug based on the name + a 4-digit timestamp suffix to avoid collisions.

---

## Telegram Bot — Gallery Manager

`bot/gallery-bot.js` is a standalone Node.js script with **zero npm dependencies**. It uses only built-in modules (`https`, `fs`, `path`, `child_process`).

### Bot Flow

| Step | What Itzik does | What the bot does |
|------|----------------|-------------------|
| 1 | Taps 📸 **פרויקט חדש** | Asks for project name |
| 2 | Types the project name | Creates folder `assets/img/projects/<slug>/`, enters upload mode |
| 3 | Sends photos | Downloads each photo, saves as `001.jpg`, `002.jpg`… |
| 4 | Taps ✅ **סיום ועדכון אתר** | Updates `gallery.json`, runs `git push`, confirms |
| — | Taps 📂 **ניהול פרויקטים** | Shows all projects with delete buttons |
| — | Taps 🗑 on a project | Confirms, deletes folder + JSON entry, pushes |
| — | Taps ❌ **בטל** | Cancels, cleans up local files, no push |

### Security

Only Telegram user IDs listed in `ALLOWED_USERS` can use the bot. Everyone else gets an "unauthorized" message.

### Running the Bot

```bash
cd bot/

export BOT_TOKEN=your_telegram_bot_token
export REPO_PATH=/path/to/Kotev_tzfoni     # defaults to parent dir
export ALLOWED_USERS=123456789,987654321   # Telegram user IDs, comma-separated

node gallery-bot.js
```

The bot uses long-polling (checks for new messages every second). Run it on any always-on machine — a VPS, a Raspberry Pi, or the same server hosting the site.

**Get your Telegram user ID:** Message [@userinfobot](https://t.me/userinfobot) on Telegram.

---

## Website Features

| Feature | Detail |
|---------|--------|
| **Language** | Hebrew (RTL) default, English toggle — persisted in localStorage |
| **Layout** | Single-page scroll: Hero → Services → About → Gallery → Contact |
| **Call button** | Floating `054-950-6888` always visible |
| **Gallery** | Dynamic cards from `gallery.json`, lightbox on click |
| **Animations** | Snowflake particles in hero, scroll-triggered fade-ins |
| **Responsive** | Mobile-first, works on any screen size |
| **No framework** | Pure HTML/CSS/JS — fast, no build step, no dependencies |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Vanilla HTML/CSS/JS | No build step, instant load, easy to maintain |
| Fonts | Google Fonts — Heebo | RTL-optimized Hebrew font |
| Icons | Font Awesome 6 | Comprehensive icon set |
| Gallery data | `gallery.json` flat file | No DB, no backend, version-controlled |
| Bot runtime | Node.js built-ins only | Zero install, runs anywhere |
| Hosting | Vercel / GitHub Pages | Free, auto-deploys on push |
| Content pipeline | Telegram → Git push | Itzik manages content from his phone |

---

## Contact

**Itzik Drori** — AC & Electrical Technician  
📞 054-950-6888  
📍 Central Israel region

# Gallery Bot — הקוטב הצפוני

## Setup

```bash
# Install (no dependencies — uses Node.js built-ins only)
# Set env vars and run:
BOT_TOKEN=your_bot_token \
GITHUB_TOKEN=not_needed_if_git_creds_configured \
ALLOWED_USERS=telegram_user_id1,telegram_user_id2 \
node gallery-bot.js
```

## Commands for Itzik

| Command | Action |
|---|---|
| `/new התקנת מזגן בתל אביב` | Start new project |
| Send photos | Add photos to current project |
| `/done` | Finalize, push to GitHub, update website |
| `/list` | See all existing projects |
| `/cancel` | Cancel current project |

## How to get Telegram User ID

Send a message to @userinfobot on Telegram — it will reply with your ID.

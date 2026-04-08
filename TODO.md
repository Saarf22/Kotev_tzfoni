# TODO — הקוטב הצפוני (Kotev Tzfoni)

Project for Itzik Drori — AC & electrical technician website with Telegram-powered gallery.
Read `README.md` for full project context before starting any task.

---

## 🔴 HIGH PRIORITY

### 1. SEO — Schema Markup
**File:** `index.html`
**What:** Add JSON-LD structured data so Google understands the business.
Add inside `<head>`:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "הקוטב הצפוני",
  "alternateName": "Kotev Tzfoni",
  "description": "טכנאי מזגנים וחשמל מוסמך באזור המרכז. התקנה, תיקון ומילוי גז.",
  "telephone": "+972-54-950-6888",
  "url": "https://yosi-elad-sabag.vercel.app",
  "priceRange": "₪₪",
  "image": "https://yosi-elad-sabag.vercel.app/assets/img/itzik.jpg",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IL",
    "addressRegion": "Central District"
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Sunday","Monday","Tuesday","Wednesday","Thursday"], "opens": "08:00", "closes": "20:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "08:00", "closes": "14:00" }
  ],
  "sameAs": [
    "https://www.facebook.com/people/..."
  ]
}
</script>
```

---

### 2. SEO — Open Graph & Meta Tags
**File:** `index.html`
**What:** Add OG tags for WhatsApp/Facebook link previews and Google.
Missing tags to add:
```html
<meta property="og:image" content="https://yosi-elad-sabag.vercel.app/assets/img/itzik.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="canonical" href="https://yosi-elad-sabag.vercel.app/">
```

---

### 3. SEO — sitemap.xml + robots.txt
**Files:** `sitemap.xml`, `robots.txt` (create in root)
**What:** Helps Google crawl and index the site.

`sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://yosi-elad-sabag.vercel.app/</loc><priority>1.0</priority></url>
  <url><loc>https://yosi-elad-sabag.vercel.app/project</loc><priority>0.8</priority></url>
</urlset>
```

`robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://yosi-elad-sabag.vercel.app/sitemap.xml
```

Also add to `vercel.json`:
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    { "source": "/sitemap.xml", "headers": [{ "key": "Content-Type", "value": "application/xml" }] }
  ]
}
```

---

### 4. Facebook Auto-Post — n8n Workflow
**What:** When Itzik finishes uploading a project via the Telegram bot, automatically post the cover photo + project name to his Facebook Page.

**Prerequisites (Itzik needs to do):**
- [ ] Create a Meta Developer App at developers.facebook.com
- [ ] Get a Page Access Token with `pages_manage_posts` + `pages_read_engagement` permissions
- [ ] Get the Facebook Page ID (visible in Page settings or via Graph API)
- [ ] Share the token + Page ID so we can set it up

**Workflow logic:**
1. Trigger: watch `gallery.json` for new entries (compare with previous state), OR trigger via webhook from the Telegram bot on project completion
2. For each new project: fetch the cover image URL
3. POST to Facebook Graph API: `POST /{page-id}/photos` with `url` + `caption`
4. Caption format: `{project name} 🔧❄️\n\nהקוטב הצפוני — מיזוג אוויר וחשמל\n📞 054-950-6888\n🌐 https://yosi-elad-sabag.vercel.app`

**Implementation options:**
- Option A: Add a webhook call inside `bot/gallery-bot.js` after `gitPush()` succeeds → triggers n8n workflow
- Option B: n8n polls `gallery.json` every hour via HTTP GET, compares to stored state
- **Recommended: Option A** — most reliable, fires immediately

---

## 🟡 MEDIUM PRIORITY

### 5. Google Business Profile
**What:** Claim and set up the Google Business Profile for "הקוטב הצפוני".
**Not a code task** — Itzik needs to do this at business.google.com.
Steps:
- [ ] Go to business.google.com
- [ ] Search "הקוטב הצפוני" or "איציק דרורי"
- [ ] Claim/create the profile
- [ ] Verify via phone (054-950-6888) or postcard
- [ ] Add photos from the website gallery
- [ ] Set correct working hours
- Once done: add Google Business Profile URL to the `sameAs` array in Schema markup (#1 above)

---

### 6. Custom Domain
**What:** Set up a proper domain (e.g. `hakotev.co.il` or `kotev-tzfoni.co.il`) instead of the Vercel URL.
**Steps:**
- [ ] Purchase domain (domains.google.com, GoDaddy, or Israeli registrar)
- [ ] Add domain in Vercel dashboard → Project Settings → Domains
- [ ] Update `canonical` meta tag, Schema `url`, sitemap URLs
- [ ] Update all cross-references in the bot and any n8n workflows

---

### 7. Bot: Notify on Publish Success with Site URL
**File:** `bot/gallery-bot.js`
**What:** After successful `gitPush()`, include a direct link to the project on the site in the confirmation message.
Currently shows: `🚀 הועלה בהצלחה! פרויקט: X — תמונות: Y`
Should show: `🚀 הועלה בהצלחה!\nצפה בפרויקט: https://yosi-elad-sabag.vercel.app/#gallery`
(Or deep link to specific project once project pages have stable URLs)

---

### 8. Project Pages — SEO URLs
**File:** `project.html` + `script.js`
**What:** Currently project pages load via `?slug=xxx` query param which Google doesn't index well.
Consider: use hash-based routing or static generation per project.
At minimum: ensure `project.html` has dynamic `<title>` and meta tags based on the loaded project name.

---

## 🟢 LOW PRIORITY / NICE TO HAVE

### 9. Image Optimization in Bot
**File:** `bot/gallery-bot.js`
**What:** Compress images before saving them. Large photos slow page load.
Use `sharp` npm package (or system `convert` if ImageMagick is installed):
- Resize to max 1920px wide
- Convert to WebP
- Keep original as fallback

---

### 10. WhatsApp Share Button on Project Pages
**File:** `project.html`
**What:** Add a "Share on WhatsApp" button on each project page so customers can easily share Itzik's work.
```html
<a href="https://wa.me/?text=ראה את העבודה של הקוטב הצפוני: {url}">שתף בוואטסאפ</a>
```

---

### 11. Admin: List Projects in Bot with Photo Count
**File:** `bot/gallery-bot.js`
**What:** The "ניהול פרויקטים" view currently shows up to 10 projects. Add:
- Total project count in the header
- Scrollable pagination if > 10 projects
- Date of each project in the button label

---

### 12. Analytics
**What:** Add basic analytics to understand traffic — which pages, where visitors come from.
Options (free, no GDPR issues for IL):
- Vercel Analytics (already available in Vercel dashboard — just enable it)
- Plausible or Fathom (privacy-friendly, simple)
- Google Analytics 4 (more powerful, requires cookie banner for EU but not mandatory in IL)

**Recommended:** Enable Vercel Analytics first (zero code change needed).

---

## ✅ DONE

- [x] Static website (Hebrew/English, RTL, responsive)
- [x] Telegram gallery bot (create, upload, publish, delete projects)
- [x] Auto git push → Vercel auto-deploy
- [x] README with full project documentation
- [x] Facebook page linked in contact section
- [x] WhatsApp contact button

---

## Notes for Agents

- **Domain is currently:** `https://yosi-elad-sabag.vercel.app` (Vercel preview URL — will change to custom domain when set up)
- **Facebook Page URL:** `https://www.facebook.com/people/איציק-דרורי-הקוטב-הצפוני.../100064091231168/`
- **Phone:** `054-950-6888` / `+972-54-950-6888`
- **Bot allowed users:** `5462839041` (netgenius), `4301222524` (Itzik)
- **Bot runs on:** the main OpenClaw server, process managed externally
- **All changes** should be committed and pushed — Vercel auto-deploys on push to `main`

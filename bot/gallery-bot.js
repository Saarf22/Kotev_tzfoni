#!/usr/bin/env node
/**
 * gallery-bot.js — Kotev Tzfoni Gallery Bot
 * 
 * Commands:
 *   /new <project name>  — start a new project
 *   /list               — list existing projects
 *   /done               — finalize current project, update gallery.json, push to GitHub
 *   /cancel             — cancel current project
 *   [photo]             — add photo to current project
 *
 * Usage: BOT_TOKEN=xxx GITHUB_TOKEN=xxx node gallery-bot.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const REPO_PATH = process.env.REPO_PATH || path.resolve(__dirname, '..');
const ALLOWED_USERS = (process.env.ALLOWED_USERS || '').split(',').map(s => s.trim()).filter(Boolean);

if (!BOT_TOKEN) { console.error('Missing BOT_TOKEN'); process.exit(1); }

// ── State (in-memory, per chat) ────────────────────────────────────────────
const sessions = {}; // chatId => { projectName, folder, photoCount }

// ── Telegram API helpers ───────────────────────────────────────────────────
function tgApi(method, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve(JSON.parse(raw)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function send(chatId, text) {
    return tgApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

function downloadFile(fileId) {
    return new Promise(async (resolve, reject) => {
        const info = await tgApi('getFile', { file_id: fileId });
        const filePath = info.result.file_path;
        const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        https.get(url, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ buffer: Buffer.concat(chunks), ext: path.extname(filePath) || '.jpg' }));
        }).on('error', reject);
    });
}

// ── Gallery JSON helpers ────────────────────────────────────────────────────
const galleryPath = path.join(REPO_PATH, 'assets', 'img', 'projects', 'gallery.json');

function loadGallery() {
    try { return JSON.parse(fs.readFileSync(galleryPath, 'utf8')); }
    catch { return []; }
}

function saveGallery(data) {
    fs.mkdirSync(path.dirname(galleryPath), { recursive: true });
    fs.writeFileSync(galleryPath, JSON.stringify(data, null, 2));
}

// ── Git push ────────────────────────────────────────────────────────────────
function gitPush(message) {
    try {
        // Use GIT_ASKPASS=echo to prevent password prompts and ensure credential helper is used
        const env = Object.assign({}, process.env, {
            GIT_TERMINAL_PROMPT: '0',
            HOME: process.env.HOME || '/home/nvsaarz'
        });
        const safeMsg = message.replace(/"/g, "'");
        execSync(
            `git -C "${REPO_PATH}" add -A && git -C "${REPO_PATH}" commit -m "${safeMsg}" && git -C "${REPO_PATH}" push`,
            { stdio: 'pipe', env }
        );
        return true;
    } catch(e) {
        console.error('Git push failed:', e.message, e.stderr?.toString());
        return false;
    }
}

// ── Slug helper ─────────────────────────────────────────────────────────────
function toSlug(str) {
    return str.trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0590-\u05FF-]/g, '')
        .toLowerCase()
        .slice(0, 40);
}

// ── Message handler ─────────────────────────────────────────────────────────
async function handleUpdate(update) {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const userId = msg.from?.id?.toString();
    const text = msg.text || '';

    // Auth check
    if (ALLOWED_USERS.length && !ALLOWED_USERS.includes(userId)) {
        return send(chatId, '⛔ לא מורשה. צור קשר עם מנהל הבוט.');
    }

    // /new <name>
    if (text.startsWith('/new')) {
        const name = text.replace('/new', '').trim();
        if (!name) return send(chatId, '❓ שלח: /new שם הפרויקט\nלדוגמה: /new התקנת מזגן - תל אביב');
        const slug = toSlug(name) + '-' + Date.now().toString().slice(-4);
        const folder = path.join(REPO_PATH, 'assets', 'img', 'projects', slug);
        fs.mkdirSync(folder, { recursive: true });
        sessions[chatId] = { projectName: name, slug, folder, photoCount: 0, date: new Date().toISOString().slice(0, 10) };
        return send(chatId, `✅ פרויקט חדש: <b>${name}</b>\n\nשלח תמונות עכשיו. כשתסיים שלח /done`);
    }

    // /list
    if (text === '/list') {
        const gallery = loadGallery();
        if (!gallery.length) return send(chatId, '📂 אין פרויקטים עדיין.');
        const list = gallery.slice(0, 10).map((p, i) => `${i+1}. ${p.name} (${p.date}) — ${p.photos.length} תמונות`).join('\n');
        return send(chatId, `📂 <b>פרויקטים:</b>\n${list}`);
    }

    // /cancel
    if (text === '/cancel') {
        if (sessions[chatId]) {
            delete sessions[chatId];
            return send(chatId, '❌ פרויקט בוטל.');
        }
        return send(chatId, '❓ אין פרויקט פעיל.');
    }

    // /done
    if (text === '/done') {
        const session = sessions[chatId];
        if (!session) return send(chatId, '❓ אין פרויקט פעיל. התחל עם /new שם הפרויקט');
        if (session.photoCount === 0) return send(chatId, '❓ לא נשלחו תמונות עדיין.');

        await send(chatId, '⏳ מעדכן את האתר...');

        // Build photo list
        const photos = fs.readdirSync(session.folder)
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .sort();

        // Update gallery.json — newest first
        const gallery = loadGallery().filter(p => p.slug !== session.slug);
        const entry = {
            name: session.projectName,
            slug: session.slug,
            date: session.date,
            cover: `projects/${session.slug}/${photos[0]}`,
            photos: photos.map(f => `projects/${session.slug}/${f}`)
        };
        gallery.unshift(entry); // newest first
        saveGallery(gallery);

        // Push
        const ok = gitPush(`gallery: add project "${session.projectName}" (${photos.length} photos)`);
        delete sessions[chatId];

        if (ok) {
            return send(chatId, `🚀 <b>הועלה בהצלחה!</b>\n\n📁 פרויקט: ${entry.name}\n📸 תמונות: ${photos.length}\n🌐 האתר יתעדכן תוך כ-30 שניות.`);
        } else {
            return send(chatId, '⚠️ הועלה לפולדר אבל הייתה בעיה עם ה-push לגיטהאב. בדוק לוגים.');
        }
    }

    // Photo
    if (msg.photo || msg.document) {
        const session = sessions[chatId];
        if (!session) return send(chatId, '❓ קודם התחל פרויקט עם /new שם הפרויקט');

        const fileId = msg.photo
            ? msg.photo[msg.photo.length - 1].file_id  // largest size
            : msg.document?.file_id;

        try {
            const { buffer, ext } = await downloadFile(fileId);
            session.photoCount++;
            const fileName = `${String(session.photoCount).padStart(3, '0')}${ext}`;
            fs.writeFileSync(path.join(session.folder, fileName), buffer);
            await send(chatId, `📸 תמונה ${session.photoCount} התקבלה. שלח עוד או /done לסיום.`);
        } catch(e) {
            await send(chatId, '❌ שגיאה בהורדת התמונה. נסה שוב.');
        }
        return;
    }

    // Default
    if (text.startsWith('/start')) {
        return send(chatId, `👋 ברוך הבא לבוט גלריה של הקוטב הצפוני!\n\n<b>פקודות:</b>\n/new שם הפרויקט — פרויקט חדש\n[שלח תמונות] — הוסף תמונות\n/done — סיים ועדכן אתר\n/list — רשימת פרויקטים\n/cancel — בטל פרויקט פעיל`);
    }
}

// ── Long polling ─────────────────────────────────────────────────────────────
let offset = 0;
async function poll() {
    try {
        const res = await tgApi('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
        if (res.ok && res.result.length) {
            for (const update of res.result) {
                offset = update.update_id + 1;
                handleUpdate(update).catch(console.error);
            }
        }
    } catch(e) {
        console.error('Poll error:', e.message);
    }
    setTimeout(poll, 1000);
}

console.log('🤖 Kotev Tzfoni Gallery Bot starting...');
poll();

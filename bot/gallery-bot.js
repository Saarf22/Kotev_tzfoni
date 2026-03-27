#!/usr/bin/env node
/**
 * gallery-bot.js — Kotev Tzfoni Gallery Bot (v2 — inline buttons)
 *
 * Flow:
 *   /start or tap "פרויקט חדש"  → ask for name
 *   Send name as text            → create project, show upload instructions
 *   Send photos                  → add to project
 *   Tap "סיום ועדכון אתר"       → finalize & push
 *   Tap "ניהול פרויקטים"        → list with delete buttons
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const BOT_TOKEN    = process.env.BOT_TOKEN;
const REPO_PATH    = process.env.REPO_PATH || path.resolve(__dirname, '..');
const ALLOWED_USERS = (process.env.ALLOWED_USERS || '').split(',').map(s => s.trim()).filter(Boolean);

if (!BOT_TOKEN) { console.error('Missing BOT_TOKEN'); process.exit(1); }

// ── State ──────────────────────────────────────────────────────────────────
// mode: null | 'awaiting_name' | 'uploading'
const sessions = {};

// ── Telegram helpers ────────────────────────────────────────────────────────
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
            res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({}); } });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Persistent bottom keyboard always shown
const persistentKeyboard = {
    keyboard: [[{ text: '🏠 תפריט ראשי' }]],
    resize_keyboard: true,
    persistent: true
};

function send(chatId, text, inline_markup) {
    return tgApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: inline_markup || persistentKeyboard
    });
}

function editMsg(chatId, msgId, text, reply_markup) {
    return tgApi('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', reply_markup });
}

function answerCallback(id, text) {
    return tgApi('answerCallbackQuery', { callback_query_id: id, text: text || '' });
}

function downloadFile(fileId) {
    return new Promise(async (resolve, reject) => {
        const info = await tgApi('getFile', { file_id: fileId });
        const filePath = info.result?.file_path;
        if (!filePath) return reject(new Error('No file path'));
        const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        https.get(url, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ buffer: Buffer.concat(chunks), ext: path.extname(filePath) || '.jpg' }));
        }).on('error', reject);
    });
}

// ── Gallery helpers ─────────────────────────────────────────────────────────
const galleryPath = path.join(REPO_PATH, 'assets', 'img', 'projects', 'gallery.json');

function loadGallery() {
    try { return JSON.parse(fs.readFileSync(galleryPath, 'utf8')); }
    catch { return []; }
}

function saveGallery(data) {
    fs.mkdirSync(path.dirname(galleryPath), { recursive: true });
    fs.writeFileSync(galleryPath, JSON.stringify(data, null, 2));
}

// ── Git push ─────────────────────────────────────────────────────────────────
function gitPush(message) {
    try {
        const env = Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0', HOME: process.env.HOME || '/home/nvsaarz' });
        const safeMsg = message.replace(/"/g, "'").replace(/\n/g, ' ');
        execSync(`git -C "${REPO_PATH}" add -A && git -C "${REPO_PATH}" commit -m "${safeMsg}" && git -C "${REPO_PATH}" push`, { stdio: 'pipe', env });
        return true;
    } catch(e) {
        console.error('Git push failed:', e.stderr?.toString() || e.message);
        return false;
    }
}

// ── Slug ─────────────────────────────────────────────────────────────────────
function toSlug(str) {
    return str.trim().replace(/\s+/g, '-').replace(/[^\w\u0590-\u05FF-]/g, '').slice(0, 40) + '-' + Date.now().toString().slice(-4);
}

// ── Main menu keyboard ────────────────────────────────────────────────────────
const mainMenu = {
    inline_keyboard: [
        [{ text: '📸 פרויקט חדש', callback_data: 'new_project' }],
        [{ text: '📂 ניהול פרויקטים', callback_data: 'manage' }]
    ]
};

function uploadingKeyboard(photoCount) {
    return {
        inline_keyboard: [
            [{ text: `✅ סיום ועדכון אתר (${photoCount} תמונות)`, callback_data: 'done' }],
            [{ text: '❌ בטל פרויקט', callback_data: 'cancel' }]
        ]
    };
}

// ── Handle messages ──────────────────────────────────────────────────────────
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id?.toString();
    const text   = msg.text || '';

    if (ALLOWED_USERS.length && !ALLOWED_USERS.includes(userId)) {
        return send(chatId, '⛔ אינך מורשה להשתמש בבוט זה.');
    }

    const session = sessions[chatId] || {};

    // Waiting for project name
    if (session.mode === 'awaiting_name') {
        if (!text.trim()) return send(chatId, '❓ שלח שם לפרויקט:');
        const name = text.trim();
        const slug = toSlug(name);
        const folder = path.join(REPO_PATH, 'assets', 'img', 'projects', slug);
        fs.mkdirSync(folder, { recursive: true });
        sessions[chatId] = { mode: 'uploading', projectName: name, slug, folder, photoCount: 0, date: new Date().toISOString().slice(0, 10) };
        return send(chatId,
            `✅ פרויקט: <b>${name}</b>\n\nשלח תמונות עכשיו.\nלחץ "סיום" כשתסיים.`,
            uploadingKeyboard(0)
        );
    }

    // Photo while uploading
    if (session.mode === 'uploading' && (msg.photo || msg.document)) {
        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document?.file_id;
        try {
            const { buffer, ext } = await downloadFile(fileId);
            session.photoCount++;
            const fileName = `${String(session.photoCount).padStart(3, '0')}${ext}`;
            fs.writeFileSync(path.join(session.folder, fileName), buffer);
            return send(chatId,
                `📸 <b>${session.photoCount} תמונות</b> התקבלו לפרויקט: ${session.projectName}\nשלח עוד תמונות או לחץ סיום.`,
                uploadingKeyboard(session.photoCount)
            );
        } catch(e) {
            return send(chatId, '❌ שגיאה בהורדת התמונה, נסה שוב.');
        }
    }

    // Photo without active session
    if (msg.photo || msg.document) {
        return send(chatId, '❓ קודם התחל פרויקט חדש:', mainMenu);
    }

    // /start or menu button or any text
    return send(chatId,
        '👋 ברוך הבא לבוט גלריה של <b>הקוטב הצפוני</b>!\n\nבחר פעולה:',
        mainMenu
    );
}

// ── Handle callback queries (button taps) ────────────────────────────────────
async function handleCallback(cb) {
    const chatId = cb.message?.chat?.id;
    const msgId  = cb.message?.message_id;
    const userId = cb.from?.id?.toString();
    const data   = cb.data;

    await answerCallback(cb.id);

    if (ALLOWED_USERS.length && !ALLOWED_USERS.includes(userId)) return;

    const session = sessions[chatId] || {};

    // ── New project ──
    if (data === 'new_project') {
        sessions[chatId] = { mode: 'awaiting_name' };
        return editMsg(chatId, msgId, '📝 מה שם הפרויקט החדש?\n\nשלח הודעה עם השם:');
    }

    // ── Done ──
    if (data === 'done') {
        if (session.mode !== 'uploading') {
            return send(chatId, '❓ אין פרויקט פעיל.', mainMenu);
        }
        if (session.photoCount === 0) {
            return send(chatId, '❓ לא נשלחו תמונות עדיין. שלח לפחות תמונה אחת.', uploadingKeyboard(0));
        }

        await editMsg(chatId, msgId, `⏳ מעלה ${session.photoCount} תמונות ומעדכן את האתר...`);

        const photos = fs.readdirSync(session.folder)
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .sort();

        const gallery = loadGallery().filter(p => p.slug !== session.slug);
        const entry = {
            name:   session.projectName,
            slug:   session.slug,
            date:   session.date,
            cover:  `projects/${session.slug}/${photos[0]}`,
            photos: photos.map(f => `projects/${session.slug}/${f}`)
        };
        gallery.unshift(entry);
        saveGallery(gallery);

        const ok = gitPush(`gallery: add "${session.projectName}" (${photos.length} photos)`);
        delete sessions[chatId];

        if (ok) {
            return send(chatId,
                `🚀 <b>הועלה בהצלחה!</b>\n\n📁 פרויקט: ${entry.name}\n📸 תמונות: ${photos.length}\n🌐 האתר יתעדכן תוך ~30 שניות.`,
                mainMenu
            );
        } else {
            return send(chatId, '⚠️ הועלה מקומית אבל הייתה בעיה עם GitHub. נסה שוב.', mainMenu);
        }
    }

    // ── Cancel ──
    if (data === 'cancel') {
        if (session.folder && fs.existsSync(session.folder)) {
            fs.rmSync(session.folder, { recursive: true, force: true });
        }
        delete sessions[chatId];
        return editMsg(chatId, msgId, '❌ פרויקט בוטל.', mainMenu);
    }

    // ── Manage projects ──
    if (data === 'manage') {
        const gallery = loadGallery();
        if (!gallery.length) {
            return editMsg(chatId, msgId, '📂 אין פרויקטים עדיין.', mainMenu);
        }
        const buttons = gallery.slice(0, 10).map(p => ([{
            text: `🗑 ${p.name} (${p.photos.length} תמונות)`,
            callback_data: `delete:${p.slug}`
        }]));
        buttons.push([{ text: '🔙 חזרה', callback_data: 'back' }]);
        return editMsg(chatId, msgId,
            `📂 <b>פרויקטים קיימים:</b>\n\nלחץ על פרויקט למחיקתו:`,
            { inline_keyboard: buttons }
        );
    }

    // ── Back ──
    if (data === 'back') {
        return editMsg(chatId, msgId, 'בחר פעולה:', mainMenu);
    }

    // ── Delete project ──
    if (data.startsWith('delete:')) {
        const slug = data.slice(7);
        const gallery = loadGallery();
        const project = gallery.find(p => p.slug === slug);
        if (!project) return send(chatId, '❓ פרויקט לא נמצא.', mainMenu);

        // Confirm button
        return editMsg(chatId, msgId,
            `⚠️ למחוק את הפרויקט <b>${project.name}</b>?\n(${project.photos.length} תמונות יימחקו לצמיתות)`,
            { inline_keyboard: [
                [{ text: '🗑 כן, מחק', callback_data: `confirm_delete:${slug}` }],
                [{ text: '🔙 ביטול', callback_data: 'manage' }]
            ]}
        );
    }

    // ── Confirm delete ──
    if (data.startsWith('confirm_delete:')) {
        const slug = data.slice(15);
        const gallery = loadGallery();
        const project = gallery.find(p => p.slug === slug);
        if (!project) return send(chatId, '❓ פרויקט לא נמצא.', mainMenu);

        // Delete folder
        const folder = path.join(REPO_PATH, 'assets', 'img', 'projects', slug);
        if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });

        // Update gallery.json
        const newGallery = gallery.filter(p => p.slug !== slug);
        saveGallery(newGallery);

        await editMsg(chatId, msgId, `⏳ מוחק את "${project.name}"...`);

        const ok = gitPush(`gallery: delete project "${project.name}"`);

        if (ok) {
            return send(chatId,
                `✅ הפרויקט <b>${project.name}</b> נמחק.\n🌐 האתר יתעדכן תוך ~30 שניות.`,
                mainMenu
            );
        } else {
            return send(chatId, '⚠️ נמחק מקומית אבל הייתה בעיה עם GitHub.', mainMenu);
        }
    }
}

// ── Long polling ──────────────────────────────────────────────────────────────
let offset = 0;
async function poll() {
    try {
        const res = await tgApi('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
        if (res.ok && res.result?.length) {
            for (const update of res.result) {
                offset = update.update_id + 1;
                if (update.message)        handleMessage(update.message).catch(console.error);
                if (update.callback_query) handleCallback(update.callback_query).catch(console.error);
            }
        }
    } catch(e) {
        console.error('Poll error:', e.message);
    }
    setTimeout(poll, 1000);
}

console.log('🤖 Kotev Tzfoni Gallery Bot v2 starting...');
poll();

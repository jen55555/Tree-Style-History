import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const CHROME_DIR = path.join(__dirname, 'chrome');
const WEB_DIR = path.join(__dirname, 'web');

// Preload locale catalogues
let enMessages = {};
let zhMessages = {};
let thMessages = {};
try {
    enMessages = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, '_locales/en/messages.json'), 'utf8'));
    zhMessages = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, '_locales/zh_CN/messages.json'), 'utf8'));
    thMessages = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, '_locales/th/messages.json'), 'utf8'));
} catch (err) {
    console.warn('[Server] Could not preload messages:', err.message);
}

// Serve firebase config
app.get('/firebase-applet-config.json', (req, res) => {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        res.setHeader('Content-Type', 'application/json');
        res.sendFile(configPath);
    } else {
        res.status(404).json({ error: 'Config not found' });
    }
});

// Serve chrome-polyfill.js with bundled translations
app.get('/chrome-polyfill.js', (req, res) => {
    try {
        const polyfillCode = fs.readFileSync(path.join(WEB_DIR, 'chrome-polyfill.js'), 'utf8');
        const injection = `
window.__TSH_MESSAGES__ = {
    en: ${JSON.stringify(enMessages)},
    zh_CN: ${JSON.stringify(zhMessages)},
    th: ${JSON.stringify(thMessages)}
};
`;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(injection + polyfillCode);
    } catch (err) {
        console.error('[Server] Error serving chrome-polyfill.js:', err);
        res.status(500).send('console.error("Polyfill failed to load");');
    }
});

// Root index.html
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.redirect('/history2.html');
    }
});

// Intercept HTML pages from chrome/ and inject polyfill
app.use((req, res, next) => {
    if (!req.path.endsWith('.html')) {
        return next();
    }
    let cleanPath = req.path;
    if (cleanPath.startsWith('/chrome/')) {
        cleanPath = cleanPath.replace('/chrome/', '/');
    }
    const filename = cleanPath.slice(1);
    const filePath = path.join(CHROME_DIR, filename);

    if (fs.existsSync(filePath)) {
        try {
            let html = fs.readFileSync(filePath, 'utf8');
            // Inject polyfill before other scripts
            if (!html.includes('/chrome-polyfill.js')) {
                html = html.replace('<head>', '<head>\n    <script src="/chrome-polyfill.js"></script>');
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        } catch (err) {
            console.error(`[Server] Error reading ${filePath}:`, err);
        }
    }
    next();
});

// Serve static assets from chrome directory (CSS, JS, images, icons, locales)
app.use(express.static(CHROME_DIR));

// Fallback for root assets or web assets
app.use(express.static(__dirname));

app.listen(PORT, HOST, () => {
    console.log(`[Server] Tree Style History web viewer running at http://${HOST}:${PORT}`);
});

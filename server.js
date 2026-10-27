require('dotenv').config({ path: '.env.local' });

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initStorage, getUploadedImage } = require('./src/helpers/storage');
const { authenticate, adminGuard } = require('./src/middleware/authenticate');
const { getJwtSecret } = require('./src/helpers/secret');

const app = express();
const PORT = process.env.PORT || 3000;

// CSP is scoped to what the app actually loads: chart.js/jspdf/html2canvas/sortablejs
// from their CDNs, Google Fonts stylesheet + font files, plus 'unsafe-inline' for
// style-src since the frontend relies heavily on inline style="" attributes.
// script-src has no 'unsafe-inline' — that's the part that actually blocks
// injected <script>/onXXX handlers. upgradeInsecureRequests is disabled because
// this app is served over plain HTTP here — with it on, the browser force-upgrades
// every subresource request (css/js/fonts/CDN) to https, which has nothing
// listening and silently kills every asset load.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: null
    }
  }
}));

app.use(express.json({ limit: '50mb' }));

// --- Static Assets ---
// Only the specific files/dirs the frontend actually needs are served. Do NOT use
// express.static(__dirname) here — that previously exposed data/ (users.json with
// password hashes, every user's medical records, uploaded images) and the app's own
// source (server.js, package.json) to anyone, unauthenticated.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Private images are served only to their owning account. The frontend fetches them
// with the same Bearer token used for API requests.
app.get('/uploads/:userId/:filename', authenticate, async (req, res, next) => {
  const { userId, filename } = req.params;
  if (
    userId !== req.userId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|gif|webp)$/i.test(filename)
  ) {
    return res.sendStatus(404);
  }
  try {
    const image = await getUploadedImage(userId, filename);
    if (!image) return res.sendStatus(404);
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(image.data);
  } catch (err) {
    next(err);
  }
});

// --- Rate Limiting ---
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { error: '操作太频繁，请5分钟后再试' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: '请求太频繁，请稍后再试' }
});

app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// --- Init Storage ---
const storageReady = initStorage().then(() => getJwtSecret());

// --- Public Routes (no auth required) ---
require('./src/routes/auth')(app);

// --- Authentication Middleware ---
app.use(authenticate);

// --- Protected Routes ---
require('./src/routes/family')(app);
require('./src/routes/records')(app);
require('./src/routes/upload')(app);
require('./src/routes/stats')(app);
require('./src/routes/reminders')(app);
require('./src/routes/metrics')(app);
require('./src/routes/medications')(app);
require('./src/routes/import')(app);

// --- Admin Guard for /api/admin routes ---
app.use('/api/admin', adminGuard);

require('./src/routes/admin')(app);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器错误，请稍后重试' });
});

storageReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`健康记服务已启动: http://localhost:${PORT}`);
      console.log('请注册账号后使用');
    });
  })
  .catch(err => {
    console.error('[Storage] 初始化失败:', err);
    process.exit(1);
  });


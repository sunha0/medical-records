const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initStorage } = require('./src/helpers/storage');
const { authenticate, adminGuard } = require('./src/middleware/authenticate');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Uploaded images are still served without auth (plain <img src> tags can't send an
// Authorization header), so unguessable UUID filenames are the only thing standing
// between a URL and the file — nosniff stops browsers from executing anything other
// than the declared image content-type even if that's ever wrong.
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

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
initStorage();

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

app.listen(PORT, () => {
  console.log(`健康记服务已启动: http://localhost:${PORT}`);
  console.log('请注册账号后使用');
});


const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initStorage } = require('./src/helpers/storage');
const { authenticate } = require('./src/middleware/authenticate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

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
app.use('/api/admin', (req, res, next) => {
  if (req.username !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
});

require('./src/routes/admin')(app);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.message && err.message.includes('只允许上传图片')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器错误，请稍后重试' });
});

app.listen(PORT, () => {
  console.log(`健康记服务已启动: http://localhost:${PORT}`);
  console.log('请注册账号后使用');
});

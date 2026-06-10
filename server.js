const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'yicheng-medical-secret-2024';
const JWT_EXPIRES = '7d';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Storage Setup ---
async function ensureDir(dir) {
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function initStorage() {
  await ensureDir(DATA_DIR);
  await ensureDir(UPLOADS_DIR);
  if (!fsSync.existsSync(USERS_FILE)) {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  } else {
    // Migrate existing users to have familyMembers
    const users = await getUsers();
    let needsSave = false;
    for (const user of users) {
      if (!user.familyMembers || user.familyMembers.length === 0) {
        user.settings = user.settings || { theme: 'light', activeMemberId: null };
        user.familyMembers = [
          { memberId: user.userId, name: user.username, relation: '自己', createdAt: user.createdAt || Date.now() }
        ];
        needsSave = true;
      }
    }
    if (needsSave) {
      await saveUsers(users);
      console.log('[Storage] Migrated existing users with default family member');
    }
  }
}

initStorage();

// --- Multer Config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
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

// --- JWT Middleware ---
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的登录凭证' });
  }
}

// --- User Storage Helpers ---
async function getUsers() {
  const content = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(content);
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function getUserDir(userId) {
  const dir = path.join(DATA_DIR, userId);
  await ensureDir(dir);
  return dir;
}

async function getUserRecords(userId) {
  const dir = await getUserDir(userId);
  const file = path.join(dir, 'records.json');
  if (!fsSync.existsSync(file)) {
    await fs.writeFile(file, '[]', 'utf8');
  }
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function saveUserRecords(userId, records) {
  const dir = await getUserDir(userId);
  await fs.writeFile(path.join(dir, 'records.json'), JSON.stringify(records, null, 2), 'utf8');
}

// --- Image Migration (from old base64 format) ---
async function migrateBase64Images(records, userId) {
  const migrated = [];
  for (const record of records) {
    if (record.images && record.images.length > 0) {
      const newImages = [];
      for (const img of record.images) {
        if (img.url && img.url.startsWith('data:')) {
          const base64Data = img.url.split(',')[1];
          const mimeMatch = img.url.match(/data:([^;]+)/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const ext = mime.split('/')[1].replace('jpeg', 'jpg');
          const filename = `${uuidv4()}.${ext}`;
          const filepath = path.join(UPLOADS_DIR, filename);
          await fs.writeFile(filepath, base64Data, 'base64');
          newImages.push({ id: img.id || uuidv4(), url: `/uploads/${filename}`, tags: img.tags || [] });
        } else {
          newImages.push(img);
        }
      }
      migrated.push({ ...record, images: newImages });
    } else {
      migrated.push(record);
    }
  }
  return migrated;
}

// --- Routes ---

// Register
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: '用户名需3-30位' });
    }
    if (password.length < 6 || password.length > 50) {
      return res.status(400).json({ error: '密码需6-50位' });
    }

    const users = await getUsers();
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    users.push({
      userId,
      username,
      password: hashed,
      createdAt: Date.now(),
      settings: { theme: 'light', activeMemberId: null },
      familyMembers: [
        { memberId: userId, name: username, relation: '自己', createdAt: Date.now() }
      ]
    });
    await saveUsers(users);

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ success: true, token, userId, username });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// Login
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[SERVER] Login attempt:', username, 'body:', JSON.stringify(req.body));
    if (!username || !password) {
      console.log('[SERVER] Missing fields');
      return res.status(400).json({ error: '请填写用户名和密码' });
    }

    const users = await getUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log('[SERVER] User not found');
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('[SERVER] Password valid:', valid);
    if (!valid) {
      console.log('[SERVER] Wrong password');
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.userId, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ success: true, token, userId: user.userId, username: user.username });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// Change Password
app.post('/api/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请填写所有字段' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6位' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const valid = await bcrypt.compare(oldPassword, users[userIndex].password);
    if (!valid) {
      return res.status(401).json({ error: '原密码错误' });
    }

    users[userIndex].password = await bcrypt.hash(newPassword, 10);
    await saveUsers(users);
    res.json({ success: true });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// Get Records (with pagination & search)
app.get('/api/records', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', timeFilter = 'all', memberId = '',
            dateFrom = '', dateTo = '', costMin = '', costMax = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    let records = await getUserRecords(req.userId);

    // Member filter
    if (memberId) {
      records = records.filter(r => r.memberId === memberId);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        `${r.patient} ${r.hospital} ${r.department} ${r.diagnosis} ${r.doctor}`.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateFrom) {
      records = records.filter(r => r.date >= dateFrom);
    }
    if (dateTo) {
      records = records.filter(r => r.date <= dateTo);
    }

    // Cost range filter
    if (costMin) {
      records = records.filter(r => (r.cost || 0) >= parseFloat(costMin));
    }
    if (costMax) {
      records = records.filter(r => (r.cost || 0) <= parseFloat(costMax));
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      records = records.filter(r => {
        const d = new Date(r.date);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        switch (timeFilter) {
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case 'quarter': return diffDays <= 90;
          case 'halfyear': return diffDays <= 180;
          case 'year': return diffDays <= 365;
          default: return true;
        }
      });
    }

    // Sort by date desc
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const total = records.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = records.slice(start, start + limitNum);

    res.json({
      records: paginated,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    console.error('读取记录失败:', err);
    res.status(500).json({ error: '读取数据失败' });
  }
});

// Add Record
app.post('/api/records', authenticate, async (req, res) => {
  try {
    const record = req.body;
    if (!record.patient || !record.date || !record.hospital || !record.department || !record.diagnosis) {
      return res.status(400).json({ error: '请填写必填项' });
    }

    const records = await getUserRecords(req.userId);
    const newRecord = {
      id: `rec_${uuidv4()}`,
      ...record,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    records.unshift(newRecord);
    await saveUserRecords(req.userId, records);
    res.json({ success: true, record: newRecord });
  } catch (err) {
    console.error('保存记录失败:', err);
    res.status(500).json({ error: '保存失败' });
  }
});

// Update Record
app.put('/api/records/:id', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    const index = records.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '记录不存在' });
    }
    records[index] = { ...records[index], ...req.body, id: req.params.id, updatedAt: Date.now() };
    await saveUserRecords(req.userId, records);
    res.json({ success: true, record: records[index] });
  } catch (err) {
    console.error('更新记录失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// Delete Record
app.delete('/api/records/:id', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    const record = records.find(r => r.id === req.params.id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // Delete associated images
    if (record.images && record.images.length > 0) {
      for (const img of record.images) {
        if (img.url && img.url.startsWith('/uploads/')) {
          const filename = path.basename(img.url);
          const filepath = path.join(UPLOADS_DIR, filename);
          if (fsSync.existsSync(filepath)) {
            await fs.unlink(filepath);
          }
        }
      }
    }

    const filtered = records.filter(r => r.id !== req.params.id);
    await saveUserRecords(req.userId, filtered);
    res.json({ success: true });
  } catch (err) {
    console.error('删除记录失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// Upload Images
app.post('/api/upload', authenticate, upload.array('images', 9), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传图片' });
    }
    const images = req.files.map(f => ({
      id: uuidv4(),
      url: `/uploads/${f.filename}`,
      originalName: f.originalname,
      size: f.size,
      tags: []
    }));
    res.json({ success: true, images });
  } catch (err) {
    console.error('上传失败:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

// Export Records
app.get('/api/export', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    res.setHeader('Content-Disposition', `attachment; filename=medical_records_${req.username}_${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, username: req.username, exportedAt: new Date().toISOString(), records });
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// Get Stats
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    const now = new Date();

    const thisMonth = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const lastYear = records.filter(r => {
      const d = new Date(r.date);
      return (now - d) / (1000 * 60 * 60 * 24) <= 365;
    });

    const depts = {};
    records.forEach(r => { depts[r.department] = (depts[r.department] || 0) + 1; });
    const sortedDepts = Object.entries(depts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthRecords = records.filter(r => {
        const rd = new Date(r.date);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      });
      months.push({ label: `${d.getMonth() + 1}月`, count: monthRecords.length, cost: monthRecords.reduce((s, r) => s + (r.cost || 0), 0) });
    }

    res.json({
      thisMonth: { count: thisMonth.length, cost: thisMonth.reduce((s, r) => s + (r.cost || 0), 0) },
      lastYear: { count: lastYear.length, cost: lastYear.reduce((s, r) => s + (r.cost || 0), 0) },
      departments: sortedDepts,
      monthlyFrequency: months
    });
  } catch (err) {
    console.error('统计失败:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// --- Admin Routes ---
app.get('/api/admin/users', authenticate, async (req, res) => {
  try {
    if (req.username !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const users = await getUsers();
    const userList = await Promise.all(users.map(async (u) => {
      const records = await getUserRecords(u.userId);
      return {
        userId: u.userId,
        username: u.username,
        recordCount: records.length,
        createdAt: u.createdAt || null
      };
    }));

    res.json({ success: true, users: userList });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

app.delete('/api/admin/users/:userId', authenticate, async (req, res) => {
  try {
    if (req.username !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({ error: '不能删除当前登录账号' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const username = users[userIndex].username;
    users.splice(userIndex, 1);
    await saveUsers(users);

    // Delete user data directory
    const userDir = path.join(DATA_DIR, userId);
    if (fsSync.existsSync(userDir)) {
      await fs.rm(userDir, { recursive: true, force: true });
    }

    res.json({ success: true, message: `用户 ${username} 已删除` });
  } catch (err) {
    console.error('删除用户失败:', err);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// --- Family Members Routes ---
app.get('/api/family/members', authenticate, async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u.userId === req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      success: true,
      members: user.familyMembers || [],
      activeMemberId: user.settings?.activeMemberId || null
    });
  } catch (err) {
    console.error('获取家庭成员失败:', err);
    res.status(500).json({ error: '获取家庭成员失败' });
  }
});

app.post('/api/family/members', authenticate, async (req, res) => {
  try {
    const { name, relation } = req.body;
    if (!name || !relation) {
      return res.status(400).json({ error: '请填写姓名和关系' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const memberId = uuidv4();
    const newMember = {
      memberId,
      name,
      relation,
      createdAt: Date.now()
    };

    if (!users[userIndex].familyMembers) {
      users[userIndex].familyMembers = [];
    }
    users[userIndex].familyMembers.push(newMember);
    await saveUsers(users);

    res.json({ success: true, member: newMember });
  } catch (err) {
    console.error('添加家庭成员失败:', err);
    res.status(500).json({ error: '添加家庭成员失败' });
  }
});

app.put('/api/family/members/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relation } = req.body;

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const members = users[userIndex].familyMembers || [];
    const memberIndex = members.findIndex(m => m.memberId === id);
    if (memberIndex === -1) {
      return res.status(404).json({ error: '成员不存在' });
    }

    if (name) members[memberIndex].name = name;
    if (relation) members[memberIndex].relation = relation;
    users[userIndex].familyMembers = members;
    await saveUsers(users);

    res.json({ success: true, member: members[memberIndex] });
  } catch (err) {
    console.error('更新家庭成员失败:', err);
    res.status(500).json({ error: '更新家庭成员失败' });
  }
});

app.delete('/api/family/members/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const members = users[userIndex].familyMembers || [];
    const memberIndex = members.findIndex(m => m.memberId === id);
    if (memberIndex === -1) {
      return res.status(404).json({ error: '成员不存在' });
    }

    // Don't allow deleting self
    if (members[memberIndex].relation === '自己') {
      return res.status(400).json({ error: '不能删除自己' });
    }

    members.splice(memberIndex, 1);
    users[userIndex].familyMembers = members;

    // If deleted member was active, reset to null
    if (users[userIndex].settings?.activeMemberId === id) {
      users[userIndex].settings.activeMemberId = null;
    }

    await saveUsers(users);
    res.json({ success: true });
  } catch (err) {
    console.error('删除家庭成员失败:', err);
    res.status(500).json({ error: '删除家庭成员失败' });
  }
});

app.post('/api/family/switch', authenticate, async (req, res) => {
  try {
    const { memberId } = req.body;

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const members = users[userIndex].familyMembers || [];
    const memberExists = members.some(m => m.memberId === memberId);
    if (!memberExists) {
      return res.status(404).json({ error: '成员不存在' });
    }

    if (!users[userIndex].settings) {
      users[userIndex].settings = {};
    }
    users[userIndex].settings.activeMemberId = memberId;
    await saveUsers(users);

    res.json({ success: true, activeMemberId: memberId });
  } catch (err) {
    console.error('切换家庭成员失败:', err);
    res.status(500).json({ error: '切换家庭成员失败' });
  }
});

// Reorder family members
app.put('/api/family/reorder', authenticate, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: '无效的请求参数' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.userId === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const members = users[userIndex].familyMembers || [];
    const reordered = [];
    orderedIds.forEach((id, index) => {
      const member = members.find(m => m.memberId === id);
      if (member) {
        member.order = index;
        reordered.push(member);
      }
    });

    users[userIndex].familyMembers = reordered;
    await saveUsers(users);

    res.json({ success: true, members: reordered });
  } catch (err) {
    console.error('更新成员顺序失败:', err);
    res.status(500).json({ error: '更新成员顺序失败' });
  }
});

// --- Reminders Routes ---
app.get('/api/reminders', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    const reminders = records
      .filter(r => r.reminder?.enabled && r.reminder?.followUpDate)
      .map(r => ({
        recordId: r.id,
        patient: r.patient,
        hospital: r.hospital,
        department: r.department,
        diagnosis: r.diagnosis,
        followUpDate: r.reminder.followUpDate,
        note: r.reminder.note || '',
        notified: r.reminder.notified || false
      }))
      .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

    res.json({ success: true, reminders });
  } catch (err) {
    console.error('获取提醒失败:', err);
    res.status(500).json({ error: '获取提醒失败' });
  }
});

app.get('/api/reminders/due', authenticate, async (req, res) => {
  try {
    const records = await getUserRecords(req.userId);
    const today = new Date().toISOString().split('T')[0];
    const dueReminders = records
      .filter(r => {
        if (!r.reminder?.enabled || !r.reminder?.followUpDate) return false;
        if (r.reminder.notified) return false;
        return r.reminder.followUpDate <= today;
      })
      .map(r => ({
        recordId: r.id,
        patient: r.patient,
        hospital: r.hospital,
        department: r.department,
        diagnosis: r.diagnosis,
        followUpDate: r.reminder.followUpDate,
        note: r.reminder.note || ''
      }));

    res.json({ success: true, dueReminders, count: dueReminders.length });
  } catch (err) {
    console.error('获取到期提醒失败:', err);
    res.status(500).json({ error: '获取到期提醒失败' });
  }
});

app.put('/api/records/:id/reminder', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, followUpDate, note } = req.body;

    const records = await getUserRecords(req.userId);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '记录不存在' });
    }

    if (enabled && followUpDate) {
      records[index].reminder = {
        enabled: true,
        followUpDate,
        note: note || '',
        notified: false
      };
    } else {
      records[index].reminder = { enabled: false };
    }

    await saveUserRecords(req.userId, records);
    res.json({ success: true, reminder: records[index].reminder });
  } catch (err) {
    console.error('设置提醒失败:', err);
    res.status(500).json({ error: '设置提醒失败' });
  }
});

app.delete('/api/records/:id/reminder', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const records = await getUserRecords(req.userId);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '记录不存在' });
    }

    records[index].reminder = { enabled: false };
    await saveUserRecords(req.userId, records);
    res.json({ success: true });
  } catch (err) {
    console.error('删除提醒失败:', err);
    res.status(500).json({ error: '删除提醒失败' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.message && err.message.includes('只允许上传图片')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器错误，请稍后重试' });
});

app.listen(PORT, () => {
  console.log(`健康记服务已启动: http://localhost:${PORT}`);
  console.log(`请注册账号后使用 (npm start)`);
});
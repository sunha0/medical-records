const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'records.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// 注册接口
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请填写用户名和密码' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: '用户名至少3位' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    // 检查用户名是否已存在
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 添加新用户
    users.push({
      username,
      password: hashPassword(password)
    });

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === username && u.password === hashPassword(password));
    if (user) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 修改密码接口
app.post('/api/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer authenticated') {
    return res.status(401).json({ error: '未授权' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    // 从 localStorage 获取当前用户名
    const currentUsername = req.headers['x-username'];
    const userIndex = users.findIndex(u => u.username === currentUsername);

    if (userIndex === -1) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 验证旧密码
    if (users[userIndex].password !== hashPassword(oldPassword)) {
      return res.status(401).json({ error: '原密码错误' });
    }

    // 更新密码
    users[userIndex].password = hashPassword(newPassword);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '修改密码失败' });
  }
});

app.get('/api/records', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer authenticated') {
    return res.status(401).json({ error: '未授权' });
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.post('/api/records', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer authenticated') {
    return res.status(401).json({ error: '未授权' });
  }
  try {
    const records = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '保存数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`医程服务已启动: http://localhost:${PORT}`);
  console.log(`请注册账号后使用`);
});

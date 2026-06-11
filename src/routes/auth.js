const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUsers, saveUsers } = require('../helpers/storage');

const JWT_EXPIRES = '7d';

module.exports = function(app) {
  // Register
  app.post('/api/register', async (req, res) => {
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
      const userId = require('uuid').v4();
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

      const token = jwt.sign({ userId, username }, process.env.JWT_SECRET || 'yicheng-medical-scrt-2024', { expiresIn: JWT_EXPIRES });
      res.json({ success: true, token, userId, username });
    } catch (err) {
      console.error('注册失败:', err);
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: '请填写用户名和密码' });
      }

      const users = await getUsers();
      const user = users.find(u => u.username === username);
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = jwt.sign({ userId: user.userId, username: user.username }, process.env.JWT_SECRET || 'yicheng-medical-scrt-2024', { expiresIn: JWT_EXPIRES });
      res.json({ success: true, token, userId: user.userId, username: user.username });
    } catch (err) {
      console.error('登录失败:', err);
      res.status(500).json({ error: '登录失败，请稍后重试' });
    }
  });

  // Change password
  app.post('/api/change-password', async (req, res) => {
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
};

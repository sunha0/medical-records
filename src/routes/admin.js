const { getUsers, saveUsers, getUserRecords } = require('../helpers/storage');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { DATA_DIR } = require('../helpers/storage');

module.exports = function(app) {
  // List all users (admin only)
  app.get('/api/admin/users', async (req, res) => {
    try {
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

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
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
};

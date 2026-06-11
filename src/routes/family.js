const { getUsers } = require('../helpers/storage');

module.exports = function(app) {
  // Get family members
  app.get('/api/family/members', async (req, res) => {
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

  // Add family member
  app.post('/api/family/members', async (req, res) => {
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

      const memberId = require('uuid').v4();
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
      await require('../helpers/storage').saveUsers(users);

      res.json({ success: true, member: newMember });
    } catch (err) {
      console.error('添加家庭成员失败:', err);
      res.status(500).json({ error: '添加家庭成员失败' });
    }
  });

  // Update family member
  app.put('/api/family/members/:id', async (req, res) => {
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
      await require('../helpers/storage').saveUsers(users);

      res.json({ success: true, member: members[memberIndex] });
    } catch (err) {
      console.error('更新家庭成员失败:', err);
      res.status(500).json({ error: '更新家庭成员失败' });
    }
  });

  // Delete family member
  app.delete('/api/family/members/:id', async (req, res) => {
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

      await require('../helpers/storage').saveUsers(users);
      res.json({ success: true });
    } catch (err) {
      console.error('删除家庭成员失败:', err);
      res.status(500).json({ error: '删除家庭成员失败' });
    }
  });

  // Switch active family member
  app.post('/api/family/switch', async (req, res) => {
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
      await require('../helpers/storage').saveUsers(users);

      res.json({ success: true, activeMemberId: memberId });
    } catch (err) {
      console.error('切换家庭成员失败:', err);
      res.status(500).json({ error: '切换家庭成员失败' });
    }
  });

  // Reorder family members
  app.put('/api/family/reorder', async (req, res) => {
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
      await require('../helpers/storage').saveUsers(users);

      res.json({ success: true, members: reordered });
    } catch (err) {
      console.error('更新成员顺序失败:', err);
      res.status(500).json({ error: '更新成员顺序失败' });
    }
  });
};

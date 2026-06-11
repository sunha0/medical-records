const { getUsers, getUserRecords, saveUserRecords } = require('../helpers/storage');

module.exports = function(app) {
  // Get all reminders
  app.get('/api/reminders', async (req, res) => {
    try {
      const records = await getUserRecords(req.userId);

      const users = await getUsers();
      const user = users.find(u => u.userId === req.userId);
      const activeMemberId = user?.settings?.activeMemberId;

      const reminders = records
        .filter(r => {
          if (!r.reminder?.enabled || !r.reminder?.followUpDate) return false;
          if (activeMemberId) {
            return r.memberId === activeMemberId;
          }
          return true;
        })
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

  // Get due reminders
  app.get('/api/reminders/due', async (req, res) => {
    try {
      const records = await getUserRecords(req.userId);

      const users = await getUsers();
      const user = users.find(u => u.userId === req.userId);
      const activeMemberId = user?.settings?.activeMemberId;

      const today = new Date().toISOString().split('T')[0];
      const dueReminders = records
        .filter(r => {
          if (!r.reminder?.enabled || !r.reminder?.followUpDate) return false;
          if (r.reminder.notified) return false;
          if (r.reminder.followUpDate > today) return false;
          if (activeMemberId) {
            return r.memberId === activeMemberId;
          }
          return true;
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

  // Update reminder
  app.put('/api/records/:id/reminder', async (req, res) => {
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

  // Delete reminder
  app.delete('/api/records/:id/reminder', async (req, res) => {
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
};

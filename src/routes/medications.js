const { getUserMedications, saveUserMedications } = require('../helpers/storage');
const { v4: uuidv4 } = require('uuid');

module.exports = function(app) {
  // Get all medications
  app.get('/api/medications', async (req, res) => {
    try {
      const { memberId } = req.query;
      let medications = await getUserMedications(req.userId);

      // Filter by memberId
      if (memberId) {
        medications = medications.filter(m => m.memberId === memberId);
      } else {
        // Apply activeMemberId from settings
        try {
          const users = require('../helpers/storage').getUsers;
          const allUsers = await users();
          const user = allUsers.find(u => u.userId === req.userId);
          const activeMemberId = user?.settings?.activeMemberId;
          if (activeMemberId) {
            medications = medications.filter(m => m.memberId === activeMemberId);
          }
        } catch (e) {
          // Ignore filter errors
        }
      }

      // Sort by createdAt desc
      medications.sort((a, b) => b.createdAt - a.createdAt);

      res.json({ medications });
    } catch (err) {
      console.error('读取用药记录失败:', err);
      res.status(500).json({ error: '读取数据失败' });
    }
  });

  // Add medication
  app.post('/api/medications', async (req, res) => {
    try {
      const { name, dosage, unit, timesPerDay, timeSlots, startDate, endDate, notes, memberId } = req.body;

      if (!name || !dosage || !unit) {
        return res.status(400).json({ error: '请填写药品名称、用量和单位' });
      }

      const medications = await getUserMedications(req.userId);
      const newMedication = {
        id: `med_${uuidv4()}`,
        name,
        dosage,
        unit,
        frequency: timesPerDay ? `每日${timesPerDay}次` : '',
        timesPerDay: timesPerDay || 1,
        timeSlots: timeSlots || [],
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || '',
        notes: notes || '',
        memberId: memberId || '',
        active: true,
        createdAt: Date.now()
      };
      medications.unshift(newMedication);
      await saveUserMedications(req.userId, medications);
      res.json({ success: true, medication: newMedication });
    } catch (err) {
      console.error('保存用药记录失败:', err);
      res.status(500).json({ error: '保存失败' });
    }
  });

  // Update medication
  app.put('/api/medications/:id', async (req, res) => {
    try {
      const medications = await getUserMedications(req.userId);
      const index = medications.findIndex(m => m.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '记录不存在' });
      }
      const updated = { ...medications[index], ...req.body, id: req.params.id };
      medications[index] = updated;
      await saveUserMedications(req.userId, medications);
      res.json({ success: true, medication: updated });
    } catch (err) {
      console.error('更新用药记录失败:', err);
      res.status(500).json({ error: '更新失败' });
    }
  });

  // Toggle medication active status
  app.patch('/api/medications/:id/toggle', async (req, res) => {
    try {
      const medications = await getUserMedications(req.userId);
      const medication = medications.find(m => m.id === req.params.id);
      if (!medication) {
        return res.status(404).json({ error: '记录不存在' });
      }
      medication.active = !medication.active;
      await saveUserMedications(req.userId, medications);
      res.json({ success: true, active: medication.active });
    } catch (err) {
      console.error('切换用药状态失败:', err);
      res.status(500).json({ error: '操作失败' });
    }
  });

  // Delete medication
  app.delete('/api/medications/:id', async (req, res) => {
    try {
      const medications = await getUserMedications(req.userId);
      const index = medications.findIndex(m => m.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '记录不存在' });
      }
      medications.splice(index, 1);
      await saveUserMedications(req.userId, medications);
      res.json({ success: true });
    } catch (err) {
      console.error('删除用药记录失败:', err);
      res.status(500).json({ error: '删除失败' });
    }
  });
};

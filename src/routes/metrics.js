const { getUserMetrics, saveUserMetrics } = require('../helpers/storage');
const { v4: uuidv4 } = require('uuid');

module.exports = function(app) {
  // Get health metrics (optional type filter)
  app.get('/api/metrics', async (req, res) => {
    try {
      const { type, memberId, limit = 100 } = req.query;
      let metrics = await getUserMetrics(req.userId);

      // Filter by memberId
      if (memberId) {
        metrics = metrics.filter(m => m.memberId === memberId);
      } else {
        // Apply activeMemberId from settings
        try {
          const users = require('../helpers/storage').getUsers;
          const allUsers = await users();
          const user = allUsers.find(u => u.userId === req.userId);
          const activeMemberId = user?.settings?.activeMemberId;
          if (activeMemberId) {
            metrics = metrics.filter(m => m.memberId === activeMemberId);
          }
        } catch (e) {
          // Ignore filter errors
        }
      }

      // Filter by type
      if (type) {
        metrics = metrics.filter(m => m.type === type);
      }

      // Sort by date desc
      metrics.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply limit
      const limited = metrics.slice(0, parseInt(limit));

      res.json({ metrics: limited, total: metrics.length });
    } catch (err) {
      console.error('读取健康指标失败:', err);
      res.status(500).json({ error: '读取数据失败' });
    }
  });

  // Add health metric
  app.post('/api/metrics', async (req, res) => {
    try {
      const { type, value, unit, date, notes, memberId } = req.body;

      if (!type || value === undefined || value === null) {
        return res.status(400).json({ error: '请填写必填项' });
      }

      const validTypes = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: '无效的指标类型' });
      }

      const metrics = await getUserMetrics(req.userId);
      const newMetric = {
        id: `met_${uuidv4()}`,
        type,
        value,
        unit: unit || getDefaultUnit(type),
        date: date || new Date().toISOString().slice(0, 10),
        notes: notes || '',
        memberId: memberId || '',
        createdAt: Date.now()
      };
      metrics.unshift(newMetric);
      await saveUserMetrics(req.userId, metrics);
      res.json({ success: true, metric: newMetric });
    } catch (err) {
      console.error('保存健康指标失败:', err);
      res.status(500).json({ error: '保存失败' });
    }
  });

  // Delete health metric
  app.delete('/api/metrics/:id', async (req, res) => {
    try {
      const metrics = await getUserMetrics(req.userId);
      const index = metrics.findIndex(m => m.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '记录不存在' });
      }
      metrics.splice(index, 1);
      await saveUserMetrics(req.userId, metrics);
      res.json({ success: true });
    } catch (err) {
      console.error('删除健康指标失败:', err);
      res.status(500).json({ error: '删除失败' });
    }
  });
};

function getDefaultUnit(type) {
  switch (type) {
    case 'blood_pressure': return 'mmHg';
    case 'blood_sugar': return 'mmol/L';
    case 'weight': return 'kg';
    case 'heart_rate': return '次/分';
    default: return '';
  }
}

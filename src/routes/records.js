const { getUsers, getUserRecords, saveUserRecords, deleteRecordImages } = require('../helpers/storage');

module.exports = function(app) {
  // Get Records (with pagination & search)
  app.get('/api/records', async (req, res) => {
    try {
      const { page = 1, limit = 50, search = '', timeFilter = 'all', memberId = '',
              dateFrom = '', dateTo = '', costMin = '', costMax = '' } = req.query;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      let records = await getUserRecords(req.userId);

      // Member filter - use query param or activeMemberId from settings
      const effectiveMemberId = memberId || (() => {
        const users = getUsers();  // getUsers is async, so this won't work synchronously
        return null;
      })();
      if (memberId) {
        records = records.filter(r => r.memberId === memberId);
      } else {
        // Apply activeMemberId filter from settings
        try {
          const users = await getUsers();
          const user = users.find(u => u.userId === req.userId);
          const activeMemberId = user?.settings?.activeMemberId;
          if (activeMemberId) {
            records = records.filter(r => r.memberId === activeMemberId);
          }
        } catch (e) {
          // Ignore filter errors, proceed unfiltered
        }
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
  app.post('/api/records', async (req, res) => {
    try {
      const record = req.body;
      if (!record.patient || !record.date || !record.hospital || !record.department || !record.diagnosis) {
        return res.status(400).json({ error: '请填写必填项' });
      }

      const records = await getUserRecords(req.userId);
      const newRecord = {
        id: `rec_${require('uuid').v4()}`,
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
  app.put('/api/records/:id', async (req, res) => {
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
  app.delete('/api/records/:id', async (req, res) => {
    try {
      const records = await getUserRecords(req.userId);
      const record = records.find(r => r.id === req.params.id);
      if (!record) {
        return res.status(404).json({ error: '记录不存在' });
      }

      // Delete associated images
      await deleteRecordImages(record);

      const filtered = records.filter(r => r.id !== req.params.id);
      await saveUserRecords(req.userId, filtered);
      res.json({ success: true });
    } catch (err) {
      console.error('删除记录失败:', err);
      res.status(500).json({ error: '删除失败' });
    }
  });

  // Export Records
  app.get('/api/export', async (req, res) => {
    try {
      let records = await getUserRecords(req.userId);

      // Filter by activeMemberId if set
      const users = await getUsers();
      const user = users.find(u => u.userId === req.userId);
      const activeMemberId = user?.settings?.activeMemberId;
      if (activeMemberId) {
        records = records.filter(r => r.memberId === activeMemberId);
      }

      res.setHeader('Content-Disposition', `attachment; filename=medical_records_${req.username}_${new Date().toISOString().slice(0, 10)}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true, username: req.username, exportedAt: new Date().toISOString(), records });
    } catch (err) {
      console.error('导出失败:', err);
      res.status(500).json({ error: '导出失败' });
    }
  });
};

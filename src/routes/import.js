const { v4: uuidv4 } = require('uuid');
const { getUsers, getUserRecords, saveUserRecords } = require('../helpers/storage');

module.exports = function(app) {
  app.post('/api/import', async (req, res) => {
    try {
      const { records, mode } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: '导入数据无效或为空' });
      }

      // Validate required fields
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (!r.date || !r.hospital || !r.department || !r.diagnosis) {
          return res.status(400).json({ error: `第 ${i + 1} 条记录缺少必填字段（date/hospital/department/diagnosis）` });
        }
      }

      // Clean records: new IDs, clear images
      const now = Date.now();
      const cleaned = records.map((r, i) => ({
        id: `rec_${uuidv4()}`,
        patient: r.patient || '',
        date: r.date,
        hospital: r.hospital,
        department: r.department,
        diagnosis: r.diagnosis,
        doctor: r.doctor || '',
        cost: r.cost || 0,
        symptoms: r.symptoms || '',
        prescription: r.prescription || '',
        memberId: r.memberId || '',
        reminder: r.reminder || null,
        images: [],
        createdAt: now + i,
        updatedAt: now
      }));

      const existing = await getUserRecords(req.userId);

      if (mode === 'replace') {
        await saveUserRecords(req.userId, cleaned);
      } else {
        // append: new records at front
        await saveUserRecords(req.userId, [...cleaned, ...existing]);
      }

      res.json({ success: true, count: cleaned.length, mode });
    } catch (err) {
      console.error('导入失败:', err);
      res.status(500).json({ error: '导入数据失败' });
    }
  });
};

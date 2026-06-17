const { getUsers, getUserRecords } = require('../helpers/storage');

module.exports = function(app) {
  // Get Stats
  app.get('/api/stats', async (req, res) => {
    try {
      let records = await getUserRecords(req.userId);

      // Filter by activeMemberId if set
      const users = await getUsers();
      const user = users.find(u => u.userId === req.userId);
      const activeMemberId = user?.settings?.activeMemberId;
      if (activeMemberId) {
        records = records.filter(r => r.memberId === activeMemberId);
      }

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

      const deptCosts = {};
      records.forEach(r => {
        const cost = r.cost || 0;
        if (cost > 0) deptCosts[r.department] = (deptCosts[r.department] || 0) + cost;
      });
      const sortedDeptCosts = Object.entries(deptCosts).sort((a, b) => b[1] - a[1]).slice(0, 8);

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
        departmentCosts: sortedDeptCosts,
        monthlyFrequency: months
      });
    } catch (err) {
      console.error('统计失败:', err);
      res.status(500).json({ error: '获取统计数据失败' });
    }
  });
};

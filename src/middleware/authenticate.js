const jwt = require('jsonwebtoken');
const { getUsers } = require('../helpers/storage');
const { getJwtSecret } = require('../helpers/secret');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的登录凭证' });
  }
}

// Role is looked up fresh from storage on every request (not embedded in the JWT)
// so that revoking admin access takes effect immediately instead of waiting for token expiry.
async function adminGuard(req, res, next) {
  try {
    const users = await getUsers();
    const user = users.find(u => u.userId === req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: '权限校验失败' });
  }
}

module.exports = { authenticate, adminGuard };

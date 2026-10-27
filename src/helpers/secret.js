const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

let cachedSecret = null;

// Production requires JWT_SECRET; local development can reuse or create data/.jwt_secret.
function getJwtSecret() {
  if (cachedSecret) return cachedSecret;

  if (process.env.JWT_SECRET) {
    cachedSecret = process.env.JWT_SECRET;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }

  if (fs.existsSync(SECRET_FILE)) {
    cachedSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    return cachedSecret;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  cachedSecret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, cachedSecret, { mode: 0o600 });
  console.warn('[Security] 未设置 JWT_SECRET 环境变量，已自动生成密钥并保存到 data/.jwt_secret（请勿提交到 git，生产环境必须设置 JWT_SECRET 环境变量）');
  return cachedSecret;
}

module.exports = { getJwtSecret };

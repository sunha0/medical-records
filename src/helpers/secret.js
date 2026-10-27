const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./storage');

const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

let cachedSecret = null;

// Resolution order: JWT_SECRET env var > persisted data/.jwt_secret > freshly generated (and persisted)
function getJwtSecret() {
  if (cachedSecret) return cachedSecret;

  if (process.env.JWT_SECRET) {
    cachedSecret = process.env.JWT_SECRET;
    return cachedSecret;
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
  console.warn('[Security] 未设置 JWT_SECRET 环境变量，已自动生成密钥并保存到 data/.jwt_secret（请勿提交到 git，生产环境建议改用环境变量）');
  return cachedSecret;
}

module.exports = { getJwtSecret };

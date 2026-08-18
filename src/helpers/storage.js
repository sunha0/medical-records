const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// --- Storage Setup ---
async function ensureDir(dir) {
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function initStorage() {
  await ensureDir(DATA_DIR);
  await ensureDir(UPLOADS_DIR);
  if (!fsSync.existsSync(USERS_FILE)) {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  } else {
    // Migrate existing users to have familyMembers
    const users = await getUsers();
    let needsSave = false;
    for (const user of users) {
      if (!user.familyMembers || user.familyMembers.length === 0) {
        user.settings = user.settings || { theme: 'light', activeMemberId: null };
        user.familyMembers = [
          { memberId: user.userId, name: user.username, relation: '自己', createdAt: user.createdAt || Date.now() }
        ];
        needsSave = true;
      }
      // Migrate to explicit role field (previously admin-ness was inferred from username === 'admin')
      if (!user.role) {
        user.role = user.username === 'admin' ? 'admin' : 'user';
        needsSave = true;
      }
    }
    if (needsSave) {
      await saveUsers(users);
      console.log('[Storage] Migrated existing users with default family member');
    }
  }
}

// --- User Storage Helpers ---
async function getUsers() {
  const content = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(content);
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function getUserDir(userId) {
  const dir = path.join(DATA_DIR, userId);
  await ensureDir(dir);
  return dir;
}

async function getUserRecords(userId) {
  const dir = await getUserDir(userId);
  const file = path.join(dir, 'records.json');
  if (!fsSync.existsSync(file)) {
    await fs.writeFile(file, '[]', 'utf8');
  }
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function saveUserRecords(userId, records) {
  const dir = await getUserDir(userId);
  await fs.writeFile(path.join(dir, 'records.json'), JSON.stringify(records, null, 2), 'utf8');
}

// --- Image Migration (from old base64 format) ---
async function migrateBase64Images(records, userId) {
  const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
  const migrated = [];
  for (const record of records) {
    if (record.images && record.images.length > 0) {
      const newImages = [];
      for (const img of record.images) {
        if (img.url && img.url.startsWith('data:')) {
          const base64Data = img.url.split(',')[1];
          const mimeMatch = img.url.match(/data:([^;]+)/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const ext = mime.split('/')[1].replace('jpeg', 'jpg');
          const filename = `${uuidv4()}.${ext}`;
          const filepath = path.join(UPLOADS_DIR, filename);
          await fs.writeFile(filepath, base64Data, 'base6');
          newImages.push({ id: img.id || uuidv4(), url: `/uploads/${filename}`, tags: img.tags || [] });
        } else {
          newImages.push(img);
        }
      }
      migrated.push({ ...record, images: newImages });
    } else {
      migrated.push(record);
    }
  }
  return migrated;
}

// Delete images associated with a record
async function deleteRecordImages(record) {
  if (!record.images || record.images.length === 0) return;
  for (const img of record.images) {
    if (img.url && img.url.startsWith('/uploads/')) {
      const filename = path.basename(img.url);
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fsSync.existsSync(filepath)) {
        await fs.unlink(filepath);
      }
    }
  }
}

// --- Health Metrics ---
async function getUserMetrics(userId) {
  const dir = await getUserDir(userId);
  const file = path.join(dir, 'metrics.json');
  if (!fsSync.existsSync(file)) {
    await fs.writeFile(file, '[]', 'utf8');
  }
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function saveUserMetrics(userId, metrics) {
  const dir = await getUserDir(userId);
  await fs.writeFile(path.join(dir, 'metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');
}

// --- Medications ---
async function getUserMedications(userId) {
  const dir = await getUserDir(userId);
  const file = path.join(dir, 'medications.json');
  if (!fsSync.existsSync(file)) {
    await fs.writeFile(file, '[]', 'utf8');
  }
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function saveUserMedications(userId, medications) {
  const dir = await getUserDir(userId);
  await fs.writeFile(path.join(dir, 'medications.json'), JSON.stringify(medications, null, 2), 'utf8');
}

module.exports = {
  DATA_DIR,
  USERS_FILE,
  UPLOADS_DIR,
  ensureDir,
  initStorage,
  getUsers,
  saveUsers,
  getUserDir,
  getUserRecords,
  saveUserRecords,
  migrateBase64Images,
  deleteRecordImages,
  getUserMetrics,
  saveUserMetrics,
  getUserMedications,
  saveUserMedications
};

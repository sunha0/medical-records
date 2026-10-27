const fs = require('fs').promises;
const path = require('path');
const {
  BlobNotFoundError,
  del,
  get,
  head,
  list,
  put
} = require('@vercel/blob');

const LEGACY_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LEGACY_USERS_FILE = path.join(LEGACY_DATA_DIR, 'users.json');
const LEGACY_UPLOADS_DIR = path.join(LEGACY_DATA_DIR, 'uploads');
const BLOB_DATA_PREFIX = 'data';

function assertBlobConfigured() {
  const hasOidc = process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN;
  if (!hasOidc && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob 未配置；请连接私有 Blob Store，或设置 BLOB_READ_WRITE_TOKEN');
  }
}

function documentPath(type, userId) {
  if (type === 'users') return `${BLOB_DATA_PREFIX}/users.json`;
  return `${BLOB_DATA_PREFIX}/${encodeURIComponent(userId)}/${type}.json`;
}

function imagePath(userId, filename) {
  return `${BLOB_DATA_PREFIX}/uploads/${encodeURIComponent(userId)}/${filename}`;
}

async function streamToBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function readJson(pathname) {
  const blob = await get(pathname, { access: 'private', useCache: false });
  if (!blob || blob.statusCode !== 200) return null;
  return JSON.parse((await streamToBuffer(blob.stream)).toString('utf8'));
}

async function writeJson(pathname, value) {
  let metadata = null;
  try {
    metadata = await head(pathname);
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) throw err;
  }

  const options = {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
    ...(metadata ? { allowOverwrite: true, ifMatch: metadata.etag } : {})
  };
  await put(pathname, JSON.stringify(value), options);
}

async function readLegacyJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function loadLegacyData() {
  const users = await readLegacyJson(LEGACY_USERS_FILE, []);
  for (const user of users) {
    if (!user.familyMembers || user.familyMembers.length === 0) {
      user.settings = user.settings || { theme: 'light', activeMemberId: null };
      user.familyMembers = [
        { memberId: user.userId, name: user.username, relation: '自己', createdAt: user.createdAt || Date.now() }
      ];
    }
    if (!user.role) user.role = user.username === 'admin' ? 'admin' : 'user';
  }
  const documents = [{ pathname: documentPath('users'), value: users }];
  const imageOwners = new Map();
  const userDirs = await fs.readdir(LEGACY_DATA_DIR, { withFileTypes: true }).catch(err => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });

  for (const entry of userDirs) {
    if (!entry.isDirectory() || entry.name === 'uploads') continue;
    for (const type of ['records', 'metrics', 'medications']) {
      const file = path.join(LEGACY_DATA_DIR, entry.name, `${type}.json`);
      try {
        const value = JSON.parse(await fs.readFile(file, 'utf8'));
        if (type === 'records' && Array.isArray(value)) {
          for (const record of value) {
            for (const image of record.images || []) {
              if (image && image.url && image.url.startsWith('/uploads/')) {
                const filename = path.basename(image.url);
                image.url = `/uploads/${encodeURIComponent(entry.name)}/${encodeURIComponent(filename)}`;
                const owners = imageOwners.get(filename) || new Set();
                owners.add(entry.name);
                imageOwners.set(filename, owners);
              }
            }
          }
        }
        documents.push({ pathname: documentPath(type, entry.name), value });
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
  }

  const contentTypes = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  const uploadEntries = await fs.readdir(LEGACY_UPLOADS_DIR, { withFileTypes: true }).catch(err => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });
  const uploads = [];
  for (const entry of uploadEntries) {
    if (!entry.isFile()) continue;
    const filename = path.basename(entry.name);
    const contentType = contentTypes[path.extname(filename).toLowerCase()];
    const owners = imageOwners.get(filename);
    if (!contentType || !owners || owners.size === 0) continue;
    const data = await fs.readFile(path.join(LEGACY_UPLOADS_DIR, filename));
    for (const ownerUserId of owners) {
      uploads.push({ ownerUserId, filename, contentType, data });
    }
  }

  return { documents, uploads };
}

async function importLegacyData() {
  const legacy = await loadLegacyData();
  // Write the users document last; its presence marks the one-time import complete.
  for (const document of legacy.documents.filter(item => item.pathname !== documentPath('users'))) {
    await put(document.pathname, JSON.stringify(document.value), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60
    });
  }
  for (const upload of legacy.uploads) {
    await put(imagePath(upload.ownerUserId, upload.filename), upload.data, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: upload.contentType
    });
  }
  await put(documentPath('users'), JSON.stringify(usersFromLegacy(legacy.documents)), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60
  });
  console.log(`[Storage] Imported ${legacy.documents.length} JSON documents and ${legacy.uploads.length} images to Vercel Blob`);
}

function usersFromLegacy(documents) {
  return documents.find(item => item.pathname === documentPath('users'))?.value || [];
}

async function initStorage() {
  assertBlobConfigured();
  if (await readJson(documentPath('users')) === null) {
    await importLegacyData();
  }
}

async function getDocument(pathname, fallback) {
  const value = await readJson(pathname);
  return value === null ? fallback : value;
}

async function saveDocument(pathname, value) {
  await writeJson(pathname, value);
}

async function getUsers() {
  return getDocument(documentPath('users'), []);
}

async function saveUsers(users) {
  await saveDocument(documentPath('users'), users);
}

async function getUserRecords(userId) {
  return getDocument(documentPath('records', userId), []);
}

async function saveUserRecords(userId, records) {
  await saveDocument(documentPath('records', userId), records);
}

async function getUserMetrics(userId) {
  return getDocument(documentPath('metrics', userId), []);
}

async function saveUserMetrics(userId, metrics) {
  await saveDocument(documentPath('metrics', userId), metrics);
}

async function getUserMedications(userId) {
  return getDocument(documentPath('medications', userId), []);
}

async function saveUserMedications(userId, medications) {
  await saveDocument(documentPath('medications', userId), medications);
}

async function saveUploadedImage(userId, filename, contentType, data) {
  await put(imagePath(userId, filename), data, {
    access: 'private',
    addRandomSuffix: false,
    contentType
  });
}

async function getUploadedImage(userId, filename) {
  const blob = await get(imagePath(userId, filename), { access: 'private', useCache: false });
  if (!blob || blob.statusCode !== 200) return null;
  return {
    contentType: blob.blob.contentType,
    data: await streamToBuffer(blob.stream)
  };
}

async function deleteRecordImages(record, userId) {
  if (!record.images || record.images.length === 0) return;
  const paths = record.images
    .filter(image => image.url && image.url.startsWith(`/uploads/${encodeURIComponent(userId)}/`))
    .map(image => imagePath(userId, path.basename(image.url)));
  if (paths.length > 0) await del(paths);
}

async function deleteUserData(userId) {
  const paths = [
    documentPath('records', userId),
    documentPath('metrics', userId),
    documentPath('medications', userId)
  ];
  let cursor;
  do {
    const page = await list({ prefix: `${BLOB_DATA_PREFIX}/uploads/${encodeURIComponent(userId)}/`, cursor, limit: 1000 });
    paths.push(...page.blobs.map(blob => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (paths.length > 0) await del(paths);
}

module.exports = {
  initStorage,
  getUsers,
  saveUsers,
  getUserRecords,
  saveUserRecords,
  deleteRecordImages,
  deleteUserData,
  getUserMetrics,
  saveUserMetrics,
  getUserMedications,
  saveUserMedications,
  saveUploadedImage,
  getUploadedImage
};

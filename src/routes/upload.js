const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOADS_DIR } = require('../helpers/storage');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

module.exports = function(app) {
  app.post('/api/upload', upload.array('images', 9), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '请上传图片' });
      }
      const images = req.files.map(f => ({
        id: uuidv4(),
        url: `/uploads/${f.filename}`,
        originalName: f.originalname,
        size: f.size,
        tags: []
      }));
      res.json({ success: true, images });
    } catch (err) {
      console.error('上传失败:', err);
      res.status(500).json({ error: '上传失败' });
    }
  });
};

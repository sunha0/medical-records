const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { UPLOADS_DIR } = require('../helpers/storage');

// Only these raster formats are accepted. SVG is deliberately excluded — it can embed
// <script>/<foreignObject> content and would be stored-XSS if opened directly from /uploads.
const SIGNATURES = [
  { ext: 'png', check: buf => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 },
  { ext: 'jpg', check: buf => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF },
  { ext: 'gif', check: buf => buf.length >= 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a') },
  { ext: 'webp', check: buf => buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP' }
];

function detectImageType(buffer) {
  return SIGNATURES.find(s => s.check(buffer)) || null;
}

// Buffer in memory instead of streaming straight to disk, so we can inspect the real
// file bytes before it's ever written to the uploads directory (client-supplied
// mimetype/extension are trivially spoofable and must not be trusted).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = function(app) {
  app.post('/api/upload', upload.array('images', 9), async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '请上传图片' });
      }

      const images = [];
      for (const file of req.files) {
        const type = detectImageType(file.buffer);
        if (!type) {
          return res.status(400).json({ error: '只允许上传 PNG/JPEG/GIF/WEBP 格式的图片' });
        }
        const filename = `${uuidv4()}.${type.ext}`;
        await fs.writeFile(path.join(UPLOADS_DIR, filename), file.buffer);
        images.push({
          id: uuidv4(),
          url: `/uploads/${filename}`,
          originalName: file.originalname,
          size: file.size,
          tags: []
        });
      }

      res.json({ success: true, images });
    } catch (err) {
      next(err);
    }
  });
};

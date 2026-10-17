const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer storage for blank template uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueName = 'template-' + Date.now() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// HTML Routes
app.get('/', (req, res) => {
  res.redirect('/ecertificates');
});

app.get('/ecertificates', (req, res) => {
  res.sendFile('ecertificates.html', { root: path.join(__dirname, 'public') });
});

app.get(['/admin', '/admin/certificates'], (req, res) => {
  res.sendFile('admin.html', { root: path.join(__dirname, 'public') });
});

// APIs
// 1. Get Active Template
app.get('/api/templates/active', (req, res) => {
  try {
    const template = db.getActiveTemplate();
    if (!template) {
      return res.status(404).json({ error: 'No active template found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save / Update Template Coordinates and Config
app.post('/api/templates', (req, res) => {
  try {
    const { id, name, event, imageUrl, naturalWidth, naturalHeight, fields } = req.body;
    if (!fields) {
      return res.status(400).json({ error: 'Missing template fields mapping' });
    }

    const templateId = id || 'tmpl-' + Date.now();
    const updated = db.saveTemplate({
      id: templateId,
      name: name || 'Custom Certificate Template',
      event: event || 'College Event / Workshop',
      imageUrl: imageUrl || '/template.png',
      naturalWidth: Number(naturalWidth) || 1563,
      naturalHeight: Number(naturalHeight) || 1105,
      fields
    });

    res.json({ success: true, template: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Upload new template image
app.post('/api/templates/upload', upload.single('templateImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const publicUrl = '/uploads/' + req.file.filename;
    res.json({
      success: true,
      imageUrl: publicUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Verify / Lookup Certificate by Number
app.get('/api/certificates/:certNo', (req, res) => {
  try {
    const { certNo } = req.params;
    const certData = db.getCertificate(certNo);
    if (!certData) {
      return res.status(404).json({
        found: false,
        error: `No certificate found matching certificate number "${certNo}". Please check the certificate number and try again.`
      });
    }

    res.json({
      found: true,
      student: certData.student,
      template: certData.template
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get all certificates (with optional pagination/search)
app.get('/api/certificates', (req, res) => {
  try {
    const list = db.getAllCertificates();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Bulk Save Certificates
app.post('/api/certificates/bulk', (req, res) => {
  try {
    const { students, templateId } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Students array is required and must not be empty' });
    }

    const result = db.saveBulkCertificates(students, templateId);
    res.json({
      success: true,
      message: `Successfully imported ${result.importedCount} student records. Total certificates: ${result.totalCount}`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Stats
app.get('/api/stats', (req, res) => {
  try {
    res.json(db.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Disha E-Certificate Bulk Engine & Verification Server `);
  console.log(` Running on: http://localhost:${PORT}                  `);
  console.log(` Admin Route: http://localhost:${PORT}/admin           `);
  console.log(` Portal Route: http://localhost:${PORT}/ecertificates  `);
  console.log(`=======================================================`);
});

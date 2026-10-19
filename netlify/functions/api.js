const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Helper to read database with bundled require fallback
let bundledDb = null;
try {
  bundledDb = require('../../data/database.json');
} catch (e1) {
  try {
    bundledDb = require('../../public/data/database.json');
  } catch (e2) {}
}

let runtimeDb = null;

function getDatabase() {
  if (runtimeDb) return runtimeDb;

  const possiblePaths = [
    path.join(__dirname, '..', '..', 'data', 'database.json'),
    path.join(__dirname, '..', '..', 'public', 'data', 'database.json'),
    path.join(process.cwd(), 'data', 'database.json'),
    path.join(process.cwd(), 'public', 'data', 'database.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        runtimeDb = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return runtimeDb;
      } catch (e) {
        console.error('Error parsing DB at', p, e);
      }
    }
  }

  runtimeDb = bundledDb ? JSON.parse(JSON.stringify(bundledDb)) : { templates: [], students: [] };
  return runtimeDb;
}

const router = express.Router();

// 1. Get Active Template
router.get('/templates/active', (req, res) => {
  try {
    const data = getDatabase();
    const active = data.templates.find(t => t.id === data.activeTemplateId) || data.templates[0];
    if (!active) return res.status(404).json({ error: 'No active template found' });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save / Update Template Coordinates and Config
router.post('/templates', (req, res) => {
  try {
    const template = req.body;
    if (template && template.id) {
      const data = getDatabase();
      const existingIdx = data.templates.findIndex(t => t.id === template.id);
      if (existingIdx >= 0) {
        data.templates[existingIdx] = template;
      } else {
        data.templates.unshift(template);
      }
      data.activeTemplateId = template.id;
    }
    res.json({ success: true, template: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Upload Template Image fallback
router.post('/templates/upload', (req, res) => {
  res.json({
    success: true,
    message: 'Template image upload acknowledged',
    imageUrl: '/template.png'
  });
});

// 4. Verify Certificate by Number or Candidate Name
router.get('/certificates/:certNo', (req, res) => {
  try {
    const data = getDatabase();
    const raw = String(req.params.certNo || '').trim();
    if (!raw) {
      return res.status(400).json({ found: false, error: 'Query parameter is empty' });
    }

    // 1. Exact case-insensitive match on cert_no
    let student = data.students.find(s => s.cert_no && s.cert_no.trim().toUpperCase() === raw.toUpperCase());

    // 2. Alphanumeric normalized match on cert_no
    if (!student) {
      const normQuery = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (normQuery.length > 0) {
        student = data.students.find(s => {
          if (!s.cert_no) return false;
          const sNorm = s.cert_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          return sNorm === normQuery;
        });
      }
    }

    // 3. Exact student name match
    if (!student) {
      const lowerQuery = raw.toLowerCase();
      student = data.students.find(s => s.name && s.name.trim().toLowerCase() === lowerQuery);
    }

    // 4. Candidate name substring match
    if (!student) {
      const lowerQuery = raw.toLowerCase();
      student = data.students.find(s => s.name && s.name.toLowerCase().includes(lowerQuery));
    }

    // 5. Numeric serial match (e.g. '013' or '13' matches '24CVSCB013')
    if (!student && /^\d{1,4}$/.test(raw)) {
      const padded = raw.padStart(3, '0');
      student = data.students.find(s => s.cert_no && s.cert_no.endsWith(padded));
    }

    // 6. Substring match on normalized cert_no
    if (!student) {
      const normQuery = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (normQuery.length >= 3) {
        student = data.students.find(s => {
          if (!s.cert_no) return false;
          const sNorm = s.cert_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          return sNorm.includes(normQuery) || normQuery.includes(sNorm);
        });
      }
    }

    if (!student) {
      return res.status(404).json({
        found: false,
        error: `No certificate found matching "${req.params.certNo}". Please check the certificate number and try again.`
      });
    }

    const template = data.templates.find(t => t.id === student.template_id) || data.templates[0];
    res.json({ found: true, student, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get all certificates
router.get('/certificates', (req, res) => {
  try {
    const data = getDatabase();
    res.json(data.students || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Bulk Save Certificates
router.post('/certificates/bulk', (req, res) => {
  try {
    const { students, templateId } = req.body || {};
    const count = Array.isArray(students) ? students.length : 0;
    if (count > 0) {
      const data = getDatabase();
      students.forEach(st => {
        if (!st.cert_no) return;
        const norm = st.cert_no.trim().toUpperCase();
        const idx = data.students.findIndex(s => s.cert_no && s.cert_no.trim().toUpperCase() === norm);
        if (idx >= 0) {
          data.students[idx] = { ...data.students[idx], ...st, template_id: templateId || data.students[idx].template_id };
        } else {
          data.students.push({ ...st, template_id: templateId || data.activeTemplateId });
        }
      });
    }
    res.json({
      success: true,
      importedCount: count,
      totalCount: (getDatabase().students || []).length,
      message: `Successfully processed ${count} student records`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Stats
router.get('/stats', (req, res) => {
  try {
    const data = getDatabase();
    res.json({
      totalStudents: data.students.length,
      totalTemplates: data.templates.length,
      activeTemplate: data.templates[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', router);
app.use('/.netlify/functions/api', router);
app.use('/', router);

module.exports.handler = serverless(app);

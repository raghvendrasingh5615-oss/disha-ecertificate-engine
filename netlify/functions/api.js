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

function getDatabase() {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'data', 'database.json'),
    path.join(__dirname, '..', '..', 'public', 'data', 'database.json'),
    path.join(process.cwd(), 'data', 'database.json'),
    path.join(process.cwd(), 'public', 'data', 'database.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (e) {
        console.error('Error parsing DB at', p, e);
      }
    }
  }

  return bundledDb || { templates: [], students: [] };
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

// 2. Verify Certificate by Number or Candidate Name
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

// 3. Get all certificates
router.get('/certificates', (req, res) => {
  try {
    const data = getDatabase();
    res.json(data.students || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Stats
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

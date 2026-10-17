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

// 2. Verify Certificate by Number
router.get('/certificates/:certNo', (req, res) => {
  try {
    const data = getDatabase();
    const cleanCertNo = req.params.certNo.trim().toUpperCase();
    const student = data.students.find(s => s.cert_no && s.cert_no.trim().toUpperCase() === cleanCertNo);

    if (!student) {
      return res.status(404).json({
        found: false,
        error: `No certificate found matching certificate number "${req.params.certNo}". Please check the certificate number and try again.`
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

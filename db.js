const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { activeTemplateId: null, templates: [], students: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

const db = {
  getActiveTemplate() {
    const data = readDb();
    const active = data.templates.find(t => t.id === data.activeTemplateId);
    return active || (data.templates.length > 0 ? data.templates[0] : null);
  },

  getTemplateById(id) {
    const data = readDb();
    return data.templates.find(t => t.id === id) || null;
  },

  getAllTemplates() {
    const data = readDb();
    return data.templates;
  },

  saveTemplate(template) {
    const data = readDb();
    const index = data.templates.findIndex(t => t.id === template.id);
    const now = new Date().toISOString();

    if (index >= 0) {
      data.templates[index] = {
        ...data.templates[index],
        ...template,
        updatedAt: now
      };
    } else {
      data.templates.push({
        ...template,
        createdAt: now,
        updatedAt: now
      });
    }

    data.activeTemplateId = template.id;
    writeDb(data);
    return template;
  },

  setActiveTemplate(id) {
    const data = readDb();
    if (data.templates.some(t => t.id === id)) {
      data.activeTemplateId = id;
      writeDb(data);
      return true;
    }
    return false;
  },

  getCertificate(query) {
    if (!query) return null;
    const raw = String(query).trim();
    if (!raw) return null;
    const data = readDb();

    // 1. Exact case-insensitive match on cert_no
    let student = data.students.find(s => s.cert_no && s.cert_no.trim().toUpperCase() === raw.toUpperCase());

    // 2. Alphanumeric normalized match on cert_no (strips spaces, hyphens, underscores, dots)
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

    // 3. Exact student name match (case-insensitive)
    if (!student) {
      const lowerQuery = raw.toLowerCase();
      student = data.students.find(s => s.name && s.name.trim().toLowerCase() === lowerQuery);
    }

    // 4. Student name substring match (e.g. "Mayank", "Mayank Aggarwal", "Kuldeep")
    if (!student) {
      const lowerQuery = raw.toLowerCase();
      student = data.students.find(s => s.name && s.name.toLowerCase().includes(lowerQuery));
    }

    // 5. Numeric serial match (e.g., '013' or '13' matches '24CVSCB013')
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

    if (!student) return null;

    const template = data.templates.find(t => t.id === student.template_id) || db.getActiveTemplate();
    return {
      student,
      template
    };
  },

  getAllCertificates() {
    const data = readDb();
    return data.students;
  },

  saveBulkCertificates(newStudents, templateId) {
    const data = readDb();
    const targetTemplateId = templateId || data.activeTemplateId || (data.templates[0] && data.templates[0].id);

    // Map or update existing by cert_no
    const existingMap = new Map();
    data.students.forEach(s => existingMap.set(s.cert_no.toUpperCase(), s));

    const added = [];
    newStudents.forEach(item => {
      const record = {
        cert_no: item.cert_no.trim().toUpperCase(),
        template_id: targetTemplateId,
        name: item.name || '',
        branch: item.branch || '',
        year: item.year || '',
        event: item.event || '',
        date: item.date || new Date().toISOString().split('T')[0],
        certificate_type: item.certificate_type || 'Participation',
        status: 'published',
        custom_fields: item.custom_fields || {}
      };
      existingMap.set(record.cert_no, record);
      added.push(record);
    });

    data.students = Array.from(existingMap.values());
    writeDb(data);
    return {
      totalCount: data.students.length,
      importedCount: added.length,
      sample: added.slice(0, 5)
    };
  },

  getStats() {
    const data = readDb();
    return {
      totalStudents: data.students.length,
      totalTemplates: data.templates.length,
      activeTemplate: db.getActiveTemplate(),
      recentCertificates: data.students.slice(-5)
    };
  }
};

module.exports = db;

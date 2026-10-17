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

  getCertificate(certNo) {
    if (!certNo) return null;
    const cleanCertNo = certNo.trim().toUpperCase();
    const data = readDb();
    const student = data.students.find(s => s.cert_no && s.cert_no.trim().toUpperCase() === cleanCertNo);
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

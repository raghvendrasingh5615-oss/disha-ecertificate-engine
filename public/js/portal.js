// Disha Student Verification Portal Engine - Resilient v2.1

(function() {
  'use strict';

  // Authoritative in-memory fallback registry for the 13 workshop certificates
  const FALLBACK_REGISTRY = {
    template: {
      id: "tmpl-smart-conveyer-2024",
      name: "Smart Conveyer Belt Workshop Certificate",
      event: "Computer Vision based Smart Conveyer Belt Workshop",
      imageUrl: "/template.png",
      naturalWidth: 1563,
      naturalHeight: 1105,
      fields: {
        cert_no: {
          label: "Certificate Number",
          placeholder: "Cert. No. {cert_no}",
          csvColumn: "cert_no",
          x: 960,
          y: 78,
          maxWidth: 460,
          height: 35,
          fontSize: 22,
          fontFamily: "Roboto",
          fontWeight: "500",
          color: "#1e293b",
          textAlign: "right",
          textTransform: "none"
        },
        name: {
          label: "Candidate Name",
          placeholder: "{name}",
          csvColumn: "name",
          x: 380,
          y: 545,
          maxWidth: 800,
          height: 75,
          fontSize: 62,
          fontFamily: "Roboto",
          fontWeight: "700",
          color: "#0f172a",
          textAlign: "center",
          textTransform: "uppercase"
        },
        year: {
          label: "Class / Year",
          placeholder: "{year}",
          csvColumn: "year",
          x: 285,
          y: 672,
          maxWidth: 168,
          height: 38,
          fontSize: 26,
          fontFamily: "Roboto",
          fontWeight: "500",
          color: "#1e293b",
          textAlign: "center",
          textTransform: "none"
        },
        branch: {
          label: "Branch / Institute",
          placeholder: "{branch}",
          csvColumn: "branch",
          x: 785,
          y: 672,
          maxWidth: 580,
          height: 38,
          fontSize: 26,
          fontFamily: "Roboto",
          fontWeight: "500",
          color: "#1e293b",
          textAlign: "center",
          textTransform: "none"
        },
        verification_url: {
          label: "Online Verification URL",
          placeholder: "Verify online at https://disha.mbm.ac.in/ecertificates?cert={cert_no}",
          csvColumn: "verification_url",
          x: 380,
          y: 1025,
          maxWidth: 800,
          height: 25,
          fontSize: 16,
          fontFamily: "Roboto",
          fontWeight: "400",
          color: "#64748b",
          textAlign: "center",
          textTransform: "none"
        }
      }
    },
    students: [
      { cert_no: "24CVSCB001", name: "Kuldeep Singh", branch: "Computer Science & Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB002", name: "Mohit Gaur", branch: "Information Technology", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB003", name: "Jinal Soni", branch: "Computer Science & Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB004", name: "Bhavesh Tak", branch: "Building & Construction Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB005", name: "Rohan Mangal", branch: "Information Technology", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB006", name: "Sanjay Jakhar", branch: "Mechanical Engineering", year: "II Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB007", name: "Jatin Saini", branch: "Electronics & Communication Engineering", year: "II Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB008", name: "Mridul Bansal", branch: "Information Technology", year: "II Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB009", name: "Nishtha Jain", branch: "Electronics & Computer Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB010", name: "Riya Shekhawat", branch: "Electronics & Electrical Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB011", name: "Yuvadhan Singh Rutia", branch: "Electrical Engineering", year: "II Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB012", name: "Ketan", branch: "Computer Science & Engineering", year: "II Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" },
      { cert_no: "24CVSCB013", name: "Mayank Aggarwal", branch: "Computer Science & Engineering", year: "I Year", event: "Computer Vision based Smart Conveyer Belt Workshop", date: "2024-06-26", certificate_type: "Participation" }
    ]
  };

  // DOM Elements
  const certForm = document.getElementById('certVerificationForm');
  const certInput = document.getElementById('certNumberInput');
  const quickTestPill = document.getElementById('quickTestPill');
  const resultContainer = document.getElementById('resultContainer');
  const errorContainer = document.getElementById('errorContainer');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const retryVerifyBtn = document.getElementById('retryVerifyBtn');
  const errorTryDemoBtn = document.getElementById('errorTryDemoBtn');
  const flatCertImage = document.getElementById('flatCertImage');

  // Student info elements
  const studentNameEl = document.getElementById('studentName');
  const certNumberDisplayEl = document.getElementById('certNumberDisplay');
  const eventTitleEl = document.getElementById('eventTitle');
  const branchNameEl = document.getElementById('branchName');
  const issueDateEl = document.getElementById('issueDate');
  const certTypeEl = document.getElementById('certType');

  // Action Buttons
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const printCertBtn = document.getElementById('printCertBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');

  // Offscreen Canvas for Razor-Sharp Bitmap Flattening
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let currentStudent = null;
  let currentTemplate = null;
  let currentPngDataUrl = null;
  let lastSearchedCertNo = '';

  // Robust student matcher: matches exact, normalized alphanumeric, name substring, and serial
  function findStudentInList(students, query) {
    if (!students || !Array.isArray(students) || !query) return null;
    const raw = String(query).trim();
    if (!raw) return null;

    // 1. Direct case-insensitive match on cert_no
    let match = students.find(s => s.cert_no && s.cert_no.trim().toUpperCase() === raw.toUpperCase());
    if (match) return match;

    // 2. Alphanumeric normalized match on cert_no (strips spaces, hyphens, underscores, dots)
    const normQuery = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (normQuery.length > 0) {
      match = students.find(s => {
        if (!s.cert_no) return false;
        const sNorm = s.cert_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        return sNorm === normQuery;
      });
      if (match) return match;
    }

    // 3. Exact candidate name match (case-insensitive)
    const lowerQuery = raw.toLowerCase();
    match = students.find(s => s.name && s.name.trim().toLowerCase() === lowerQuery);
    if (match) return match;

    // 4. Candidate name substring match (e.g. "Mayank", "Mayank Aggarwal", "Kuldeep")
    match = students.find(s => s.name && s.name.toLowerCase().includes(lowerQuery));
    if (match) return match;

    // 5. Trailing serial number match (e.g., '013' or '13' matches '24CVSCB013')
    if (/^\d{1,4}$/.test(raw)) {
      const padded = raw.padStart(3, '0');
      match = students.find(s => s.cert_no && s.cert_no.endsWith(padded));
      if (match) return match;
    }

    // 6. Substring match on normalized cert_no
    if (normQuery.length >= 3) {
      match = students.find(s => {
        if (!s.cert_no) return false;
        const sNorm = s.cert_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        return sNorm.includes(normQuery) || normQuery.includes(sNorm);
      });
      if (match) return match;
    }

    return null;
  }

  async function init() {
    bindEvents();

    // Check URL parameters for direct verification link e.g. /ecertificates?cert=24CVSCB013
    const urlParams = new URLSearchParams(window.location.search);
    const certQuery = urlParams.get('cert') || urlParams.get('certNo');
    if (certQuery) {
      certInput.value = certQuery.trim().toUpperCase();
      await verifyCertificate(certInput.value);
    } else {
      // Do NOT autofill when opening portal! Keep blank so user types their own credentials
      certInput.value = '';
    }
  }

  function bindEvents() {
    certForm.addEventListener('submit', async e => {
      e.preventDefault();
      const certNo = certInput.value.trim();
      if (!certNo) {
        showError('Missing Certificate Number', 'Please enter a certificate number or candidate name to verify.', false);
        return;
      }
      await verifyCertificate(certNo);
    });

    if (quickTestPill) {
      quickTestPill.addEventListener('click', async () => {
        certInput.value = '24CVSCB013';
        await verifyCertificate('24CVSCB013');
      });
    }

    if (errorTryDemoBtn) {
      errorTryDemoBtn.addEventListener('click', async () => {
        certInput.value = '24CVSCB013';
        await verifyCertificate('24CVSCB013');
      });
    }

    if (retryVerifyBtn) {
      retryVerifyBtn.addEventListener('click', async () => {
        const certToRetry = lastSearchedCertNo || certInput.value.trim() || '24CVSCB013';
        certInput.value = certToRetry;
        await verifyCertificate(certToRetry);
      });
    }

    downloadPngBtn.addEventListener('click', downloadHighResPng);
    downloadPdfBtn.addEventListener('click', downloadPrintReadyPdf);
    printCertBtn.addEventListener('click', () => window.print());
    copyLinkBtn.addEventListener('click', copyVerificationLink);
  }

  // Fetch with strict timeout helper
  async function fetchWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // Verify Certificate by Number or Candidate Name
  async function verifyCertificate(searchQuery) {
    const rawQuery = (searchQuery || '').trim();
    lastSearchedCertNo = rawQuery;

    if (!rawQuery) {
      showError('Empty Input', 'Please enter a certificate number or candidate name before searching.', false);
      return;
    }

    showLoading(true);
    errorContainer.style.display = 'none';
    resultContainer.style.display = 'none';

    try {
      let data = null;

      // 1. Try Backend API
      try {
        const res = await fetchWithTimeout(`/api/certificates/${encodeURIComponent(rawQuery)}`, 3500);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('Backend API endpoint unavailable or timed out, trying static database...', e);
      }

      // 2. Try Static CDN database.json (for Netlify / static hosting) with smart matching
      if (!data || !data.found) {
        try {
          const staticRes = await fetchWithTimeout('/data/database.json', 3500);
          if (staticRes.ok) {
            const staticDb = await staticRes.json();
            const student = findStudentInList(staticDb.students, rawQuery);
            if (student) {
              const template = staticDb.templates.find(t => t.id === student.template_id) || staticDb.templates[0];
              data = { found: true, student, template };
            }
          }
        } catch (e) {
          console.warn('Static database.json fetch failed, falling back to embedded registry...', e);
        }
      }

      // 3. Fall back to embedded offline registry with smart matching
      if (!data || !data.found) {
        const fallbackStudent = findStudentInList(FALLBACK_REGISTRY.students, rawQuery);
        if (fallbackStudent) {
          data = {
            found: true,
            student: fallbackStudent,
            template: FALLBACK_REGISTRY.template
          };
        }
      }

      // If still not found, show user-friendly not found error with retry option
      if (!data || !data.found) {
        showError(
          'Certificate Not Found',
          `No official record was found matching "${rawQuery}". Please check the certificate number or candidate name and try again.`,
          true,
          rawQuery
        );
        return;
      }

      currentStudent = data.student;
      currentTemplate = data.template || FALLBACK_REGISTRY.template;

      // Update input field to show the canonical certificate number
      if (currentStudent.cert_no) {
        certInput.value = currentStudent.cert_no;
      }

      // Populate textual metadata in verified result card
      const canonicalCert = currentStudent.cert_no || rawQuery;
      studentNameEl.textContent = currentStudent.name || 'Candidate';
      certNumberDisplayEl.textContent = canonicalCert;
      eventTitleEl.textContent = currentStudent.event || currentTemplate.event || 'College Workshop / Event';
      branchNameEl.textContent = `${currentStudent.branch || 'CSE'} ${currentStudent.year ? `(${currentStudent.year})` : ''}`;
      issueDateEl.textContent = currentStudent.date || 'N/A';
      certTypeEl.textContent = currentStudent.certificate_type || 'Participation';

      // Flatten certificate onto canvas and display as single flat <img>
      await renderFlatCertificate();

      resultContainer.style.display = 'block';
      const yOffset = -75;
      const yPos = resultContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, yPos), behavior: 'smooth' });

      // Update URL without full refresh for easy sharing
      const newUrl = `${window.location.pathname}?cert=${encodeURIComponent(canonicalCert)}`;
      window.history.replaceState({ cert: canonicalCert }, '', newUrl);

    } catch (err) {
      console.error('Verification error:', err);
      showError(
        'Verification Timeout / Render Error',
        `An error occurred while preparing your certificate (${err.message || 'connection issue'}). Click "Retry Verification" to try again.`,
        true,
        cleanCertNo
      );
    } finally {
      showLoading(false);
    }
  }

  // Load image with timeout and CORS fallback
  function loadTemplateImageSafely(src, timeoutMs = 4500) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const img = new Image();

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Retry without crossOrigin
          const directImg = new Image();
          directImg.onload = () => resolve(directImg);
          directImg.onerror = () => reject(new Error('Template image timed out'));
          directImg.src = src;
        }
      }, timeoutMs);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(img);
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          // Retry without crossOrigin in case CORS header was blocked
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = () => reject(new Error('Failed to load certificate template background'));
          fallbackImg.src = src;
        }
      };

      img.crossOrigin = 'anonymous';
      img.src = src;

      if (img.complete && img.naturalWidth > 0) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    });
  }

  // Render Flat Certificate Bitmap
  async function renderFlatCertificate() {
    // 1. Wait for web fonts with a strict 800ms race timeout
    try {
      const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();
      await Promise.race([fontPromise, new Promise(r => setTimeout(r, 800))]);
    } catch (e) {
      console.warn('Font loading check bypassed:', e);
    }

    // 2. Load template image with CORS safety fallback
    const imageUrl = (currentTemplate && currentTemplate.imageUrl) ? currentTemplate.imageUrl : '/template.png';
    const templateImg = await loadTemplateImageSafely(imageUrl);

    // 3. Set native canvas dimensions (naturalWidth × naturalHeight)
    canvas.width = templateImg.naturalWidth || 1563;
    canvas.height = templateImg.naturalHeight || 1105;

    // 4. Draw template image background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    // 5. Draw all text fields using coordinate mapping with auto-font-shrinking
    const fields = (currentTemplate && currentTemplate.fields) ? currentTemplate.fields : FALLBACK_REGISTRY.template.fields;

    Object.keys(fields).forEach(key => {
      const field = fields[key];
      let val = currentStudent[field.csvColumn || key] || currentStudent[key] || '';
      if (!val && key === 'verification_url') {
        val = `Verify online at https://disha.mbm.ac.in/ecertificates?cert=${currentStudent.cert_no || ''}`;
      }

      // Check placeholder formatting
      let displayText = val;
      if (field.placeholder && field.placeholder.includes(`{${key}}`)) {
        displayText = field.placeholder.replace(`{${key}}`, val);
      } else if (field.placeholder && field.placeholder.includes('{cert_no}')) {
        displayText = field.placeholder.replace('{cert_no}', currentStudent.cert_no || '');
      }

      if (field.textTransform === 'uppercase') {
        displayText = displayText.toUpperCase();
      } else if (field.textTransform === 'capitalize') {
        displayText = displayText.replace(/\b\w/g, c => c.toUpperCase());
      }

      // Exact native image pixel coordinates
      const x = field.x;
      const y = field.y;
      const mw = field.maxWidth;
      const h = field.height || 40;

      let fontSize = field.fontSize || 24;
      const fontStyleStr = field.fontStyle ? `${field.fontStyle} ` : '';
      ctx.save();
      ctx.font = `${fontStyleStr}${field.fontWeight || 400} ${fontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;

      // Automatic Font-Size Shrinking: measure text width and shrink until it fits within maxWidth
      let textWidth = ctx.measureText(displayText).width;
      while (textWidth > mw && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontStyleStr}${field.fontWeight || 400} ${fontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;
        textWidth = ctx.measureText(displayText).width;
      }

      ctx.fillStyle = field.color || '#000000';
      ctx.textBaseline = 'middle';

      let textX = x;
      if (field.textAlign === 'center') {
        textX = x + mw / 2;
        ctx.textAlign = 'center';
      } else if (field.textAlign === 'right') {
        textX = x + mw;
        ctx.textAlign = 'right';
      } else {
        textX = x;
        ctx.textAlign = 'left';
      }

      ctx.fillText(displayText, textX, y + h / 2);
      ctx.restore();
    });

    // 6. Convert canvas to data URL and display inside <img>
    currentPngDataUrl = canvas.toDataURL('image/png');
    flatCertImage.src = currentPngDataUrl;
    flatCertImage.alt = `E-Certificate for ${currentStudent.name} (${currentStudent.cert_no})`;
  }

  // Download High-Res PNG
  function downloadHighResPng() {
    if (!currentPngDataUrl) {
      alert('Certificate bitmap is still preparing. Please wait a moment.');
      return;
    }
    const link = document.createElement('a');
    link.href = currentPngDataUrl;
    const safeName = (currentStudent.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Certificate_${currentStudent.cert_no}_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Download Print-Ready PDF (A4 Landscape 300 DPI)
  async function downloadPrintReadyPdf() {
    if (!currentPngDataUrl || !currentStudent) {
      alert('Certificate bitmap is still preparing. Please wait a moment.');
      return;
    }

    try {
      // Check for jsPDF
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        alert('PDF generator library is initializing. Please click again in 2 seconds.');
        return;
      }

      // Create landscape A4 document (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Fit image maintaining aspect ratio
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = pageWidth / pageHeight;

      let renderW, renderH, offsetX, offsetY;

      if (imgRatio > pageRatio) {
        renderW = pageWidth;
        renderH = pageWidth / imgRatio;
        offsetX = 0;
        offsetY = (pageHeight - renderH) / 2;
      } else {
        renderH = pageHeight;
        renderW = pageHeight * imgRatio;
        offsetY = 0;
        offsetX = (pageWidth - renderW) / 2;
      }

      pdf.addImage(currentPngDataUrl, 'PNG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');

      const safeName = (currentStudent.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Disha_Certificate_${currentStudent.cert_no}_${safeName}.pdf`);

    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Error generating PDF: ' + err.message);
    }
  }

  // Copy Verification URL
  function copyVerificationLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const origText = copyLinkBtn.innerHTML;
      copyLinkBtn.innerHTML = `<span>✓</span> Copied!`;
      setTimeout(() => copyLinkBtn.innerHTML = origText, 2500);
    }).catch(() => {
      prompt('Copy this verification link:', url);
    });
  }

  function showError(title, msg, isRetryable = true, certNo = '') {
    resultContainer.style.display = 'none';
    if (errorTitle) errorTitle.textContent = title || 'Certificate Not Found';
    if (errorMessage) errorMessage.textContent = msg;

    if (retryVerifyBtn) {
      retryVerifyBtn.style.display = isRetryable ? 'inline-flex' : 'none';
    }

    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showLoading(isLoading) {
    const btn = document.getElementById('searchBtn');
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Verifying...`;
    } else {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Verify Certificate
      `;
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();

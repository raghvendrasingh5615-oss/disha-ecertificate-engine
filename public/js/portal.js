// Disha Student Verification Portal Engine

(function() {
  'use strict';

  // DOM Elements
  const certForm = document.getElementById('certVerificationForm');
  const certInput = document.getElementById('certNumberInput');
  const quickTestPill = document.getElementById('quickTestPill');
  const resultContainer = document.getElementById('resultContainer');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
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

  async function init() {
    bindEvents();

    // Check URL parameters for direct verification link e.g. /ecertificates?cert=24CVSCB013
    const urlParams = new URLSearchParams(window.location.search);
    const certQuery = urlParams.get('cert') || urlParams.get('certNo');
    if (certQuery) {
      certInput.value = certQuery.trim().toUpperCase();
      await verifyCertificate(certInput.value);
    } else {
      // Pre-fill with trial certificate 24CVSCB013
      certInput.value = '24CVSCB013';
    }
  }

  function bindEvents() {
    certForm.addEventListener('submit', async e => {
      e.preventDefault();
      const certNo = certInput.value.trim().toUpperCase();
      if (!certNo) {
        showError('Please enter a certificate number to verify.');
        return;
      }
      await verifyCertificate(certNo);
    });

    quickTestPill.addEventListener('click', async () => {
      certInput.value = '24CVSCB013';
      await verifyCertificate('24CVSCB013');
    });

    downloadPngBtn.addEventListener('click', downloadHighResPng);
    downloadPdfBtn.addEventListener('click', downloadPrintReadyPdf);
    printCertBtn.addEventListener('click', () => window.print());
    copyLinkBtn.addEventListener('click', copyVerificationLink);
  }

  // Verify Certificate by Number
  async function verifyCertificate(certNo) {
    try {
      showLoading(true);
      errorContainer.style.display = 'none';
      resultContainer.style.display = 'none';

      const res = await fetch(`/api/certificates/${encodeURIComponent(certNo)}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        showError(data.error || `No certificate record found for "${certNo}". Please check the certificate number and try again.`);
        return;
      }

      currentStudent = data.student;
      currentTemplate = data.template;

      // Populate textual metadata
      studentNameEl.textContent = currentStudent.name || 'Candidate';
      certNumberDisplayEl.textContent = currentStudent.cert_no || certNo;
      eventTitleEl.textContent = currentStudent.event || currentTemplate.event || 'College Workshop / Event';
      branchNameEl.textContent = `${currentStudent.branch || 'CSE'} ${currentStudent.year ? `(${currentStudent.year})` : ''}`;
      issueDateEl.textContent = currentStudent.date || 'N/A';
      certTypeEl.textContent = currentStudent.certificate_type || 'Participation';

      // Flatten certificate onto canvas and display as single <img>
      await renderFlatCertificate();

      resultContainer.style.display = 'block';
      const yOffset = -75;
      const yPos = resultContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, yPos), behavior: 'smooth' });

      // Update URL without full refresh for easy sharing
      const newUrl = `${window.location.pathname}?cert=${encodeURIComponent(certNo)}`;
      window.history.replaceState({ cert: certNo }, '', newUrl);

    } catch (err) {
      console.error(err);
      showError('Network error or server unavailable. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  // Render Flat Certificate Bitmap
  async function renderFlatCertificate() {
    // 1. Wait for all fonts (Roboto, Sanchez, Outfit, Inter, etc.) to be fully loaded
    await document.fonts.ready;

    // 2. Load the blank template image
    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      templateImg.onload = resolve;
      templateImg.onerror = () => reject(new Error('Failed to load template image bitmap'));
      templateImg.src = currentTemplate.imageUrl;
    });

    // 3. Set native canvas dimensions (naturalWidth × naturalHeight)
    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;

    // 4. Draw template image background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    // 5. Draw all text fields using coordinate mapping with auto-font-shrinking
    const fields = currentTemplate.fields || {};

    Object.keys(fields).forEach(key => {
      const field = fields[key];
      let val = currentStudent[field.csvColumn || key] || currentStudent[key] || '';
      if (!val && key === 'verification_url') {
        val = `Verify online at https://disha.mbm.ac.in/ecertificates?cert=${currentStudent.cert_no}`;
      }

      // Check placeholder formatting
      let displayText = val;
      if (field.placeholder && field.placeholder.includes(`{${key}}`)) {
        displayText = field.placeholder.replace(`{${key}}`, val);
      } else if (field.placeholder && field.placeholder.includes('{cert_no}')) {
        displayText = field.placeholder.replace('{cert_no}', currentStudent.cert_no);
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
    if (!currentPngDataUrl) return;
    const link = document.createElement('a');
    link.href = currentPngDataUrl;
    const safeName = (currentStudent.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Certificate_${currentStudent.cert_no}_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Download Print-Ready PDF
  async function downloadPrintReadyPdf() {
    if (!currentPngDataUrl || !currentStudent) return;

    try {
      // Check for jsPDF
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        alert('PDF generator library is loading, please try again in a few moments.');
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
      console.error(err);
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
      prompt('Copy this link:', url);
    });
  }

  function showError(msg) {
    resultContainer.style.display = 'none';
    errorMessage.textContent = msg;
    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showLoading(isLoading) {
    const btn = document.getElementById('searchBtn');
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

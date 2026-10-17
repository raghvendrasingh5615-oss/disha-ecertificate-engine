// Disha E-Certificate Bulk Engine & Canva-Style Mapper

(function() {
  'use strict';

  // State
  let templateConfig = null;
  let templateImage = new Image();
  let imageLoaded = false;
  let selectedFieldKey = 'name';
  let editorMode = 'mapper'; // 'mapper' or 'preview'
  let zoomLevel = 0.65; // default scale for editor viewport
  let studentsData = [];
  let sampleStudentIndex = 12; // Mayank Aggarwal (row 13)

  // Interaction State for Drag & Resize
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
  let dragStartX = 0;
  let dragStartY = 0;
  let originalFieldState = null;

  // DOM Elements
  const canvas = document.getElementById('editorCanvas');
  const ctx = canvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const mouseCoordsEl = document.getElementById('mouseCoords');
  const imageDimsEl = document.getElementById('imageDims');
  const selectedFieldBadge = document.getElementById('selectedFieldBadge');
  const zoomText = document.getElementById('zoomText');

  // Inspector Elements
  const fieldSelect = document.getElementById('fieldSelect');
  const fieldChipsContainer = document.getElementById('fieldChipsContainer');
  const propLabel = document.getElementById('propLabel');
  const propCsvCol = document.getElementById('propCsvCol');
  const propPlaceholder = document.getElementById('propPlaceholder');
  const propX = document.getElementById('propX');
  const propY = document.getElementById('propY');
  const propMaxWidth = document.getElementById('propMaxWidth');
  const propHeight = document.getElementById('propHeight');
  const propFontFamily = document.getElementById('propFontFamily');
  const propFontSize = document.getElementById('propFontSize');
  const propFontWeight = document.getElementById('propFontWeight');
  const propColor = document.getElementById('propColor');
  const propColorHex = document.getElementById('propColorHex');
  const propTextAlign = document.getElementById('propTextAlign');
  const propTextTransform = document.getElementById('propTextTransform');

  // CSV Generator Elements
  const csvTableBody = document.getElementById('csvTableBody');
  const certPrefix = document.getElementById('certPrefix');
  const certStart = document.getElementById('certStart');
  const certPadding = document.getElementById('certPadding');
  const totalRowsCount = document.getElementById('totalRowsCount');
  const progressModal = document.getElementById('progressModal');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  // Initialize
  async function init() {
    await document.fonts.ready;
    bindEvents();
    await loadActiveTemplate();
    await loadInitialStudents();
  }

  // Load Active Template from backend (with static CDN fallback for Netlify)
  async function loadActiveTemplate() {
    try {
      let data = null;
      try {
        const res = await fetch('/api/templates/active');
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('API /api/templates/active failed, trying static fallback...');
      }

      // Static fallback for Netlify
      if (!data) {
        try {
          const staticRes = await fetch('/data/database.json');
          if (staticRes.ok) {
            const staticDb = await staticRes.json();
            data = staticDb.templates.find(t => t.id === staticDb.activeTemplateId) || staticDb.templates[0];
          }
        } catch (e) {
          console.warn('Static template fallback error:', e);
        }
      }

      if (!data) throw new Error('Failed to load active template');
      templateConfig = data;

      document.getElementById('templateNameInput').value = templateConfig.name || '';
      document.getElementById('eventNameInput').value = templateConfig.event || '';

      // Load Image
      templateImage.crossOrigin = 'anonymous';
      templateImage.onload = () => {
        imageLoaded = true;
        templateConfig.naturalWidth = templateImage.naturalWidth;
        templateConfig.naturalHeight = templateImage.naturalHeight;
        imageDimsEl.textContent = `${templateImage.naturalWidth} × ${templateImage.naturalHeight} px`;
        fitCanvasToViewport();
        renderFieldChips();
        updateInspector();
        renderCanvas();
      };
      templateImage.onerror = () => {
        showToast('Error loading template image bitmap', 'error');
      };
      templateImage.src = templateConfig.imageUrl;
    } catch (err) {
      console.error(err);
      showToast('Could not load template from database', 'error');
    }
  }

  // Load initial students (13 records including 24CVSCB013)
  async function loadInitialStudents() {
    try {
      let certs = null;
      try {
        const res = await fetch('/api/certificates');
        if (res.ok) {
          certs = await res.json();
        }
      } catch (e) {
        console.warn('API /api/certificates failed, trying static fallback...');
      }

      // Static fallback for Netlify
      if (!certs || !Array.isArray(certs) || certs.length === 0) {
        try {
          const staticRes = await fetch('/data/database.json');
          if (staticRes.ok) {
            const staticDb = await staticRes.json();
            certs = staticDb.students;
          }
        } catch (e) {
          console.warn('Static students fallback error:', e);
        }
      }

      if (Array.isArray(certs) && certs.length > 0) {
        studentsData = certs;
        totalRowsCount.textContent = `${studentsData.length} Students`;
        renderCsvTable();
      }
    } catch (err) {
      console.error('Error loading certificates:', err);
    }
  }

  // Fit canvas into viewport
  function fitCanvasToViewport() {
    if (!imageLoaded) return;
    const viewport = document.querySelector('.canvas-viewport');
    const availableWidth = viewport.clientWidth - 80;
    const availableHeight = viewport.clientHeight - 80;

    const scaleX = availableWidth / templateImage.naturalWidth;
    const scaleY = availableHeight / templateImage.naturalHeight;
    zoomLevel = Math.min(scaleX, scaleY, 0.85);
    updateCanvasScale();
  }

  function updateCanvasScale() {
    if (!imageLoaded) return;
    const displayW = Math.round(templateImage.naturalWidth * zoomLevel);
    const displayH = Math.round(templateImage.naturalHeight * zoomLevel);

    canvas.width = displayW;
    canvas.height = displayH;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    zoomText.textContent = `${Math.round(zoomLevel * 100)}%`;
    renderCanvas();
  }

  // Main Canvas Render
  function renderCanvas() {
    if (!imageLoaded || !templateConfig) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background template image
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    if (editorMode === 'mapper') {
      renderMapperMode();
    } else {
      renderPreviewMode();
    }
  }

  // Render Bounding Box Mapper Mode
  function renderMapperMode() {
    const fields = templateConfig.fields;
    const scale = zoomLevel;

    // First pass: render non-selected bounding boxes
    Object.keys(fields).forEach(key => {
      if (key !== selectedFieldKey) {
        drawBoundingBox(key, fields[key], scale, false);
      }
    });

    // Second pass: render selected bounding box with handles on top
    if (selectedFieldKey && fields[selectedFieldKey]) {
      drawBoundingBox(selectedFieldKey, fields[selectedFieldKey], scale, true);
    }
  }

  // Draw individual bounding box
  function drawBoundingBox(key, field, scale, isSelected) {
    const sx = field.x * scale;
    const sy = field.y * scale;
    const sw = field.maxWidth * scale;
    const sh = (field.height || 40) * scale;

    ctx.save();

    // Box fill & border
    if (isSelected) {
      ctx.fillStyle = 'rgba(18, 67, 156, 0.12)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#12439c';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
    } else {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    // Label tag
    const tagText = `{{${key}}}`;
    ctx.font = '600 11px Inter, sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 10;
    ctx.fillStyle = isSelected ? '#12439c' : '#475569';
    ctx.fillRect(sx, Math.max(0, sy - 18), tagWidth, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagText, sx + 5, Math.max(12, sy - 5));

    // Sample Text rendering inside the box
    const sampleText = field.placeholder || `{{${key}}}`;
    const scaledFontSize = Math.max(10, Math.round((field.fontSize || 24) * scale));
    ctx.font = `${field.fontWeight || 400} ${scaledFontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;
    ctx.fillStyle = field.color || '#000000';
    ctx.textBaseline = 'middle';

    let textX = sx;
    if (field.textAlign === 'center') {
      textX = sx + sw / 2;
      ctx.textAlign = 'center';
    } else if (field.textAlign === 'right') {
      textX = sx + sw - 6;
      ctx.textAlign = 'right';
    } else {
      textX = sx + 6;
      ctx.textAlign = 'left';
    }

    const textY = sy + sh / 2;
    ctx.fillText(sampleText, textX, textY);

    // Draw 8 handles if selected
    if (isSelected) {
      drawHandles(sx, sy, sw, sh);
    }

    ctx.restore();
  }

  // Draw 8 Resize Handles (Canva Style)
  function drawHandles(x, y, w, h) {
    const handleSize = 8;
    const half = handleSize / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#12439c';
    ctx.lineWidth = 2;

    const points = [
      { id: 'nw', x: x - half, y: y - half },
      { id: 'n',  x: x + w / 2 - half, y: y - half },
      { id: 'ne', x: x + w - half, y: y - half },
      { id: 'e',  x: x + w - half, y: y + h / 2 - half },
      { id: 'se', x: x + w - half, y: y + h - half },
      { id: 's',  x: x + w / 2 - half, y: y + h - half },
      { id: 'sw', x: x - half, y: y + h - half },
      { id: 'w',  x: x - half, y: y + h / 2 - half }
    ];

    points.forEach(p => {
      ctx.fillRect(p.x, p.y, handleSize, handleSize);
      ctx.strokeRect(p.x, p.y, handleSize, handleSize);
    });
  }

  // Render Live Preview Mode (Drawing actual student data with auto-shrink text)
  function renderPreviewMode() {
    const student = studentsData[sampleStudentIndex] || {
      name: 'Mayank Aggarwal',
      cert_no: '24CVSCB013',
      branch: 'Computer Science & Engineering',
      year: 'I Year',
      event: 'Computer Vision based Smart Conveyer Belt Workshop',
      date: '2024-06-26'
    };

    const fields = templateConfig.fields;
    const scale = zoomLevel;

    Object.keys(fields).forEach(key => {
      const field = fields[key];
      let val = student[field.csvColumn || key] || student[key] || '';
      if (!val && key === 'verification_url') {
        val = `https://disha.mbm.ac.in/ecertificates?cert=${student.cert_no || '24CVSCB013'}`;
      }

      // Format placeholder if template syntax is used e.g. "Cert. No. {cert_no}"
      let displayText = val;
      if (field.placeholder && field.placeholder.includes(`{${key}}`)) {
        displayText = field.placeholder.replace(`{${key}}`, val);
      } else if (field.placeholder && field.placeholder.includes('{cert_no}')) {
        displayText = field.placeholder.replace('{cert_no}', student.cert_no || '24CVSCB013');
      }

      if (field.textTransform === 'uppercase') {
        displayText = displayText.toUpperCase();
      } else if (field.textTransform === 'capitalize') {
        displayText = displayText.replace(/\b\w/g, c => c.toUpperCase());
      }

      // Native box coordinates
      const sx = field.x * scale;
      const sy = field.y * scale;
      const sw = field.maxWidth * scale;
      const sh = (field.height || 40) * scale;

      // Auto-shrink font logic scaled to canvas
      let targetFontSize = Math.round((field.fontSize || 24) * scale);
      const fontStyleStr = field.fontStyle ? `${field.fontStyle} ` : '';
      ctx.save();
      ctx.font = `${fontStyleStr}${field.fontWeight || 400} ${targetFontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;

      let measuredWidth = ctx.measureText(displayText).width;
      while (measuredWidth > sw && targetFontSize > 8) {
        targetFontSize -= 1;
        ctx.font = `${fontStyleStr}${field.fontWeight || 400} ${targetFontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;
        measuredWidth = ctx.measureText(displayText).width;
      }

      ctx.fillStyle = field.color || '#0f172a';
      ctx.textBaseline = 'middle';

      let textX = sx;
      if (field.textAlign === 'center') {
        textX = sx + sw / 2;
        ctx.textAlign = 'center';
      } else if (field.textAlign === 'right') {
        textX = sx + sw;
        ctx.textAlign = 'right';
      } else {
        textX = sx;
        ctx.textAlign = 'left';
      }

      ctx.fillText(displayText, textX, sy + sh / 2);
      ctx.restore();
    });
  }

  // Handle detection on mouse hover
  function getHandleAt(nativeX, nativeY, field) {
    const handleThreshold = 14 / zoomLevel; // tolerance in native px
    const x = field.x;
    const y = field.y;
    const w = field.maxWidth;
    const h = field.height || 40;

    const handles = {
      nw: { x: x, y: y },
      n:  { x: x + w / 2, y: y },
      ne: { x: x + w, y: y },
      e:  { x: x + w, y: y + h / 2 },
      se: { x: x + w, y: y + h },
      s:  { x: x + w / 2, y: y + h },
      sw: { x: x, y: y + h },
      w:  { x: x, y: y + h / 2 }
    };

    for (const [key, pt] of Object.entries(handles)) {
      if (Math.abs(nativeX - pt.x) <= handleThreshold && Math.abs(nativeY - pt.y) <= handleThreshold) {
        return key;
      }
    }
    return null;
  }

  // Check if point is inside field
  function isInsideField(nativeX, nativeY, field) {
    return nativeX >= field.x && nativeX <= field.x + field.maxWidth &&
           nativeY >= field.y && nativeY <= field.y + (field.height || 40);
  }

  // Bind Canvas Mouse and Touch Events
  function bindEvents() {
    // Canvas Mouse Move
    canvas.addEventListener('mousemove', e => {
      if (!imageLoaded || !templateConfig) return;
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const nativeX = Math.round(canvasX / zoomLevel);
      const nativeY = Math.round(canvasY / zoomLevel);

      mouseCoordsEl.textContent = `X: ${nativeX}, Y: ${nativeY}`;

      if (editorMode !== 'mapper') return;

      const fields = templateConfig.fields;
      const activeField = fields[selectedFieldKey];

      // Handle active drag/resize operation
      if (isDragging && activeField) {
        const dx = nativeX - dragStartX;
        const dy = nativeY - dragStartY;
        activeField.x = Math.max(0, Math.min(templateConfig.naturalWidth - activeField.maxWidth, originalFieldState.x + dx));
        activeField.y = Math.max(0, Math.min(templateConfig.naturalHeight - (activeField.height || 40), originalFieldState.y + dy));
        updateInspectorNumbers();
        renderCanvas();
        return;
      }

      if (isResizing && activeField) {
        const dx = nativeX - dragStartX;
        const dy = nativeY - dragStartY;

        switch (resizeHandle) {
          case 'e':
            activeField.maxWidth = Math.max(40, originalFieldState.maxWidth + dx);
            break;
          case 'w':
            const newW = Math.max(40, originalFieldState.maxWidth - dx);
            activeField.x = originalFieldState.x + (originalFieldState.maxWidth - newW);
            activeField.maxWidth = newW;
            break;
          case 's':
            activeField.height = Math.max(20, originalFieldState.height + dy);
            break;
          case 'n':
            const newH = Math.max(20, originalFieldState.height - dy);
            activeField.y = originalFieldState.y + (originalFieldState.height - newH);
            activeField.height = newH;
            break;
          case 'se':
            activeField.maxWidth = Math.max(40, originalFieldState.maxWidth + dx);
            activeField.height = Math.max(20, originalFieldState.height + dy);
            break;
          case 'sw':
            const newWSw = Math.max(40, originalFieldState.maxWidth - dx);
            activeField.x = originalFieldState.x + (originalFieldState.maxWidth - newWSw);
            activeField.maxWidth = newWSw;
            activeField.height = Math.max(20, originalFieldState.height + dy);
            break;
          case 'ne':
            activeField.maxWidth = Math.max(40, originalFieldState.maxWidth + dx);
            const newHNe = Math.max(20, originalFieldState.height - dy);
            activeField.y = originalFieldState.y + (originalFieldState.height - newHNe);
            activeField.height = newHNe;
            break;
          case 'nw':
            const newWNw = Math.max(40, originalFieldState.maxWidth - dx);
            activeField.x = originalFieldState.x + (originalFieldState.maxWidth - newWNw);
            activeField.maxWidth = newWNw;
            const newHNw = Math.max(20, originalFieldState.height - dy);
            activeField.y = originalFieldState.y + (originalFieldState.height - newHNw);
            activeField.height = newHNw;
            break;
        }

        updateInspectorNumbers();
        renderCanvas();
        return;
      }

      // Cursor updates based on hover
      if (activeField) {
        const handle = getHandleAt(nativeX, nativeY, activeField);
        if (handle) {
          if (['nw', 'se'].includes(handle)) canvas.style.cursor = 'nwse-resize';
          else if (['ne', 'sw'].includes(handle)) canvas.style.cursor = 'nesw-resize';
          else if (['e', 'w'].includes(handle)) canvas.style.cursor = 'ew-resize';
          else if (['n', 's'].includes(handle)) canvas.style.cursor = 'ns-resize';
          return;
        }
      }

      // Check if hovering any field box
      let hoveredAny = false;
      for (const [key, f] of Object.entries(fields)) {
        if (isInsideField(nativeX, nativeY, f)) {
          canvas.style.cursor = 'move';
          hoveredAny = true;
          break;
        }
      }

      if (!hoveredAny) {
        canvas.style.cursor = 'default';
      }
    });

    // Canvas Mouse Down
    canvas.addEventListener('mousedown', e => {
      if (!imageLoaded || !templateConfig || editorMode !== 'mapper') return;
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const nativeX = Math.round(canvasX / zoomLevel);
      const nativeY = Math.round(canvasY / zoomLevel);

      const fields = templateConfig.fields;
      const activeField = fields[selectedFieldKey];

      // Check handle on active field first
      if (activeField) {
        const handle = getHandleAt(nativeX, nativeY, activeField);
        if (handle) {
          isResizing = true;
          resizeHandle = handle;
          dragStartX = nativeX;
          dragStartY = nativeY;
          originalFieldState = { ...activeField };
          return;
        }
      }

      // Check clicking inside any field to select & drag
      for (const [key, f] of Object.entries(fields)) {
        if (isInsideField(nativeX, nativeY, f)) {
          selectField(key);
          isDragging = true;
          dragStartX = nativeX;
          dragStartY = nativeY;
          originalFieldState = { ...f };
          renderCanvas();
          return;
        }
      }
    });

    // Canvas Mouse Up
    window.addEventListener('mouseup', () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
        renderCanvas();
      }
    });

    // Zoom buttons
    document.getElementById('zoomInBtn').addEventListener('click', () => {
      zoomLevel = Math.min(2.0, zoomLevel + 0.1);
      updateCanvasScale();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      zoomLevel = Math.max(0.2, zoomLevel - 0.1);
      updateCanvasScale();
    });

    document.getElementById('zoomFitBtn').addEventListener('click', () => {
      fitCanvasToViewport();
    });

    // Mode Toggle
    document.getElementById('modeMapperBtn').addEventListener('click', () => {
      editorMode = 'mapper';
      document.getElementById('modeMapperBtn').classList.add('active');
      document.getElementById('modePreviewBtn').classList.remove('active');
      renderCanvas();
    });

    document.getElementById('modePreviewBtn').addEventListener('click', () => {
      editorMode = 'preview';
      document.getElementById('modePreviewBtn').classList.add('active');
      document.getElementById('modeMapperBtn').classList.remove('active');
      renderCanvas();
    });

    // Save Template Mapping Button
    document.getElementById('saveTemplateBtn').addEventListener('click', saveTemplateConfig);

    // Upload Blank Template Image
    document.getElementById('uploadTemplateInput').addEventListener('change', uploadBlankTemplate);

    // Inspector Inputs change listeners
    bindInspectorInputs();

    // CSV & Auto Serial Generator listeners
    bindCsvGenerator();
  }

  // Select field and sync with inspector
  function selectField(key) {
    if (!templateConfig.fields[key]) return;
    selectedFieldKey = key;
    selectedFieldBadge.textContent = `Selected: {{${key}}}`;
    renderFieldChips();
    updateInspector();
    renderCanvas();
  }

  // Render Field Chips in Inspector
  function renderFieldChips() {
    fieldChipsContainer.innerHTML = '';
    fieldSelect.innerHTML = '';

    Object.keys(templateConfig.fields).forEach(key => {
      // Chip
      const chip = document.createElement('button');
      chip.className = `field-chip ${key === selectedFieldKey ? 'active' : ''}`;
      chip.textContent = `{{${key}}}`;
      chip.addEventListener('click', () => selectField(key));
      fieldChipsContainer.appendChild(chip);

      // Select Option
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${templateConfig.fields[key].label || key} ({{${key}}})`;
      if (key === selectedFieldKey) opt.selected = true;
      fieldSelect.appendChild(opt);
    });

    fieldSelect.onchange = e => selectField(e.target.value);
  }

  // Update Inspector Form Fields
  function updateInspector() {
    const field = templateConfig.fields[selectedFieldKey];
    if (!field) return;

    propLabel.value = field.label || selectedFieldKey;
    propCsvCol.value = field.csvColumn || selectedFieldKey;
    propPlaceholder.value = field.placeholder || '';
    propX.value = Math.round(field.x);
    propY.value = Math.round(field.y);
    propMaxWidth.value = Math.round(field.maxWidth);
    propHeight.value = Math.round(field.height || 40);
    propFontFamily.value = field.fontFamily || 'Roboto';
    propFontSize.value = field.fontSize || 24;
    propFontWeight.value = field.fontWeight || '400';
    propColor.value = field.color || '#000000';
    propColorHex.value = field.color || '#000000';
    propTextAlign.value = field.textAlign || 'center';
    propTextTransform.value = field.textTransform || 'none';
  }

  // Update only numeric inputs while dragging to avoid input focus issues
  function updateInspectorNumbers() {
    const field = templateConfig.fields[selectedFieldKey];
    if (!field) return;
    propX.value = Math.round(field.x);
    propY.value = Math.round(field.y);
    propMaxWidth.value = Math.round(field.maxWidth);
    propHeight.value = Math.round(field.height || 40);
  }

  // Bind Inspector Input Events
  function bindInspectorInputs() {
    const syncNumber = (input, key) => {
      input.addEventListener('input', () => {
        if (!templateConfig.fields[selectedFieldKey]) return;
        templateConfig.fields[selectedFieldKey][key] = Number(input.value) || 0;
        renderCanvas();
      });
    };

    syncNumber(propX, 'x');
    syncNumber(propY, 'y');
    syncNumber(propMaxWidth, 'maxWidth');
    syncNumber(propHeight, 'height');
    syncNumber(propFontSize, 'fontSize');

    propLabel.addEventListener('input', () => {
      templateConfig.fields[selectedFieldKey].label = propLabel.value;
    });

    propCsvCol.addEventListener('input', () => {
      templateConfig.fields[selectedFieldKey].csvColumn = propCsvCol.value;
    });

    propPlaceholder.addEventListener('input', () => {
      templateConfig.fields[selectedFieldKey].placeholder = propPlaceholder.value;
      renderCanvas();
    });

    propFontFamily.addEventListener('change', () => {
      templateConfig.fields[selectedFieldKey].fontFamily = propFontFamily.value;
      renderCanvas();
    });

    propFontWeight.addEventListener('change', () => {
      templateConfig.fields[selectedFieldKey].fontWeight = propFontWeight.value;
      renderCanvas();
    });

    propColor.addEventListener('input', () => {
      propColorHex.value = propColor.value;
      templateConfig.fields[selectedFieldKey].color = propColor.value;
      renderCanvas();
    });

    propColorHex.addEventListener('input', () => {
      propColor.value = propColorHex.value;
      templateConfig.fields[selectedFieldKey].color = propColorHex.value;
      renderCanvas();
    });

    propTextAlign.addEventListener('change', () => {
      templateConfig.fields[selectedFieldKey].textAlign = propTextAlign.value;
      renderCanvas();
    });

    propTextTransform.addEventListener('change', () => {
      templateConfig.fields[selectedFieldKey].textTransform = propTextTransform.value;
      renderCanvas();
    });

    // Add Custom Column
    document.getElementById('addCustomColBtn').addEventListener('click', () => {
      const colName = prompt('Enter custom column key name (e.g. mentor, position, grade):');
      if (!colName) return;
      const cleanKey = colName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (templateConfig.fields[cleanKey]) {
        alert('Field already exists!');
        return;
      }

      templateConfig.fields[cleanKey] = {
        label: colName.trim(),
        placeholder: `{${cleanKey}}`,
        csvColumn: cleanKey,
        x: 400,
        y: 400,
        maxWidth: 400,
        height: 40,
        fontSize: 24,
        fontFamily: 'Roboto',
        fontWeight: '400',
        color: '#1e293b',
        textAlign: 'center',
        textTransform: 'none'
      };

      selectField(cleanKey);
      showToast(`Added custom field {{${cleanKey}}}`, 'success');
    });

    // Delete Field
    document.getElementById('deleteFieldBtn').addEventListener('click', () => {
      if (Object.keys(templateConfig.fields).length <= 1) {
        alert('You must keep at least one field');
        return;
      }
      if (confirm(`Delete field {{${selectedFieldKey}}}?`)) {
        delete templateConfig.fields[selectedFieldKey];
        selectedFieldKey = Object.keys(templateConfig.fields)[0];
        selectField(selectedFieldKey);
        showToast('Field deleted', 'info');
      }
    });
  }

  // Upload Blank Template Image
  async function uploadBlankTemplate(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('templateImage', file);

    try {
      showToast('Uploading template image...', 'info');
      const res = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      templateConfig.imageUrl = data.imageUrl;
      templateImage = new Image();
      templateImage.crossOrigin = 'anonymous';
      templateImage.onload = () => {
        imageLoaded = true;
        templateConfig.naturalWidth = templateImage.naturalWidth;
        templateConfig.naturalHeight = templateImage.naturalHeight;
        imageDimsEl.textContent = `${templateImage.naturalWidth} × ${templateImage.naturalHeight} px`;
        fitCanvasToViewport();
        showToast('New blank template loaded successfully!', 'success');
      };
      templateImage.src = data.imageUrl;
    } catch (err) {
      console.error(err);
      showToast('Error uploading blank template: ' + err.message, 'error');
    }
  }

  // Save Template Config to Backend Database
  async function saveTemplateConfig() {
    try {
      templateConfig.name = document.getElementById('templateNameInput').value;
      templateConfig.event = document.getElementById('eventNameInput').value;

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateConfig)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');

      showToast('Template coordinates & config saved to database!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error saving template: ' + err.message, 'error');
    }
  }

  // CSV and Auto Serial Generator bindings
  function bindCsvGenerator() {
    // Drawer toggle
    const drawer = document.getElementById('csvDrawer');
    document.getElementById('drawerToggleBtn').addEventListener('click', () => {
      drawer.classList.toggle('collapsed');
      drawer.classList.toggle('expanded');
    });

    // Load sample CSV button
    document.getElementById('loadSampleCsvBtn').addEventListener('click', async () => {
      try {
        const res = await fetch('/sample_students.csv');
        const text = await res.text();
        parseCsvText(text);
        showToast('Loaded sample_students.csv (15 records)', 'success');
      } catch (err) {
        showToast('Error loading sample CSV: ' + err.message, 'error');
      }
    });

    // Upload custom CSV file
    document.getElementById('csvFileInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        parseCsvText(ev.target.result);
        showToast(`Loaded CSV: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    });

    // Apply Auto Serial Generator
    document.getElementById('applyGeneratorBtn').addEventListener('click', applyAutoCertificateNumbers);

    // Save records to database
    document.getElementById('saveDbBtn').addEventListener('click', saveRecordsToDatabase);

    // Bulk Download ZIP (PNGs)
    document.getElementById('bulkZipBtn').addEventListener('click', bulkDownloadZip);
  }

  // Parse CSV Text
  function parseCsvText(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV must contain a header row and at least one student data row');
      return;
    }

    const headers = parseCsvRow(lines[0]);
    studentsData = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvRow(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => {
        const key = h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        obj[key] = row[idx] ? row[idx].trim() : '';
      });
      studentsData.push(obj);
    }

    applyAutoCertificateNumbers();
  }

  // Robust CSV row splitter
  function parseCsvRow(rowText) {
    const result = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry);
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry);
    return result;
  }

  // Auto Certificate Number Generator
  function applyAutoCertificateNumbers() {
    const prefix = (certPrefix.value || '24CVSCB').trim().toUpperCase();
    const startNum = parseInt(certStart.value, 10) || 1;
    const padding = parseInt(certPadding.value, 10) || 3;

    studentsData.forEach((student, idx) => {
      const serial = String(startNum + idx).padStart(padding, '0');
      student.cert_no = `${prefix}${serial}`;
    });

    totalRowsCount.textContent = `${studentsData.length} Students`;
    renderCsvTable();
    renderCanvas();
    showToast(`Generated numbers ${prefix}${String(startNum).padStart(padding, '0')} to ${prefix}${String(startNum + studentsData.length - 1).padStart(padding, '0')}`, 'success');
  }

  // Render CSV preview table
  function renderCsvTable() {
    csvTableBody.innerHTML = '';
    studentsData.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:var(--gray-500);">${idx + 1}</td>
        <td><strong>${escapeHtml(s.name || '')}</strong></td>
        <td><span class="cert-pill">${escapeHtml(s.cert_no || '')}</span></td>
        <td>${escapeHtml(s.branch || s.department || '')}</td>
        <td>${escapeHtml(s.year || s.class || '')}</td>
        <td>${escapeHtml(s.event || templateConfig.event || '')}</td>
        <td>${escapeHtml(s.date || '')}</td>
        <td>
          <button class="toolbar-btn preview-row-btn" data-idx="${idx}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">Preview</button>
        </td>
      `;
      csvTableBody.appendChild(tr);
    });

    document.querySelectorAll('.preview-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sampleStudentIndex = Number(btn.getAttribute('data-idx'));
        editorMode = 'preview';
        document.getElementById('modePreviewBtn').classList.add('active');
        document.getElementById('modeMapperBtn').classList.remove('active');
        renderCanvas();
        showToast(`Previewing certificate for ${studentsData[sampleStudentIndex].name}`, 'info');
      });
    });
  }

  // Save student records to database
  async function saveRecordsToDatabase() {
    if (studentsData.length === 0) {
      alert('No student records to save. Load a CSV first.');
      return;
    }

    try {
      showToast('Saving records to database...', 'info');
      const res = await fetch('/api/certificates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: studentsData,
          templateId: templateConfig.id
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');

      showToast(`Saved ${studentsData.length} certificates to database!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error saving certificates: ' + err.message, 'error');
    }
  }

  // Bulk Download ZIP (PNGs) - High-res rendering with auto-shrinking text
  async function bulkDownloadZip() {
    if (studentsData.length === 0) {
      alert('No student records found to generate ZIP.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('JSZip library is loading. Please try again in a moment.');
      return;
    }

    // Show progress modal
    progressModal.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = `Preparing 0 / ${studentsData.length} certificates...`;

    // Offscreen native canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = templateImage.naturalWidth;
    offCanvas.height = templateImage.naturalHeight;
    const offCtx = offCanvas.getContext('2d');

    const zip = new JSZip();
    const folder = zip.folder("Disha_Certificates");
    const fields = templateConfig.fields;

    try {
      for (let i = 0; i < studentsData.length; i++) {
        const student = studentsData[i];
        
        // 1. Draw template image at 100% native resolution
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        offCtx.drawImage(templateImage, 0, 0, offCanvas.width, offCanvas.height);

        // 2. Draw each mapped field
        Object.keys(fields).forEach(key => {
          const field = fields[key];
          let val = student[field.csvColumn || key] || student[key] || '';
          if (!val && key === 'verification_url') {
            val = `https://disha.mbm.ac.in/ecertificates?cert=${student.cert_no || ''}`;
          }

          let displayText = val;
          if (field.placeholder && field.placeholder.includes(`{${key}}`)) {
            displayText = field.placeholder.replace(`{${key}}`, val);
          } else if (field.placeholder && field.placeholder.includes('{cert_no}')) {
            displayText = field.placeholder.replace('{cert_no}', student.cert_no || '');
          }

          if (field.textTransform === 'uppercase') {
            displayText = displayText.toUpperCase();
          } else if (field.textTransform === 'capitalize') {
            displayText = displayText.replace(/\b\w/g, c => c.toUpperCase());
          }

          // Native pixel dimensions
          const x = field.x;
          const y = field.y;
          const mw = field.maxWidth;
          const h = field.height || 40;

          let fontSize = field.fontSize || 24;
          const fontStyleStr = field.fontStyle ? `${field.fontStyle} ` : '';
          offCtx.save();
          offCtx.font = `${fontStyleStr}${field.fontWeight || 400} ${fontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;

          // Automatic font-size shrinking
          let textWidth = offCtx.measureText(displayText).width;
          while (textWidth > mw && fontSize > 10) {
            fontSize -= 1;
            offCtx.font = `${fontStyleStr}${field.fontWeight || 400} ${fontSize}px "${field.fontFamily || 'Roboto'}", sans-serif`;
            textWidth = offCtx.measureText(displayText).width;
          }

          offCtx.fillStyle = field.color || '#000000';
          offCtx.textBaseline = 'middle';

          let renderX = x;
          if (field.textAlign === 'center') {
            renderX = x + mw / 2;
            offCtx.textAlign = 'center';
          } else if (field.textAlign === 'right') {
            renderX = x + mw;
            offCtx.textAlign = 'right';
          } else {
            renderX = x;
            offCtx.textAlign = 'left';
          }

          offCtx.fillText(displayText, renderX, y + h / 2);
          offCtx.restore();
        });

        // 3. Convert offscreen canvas to PNG blob & add to zip
        const blob = await new Promise(resolve => offCanvas.toBlob(resolve, 'image/png'));
        const safeName = (student.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${student.cert_no || `CERT_${i+1}`}_${safeName}.png`;
        folder.file(filename, blob);

        // Update progress
        const percent = Math.round(((i + 1) / studentsData.length) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Generated ${i + 1} of ${studentsData.length} (${percent}%)...`;

        // Small timeout to allow UI rendering
        await new Promise(r => setTimeout(r, 20));
      }

      progressText.textContent = 'Compressing into ZIP archive...';
      const zipContent = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      link.download = `Disha_Certificates_${(certPrefix.value || '24CVSCB').trim()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Bulk ZIP generated & downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating ZIP: ' + err.message, 'error');
    } finally {
      progressModal.style.display = 'none';
    }
  }

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Start app
  window.addEventListener('DOMContentLoaded', init);
})();

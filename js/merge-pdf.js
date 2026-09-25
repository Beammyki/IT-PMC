const MergePdf = (() => {
  const pages = [];
  const sources = new Map();
  const fileKeys = new Set();
  const queuedFiles = [];
  let nextId = 0;
  let isLoading = false;
  let isMerging = false;
  let dragSourceId = null;
  let previewRequest = 0;
  let statusMessage = '';

  function getFileKind(file) {
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (file.type === 'image/jpeg' || /\.(jpe?g)$/.test(name)) return 'jpg';
    if (file.type === 'image/png' || name.endsWith('.png')) return 'png';
    return null;
  }

  function getFileKey(file) {
    return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
  }

  function setStatus(message, isError = false) {
    statusMessage = message;
    const el = document.getElementById('merge-status');
    if (el) {
      el.textContent = message;
      el.className = 'status-text merge-status' + (isError ? ' error' : '');
      el.style.display = message ? 'block' : 'none';
    }
    const section = document.getElementById('merge-file-section');
    if (section) section.style.display = pages.length || isLoading || message ? '' : 'none';
  }

  function setProgress(percent) {
    const track = document.getElementById('merge-track');
    const fill = document.getElementById('merge-fill');
    if (!track || !fill) return;
    track.style.display = percent >= 0 && percent < 100 ? 'block' : 'none';
    fill.style.width = `${percent}%`;
  }

  function updateStat() {
    const stat = document.getElementById('merge-stat');
    if (!stat) return;
    stat.innerHTML = `<strong>${sources.size}</strong> ไฟล์ · <strong>${pages.length}</strong> หน้า — ลากเพื่อจัดลำดับหรือหมุนทีละหน้า`;
  }

  function render() {
    const section = document.getElementById('merge-file-section');
    const grid = document.getElementById('merge-page-grid');
    const button = document.getElementById('merge-btn');
    const clearButton = document.getElementById('merge-clear-btn');
    if (!section) return;

    section.style.display = pages.length || isLoading || statusMessage ? '' : 'none';
    updateStat();
    if (button) button.disabled = pages.length < 2 || isLoading || isMerging;
    if (clearButton) clearButton.disabled = !pages.length || isLoading || isMerging;
    if (!grid) return;

    grid.innerHTML = '';
    pages.forEach((page, index) => {
      const item = document.createElement('article');
      item.className = 'merge-page-item';
      item.id = `merge-page-${page.id}`;
      item.dataset.pageId = page.id;
      item.draggable = !isLoading && !isMerging;
      item.style.setProperty('--merge-page-rotation', `${page.rotation}deg`);
      item.classList.toggle('is-rotated-sideways', page.rotation % 180 !== 0);
      item.setAttribute('aria-label', `หน้า ${index + 1} จาก ${page.file.name}`);
      item.innerHTML = `
        <button class="merge-page-preview" type="button" data-action="preview" aria-label="เปิดดูหน้า ${index + 1} ขนาดใหญ่">
          <img class="merge-page-thumb" alt="" ${page.thumbnail ? '' : 'hidden'} />
          <span class="merge-page-placeholder" ${page.thumbnail ? 'hidden' : ''}>กำลังสร้างภาพตัวอย่าง...</span>
        </button>
        <div class="merge-page-caption">
          <span class="merge-page-number">Page ${index + 1}</span>
          <span class="merge-page-source" title="${escapeHtml(page.file.name)}"></span>
        </div>
        <div class="merge-page-actions">
          <button class="action-btn" type="button" data-action="up" aria-label="เลื่อนหน้า ${index + 1} ขึ้น" ${index === 0 || isLoading || isMerging ? 'disabled' : ''}>↑</button>
          <button class="action-btn" type="button" data-action="down" aria-label="เลื่อนหน้า ${index + 1} ลง" ${index === pages.length - 1 || isLoading || isMerging ? 'disabled' : ''}>↓</button>
          <button class="action-btn merge-page-rotate" type="button" data-action="rotate" title="หมุนตามเข็มนาฬิกา 90°" aria-label="หมุนหน้า ${index + 1} ตามเข็มนาฬิกา 90 องศา" ${isLoading || isMerging ? 'disabled' : ''}>↻</button>
          <button class="action-btn action-btn--danger" type="button" data-action="remove" aria-label="ลบหน้า ${index + 1}" ${isLoading || isMerging ? 'disabled' : ''}>ลบหน้า</button>
        </div>
      `;

      const thumb = item.querySelector('.merge-page-thumb');
      if (page.thumbnail) thumb.src = page.thumbnail;
      const sourceLabel = item.querySelector('.merge-page-source');
      sourceLabel.textContent = page.kind === 'pdf'
        ? `${page.file.name} · หน้าเดิม ${page.pageIndex + 1}`
        : page.file.name;

      item.querySelector('[data-action="up"]').addEventListener('click', () => moveUp(index));
      item.querySelector('[data-action="down"]').addEventListener('click', () => moveDown(index));
      item.querySelector('[data-action="rotate"]').addEventListener('click', () => rotatePage(index));
      item.querySelector('[data-action="remove"]').addEventListener('click', () => removePage(index));
      item.querySelector('[data-action="preview"]').addEventListener('click', () => openPreview(page.id));
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
      grid.appendChild(item);
    });
  }

  function moveUp(index) {
    if (isLoading || isMerging || index <= 0 || index >= pages.length) return;
    [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    render();
  }

  function moveDown(index) {
    if (isLoading || isMerging || index < 0 || index >= pages.length - 1) return;
    [pages[index], pages[index + 1]] = [pages[index + 1], pages[index]];
    render();
  }

  function rotatePage(index) {
    if (isLoading || isMerging || index < 0 || index >= pages.length) return;
    const page = pages[index];
    page.rotation = (page.rotation + 90) % 360;
    render();
    setStatus(`หมุนหน้า ${index + 1} แล้ว ${page.rotation}°`);
  }

  function releaseSourceIfUnused(sourceId) {
    if (pages.some(page => page.sourceId === sourceId)) return;
    const source = sources.get(sourceId);
    if (!source) return;
    if (source.previewUrl) URL.revokeObjectURL(source.previewUrl);
    sources.delete(sourceId);
    fileKeys.delete(source.fileKey);
  }

  function removePage(index) {
    if (isLoading || isMerging || index < 0 || index >= pages.length) return;
    const [removed] = pages.splice(index, 1);
    releaseSourceIfUnused(removed.sourceId);
    render();
  }

  function handleDragStart(event) {
    if (isLoading || isMerging) {
      event.preventDefault();
      return;
    }
    dragSourceId = this.dataset.pageId;
    this.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragSourceId);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter() {
    if (this.dataset.pageId !== dragSourceId) this.classList.add('is-drop-target');
  }

  function handleDragLeave(event) {
    if (!this.contains(event.relatedTarget)) this.classList.remove('is-drop-target');
  }

  function handleDrop(event) {
    event.preventDefault();
    const sourceId = dragSourceId || event.dataTransfer.getData('text/plain');
    const from = pages.findIndex(page => page.id === sourceId);
    const to = pages.findIndex(page => page.id === this.dataset.pageId);
    if (from < 0 || to < 0 || from === to) return;
    const [page] = pages.splice(from, 1);
    pages.splice(to, 0, page);
    dragSourceId = null;
    render();
  }

  function handleDragEnd() {
    dragSourceId = null;
    document.querySelectorAll('.merge-page-item').forEach(item => {
      item.classList.remove('is-dragging', 'is-drop-target');
    });
  }

  function createPage(file, sourceId, kind, pageIndex, thumbnail = null) {
    return { id: String(++nextId), file, sourceId, kind, pageIndex, thumbnail, rotation: 0 };
  }

  async function openPreview(pageId) {
    const pageIndex = pages.findIndex(page => page.id === pageId);
    const page = pages[pageIndex];
    const dialog = document.getElementById('merge-preview-dialog');
    const image = document.getElementById('merge-preview-image');
    const loadingMessage = document.getElementById('merge-preview-loading');
    if (!page || !page.thumbnail || !dialog || !image || !loadingMessage) return;

    const requestId = ++previewRequest;
    document.getElementById('merge-preview-title').textContent = `Page ${pageIndex + 1}`;
    document.getElementById('merge-preview-source').textContent = page.kind === 'pdf'
      ? `${page.file.name} · หน้าเดิม ${page.pageIndex + 1}`
      : page.file.name;
    image.hidden = true;
    image.removeAttribute('src');
    image.style.transform = '';
    loadingMessage.textContent = page.kind === 'pdf' ? 'กำลังโหลดภาพความละเอียดสูง...' : '';
    loadingMessage.hidden = page.kind !== 'pdf';
    if (!dialog.open) dialog.showModal();

    if (page.kind !== 'pdf') {
      image.src = page.thumbnail;
      image.alt = `ตัวอย่างหน้า ${pageIndex + 1} จาก ${page.file.name}`;
      image.style.transform = `rotate(${page.rotation}deg)`;
      image.hidden = false;
      return;
    }

    let loadingTask;
    let pdf;
    let pdfPage;
    let canvas;
    try {
      const bytes = await page.file.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
      pdf = await loadingTask.promise;
      pdfPage = await pdf.getPage(page.pageIndex + 1);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(
        2.2,
        1600 / baseViewport.width,
        1400 / baseViewport.height,
        (window.innerWidth - 56) / baseViewport.width,
        (window.innerHeight - 168) / baseViewport.height
      );
      const viewport = pdfPage.getViewport({
        scale: Math.max(0.4, scale),
        rotation: (pdfPage.rotate + page.rotation) % 360,
      });
      canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      if (dialog.open && requestId === previewRequest) {
        image.src = canvas.toDataURL('image/jpeg', 0.92);
        image.alt = `ตัวอย่างหน้า ${pageIndex + 1} จาก ${page.file.name}`;
        image.style.transform = '';
        image.hidden = false;
        loadingMessage.hidden = true;
      }
    } catch (error) {
      if (dialog.open && requestId === previewRequest) {
        loadingMessage.textContent = `เปิดภาพตัวอย่างไม่ได้: ${error.message}`;
      }
    } finally {
      if (pdfPage) pdfPage.cleanup();
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      try {
        if (pdf) await pdf.destroy();
        else if (loadingTask) await loadingTask.destroy();
      } catch (_) {}
    }
  }

  async function addPdfPages(source) {
    if (!window.pdfjsLib) throw new Error('ไม่สามารถโหลดตัวแสดงตัวอย่าง PDF ได้');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const bytes = await source.file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
    let pdf;
    try {
      pdf = await loadingTask.promise;
      const sourcePages = [];
      for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
        const page = createPage(source.file, source.id, 'pdf', pageIndex);
        pages.push(page);
        sourcePages.push(page);
      }
      render();

      for (let i = 0; i < sourcePages.length; i++) {
        setStatus(`กำลังสร้างภาพตัวอย่าง ${i + 1}/${sourcePages.length}: ${source.file.name}`);
        const pdfPage = await pdf.getPage(i + 1);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(0.58, 220 / baseViewport.width, 250 / baseViewport.height);
        const viewport = pdfPage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        sourcePages[i].thumbnail = canvas.toDataURL('image/jpeg', 0.76);
        canvas.width = 0;
        canvas.height = 0;
        pdfPage.cleanup();

        const item = document.getElementById(`merge-page-${sourcePages[i].id}`);
        if (item) {
          const image = item.querySelector('.merge-page-thumb');
          image.src = sourcePages[i].thumbnail;
          image.hidden = false;
          item.querySelector('.merge-page-placeholder').hidden = true;
        }
      }
    } finally {
      if (pdf) await pdf.destroy();
      else await loadingTask.destroy();
    }
  }

  async function addFiles(newFiles) {
    const incoming = Array.from(newFiles || []);
    if (!incoming.length) return;
    if (isLoading || isMerging) {
      queuedFiles.push(...incoming);
      setStatus('รับไฟล์ไว้แล้ว จะเพิ่มหลังจากประมวลผลชุดปัจจุบันเสร็จ');
      return;
    }

    const accepted = [];
    let invalidCount = 0;
    let duplicateCount = 0;
    for (const file of incoming) {
      const kind = getFileKind(file);
      if (!kind) {
        invalidCount++;
        continue;
      }
      const fileKey = getFileKey(file);
      if (fileKeys.has(fileKey)) {
        duplicateCount++;
        continue;
      }
      fileKeys.add(fileKey);
      const source = { id: `source-${++nextId}`, file, fileKey, kind, previewUrl: null };
      sources.set(source.id, source);
      accepted.push(source);
    }

    if (!accepted.length) {
      const message = invalidCount
        ? 'รองรับเฉพาะไฟล์ PDF, JPG และ PNG'
        : duplicateCount ? 'ไฟล์ที่เลือกถูกเพิ่มไว้แล้ว' : '';
      setStatus(message, invalidCount > 0);
      return;
    }

    isLoading = true;
    render();
    setStatus('กำลังอ่านไฟล์และสร้างภาพตัวอย่าง...');
    const errors = [];

    for (const source of accepted) {
      try {
        if (source.kind === 'pdf') {
          await addPdfPages(source);
        } else {
          source.previewUrl = URL.createObjectURL(source.file);
          pages.push(createPage(source.file, source.id, source.kind, 0, source.previewUrl));
          render();
        }
      } catch (error) {
        for (let i = pages.length - 1; i >= 0; i--) {
          if (pages[i].sourceId === source.id) pages.splice(i, 1);
        }
        if (source.previewUrl) URL.revokeObjectURL(source.previewUrl);
        sources.delete(source.id);
        fileKeys.delete(source.fileKey);
        errors.push(`${source.file.name}: ${error.message}`);
      }
    }

    isLoading = false;
    render();
    if (errors.length) {
      setStatus(`เปิดไฟล์บางรายการไม่ได้: ${errors.join(' · ')}`, true);
    } else if (invalidCount) {
      setStatus(`เพิ่มไฟล์แล้ว · ข้าม ${invalidCount} ไฟล์ที่ไม่รองรับ`);
    } else if (duplicateCount) {
      setStatus(`เพิ่มไฟล์แล้ว · ข้าม ${duplicateCount} ไฟล์ที่ซ้ำ`);
    } else {
      setStatus('สร้างภาพตัวอย่างครบแล้ว ลากหรือใช้ปุ่มลูกศรเพื่อจัดลำดับหน้า');
    }
    processQueuedFiles();
  }

  function processQueuedFiles() {
    if (isLoading || isMerging || !queuedFiles.length) return;
    const nextBatch = queuedFiles.splice(0, queuedFiles.length);
    addFiles(nextBatch);
  }

  async function doMerge() {
    if (pages.length < 2 || isLoading || isMerging) return;
    isMerging = true;
    render();
    setProgress(0);
    setStatus('กำลังรวมหน้าตามลำดับที่จัดไว้...');

    try {
      if (!window.PDFLib) throw new Error('ไม่สามารถโหลดเครื่องมือสร้าง PDF ได้');
      const merged = await PDFLib.PDFDocument.create();
      const pdfCache = new Map();
      const imageCache = new Map();
      const orderedPages = [...pages];

      for (let i = 0; i < orderedPages.length; i++) {
        const item = orderedPages[i];
        setStatus(`กำลังเพิ่มหน้า ${i + 1}/${orderedPages.length}: ${item.file.name}`);
        if (item.kind === 'pdf') {
          let sourcePdf = pdfCache.get(item.sourceId);
          if (!sourcePdf) {
            sourcePdf = await PDFLib.PDFDocument.load(await item.file.arrayBuffer(), { ignoreEncryption: true });
            pdfCache.set(item.sourceId, sourcePdf);
          }
          const [page] = await merged.copyPages(sourcePdf, [item.pageIndex]);
          if (item.rotation) {
            page.setRotation(PDFLib.degrees((page.getRotation().angle + item.rotation) % 360));
          }
          merged.addPage(page);
        } else {
          let image = imageCache.get(item.sourceId);
          if (!image) {
            const bytes = await item.file.arrayBuffer();
            image = item.kind === 'jpg' ? await merged.embedJpg(bytes) : await merged.embedPng(bytes);
            imageCache.set(item.sourceId, image);
          }
          const sideways = item.rotation % 180 !== 0;
          const page = merged.addPage(sideways ? [image.height, image.width] : [image.width, image.height]);
          const drawPosition = {
            0: { x: 0, y: 0 },
            90: { x: image.height, y: 0 },
            180: { x: image.width, y: image.height },
            270: { x: 0, y: image.width },
          }[item.rotation];
          page.drawImage(image, {
            ...drawPosition,
            width: image.width,
            height: image.height,
            rotate: PDFLib.degrees(item.rotation),
          });
        }
        setProgress(Math.round(((i + 1) / orderedPages.length) * 88));
      }

      setStatus('กำลังสร้างไฟล์ PDF...');
      setProgress(95);
      const bytes = await merged.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProgress(100);
      setStatus(`รวม ${orderedPages.length} หน้า จาก ${sources.size} ไฟล์สำเร็จ — ดาวน์โหลดแล้ว`);
    } catch (error) {
      setStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
      isMerging = false;
      render();
      processQueuedFiles();
    }
  }

  function clearAll() {
    if (isLoading || isMerging) return;
    for (const source of sources.values()) {
      if (source.previewUrl) URL.revokeObjectURL(source.previewUrl);
    }
    pages.length = 0;
    sources.clear();
    fileKeys.clear();
    setStatus('');
    setProgress(-1);
    render();
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 02</span>
          <h1 class="page-title">Merge <em>PDF & Images</em></h1>
          <p class="page-desc">รวมไฟล์ PDF และรูปภาพ แล้วลากจัดลำดับ หมุน หรือลบทีละหน้าก่อนดาวน์โหลด</p>
        </div>

        <div class="drop-zone" id="merge-drop-zone" onclick="document.getElementById('merge-input').click()">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์ PDF หรือรูปภาพ (JPG/PNG)</p>
          <p class="drop-sub">เลือกได้หลายไฟล์ · ต้องมีอย่างน้อย 2 หน้า<br/><strong>คลิกหรือลากไฟล์มาวาง</strong></p>
          <input type="file" id="merge-input" accept=".pdf,.jpg,.jpeg,.png" multiple style="display:none" />
        </div>

        <div class="file-section merge-file-section" id="merge-file-section" style="display:none">
          <div class="list-toolbar">
            <span class="list-stat" id="merge-stat">0 ไฟล์ · 0 หน้า</span>
            <button class="action-btn action-btn--danger" id="merge-clear-btn" type="button">ล้างทั้งหมด</button>
          </div>
          <div class="merge-page-grid" id="merge-page-grid"></div>
          <div class="print-bar">
            <span class="selected-summary">ลากหน้าเพื่อจัดลำดับ ใช้ปุ่ม ↑↓ หรือ ↻ เพื่อหมุน แล้วกด Merge</span>
            <button class="btn btn--primary" id="merge-btn" type="button" disabled>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h7M3 12h4"/></svg>
              Merge & Download
            </button>
          </div>
          <div class="progress-track" id="merge-track"><div class="progress-fill" id="merge-fill"></div></div>
          <div class="status-text merge-status" id="merge-status" aria-live="polite"></div>
        </div>
        <dialog class="merge-preview-dialog" id="merge-preview-dialog" aria-labelledby="merge-preview-title">
          <div class="merge-preview-dialog__content">
            <header class="merge-preview-dialog__header">
              <div class="merge-preview-dialog__heading">
                <h2 id="merge-preview-title">Page preview</h2>
                <p id="merge-preview-source"></p>
              </div>
              <button class="merge-preview-close" type="button" aria-label="ปิดภาพตัวอย่าง">×</button>
            </header>
            <div class="merge-preview-stage">
              <p class="merge-preview-loading" id="merge-preview-loading" aria-live="polite" hidden></p>
              <img id="merge-preview-image" alt="" />
            </div>
            <p class="merge-preview-hint">กด Esc หรือคลิกด้านนอกเพื่อปิด</p>
          </div>
        </dialog>
      </div>
    `;

    const dropZone = document.getElementById('merge-drop-zone');
    const fileInput = document.getElementById('merge-input');
    fileInput.addEventListener('change', event => {
      addFiles(event.target.files);
      event.target.value = '';
    });
    dropZone.addEventListener('dragover', event => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', event => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');
      addFiles(event.dataTransfer.files);
    });
    document.getElementById('merge-clear-btn').addEventListener('click', clearAll);
    document.getElementById('merge-btn').addEventListener('click', doMerge);
    const previewDialog = document.getElementById('merge-preview-dialog');
    document.querySelector('.merge-preview-close').addEventListener('click', () => previewDialog.close());
    previewDialog.addEventListener('click', event => {
      if (event.target === previewDialog) previewDialog.close();
    });
    previewDialog.addEventListener('close', () => {
      previewRequest++;
      const image = document.getElementById('merge-preview-image');
      if (image) {
        image.removeAttribute('src');
        image.style.transform = '';
        image.hidden = true;
      }
    });
    render();
    if (statusMessage) setStatus(statusMessage);
  }

  return { renderPage, addFiles, removePage, moveUp, moveDown, rotatePage, doMerge, clearAll };
})();

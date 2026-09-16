const SplitPdf = (() => {
  let originalFile = null;
  let originalBytes = null;
  let pageOrder = []; // Array of original page indices (1-indexed)
  let thumbnails = {}; // map of page index to data URL

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError=false) {
    const el = document.getElementById('split-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setStatus('กรุณาอัปโหลดไฟล์ PDF เท่านั้น', true);
      return;
    }
    originalFile = file;
    document.getElementById('split-drop-zone').style.display = 'none';
    document.getElementById('split-workspace').style.display = 'block';
    document.getElementById('split-filename').textContent = `${file.name} (${fmt(file.size)})`;
    setStatus('กำลังโหลดหน้ากระดาษ...');
    
    try {
      originalBytes = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument({ data: originalBytes });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      pageOrder = [];
      thumbnails = {};
      const grid = document.getElementById('split-grid');
      grid.innerHTML = '';
      
      for (let i = 1; i <= numPages; i++) {
        pageOrder.push(i);
        // We will render thumbnails asynchronously
      }
      
      renderGrid();
      setStatus('');
      
      // Render thumbnails in background
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 }); // low scale for thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        thumbnails[i] = canvas.toDataURL('image/jpeg', 0.7);
        
        // Update the specific img element if it exists
        const imgEl = document.getElementById(`thumb-img-${i}`);
        if (imgEl) imgEl.src = thumbnails[i];
      }
      
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการโหลด PDF: ' + err.message, true);
    }
  }

  function renderGrid() {
    const grid = document.getElementById('split-grid');
    grid.innerHTML = '';
    
    pageOrder.forEach((pageNum, index) => {
      const item = document.createElement('div');
      item.className = 'split-item';
      item.draggable = true;
      item.dataset.index = index;
      item.dataset.pageNum = pageNum;
      
      // Drag and drop events
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('dragend', handleDragEnd);
      
      const imgSrc = thumbnails[pageNum] || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // empty transparent gif
      
      item.innerHTML = `
        <img id="thumb-img-${pageNum}" src="${imgSrc}" style="width:100%;height:auto;border:1px solid rgba(255,255,255,0.1);border-radius:4px;display:block;background:#fff;" />
        <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">
          Page ${pageNum}
        </div>
        <button class="split-del-btn" onclick="SplitPdf.deletePage(${index})" title="ลบหน้านี้">✕</button>
      `;
      grid.appendChild(item);
    });
    
    document.getElementById('split-total').textContent = `เหลือ ${pageOrder.length} หน้า`;
    document.getElementById('split-btn-save').disabled = pageOrder.length === 0;
  }

  let dragSrcEl = null;

  function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    this.classList.add('over');
  }

  function handleDragLeave(e) {
    this.classList.remove('over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
      const fromIndex = parseInt(dragSrcEl.dataset.index);
      const toIndex = parseInt(this.dataset.index);
      
      // Reorder array
      const item = pageOrder.splice(fromIndex, 1)[0];
      pageOrder.splice(toIndex, 0, item);
      
      renderGrid();
    }
    return false;
  }

  function handleDragEnd(e) {
    this.style.opacity = '1';
    const items = document.querySelectorAll('.split-item');
    items.forEach(item => item.classList.remove('over'));
  }

  function deletePage(index) {
    pageOrder.splice(index, 1);
    renderGrid();
  }

  async function savePdf() {
    if (pageOrder.length === 0) return;
    setStatus('กำลังสร้าง PDF ใหม่...');
    const btn = document.getElementById('split-btn-save');
    btn.disabled = true;
    
    try {
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(originalBytes);
      const newPdf = await PDFDocument.create();
      
      // pageOrder contains 1-based indices, PDFLib copyPages needs 0-based
      const indices = pageOrder.map(p => p - 1);
      const copiedPages = await newPdf.copyPages(pdfDoc, indices);
      
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      let newName = originalFile.name;
      if (newName.endsWith('.pdf')) newName = newName.substring(0, newName.length - 4);
      a.download = `${newName}_organized.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('บันทึกไฟล์สำเร็จแล้ว!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    originalFile = null;
    originalBytes = null;
    pageOrder = [];
    thumbnails = {};
    document.getElementById('split-drop-zone').style.display = 'flex';
    document.getElementById('split-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <style>
        .split-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; margin-top: 16px; }
        .split-item { position: relative; cursor: grab; transition: transform 0.2s; border: 2px solid transparent; border-radius: 6px; padding: 4px; background: rgba(255,255,255,0.02); }
        .split-item:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .split-item.over { border: 2px dashed var(--gold); background: rgba(201,168,76,0.1); }
        .split-del-btn { position: absolute; top: -8px; right: -8px; background: var(--red); color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 12px; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .split-item:hover .split-del-btn { display: flex; }
      </style>
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">Split & <em>Organize</em></h1>
          <p class="page-desc">ลากสลับหน้า ลบหน้ากระดาษเปล่า หรือแยกเฉพาะหน้าที่ต้องการ (ลากสลับตำแหน่งได้เลย)</p>
        </div>

        <div class="drop-zone" id="split-drop-zone" onclick="document.getElementById('split-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ PDF</p>
          <p class="drop-sub">คลิกหรือลากไฟล์มาวาง</p>
          <input type="file" id="split-input" accept=".pdf" style="display:none" onchange="SplitPdf.handleFile(this.files[0])" />
        </div>

        <div id="split-workspace" style="display:none;">
          <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
            <div>
              <div id="split-filename" style="font-weight: 500; font-size: 14px;"></div>
              <div id="split-total" style="font-size: 12px; color: var(--text-2); margin-top: 4px;"></div>
            </div>
            <div style="display:flex; gap: 8px;">
              <button class="btn btn--ghost" onclick="SplitPdf.reset()">ยกเลิก</button>
              <button class="btn btn--primary" id="split-btn-save" onclick="SplitPdf.savePdf()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                บันทึก & ดาวน์โหลด
              </button>
            </div>
          </div>
          <div id="split-status" style="font-size:13px; margin-bottom:16px; display:none;"></div>
          <div class="split-grid" id="split-grid"></div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('split-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, handleFile, deletePage, savePdf, reset };
})();

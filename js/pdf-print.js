/* ─────────────────────────────────────────────
   pdf-print.js — PDF Batch Print Tool
   ───────────────────────────────────────────── */

const PdfPrint = (() => {
  const files = [];
  const selected = new Set();

  /* ── Helpers ── */
  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('pdf-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const track = document.getElementById('pdf-progress-track');
    const fill  = document.getElementById('pdf-progress-fill');
    if (!track || !fill) return;
    track.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    fill.style.width = pct + '%';
  }

  /* ── File Management ── */
  function addFiles(newFiles) {
    for (const f of newFiles) {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isDupe = files.find(x => x.name === f.name && x.size === f.size);
      if (isPdf && !isDupe) {
        files.push(f);
        selected.add(files.length - 1);
      }
    }
    render();
    setStatus('');
  }

  function removeFile(i) {
    files.splice(i, 1);
    const newSel = new Set();
    selected.forEach(idx => {
      if (idx < i) newSel.add(idx);
      else if (idx > i) newSel.add(idx - 1);
    });
    selected.clear();
    newSel.forEach(idx => selected.add(idx));
    render();
  }

  function toggle(i) {
    selected.has(i) ? selected.delete(i) : selected.add(i);
    render();
  }

  function selectAll()  { files.forEach((_, i) => selected.add(i)); render(); }
  function deselectAll(){ selected.clear(); render(); }
  function clearAll()   { files.length = 0; selected.clear(); render(); setStatus(''); }

  /* ── Render ── */
  function render() {
    const section = document.getElementById('pdf-file-section');
    const listEl  = document.getElementById('pdf-file-list');
    const statEl  = document.getElementById('pdf-list-stat');
    const summEl  = document.getElementById('pdf-selected-summary');
    const printBtn = document.getElementById('pdf-print-btn');

    if (!section) return;

    section.style.display = files.length ? '' : 'none';

    const s = selected.size;
    if (statEl) {
      statEl.innerHTML = `<strong>${files.length}</strong> ไฟล์ในคิว`;
    }
    if (summEl) {
      summEl.innerHTML = s
        ? `เลือกแล้ว <strong>${s}</strong> จาก ${files.length} ไฟล์`
        : 'ยังไม่ได้เลือกไฟล์';
    }
    if (printBtn) printBtn.disabled = s === 0;

    if (!listEl) return;
    listEl.innerHTML = '';

    files.forEach((f, i) => {
      const isSel = selected.has(i);
      const item = document.createElement('div');
      item.className = 'file-item' + (isSel ? ' selected' : '');
      item.style.animationDelay = (i * 0.04) + 's';
      item.onclick = () => toggle(i);

      item.innerHTML = `
        <div class="checkbox">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 2.5" stroke="#0C0B09" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="pdf-tag">PDF</span>
        <span class="file-name" title="${f.name}">${f.name}</span>
        <span class="file-size">${formatBytes(f.size)}</span>
        <button class="file-remove" onclick="event.stopPropagation(); PdfPrint.removeFile(${i})" title="ลบออก">×</button>
      `;
      listEl.appendChild(item);
    });
  }

  /* ── Modal ── */
  function openConfirm() {
    const sel = [...selected].map(i => files[i]);
    const subtitle = document.getElementById('modal-subtitle');
    const list = document.getElementById('modal-list');

    if (subtitle) {
      subtitle.textContent = `จะรวม ${sel.length} ไฟล์เป็น PDF เดียว แล้วส่งไปยังเครื่องปริ้น`;
    }
    if (list) {
      list.innerHTML = sel.map(f => `
        <div class="modal-file-item">
          <span class="pdf-tag">PDF</span>
          <span>${f.name}</span>
        </div>
      `).join('');
    }
    document.getElementById('modal-overlay').classList.add('open');
  }

  /* ── Print Logic ── */
  async function executePrint() {
    const sel = [...selected].map(i => files[i]);
    const printBtn = document.getElementById('pdf-print-btn');
    if (printBtn) printBtn.disabled = true;

    setProgress(0);
    setStatus('กำลังโหลดและรวมไฟล์...');

    try {
      const merged = await PDFLib.PDFDocument.create();

      for (let i = 0; i < sel.length; i++) {
        setStatus(`กำลังประมวลผล: ${sel[i].name}`);
        const buffer = await sel[i].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(Math.round(((i + 1) / sel.length) * 80));
      }

      setStatus('กำลังสร้างไฟล์...');
      setProgress(90);

      const bytes = await merged.save();
      const blob  = new Blob([bytes], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('เปิดหน้าต่างปริ้น...');

      const win = window.open(url);
      if (win) {
        win.onload = () => {
          setTimeout(() => {
            win.print();
            URL.revokeObjectURL(url);
          }, 600);
        };
        setStatus('');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_print.pdf';
        a.click();
        setStatus('Popup ถูกบล็อก — ดาวน์โหลดไฟล์รวมให้แล้ว ปริ้นเองได้เลย');
      }
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    }

    setProgress(100);
    if (printBtn) printBtn.disabled = selected.size === 0;
  }

  /* ── Setup Drop Zone ── */
  function setupDropZone() {
    const dz = document.getElementById('pdf-drop-zone');
    const fi = document.getElementById('file-input');
    if (!dz || !fi) return;

    fi.addEventListener('change', e => {
      addFiles(e.target.files);
      e.target.value = '';
    });

    dz.addEventListener('dragover', e => {
      e.preventDefault();
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));

    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
  }

  /* ── Render Page ── */
  function renderPage() {
    const container = document.getElementById('page-container');
    if (!container) return;

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 01</span>
          <h1 class="page-title">PDF Batch <em>Print</em></h1>
          <p class="page-desc">เลือกไฟล์ PDF หลายไฟล์ เลือกว่าจะปริ้นไฟล์ไหน แล้วส่งออกทีเดียว — ทุกอย่างทำงานบนเครื่องคุณ ไม่มีข้อมูลออกไปไหน</p>
        </div>

        <div class="drop-zone" id="pdf-drop-zone" onclick="document.getElementById('file-input').click()">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">ลากไฟล์มาวางที่นี่</p>
          <p class="drop-sub">รองรับ PDF หลายไฟล์พร้อมกัน<br/><strong>คลิกเพื่อเปิด File Browser</strong></p>
          <input type="file" id="file-input" accept=".pdf" multiple/>
        </div>

        <div class="file-section" id="pdf-file-section" style="display:none">
          <div class="list-toolbar">
            <span class="list-stat" id="pdf-list-stat">0 ไฟล์</span>
            <div class="toolbar-actions">
              <button class="action-btn" onclick="PdfPrint.selectAll()">เลือกทั้งหมด</button>
              <button class="action-btn" onclick="PdfPrint.deselectAll()">ยกเลิก</button>
              <button class="action-btn action-btn--danger" onclick="PdfPrint.clearAll()">ล้างทั้งหมด</button>
            </div>
          </div>

          <div class="file-list" id="pdf-file-list"></div>

          <div class="print-bar">
            <span class="selected-summary" id="pdf-selected-summary">ยังไม่ได้เลือก</span>
            <button class="btn btn--primary" id="pdf-print-btn" disabled onclick="PdfPrint.openConfirm()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6V1h8v5M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3A1.5 1.5 0 0113.5 12H12M4 9.5h8V15H4z"/>
              </svg>
              ปริ้นที่เลือก
            </button>
          </div>

          <div class="progress-track" id="pdf-progress-track">
            <div class="progress-fill" id="pdf-progress-fill"></div>
          </div>
          <div class="status-text" id="pdf-status"></div>
        </div>
      </div>
    `;

    setupDropZone();
    render();
  }

  /* ── Public API ── */
  return {
    renderPage,
    removeFile,
    selectAll,
    deselectAll,
    clearAll,
    openConfirm,
    executePrint,
  };
})();

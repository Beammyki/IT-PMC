const MergePdf = (() => {
  const files = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if ((f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
          && !files.find(x => x.name === f.name && x.size === f.size)) {
        files.push(f);
      }
    }
    render();
  }

  function removeFile(i) { files.splice(i, 1); render(); }

  function moveUp(i)   { if (i > 0) { [files[i-1], files[i]] = [files[i], files[i-1]]; render(); } }
  function moveDown(i) { if (i < files.length-1) { [files[i], files[i+1]] = [files[i+1], files[i]]; render(); } }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('merge-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('merge-track');
    const f = document.getElementById('merge-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function render() {
    const sec  = document.getElementById('merge-file-section');
    const list = document.getElementById('merge-file-list');
    const btn  = document.getElementById('merge-btn');
    const stat = document.getElementById('merge-stat');
    if (!sec) return;

    sec.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์ — ลากเรียงลำดับได้`;
    if (btn) btn.disabled = files.length < 2;
    if (!list) return;

    list.innerHTML = '';
    files.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.animationDelay = (i * 0.04) + 's';
      div.innerHTML = `
        <span class="pdf-tag">PDF</span>
        <span class="file-name" title="${f.name}">${f.name}</span>
        <span class="file-size">${fmt(f.size)}</span>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="action-btn" onclick="MergePdf.moveUp(${i})" ${i===0?'disabled':''} style="padding:3px 7px">↑</button>
          <button class="action-btn" onclick="MergePdf.moveDown(${i})" ${i===files.length-1?'disabled':''} style="padding:3px 7px">↓</button>
        </div>
        <button class="file-remove" onclick="MergePdf.removeFile(${i})">×</button>
      `;
      list.appendChild(div);
    });
  }

  async function doMerge() {
    const btn = document.getElementById('merge-btn');
    if (btn) btn.disabled = true;
    setProgress(0);
    setStatus('กำลังรวมไฟล์...');
    try {
      const merged = await PDFLib.PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        setStatus(`กำลังโหลด: ${files[i].name}`);
        const buf = await files[i].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(Math.round(((i + 1) / files.length) * 85));
      }
      setStatus('กำลังสร้างไฟล์...');
      setProgress(95);
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      setStatus(`รวม ${files.length} ไฟล์สำเร็จ — ดาวน์โหลดแล้ว`);
    } catch (e) {
      setStatus('เกิดข้อผิดพลาด: ' + e.message, true);
    }
    if (btn) btn.disabled = files.length < 2;
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 02</span>
          <h1 class="page-title">Merge <em>PDF</em></h1>
          <p class="page-desc">รวม PDF หลายไฟล์เป็นไฟล์เดียว กด ↑↓ เพื่อเรียงลำดับหน้า แล้วดาวน์โหลด</p>
        </div>

        <div class="drop-zone" id="merge-drop-zone" onclick="document.getElementById('merge-input').click()">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์ PDF ที่จะรวม</p>
          <p class="drop-sub">ต้องการอย่างน้อย 2 ไฟล์ขึ้นไป<br/><strong>คลิกหรือลากไฟล์มาวาง</strong></p>
          <input type="file" id="merge-input" accept=".pdf" multiple style="display:none"/>
        </div>

        <div class="file-section" id="merge-file-section" style="display:none">
          <div class="list-toolbar">
            <span class="list-stat" id="merge-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="MergePdf.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="merge-file-list"></div>
          <div class="print-bar">
            <span class="selected-summary">เรียงลำดับแล้วกด Merge</span>
            <button class="btn btn--primary" id="merge-btn" disabled onclick="MergePdf.doMerge()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h7M3 12h4"/></svg>
              Merge & Download
            </button>
          </div>
          <div class="progress-track" id="merge-track"><div class="progress-fill" id="merge-fill"></div></div>
          <div class="status-text" id="merge-status"></div>
        </div>
      </div>
    `;

    const dz = document.getElementById('merge-drop-zone');
    const fi = document.getElementById('merge-input');
    fi.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); addFiles(e.dataTransfer.files); });
  }

  function clearAll() { files.length = 0; render(); }

  return { renderPage, removeFile, moveUp, moveDown, doMerge, clearAll };
})();
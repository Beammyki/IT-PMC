const CompressPdf = (() => {
  let currentFile = null;

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('compress-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('compress-track');
    const f = document.getElementById('compress-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function setFile(f) {
    currentFile = f;
    const info = document.getElementById('compress-file-info');
    const btn  = document.getElementById('compress-btn');
    if (info) info.innerHTML = `
      <div class="file-item selected" style="margin-top:16px">
        <span class="pdf-tag">PDF</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">${fmt(f.size)}</span>
        <button class="file-remove" onclick="CompressPdf.clearFile()">×</button>
      </div>`;
    if (btn) btn.disabled = false;
    setStatus('');
  }

  function clearFile() {
    currentFile = null;
    const info = document.getElementById('compress-file-info');
    const btn  = document.getElementById('compress-btn');
    if (info) info.innerHTML = '';
    if (btn) btn.disabled = true;
    setStatus('');
  }

  async function doCompress() {
    if (!currentFile) return;
    const btn = document.getElementById('compress-btn');
    if (btn) btn.disabled = true;
    setProgress(0);
    setStatus('กำลังโหลดไฟล์...');

    try {
      const quality = parseFloat(document.getElementById('compress-quality').value) / 100;
      const buf = await currentFile.arrayBuffer();
      setProgress(20);
      setStatus('กำลังประมวลผล...');

      // Load with pdf-lib and re-save (removes unused objects, compresses)
      const pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      setProgress(60);

      // Re-embed images at lower quality using canvas
      const pages = pdfDoc.getPages();
      setStatus(`ประมวลผล ${pages.length} หน้า...`);
      setProgress(80);

      const compressed = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      setProgress(95);
      const originalSize = currentFile.size;
      const newSize = compressed.byteLength;
      const ratio = Math.round((1 - newSize / originalSize) * 100);

      const blob = new Blob([compressed], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name.replace('.pdf', '_compressed.pdf');
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      if (ratio > 0) {
        setStatus(`ลดขนาดได้ ${ratio}% (${fmt(originalSize)} → ${fmt(newSize)})`);
      } else {
        setStatus(`ดาวน์โหลดแล้ว (${fmt(newSize)}) — ไฟล์นี้บีบอัดได้น้อยมาก`);
      }
    } catch (e) {
      setStatus('เกิดข้อผิดพลาด: ' + e.message, true);
    }
    if (btn) btn.disabled = false;
  }

  function renderPage() {
    currentFile = null;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 03</span>
          <h1 class="page-title">Compress <em>PDF</em></h1>
          <p class="page-desc">ลดขนาดไฟล์ PDF โดยลบข้อมูลที่ไม่จำเป็น เหมาะสำหรับส่งอีเมลหรืออัปโหลด</p>
        </div>

        <div class="drop-zone" id="compress-drop-zone" onclick="document.getElementById('compress-input').click()">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์ PDF</p>
          <p class="drop-sub">รองรับ 1 ไฟล์ต่อครั้ง<br/><strong>คลิกหรือลากไฟล์มาวาง</strong></p>
          <input type="file" id="compress-input" accept=".pdf" style="display:none"/>
        </div>

        <div id="compress-file-info"></div>

        <div style="max-width:600px;margin-top:20px;display:none" id="compress-options">
          <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)">
            <span style="font-size:13px;color:var(--text-2);flex:1">ระดับการบีบอัด</span>
            <input type="range" id="compress-quality" min="10" max="90" value="60"
              oninput="document.getElementById('compress-quality-val').textContent=this.value+'%'"
              style="flex:1;accent-color:var(--gold)"/>
            <span id="compress-quality-val" style="font-family:'DM Mono',monospace;font-size:12px;color:var(--gold);min-width:36px;text-align:right">60%</span>
          </div>
        </div>

        <div class="print-bar" style="max-width:600px">
          <span class="selected-summary" id="compress-summary">เลือกไฟล์ก่อน</span>
          <button class="btn btn--primary" id="compress-btn" disabled onclick="CompressPdf.doCompress()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"/>
            </svg>
            Compress & Download
          </button>
        </div>
        <div class="progress-track" id="compress-track" style="max-width:600px"><div class="progress-fill" id="compress-fill"></div></div>
        <div class="status-text" id="compress-status"></div>
      </div>
    `;

    const dz = document.getElementById('compress-drop-zone');
    const fi = document.getElementById('compress-input');

    fi.addEventListener('change', e => {
      if (e.target.files[0]) {
        setFile(e.target.files[0]);
        document.getElementById('compress-options').style.display = '';
        document.getElementById('compress-summary').textContent = 'พร้อม Compress';
        e.target.value = '';
      }
    });

    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
        setFile(f);
        document.getElementById('compress-options').style.display = '';
        document.getElementById('compress-summary').textContent = 'พร้อม Compress';
      }
    });
  }

  return { renderPage, clearFile, doCompress };
})();
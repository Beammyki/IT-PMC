const PdfUnlock = (() => {
  const files = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('unlock-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('unlock-track');
    const f = document.getElementById('unlock-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if ((f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        && !files.find(x => x.name === f.name && x.size === f.size)) {
        files.push({ file: f, password: '', status: 'pending' });
      }
    }
    render();
  }

  function removeFile(i) { files.splice(i, 1); render(); }
  function clearAll() { files.length = 0; render(); setStatus(''); }

  function setPassword(i, val) {
    if (files[i]) files[i].password = val;
  }

  // โหลด CSV format: ชื่อไฟล์,รหัสผ่าน
  function loadCsv(csvFile) {
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n');
      let matched = 0;
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 2) return;
        const name = parts[0].trim().replace(/^"|"$/g, '');
        const pass = parts[1].trim().replace(/^"|"$/g, '');
        const found = files.find(f => f.file.name === name);
        if (found) { found.password = pass; matched++; }
      });
      render();
      setStatus(`โหลด CSV แล้ว — จับคู่รหัสได้ ${matched} ไฟล์`);
    };
    reader.readAsText(csvFile);
  }

  // ใส่รหัสเดียวกันทุกไฟล์
  function applyGlobalPassword() {
    const val = document.getElementById('unlock-global-pass').value.trim();
    if (!val) return;
    files.forEach(f => f.password = val);
    render();
    setStatus(`ใส่รหัส "${val}" ให้ทุกไฟล์แล้ว`);
  }

  function render() {
    const sec  = document.getElementById('unlock-file-section');
    const list = document.getElementById('unlock-file-list');
    const btn  = document.getElementById('unlock-btn');
    const stat = document.getElementById('unlock-stat');
    if (!sec) return;

    sec.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์`;
    if (btn) btn.disabled = files.length === 0;
    if (!list) return;

    list.innerHTML = '';
    files.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.animationDelay = (i * 0.03) + 's';

      const statusIcon = {
        pending: '',
        success: '<span style="color:var(--green);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✓ OK</span>',
        error:   '<span style="color:var(--red);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✗ ผิด</span>',
      }[item.status] || '';

      div.innerHTML = `
        <span class="pdf-tag">PDF</span>
        <span class="file-name" title="${item.file.name}">${item.file.name}</span>
        <span class="file-size">${fmt(item.file.size)}</span>
        <input type="text" placeholder="รหัสผ่าน"
          value="${item.password}"
          oninput="PdfUnlock.setPassword(${i}, this.value)"
          style="width:130px;font-size:12px;font-family:'DM Mono',monospace;
            background:var(--bg);border:1px solid var(--border2);border-radius:5px;
            color:var(--text);padding:4px 8px;outline:none;flex-shrink:0"
          onclick="event.stopPropagation()"/>
        ${statusIcon}
        <button class="file-remove" onclick="PdfUnlock.removeFile(${i})">×</button>
      `;
      list.appendChild(div);
    });
  }

  async function doUnlock() {
    if (!files.length) return;
    const btn = document.getElementById('unlock-btn');
    if (btn) btn.disabled = true;
    setProgress(0);

    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setStatus(`กำลังปลดล็อค: ${item.file.name} (${i+1}/${files.length})`);
      setProgress(Math.round((i / files.length) * 90));

      try {
        const buf = await item.file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(buf, {
          password: item.password,
          ignoreEncryption: false,
        });

        // Re-save โดยไม่มีรหัสผ่าน
        const unlocked = await pdf.save();
        const outName = item.file.name.replace('.pdf', '_unlocked.pdf');
        zip.file(outName, unlocked);

        item.status = 'success';
        successCount++;
      } catch (err) {
        item.status = 'error';
        errorCount++;
        console.error(`${item.file.name}:`, err.message);
      }

      render();
    }

    setProgress(95);
    setStatus('กำลังสร้าง ZIP...');

    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'unlocked_pdfs.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    setProgress(100);
    setStatus(
      `✓ ปลดล็อคสำเร็จ ${successCount} ไฟล์` +
      (errorCount > 0 ? ` · ✗ ผิดพลาด ${errorCount} ไฟล์ (รหัสอาจไม่ถูกต้อง)` : ''),
      errorCount > 0 && successCount === 0
    );

    if (btn) btn.disabled = false;
  }

  function renderPage() {
    files.length = 0;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 07</span>
          <h1 class="page-title">PDF <em>Unlock</em></h1>
          <p class="page-desc">ปลดล็อค PDF รหัสผ่านหลายไฟล์พร้อมกัน — กรอกรหัสทีละไฟล์ หรืออัปโหลด CSV เพื่อนำเข้าทีเดียว ผลลัพธ์ได้เป็น ZIP</p>
        </div>

        <!-- Upload Zone -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;margin-bottom:16px">

          <!-- PDF Drop Zone -->
          <div class="drop-zone" id="unlock-drop-zone"
            onclick="document.getElementById('unlock-input').click()"
            style="padding:28px 20px;text-align:center;cursor:none">
            <div class="drop-icon" style="margin:0 auto 10px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p class="drop-title" style="font-size:13px">เพิ่มไฟล์ PDF</p>
            <p class="drop-sub" style="font-size:11px">ลากหรือคลิกเลือก</p>
            <input type="file" id="unlock-input" accept=".pdf" multiple style="display:none"/>
          </div>

          <!-- CSV Drop Zone -->
          <div class="drop-zone" id="csv-drop-zone"
            onclick="document.getElementById('csv-input').click()"
            style="padding:28px 20px;text-align:center;cursor:none">
            <div class="drop-icon" style="margin:0 auto 10px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <p class="drop-title" style="font-size:13px">นำเข้า CSV</p>
            <p class="drop-sub" style="font-size:11px">format: ชื่อไฟล์,รหัสผ่าน</p>
            <input type="file" id="csv-input" accept=".csv,.txt" style="display:none"/>
          </div>
        </div>

        <!-- CSV Format hint -->
        <div style="max-width:600px;margin-bottom:14px;padding:10px 14px;
          background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
          font-size:11px;font-family:'DM Mono',monospace;color:var(--text-3);line-height:1.8">
          <span style="color:var(--cyan)">// ตัวอย่าง CSV</span><br/>
          สมชาย_เงินเดือน.pdf,01011990<br/>
          สมหญิง_เงินเดือน.pdf,15061985
        </div>

        <!-- Global Password -->
        <div style="max-width:600px;display:flex;gap:8px;margin-bottom:4px;align-items:center">
          <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-3);white-space:nowrap;letter-spacing:0.5px">รหัสเดียวกันทุกไฟล์</span>
          <input type="text" id="unlock-global-pass" placeholder="ใส่รหัสแล้วกด Apply"
            style="flex:1;font-size:12px;font-family:'DM Mono',monospace;
              background:var(--surface);border:1px solid var(--border2);border-radius:6px;
              color:var(--text);padding:7px 12px;outline:none"/>
          <button class="btn btn--ghost" onclick="PdfUnlock.applyGlobalPassword()"
            style="font-size:11px;padding:7px 14px;font-family:'DM Mono',monospace;white-space:nowrap">
            Apply ทุกไฟล์
          </button>
        </div>

        <!-- File List -->
        <div id="unlock-file-section" style="display:none;max-width:600px;margin-top:14px">
          <div class="list-toolbar">
            <span class="list-stat" id="unlock-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="PdfUnlock.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="unlock-file-list"></div>

          <div class="print-bar">
            <span class="selected-summary">ใส่รหัสให้ครบแล้วกด Unlock</span>
            <button class="btn btn--primary" id="unlock-btn" disabled onclick="PdfUnlock.doUnlock()">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V5a3 3 0 016 0"/>
              </svg>
              Unlock & Download ZIP
            </button>
          </div>

          <div class="progress-track" id="unlock-track" style="max-width:600px">
            <div class="progress-fill" id="unlock-fill"></div>
          </div>
          <div class="status-text" id="unlock-status"></div>
        </div>
      </div>
    `;

    // Drop zone events — PDF
    const dz = document.getElementById('unlock-drop-zone');
    const fi = document.getElementById('unlock-input');
    fi.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });

    // Drop zone events — CSV
    const csvDz = document.getElementById('csv-drop-zone');
    const csvFi = document.getElementById('csv-input');
    csvFi.addEventListener('change', e => { if (e.target.files[0]) { loadCsv(e.target.files[0]); e.target.value = ''; } });
    csvDz.addEventListener('dragover',  e => { e.preventDefault(); csvDz.classList.add('drag-over'); });
    csvDz.addEventListener('dragleave', () => csvDz.classList.remove('drag-over'));
    csvDz.addEventListener('drop', e => {
      e.preventDefault(); csvDz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) loadCsv(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, removeFile, clearAll, setPassword, applyGlobalPassword, doUnlock };
})();
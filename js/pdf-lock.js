const PdfLock = (() => {
  const files = [];
  let workerUrl = '';

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('lock-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('lock-track');
    const f = document.getElementById('lock-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if ((f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        && !files.find(x => x.file.name === f.name && x.file.size === f.size)) {
        files.push({ file: f, password: '', status: 'pending' });
      }
    }
    render();
  }

  function removeFile(i) { files.splice(i, 1); render(); }
  function clearAll()    { files.length = 0; render(); setStatus(''); }
  function setPassword(i, val) { if (files[i]) files[i].password = val; }

  function applyGlobalPassword() {
    const val = document.getElementById('lock-global-pass').value.trim();
    if (!val) return;
    files.forEach(f => f.password = val);
    render();
    setStatus(`ใส่รหัสให้ทุกไฟล์แล้ว`);
  }

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
      setStatus(`โหลด CSV — จับคู่รหัสได้ ${matched} ไฟล์`);
    };
    reader.readAsText(csvFile);
  }

  function render() {
    const sec  = document.getElementById('lock-file-section');
    const list = document.getElementById('lock-file-list');
    const btn  = document.getElementById('lock-btn');
    const stat = document.getElementById('lock-stat');
    if (!sec) return;

    sec.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์`;
    if (btn)  btn.disabled = files.length === 0;
    if (!list) return;

    list.innerHTML = '';
    files.forEach((item, i) => {
      const icon = {
        pending: '',
        success: '<span style="color:var(--green);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✓ OK</span>',
        error:   '<span style="color:var(--red);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✗ Error</span>',
      }[item.status] || '';

      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.animationDelay = (i * 0.03) + 's';
      div.innerHTML = `
        <span class="pdf-tag">PDF</span>
        <span class="file-name" title="${item.file.name}">${item.file.name}</span>
        <span class="file-size">${fmt(item.file.size)}</span>
        <input type="password" placeholder="รหัสผ่าน"
          value="${item.password}"
          oninput="PdfLock.setPassword(${i}, this.value)"
          style="width:130px;font-size:12px;font-family:'DM Mono',monospace;
            background:var(--bg);border:1px solid var(--border2);border-radius:5px;
            color:var(--text);padding:4px 8px;outline:none;flex-shrink:0"
          onclick="event.stopPropagation()"/>
        ${icon}
        <button class="file-remove" onclick="PdfLock.removeFile(${i})">×</button>
      `;
      list.appendChild(div);
    });
  }

  async function doLock() {
    const url = document.getElementById('lock-worker-url').value.trim();
    if (!url) {
      setStatus('กรุณาใส่ Worker URL ก่อนครับ', true);
      return;
    }
    if (!files.length) return;
    if (files.some(f => !f.password)) {
      setStatus('ไฟล์บางไฟล์ยังไม่มีรหัสผ่านครับ', true);
      return;
    }

    const btn = document.getElementById('lock-btn');
    if (btn) btn.disabled = true;
    setProgress(10);
    setStatus('กำลังส่งไฟล์ไปเข้ารหัส...');

    try {
      const formData = new FormData();
      files.forEach((item, i) => {
        formData.append(`file_${i}`, item.file);
        formData.append(`pass_${i}`, item.password);
      });

      setProgress(40);
      const res = await fetch(url, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Worker error: ${res.status}`);

      const results = await res.json();
      setProgress(80);

      // สร้าง ZIP
      const zip = new JSZip();
      let ok = 0, fail = 0;

      results.forEach((r, i) => {
        if (r.success) {
          zip.file(r.name, new Uint8Array(r.data));
          files[i].status = 'success';
          ok++;
        } else {
          files[i].status = 'error';
          fail++;
        }
      });

      render();
      setProgress(95);

      if (ok > 0) {
        const blob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'locked_pdfs.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      }

      setProgress(100);
      setStatus(
        `✓ ล็อคสำเร็จ ${ok} ไฟล์` + (fail > 0 ? ` · ✗ ล้มเหลว ${fail} ไฟล์` : '')
      );

    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    }

    if (btn) btn.disabled = false;
  }

  function renderPage() {
    files.length = 0;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 08</span>
          <h1 class="page-title">PDF <em>Lock</em></h1>
          <p class="page-desc">ใส่รหัสผ่านให้ PDF หลายไฟล์พร้อมกัน — ผ่าน Cloudflare Worker ดาวน์โหลดเป็น ZIP</p>
        </div>

        <!-- Worker URL -->
        <div style="max-width:600px;margin-bottom:16px;padding:14px 16px;
          background:var(--surface);border:1px solid var(--border2);border-radius:var(--r)">
          <p style="font-size:10px;font-family:'DM Mono',monospace;color:var(--cyan);letter-spacing:1px;margin-bottom:8px">// CLOUDFLARE WORKER URL</p>
          <input type="text" id="lock-worker-url"
            placeholder="https://pdf-lock-worker.YOUR_NAME.workers.dev"
            style="width:100%;font-size:12px;font-family:'DM Mono',monospace;
              background:var(--bg);border:1px solid var(--border2);border-radius:6px;
              color:var(--text);padding:8px 12px;outline:none"/>
          <p style="font-size:10px;color:var(--text-3);margin-top:6px;font-family:'DM Mono',monospace">
            ใส่ URL ของ Cloudflare Worker ที่ deploy ไว้ครับ
          </p>
        </div>

        <!-- Upload Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;margin-bottom:14px">
          <div class="drop-zone" id="lock-drop-zone"
            onclick="document.getElementById('lock-input').click()"
            style="padding:28px 20px;text-align:center">
            <div class="drop-icon" style="margin:0 auto 10px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p class="drop-title" style="font-size:13px">เพิ่มไฟล์ PDF</p>
            <p class="drop-sub" style="font-size:11px">ลากหรือคลิกเลือก</p>
            <input type="file" id="lock-input" accept=".pdf" multiple style="display:none"/>
          </div>

          <div class="drop-zone" id="lock-csv-zone"
            onclick="document.getElementById('lock-csv-input').click()"
            style="padding:28px 20px;text-align:center">
            <div class="drop-icon" style="margin:0 auto 10px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <p class="drop-title" style="font-size:13px">นำเข้า CSV</p>
            <p class="drop-sub" style="font-size:11px">ชื่อไฟล์,รหัสผ่าน</p>
            <input type="file" id="lock-csv-input" accept=".csv,.txt" style="display:none"/>
          </div>
        </div>

        <!-- Global Password -->
        <div style="max-width:600px;display:flex;gap:8px;margin-bottom:4px;align-items:center">
          <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-3);white-space:nowrap">รหัสเดียวกันทุกไฟล์</span>
          <input type="password" id="lock-global-pass" placeholder="ใส่รหัสแล้วกด Apply"
            style="flex:1;font-size:12px;font-family:'DM Mono',monospace;
              background:var(--surface);border:1px solid var(--border2);border-radius:6px;
              color:var(--text);padding:7px 12px;outline:none"/>
          <button class="btn btn--ghost" onclick="PdfLock.applyGlobalPassword()"
            style="font-size:11px;padding:7px 14px;font-family:'DM Mono',monospace;white-space:nowrap">
            Apply ทุกไฟล์
          </button>
        </div>

        <!-- File List -->
        <div id="lock-file-section" style="display:none;max-width:600px;margin-top:14px">
          <div class="list-toolbar">
            <span class="list-stat" id="lock-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="PdfLock.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="lock-file-list"></div>
          <div class="print-bar">
            <span class="selected-summary">ใส่รหัสให้ครบแล้วกด Lock</span>
            <button class="btn btn--primary" id="lock-btn" disabled onclick="PdfLock.doLock()">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              Lock & Download ZIP
            </button>
          </div>
          <div class="progress-track" id="lock-track" style="max-width:600px">
            <div class="progress-fill" id="lock-fill"></div>
          </div>
          <div class="status-text" id="lock-status"></div>
        </div>
      </div>
    `;

    const dz = document.getElementById('lock-drop-zone');
    const fi = document.getElementById('lock-input');
    fi.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); addFiles(e.dataTransfer.files); });

    const csvDz = document.getElementById('lock-csv-zone');
    const csvFi = document.getElementById('lock-csv-input');
    csvFi.addEventListener('change', e => { if (e.target.files[0]) { loadCsv(e.target.files[0]); e.target.value = ''; } });
    csvDz.addEventListener('dragover',  e => { e.preventDefault(); csvDz.classList.add('drag-over'); });
    csvDz.addEventListener('dragleave', () => csvDz.classList.remove('drag-over'));
    csvDz.addEventListener('drop', e => { e.preventDefault(); csvDz.classList.remove('drag-over'); if (e.dataTransfer.files[0]) loadCsv(e.dataTransfer.files[0]); });
  }

  return { renderPage, removeFile, clearAll, setPassword, applyGlobalPassword, doLock };
})();

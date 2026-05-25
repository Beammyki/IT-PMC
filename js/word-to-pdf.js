const WordToPdf = (() => {
  const files = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('w2p-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('w2p-track');
    const f = document.getElementById('w2p-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      const ext = f.name.toLowerCase();
      if ((ext.endsWith('.doc') || ext.endsWith('.docx'))
        && !files.find(x => x.name === f.name && x.size === f.size)) {
        files.push({ file: f, status: 'pending' });
      }
    }
    render();
  }

  function removeFile(i) { files.splice(i, 1); render(); }
  function clearAll() { files.length = 0; render(); setStatus(''); }

  function render() {
    const sec  = document.getElementById('w2p-section');
    const list = document.getElementById('w2p-list');
    const btn  = document.getElementById('w2p-btn');
    const stat = document.getElementById('w2p-stat');
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
      div.style.animationDelay = (i * 0.04) + 's';
      div.innerHTML = `
        <span class="pdf-tag">WORD</span>
        <span class="file-name" title="${item.file.name}">${item.file.name}</span>
        <span class="file-size">${fmt(item.file.size)}</span>
        ${icon}
        <button class="file-remove" onclick="WordToPdf.removeFile(${i})">×</button>
      `;
      list.appendChild(div);
    });
  }

  async function doConvert() {
    const url = document.getElementById('w2p-worker-url').value.trim();
    if (!url) { setStatus('กรุณาใส่ Worker URL ก่อนครับ', true); return; }
    if (!files.length) return;

    const btn = document.getElementById('w2p-btn');
    if (btn) btn.disabled = true;
    setProgress(10);
    setStatus('กำลังส่งไฟล์ไปแปลง...');

    try {
      const formData = new FormData();
      formData.append('tool', 'word2pdf');
      files.forEach((item, i) => formData.append(`file_${i}`, item.file));

      setProgress(30);
      const res = await fetch(url, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Worker error: ${res.status}`);

      const results = await res.json();
      setProgress(80);

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
        a.download = ok === 1 ? results.find(r => r.success).name : 'converted_pdfs.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      }

      setProgress(100);
      setStatus(`✓ แปลงสำเร็จ ${ok} ไฟล์` + (fail > 0 ? ` · ✗ ล้มเหลว ${fail} ไฟล์` : ''));

    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    }

    if (btn) btn.disabled = files.length === 0;
  }

  function renderPage() {
    files.length = 0;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool</span>
          <h1 class="page-title">Word <em>to PDF</em></h1>
          <p class="page-desc">แปลงไฟล์ Word (.doc, .docx) เป็น PDF ได้ formatting ตรงต้นฉบับ — ผ่าน Cloudflare Worker</p>
        </div>

        <!-- Worker URL -->
        <div style="max-width:600px;margin-bottom:16px;padding:14px 16px;
          background:var(--surface);border:1px solid var(--border2);border-radius:var(--r)">
          <p style="font-size:10px;font-family:'DM Mono',monospace;color:var(--cyan);letter-spacing:1px;margin-bottom:8px">// CLOUDFLARE WORKER URL</p>
          <input type="text" id="w2p-worker-url"
            placeholder="https://pdf-lock-worker.YOUR_NAME.workers.dev"
            style="width:100%;font-size:12px;font-family:'DM Mono',monospace;
              background:var(--bg);border:1px solid var(--border2);border-radius:6px;
              color:var(--text);padding:8px 12px;outline:none"/>
          <p style="font-size:10px;color:var(--text-3);margin-top:6px;font-family:'DM Mono',monospace">
            ใช้ Worker URL เดียวกับ PDF Lock ได้เลยครับ
          </p>
        </div>

        <!-- Drop zone -->
        <div class="drop-zone" id="w2p-drop-zone"
          onclick="document.getElementById('w2p-input').click()"
          style="max-width:600px;margin-bottom:16px">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">ลากไฟล์ Word มาวางที่นี่</p>
          <p class="drop-sub">รองรับ .doc และ .docx หลายไฟล์พร้อมกัน<br/><strong>คลิกเพื่อเปิด File Browser</strong></p>
          <input type="file" id="w2p-input" accept=".doc,.docx" multiple style="display:none"/>
        </div>

        <!-- File list -->
        <div id="w2p-section" style="display:none;max-width:600px">
          <div class="list-toolbar">
            <span class="list-stat" id="w2p-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="WordToPdf.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="w2p-list"></div>
          <div class="print-bar">
            <span class="selected-summary">เลือกไฟล์แล้วกด Convert</span>
            <button class="btn btn--primary" id="w2p-btn" disabled onclick="WordToPdf.doConvert()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 8h12M10 4l4 4-4 4"/>
              </svg>
              Convert & Download
            </button>
          </div>
          <div class="progress-track" id="w2p-track" style="max-width:600px">
            <div class="progress-fill" id="w2p-fill"></div>
          </div>
          <div class="status-text" id="w2p-status"></div>
        </div>
      </div>
    `;

    const dz = document.getElementById('w2p-drop-zone');
    const fi = document.getElementById('w2p-input');
    fi.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, removeFile, clearAll, doConvert };
})();
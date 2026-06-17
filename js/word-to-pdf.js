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
      const name = f.name.toLowerCase();
      if ((name.endsWith('.doc') || name.endsWith('.docx'))
        && !files.find(x => x.file.name === f.name && x.file.size === f.size)) {
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

  /* ── Convert single DOCX → PDF blob ────────── */
  async function convertOneFile(file) {
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:0;top:0;width:fit-content;background:#fff;'
      + 'z-index:-1;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    try {
      const buf = await file.arrayBuffer();

      // Render DOCX via docx-preview
      await docx.renderAsync(buf, container, null, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
      });

      // Show for html2canvas capture
      container.style.opacity = '1';
      container.style.zIndex  = '99999';
      await new Promise(r => setTimeout(r, 800));

      // Collect page sections
      const wrapper  = container.querySelector('.docx-wrapper');
      const sections = wrapper
        ? Array.from(wrapper.querySelectorAll(':scope > section'))
        : [container];
      if (!sections.length) throw new Error('ไม่พบหน้าเอกสาร');

      // Capture each page → build PDF
      const { jsPDF } = window.jspdf;
      let pdf = null;

      for (let i = 0; i < sections.length; i++) {
        const sec    = sections[i];
        const canvas = await html2canvas(sec, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        });

        const wMm = sec.offsetWidth  * 25.4 / 96;
        const hMm = sec.offsetHeight * 25.4 / 96;
        const ori = wMm > hMm ? 'l' : 'p';

        if (i === 0) {
          pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [wMm, hMm] });
        } else {
          pdf.addPage([wMm, hMm], ori);
        }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm);
      }

      return pdf.output('blob');
    } finally {
      container.remove();
    }
  }

  /* ── Main convert action ───────────────────── */
  async function doConvert() {
    if (!files.length) return;

    if (typeof docx === 'undefined' || !docx.renderAsync) {
      setStatus('โหลด docx-preview ไม่สำเร็จ — ตรวจสอบ internet', true); return;
    }
    if (typeof html2canvas === 'undefined') {
      setStatus('โหลด html2canvas ไม่สำเร็จ', true); return;
    }
    if (typeof jspdf === 'undefined') {
      setStatus('โหลด jsPDF ไม่สำเร็จ', true); return;
    }

    const btn = document.getElementById('w2p-btn');
    if (btn) btn.disabled = true;
    setProgress(5);

    let ok = 0, fail = 0;
    const blobs = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setStatus(`กำลังแปลง ${item.file.name}  (${i + 1}/${files.length})...`);
      setProgress(Math.round((i / files.length) * 90) + 5);

      try {
        const blob    = await convertOneFile(item.file);
        const pdfName = item.file.name.replace(/\.docx?$/i, '.pdf');
        blobs.push({ name: pdfName, blob });
        item.status = 'success';
        ok++;
      } catch (err) {
        console.error('Convert error:', err);
        item.status = 'error';
        fail++;
      }
      render();
    }

    setProgress(95);

    // Download
    if (ok === 1) {
      const { name, blob } = blobs[0];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (ok > 1) {
      const zip = new JSZip();
      blobs.forEach(b => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'converted_pdfs.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    setProgress(100);
    setStatus(`✓ แปลงสำเร็จ ${ok} ไฟล์` + (fail ? ` · ✗ ล้มเหลว ${fail} ไฟล์` : ''));
    if (btn) btn.disabled = files.length === 0;
  }

  /* ── Render Page ────────────────────────────── */
  function renderPage() {
    files.length = 0;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool</span>
          <h1 class="page-title">Word <em>to PDF</em></h1>
          <p class="page-desc">แปลงไฟล์ Word (.docx) เป็น PDF ได้ formatting ใกล้เคียงต้นฉบับ — ทำงานบนเบราว์เซอร์ทั้งหมด ไม่มีการอัปโหลด</p>
        </div>

        <!-- Info note -->
        <div style="max-width:600px;margin-bottom:14px;
          padding:10px 14px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);
          border-radius:var(--r);font-size:12px;color:var(--text-2);line-height:1.6">
          ระบบจะ render เอกสาร Word บนเบราว์เซอร์แล้วแปลงเป็น PDF อัตโนมัติ — รองรับ <strong style="color:var(--gold)">.docx</strong> (ไม่รองรับ .doc รุ่นเก่า)
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
          <p class="drop-sub">รองรับ .docx หลายไฟล์พร้อมกัน<br/><strong>คลิกเพื่อเปิด File Browser</strong></p>
          <input type="file" id="w2p-input" accept=".docx" multiple style="display:none"/>
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
              Convert &amp; Download
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
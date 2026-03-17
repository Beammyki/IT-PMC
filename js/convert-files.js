const ConvertFiles = (() => {
  let currentFile = null;
  let mode = 'pdf-to-img';

  const MODES = {
    'pdf-to-img':  { label: 'PDF → Image',  accept: '.pdf',               desc: 'แปลง PDF เป็น PNG ทุกหน้า' },
    'img-to-pdf':  { label: 'Image → PDF',  accept: 'image/*',            desc: 'แปลง JPG/PNG เป็น PDF' },
    'docx-to-pdf': { label: 'DOCX → PDF',   accept: '.docx,.doc',         desc: 'แปลง Word เป็น PDF ผ่าน browser print' },
    'pdf-to-text': { label: 'PDF → Text',   accept: '.pdf',               desc: 'ดึงข้อความจาก PDF เป็น .txt' },
  };

  function setStatus(msg, isError = false) {
    const el = document.getElementById('convert-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('convert-track');
    const f = document.getElementById('convert-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function switchMode(m) {
    mode = m;
    currentFile = null;

    // Update tab styles
    document.querySelectorAll('.mode-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === m);
    });

    // Update drop zone
    const fi   = document.getElementById('convert-input');
    const sub  = document.getElementById('convert-drop-sub');
    const info = document.getElementById('convert-file-info');
    const btn  = document.getElementById('convert-btn');
    const note = document.getElementById('convert-note');

    if (fi)   fi.accept = MODES[m].accept;
    if (sub)  sub.innerHTML = `${MODES[m].desc}<br/><strong>คลิกหรือลากไฟล์มาวาง</strong>`;
    if (info) info.innerHTML = '';
    if (btn)  btn.disabled = true;
    if (note) {
      note.style.display = m === 'docx-to-pdf' ? '' : 'none';
    }
    setStatus('');
  }

  function setFile(f) {
    currentFile = f;
    const info = document.getElementById('convert-file-info');
    const btn  = document.getElementById('convert-btn');
    const ext  = f.name.split('.').pop().toUpperCase();
    if (info) info.innerHTML = `
      <div class="file-item selected" style="margin-top:16px;max-width:600px">
        <span class="pdf-tag">${ext}</span>
        <span class="file-name">${f.name}</span>
        <button class="file-remove" onclick="ConvertFiles.clearFile()">×</button>
      </div>`;
    if (btn) btn.disabled = false;
    setStatus('');
  }

  function clearFile() {
    currentFile = null;
    const info = document.getElementById('convert-file-info');
    const btn  = document.getElementById('convert-btn');
    if (info) info.innerHTML = '';
    if (btn)  btn.disabled = true;
  }

  // ── 1. PDF → Images ──────────────────────────
  async function pdfToImages() {
    if (!window.pdfjsLib) {
      setStatus('กรุณาเพิ่ม pdf.js script ใน index.html', true);
      return;
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const buf = await currentFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;

    for (let i = 1; i <= total; i++) {
      setStatus(`กำลังแปลงหน้า ${i}/${total}...`);
      const page = await pdf.getPage(i);
      const vp   = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${currentFile.name.replace('.pdf', '')}_p${String(i).padStart(3,'0')}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setProgress(Math.round((i / total) * 95));
      await new Promise(r => setTimeout(r, 150));
    }
    setProgress(100);
    setStatus(`✓ ดาวน์โหลด ${total} ไฟล์ PNG แล้ว`);
  }

  // ── 2. Image → PDF ───────────────────────────
  async function imageToPdf() {
    const buf = await currentFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.create();
    setProgress(40);

    const ext = currentFile.name.split('.').pop().toLowerCase();
    const img = (ext === 'jpg' || ext === 'jpeg')
      ? await pdfDoc.embedJpg(buf)
      : await pdfDoc.embedPng(buf);

    setProgress(70);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });

    const bytes = await pdfDoc.save();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    a.download = currentFile.name.replace(/\.(jpg|jpeg|png|webp)$/i, '.pdf');
    a.click();
    URL.revokeObjectURL(a.href);
    setProgress(100);
    setStatus(`✓ แปลงเป็น PDF แล้ว`);
  }

  // ── 3. DOCX → PDF ────────────────────────────
  async function docxToPdf() {
    if (!window.mammoth) {
      setStatus('กรุณาเพิ่ม mammoth.js script ใน index.html', true);
      return;
    }
    setStatus('กำลังอ่าน DOCX...');
    setProgress(20);

    const buf = await currentFile.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buf });
    setProgress(60);
    setStatus('เปิดหน้าต่างปริ้น...');

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>${currentFile.name}</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; font-size: 12pt; line-height: 1.7;
               max-width: 800px; margin: 40px auto; color: #111; }
        h1,h2,h3 { margin: 1em 0 0.4em; }
        p { margin: 0.4em 0; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ccc; padding: 6px 10px; }
        img { max-width: 100%; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>${result.value}</body></html>
    `);
    printWin.document.close();
    printWin.onload = () => {
      setTimeout(() => printWin.print(), 500);
    };
    setProgress(100);
    setStatus('✓ เปิดหน้าต่างปริ้นแล้ว — เลือก "Save as PDF" ในเครื่องปริ้น');
  }

  // ── 4. PDF → Text ────────────────────────────
  async function pdfToText() {
    if (!window.pdfjsLib) {
      setStatus('กรุณาเพิ่ม pdf.js script ใน index.html', true);
      return;
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const buf = await currentFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= total; i++) {
      setStatus(`กำลังดึงข้อความหน้า ${i}/${total}...`);
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `\n--- หน้า ${i} ---\n${pageText}\n`;
      setProgress(Math.round((i / total) * 95));
    }

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentFile.name.replace('.pdf', '.txt');
    a.click();
    URL.revokeObjectURL(a.href);
    setProgress(100);
    setStatus(`✓ ดึงข้อความจาก ${total} หน้าแล้ว`);
  }

  // ── Dispatch ─────────────────────────────────
  async function doConvert() {
    if (!currentFile) return;
    const btn = document.getElementById('convert-btn');
    if (btn) btn.disabled = true;
    setProgress(0);
    setStatus('กำลังประมวลผล...');
    try {
      if      (mode === 'pdf-to-img')  await pdfToImages();
      else if (mode === 'img-to-pdf')  await imageToPdf();
      else if (mode === 'docx-to-pdf') await docxToPdf();
      else if (mode === 'pdf-to-text') await pdfToText();
    } catch (e) {
      setStatus('เกิดข้อผิดพลาด: ' + e.message, true);
    }
    if (btn) btn.disabled = false;
  }

  // ── Render Page ───────────────────────────────
  function renderPage() {
    currentFile = null;
    mode = 'pdf-to-img';

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 04</span>
          <h1 class="page-title">Convert <em>Files</em></h1>
          <p class="page-desc">แปลงไฟล์หลายรูปแบบ — ทำงานบนเบราว์เซอร์ทั้งหมด ไม่มีการอัปโหลด</p>
        </div>

        <!-- Mode Tabs -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;max-width:600px">
          ${Object.entries(MODES).map(([key, val]) => `
            <button class="mode-tab btn btn--ghost${key === 'pdf-to-img' ? ' active' : ''}"
              data-mode="${key}" onclick="ConvertFiles.switchMode('${key}')"
              style="justify-content:center;font-size:12px;padding:8px 10px;text-align:center">
              ${val.label}
            </button>
          `).join('')}
        </div>

        <!-- DOCX note -->
        <div id="convert-note" style="display:none;max-width:600px;margin-bottom:14px;
          padding:10px 14px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);
          border-radius:var(--r);font-size:12px;color:var(--text-2);line-height:1.6">
          DOCX → PDF จะแปลงเนื้อหาเป็น HTML ก่อน แล้วเปิด print dialog ให้เลือก <strong style="color:var(--gold)">"Save as PDF"</strong> — ฟอร์แมตอาจเปลี่ยนเล็กน้อย
        </div>

        <!-- Drop Zone -->
        <div class="drop-zone" id="convert-drop-zone"
          onclick="document.getElementById('convert-input').click()">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์</p>
          <p class="drop-sub" id="convert-drop-sub">
            แปลง PDF เป็น PNG ทุกหน้า<br/><strong>คลิกหรือลากไฟล์มาวาง</strong>
          </p>
          <input type="file" id="convert-input" accept=".pdf" style="display:none"/>
        </div>

        <div id="convert-file-info"></div>

        <div class="print-bar" style="max-width:600px;margin-top:16px">
          <span class="selected-summary">เลือก mode และไฟล์ก่อน</span>
          <button class="btn btn--primary" id="convert-btn" disabled onclick="ConvertFiles.doConvert()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 8h12M10 4l4 4-4 4"/>
            </svg>
            Convert & Download
          </button>
        </div>

        <div class="progress-track" id="convert-track" style="max-width:600px">
          <div class="progress-fill" id="convert-fill"></div>
        </div>
        <div class="status-text" id="convert-status"></div>
      </div>
    `;

    // Mode tab active style (inject once)
    if (!document.getElementById('mode-tab-style')) {
      const s = document.createElement('style');
      s.id = 'mode-tab-style';
      s.textContent = `.mode-tab.active{background:var(--gold-dim)!important;color:var(--gold)!important;border-color:rgba(201,168,76,0.3)!important;}`;
      document.head.appendChild(s);
    }

    // Drop zone events
    const dz = document.getElementById('convert-drop-zone');
    const fi = document.getElementById('convert-input');
    fi.addEventListener('change', e => {
      if (e.target.files[0]) { setFile(e.target.files[0]); e.target.value = ''; }
    });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, switchMode, clearFile, doConvert };
})();
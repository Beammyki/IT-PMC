const ConvertFiles = (() => {
  const files = [];
  let mode = 'pdf-to-img';

  const MODES = {
    'pdf-to-img':  { label: 'PDF → Image',  accept: '.pdf',       desc: 'แปลง PDF เป็น PNG ทุกหน้า' },
    'img-to-pdf':  { label: 'Image → PDF',  accept: 'image/*',    desc: 'แปลง JPG/PNG เป็น PDF' },
    'docx-to-pdf': { label: 'DOCX → PDF',   accept: '.docx',      desc: 'แปลง Word (.docx) เป็น PDF' },
    'pdf-to-text': { label: 'PDF → Text',   accept: '.pdf',       desc: 'ดึงข้อความจาก PDF เป็น .txt' },
  };

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

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

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if (!files.find(x => x.file.name === f.name && x.file.size === f.size)) {
        files.push({ file: f, status: 'pending' });
      }
    }
    renderList();
  }

  function removeFile(i) { files.splice(i, 1); renderList(); }
  function clearAll() { files.length = 0; renderList(); setStatus(''); }

  function renderList() {
    const sec  = document.getElementById('convert-section');
    const list = document.getElementById('convert-list');
    const btn  = document.getElementById('convert-btn');
    const stat = document.getElementById('convert-stat');
    if (!sec) return;

    sec.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์`;
    if (btn)  btn.disabled = files.length === 0;
    if (!list) return;

    list.innerHTML = '';
    files.forEach((item, i) => {
      const ext = item.file.name.split('.').pop().toUpperCase();
      const icon = {
        pending: '',
        success: '<span style="color:var(--green);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✓ OK</span>',
        error:   '<span style="color:var(--red);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✗ Error</span>',
      }[item.status] || '';

      const errorMsg = item.errorMsg ? `<div style="color:var(--red);font-size:10px;margin-top:4px;grid-column:1/-1;">${item.errorMsg}</div>` : '';

      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.animationDelay = (i * 0.04) + 's';
      div.style.display = 'grid';
      div.style.gridTemplateColumns = 'auto 1fr auto auto auto';
      div.style.gap = '10px';
      div.style.alignItems = 'center';
      div.innerHTML = `
        <span class="pdf-tag">${ext}</span>
        <span class="file-name" title="${item.file.name}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.file.name}</span>
        <span class="file-size">${fmt(item.file.size)}</span>
        ${icon}
        <button class="file-remove" onclick="ConvertFiles.removeFile(${i})">×</button>
        ${errorMsg}
      `;
      list.appendChild(div);
    });
  }

  function switchMode(m) {
    mode = m;
    files.length = 0;

    document.querySelectorAll('.mode-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === m);
    });

    const fi   = document.getElementById('convert-input');
    const sub  = document.getElementById('convert-drop-sub');
    const note = document.getElementById('convert-note');
    const wip  = document.getElementById('convert-docx-wip');
    const sec  = document.getElementById('convert-section');
    const dz   = document.getElementById('convert-drop-zone');

    if (m === 'docx-to-pdf') {
      if (note) note.style.display = 'none';
      if (wip)  wip.style.display = 'block';
      if (dz)   dz.style.display = 'none';
      if (sec)  sec.style.display = 'none';
    } else {
      if (fi)   fi.accept = MODES[m].accept;
      if (sub)  sub.innerHTML = `${MODES[m].desc}<br/><strong>คลิกหรือลากไฟล์มาวาง (หลายไฟล์ได้)</strong>`;
      if (note) note.style.display = 'none';
      if (wip)  wip.style.display = 'none';
      if (dz)   dz.style.display = 'block';
    }
    setStatus('');
  }

  // ── 1. PDF → Images (single file) ─────────────
  async function pdfToImages(file) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;
    const blobs = [];

    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const vp   = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const name = `${file.name.replace('.pdf', '')}_p${String(i).padStart(3,'0')}.png`;
      blobs.push({ name, blob });
    }
    return blobs;
  }

  // ── 2. Image → PDF (single file) ──────────────
  async function imageToPdf(file) {
    const buf = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.create();
    const ext = file.name.split('.').pop().toLowerCase();
    const img = (ext === 'jpg' || ext === 'jpeg')
      ? await pdfDoc.embedJpg(buf)
      : await pdfDoc.embedPng(buf);

    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });

    const bytes = await pdfDoc.save();
    const name = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '.pdf');
    return [{ name, blob: new Blob([bytes], { type: 'application/pdf' }) }];
  }

  // ── 3. DOCX → PDF (single file, direct blob output) ──
  async function docxToPdf(file) {
    if (typeof window.docx === 'undefined' || !window.docx.renderAsync) throw new Error('โหลด docx-preview ไม่สำเร็จ');
    if (typeof window.html2canvas === 'undefined') throw new Error('โหลด html2canvas ไม่สำเร็จ');
    if (typeof window.jspdf === 'undefined') throw new Error('โหลด jsPDF ไม่สำเร็จ');

    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:0;top:0;width:max-content;min-width:1200px;background:#fff;'
      + 'z-index:-1;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    // Inject CSS to override broken table widths and fix font fallbacks
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .docx-wrapper table { width: 100% !important; }
      .docx-wrapper td, .docx-wrapper th { width: auto !important; }
      .docx-wrapper * { font-family: 'Sarabun', 'TH SarabunPSK', 'TH Sarabun New', sans-serif; }
    `;
    container.appendChild(styleEl);

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

        let wMm = sec.offsetWidth  * 25.4 / 96;
        let hMm = sec.offsetHeight * 25.4 / 96;
        
        if (!wMm || !hMm || wMm === 0 || hMm === 0) {
           wMm = 210; // A4 width
           hMm = 297; // A4 height
        }

        const ori = wMm > hMm ? 'l' : 'p';

        if (i === 0) {
          pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [wMm, hMm] });
        } else {
          pdf.addPage([wMm, hMm], ori);
        }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm);
      }

      const blob = pdf.output('blob');
      const name = file.name.replace(/\.docx?$/i, '.pdf');
      return [{ name, blob }];
    } catch (e) {
      throw new Error('แปลงไฟล์ล้มเหลว (รองรับเฉพาะ .docx): ' + e.message);
    } finally {
      container.remove();
    }
  }

  // ── 4. PDF → Text (single file) ───────────────
  async function pdfToText(file) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= total; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `\n--- หน้า ${i} ---\n${pageText}\n`;
    }

    const name = file.name.replace('.pdf', '.txt');
    return [{ name, blob: new Blob([fullText], { type: 'text/plain;charset=utf-8' }) }];
  }

  // ── Dispatch single file ──────────────────────
  async function convertOne(file) {
    if (mode === 'pdf-to-img')  return await pdfToImages(file);
    if (mode === 'img-to-pdf')  return await imageToPdf(file);
    if (mode === 'docx-to-pdf') return await docxToPdf(file);
    if (mode === 'pdf-to-text') return await pdfToText(file);
    return null;
  }

  // ── Main batch convert ────────────────────────
  async function doConvert() {
    if (!files.length) return;

    if ((mode === 'pdf-to-img' || mode === 'pdf-to-text') && !window.pdfjsLib) {
      setStatus('กรุณาเพิ่ม pdf.js script ใน index.html', true); return;
    }

    const btn = document.getElementById('convert-btn');
    if (btn) btn.disabled = true;
    setProgress(5);

    let ok = 0, fail = 0;
    const allBlobs = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setStatus(`กำลังแปลง ${item.file.name} (${i + 1}/${files.length})...`);
      setProgress(Math.round((i / files.length) * 90) + 5);

      try {
        const result = await convertOne(item.file);
        if (result) result.forEach(b => allBlobs.push(b));
        item.status = 'success';
        ok++;
      } catch (err) {
        console.error('Convert error:', err);
        item.status = 'error';
        item.errorMsg = err.message;
        fail++;
      }
      renderList();
    }

    setProgress(95);

    // Download results
    if (allBlobs.length === 1) {
      const { name, blob } = allBlobs[0];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (allBlobs.length > 1) {
      setStatus('กำลังรวมไฟล์เป็น ZIP...');
      const zip = new JSZip();
      allBlobs.forEach(b => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'converted_files.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    setProgress(100);
    const docxNote = mode === 'docx-to-pdf' ? ' (เลือก "Save as PDF" ในหน้าต่างปริ้น)' : '';
    setStatus(`✓ แปลงสำเร็จ ${ok} ไฟล์${docxNote}` + (fail ? ` · ✗ ล้มเหลว ${fail} ไฟล์` : ''));
    if (btn) btn.disabled = files.length === 0;
  }

  // ── Render Page ───────────────────────────────
  function renderPage() {
    files.length = 0;
    mode = 'pdf-to-img';

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 04</span>
          <h1 class="page-title">Convert <em>Files</em></h1>
          <p class="page-desc">แปลงไฟล์หลายรูปแบบ หลายไฟล์พร้อมกัน — ทำงานบนเบราว์เซอร์ทั้งหมด ไม่มีการอัปโหลด</p>
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
          DOCX → PDF ระบบจะ render เอกสารบนเบราว์เซอร์แล้วแปลงเป็น PDF อัตโนมัติ — รองรับเฉพาะ <strong style="color:var(--gold)">.docx</strong> (ตารางและฟอร์แมตจะใกล้เคียงต้นฉบับมากที่สุด)
        </div>

        <!-- DOCX Under Construction (NEW) -->
        <div id="convert-docx-wip" style="display:none;max-width:600px;margin-bottom:16px;">
          <div style="padding:16px;background:rgba(255,80,80,0.05);border:1px solid rgba(255,80,80,0.2);border-radius:var(--r);color:var(--text-2);line-height:1.6;font-size:13px">
            <div style="font-weight:600;color:var(--red);margin-bottom:8px">⚠️ โหมดแปลง DOCX บนหน้าเว็บกำลังปรับปรุง</div>
            เพื่อป้องกันปัญหาตารางหรือฟอร์แมตตกหล่น ขอแนะนำให้ใช้สคริปต์อัตโนมัติแปลงในเครื่อง (ได้ผลลัพธ์เป๊ะ 100% รวดเดียวหลายไฟล์):
            <ol style="margin-top:8px;padding-left:20px;color:var(--text-2)">
              <li>ก๊อปปี้โค้ดด้านล่างไปใส่ไฟล์ Text (Notepad) แล้วเซฟชื่อไฟล์เป็น <code>ConvertAll.ps1</code></li>
              <li>เอาไฟล์ <code>ConvertAll.ps1</code> ไปวางในโฟลเดอร์ที่มีไฟล์ Word ของคุณทั้งหมด</li>
              <li>คลิกขวาที่ไฟล์นี้ แล้วเลือก <strong>Run with PowerShell</strong> (สคริปต์จะแปลงไฟล์ทั้งหมดให้ทันทีแบบไม่เปิดหน้าจอให้กวนใจ)</li>
            </ol>
            <div style="background:#111;color:#0f0;padding:12px;border-radius:6px;font-family:'DM Mono',monospace;font-size:11px;margin-top:12px;white-space:pre-wrap;overflow-x:auto;">$w = New-Object -ComObject Word.Application
$w.Visible = $false
Get-ChildItem -Filter *.docx | ForEach-Object {
  Write-Host "Converting: $($_.Name)"
  $pdf = $_.FullName -replace "\\.docx$", ".pdf"
  $doc = $w.Documents.Open($_.FullName)
  $doc.SaveAs([ref]$pdf, [ref]17)
  $doc.Close()
}
$w.Quit()
Write-Host "Done!"; Start-Sleep 3</div>
          </div>
        </div>

        <!-- Drop Zone -->
        <div class="drop-zone" id="convert-drop-zone"
          onclick="document.getElementById('convert-input').click()"
          style="max-width:600px;margin-bottom:16px">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">ลากไฟล์มาวางที่นี่</p>
          <p class="drop-sub" id="convert-drop-sub">
            แปลง PDF เป็น PNG ทุกหน้า<br/><strong>คลิกหรือลากไฟล์มาวาง (หลายไฟล์ได้)</strong>
          </p>
          <input type="file" id="convert-input" accept=".pdf" multiple style="display:none"/>
        </div>

        <!-- File list -->
        <div id="convert-section" style="display:none;max-width:600px">
          <div class="list-toolbar">
            <span class="list-stat" id="convert-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="ConvertFiles.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="convert-list"></div>
          <div class="print-bar">
            <span class="selected-summary">เลือกไฟล์แล้วกด Convert</span>
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
      addFiles(e.target.files);
      e.target.value = '';
    });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, switchMode, removeFile, clearAll, doConvert };
})();
const SignPdf = (() => {
  let pdfFile = null;
  let isDrawing = false;
  let hasSignature = false;
  let lastX = 0, lastY = 0;

  function setStatus(msg, isError = false) {
    const el = document.getElementById('sign-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('sign-track');
    const f = document.getElementById('sign-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function clearCanvas() {
    const canvas = document.getElementById('sign-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('sign-apply-btn');
    if (btn) btn.disabled = !(pdfFile && hasSignature);
  }

  function setupCanvas() {
    const canvas = document.getElementById('sign-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1A1915';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top)  * scaleY
      };
    }

    function start(e) {
      e.preventDefault();
      isDrawing = true;
      const { x, y } = getPos(e);
      lastX = x; lastY = y;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function draw(e) {
      e.preventDefault();
      if (!isDrawing) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastX = x; lastY = y;
      hasSignature = true;
      updateBtn();
    }

    function stop(e) { e.preventDefault(); isDrawing = false; }

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  draw);
    canvas.addEventListener('mouseup',    stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  draw,  { passive: false });
    canvas.addEventListener('touchend',   stop,  { passive: false });
  }

  function setFile(f) {
    pdfFile = f;
    const info = document.getElementById('sign-file-info');
    if (info) info.innerHTML = `
      <div class="file-item selected" style="max-width:600px;margin-bottom:16px">
        <span class="pdf-tag">PDF</span>
        <span class="file-name">${f.name}</span>
        <button class="file-remove" onclick="SignPdf.clearFile()">×</button>
      </div>`;
    updateBtn();
    setStatus('');
  }

  function clearFile() {
    pdfFile = null;
    const info = document.getElementById('sign-file-info');
    if (info) info.innerHTML = '';
    updateBtn();
  }

  async function applySignature() {
    if (!pdfFile || !hasSignature) return;
    const btn = document.getElementById('sign-apply-btn');
    if (btn) btn.disabled = true;

    setProgress(0);
    setStatus('กำลังโหลด PDF...');

    try {
      const canvas = document.getElementById('sign-canvas');
      const posX = parseFloat(document.getElementById('sign-pos-x').value) / 100;
      const posY = parseFloat(document.getElementById('sign-pos-y').value) / 100;
      const sizePct = parseFloat(document.getElementById('sign-size').value) / 100;

      // Get signature as PNG
      const sigDataUrl = canvas.toDataURL('image/png');
      const sigResp = await fetch(sigDataUrl);
      const sigBuf  = await sigResp.arrayBuffer();

      setProgress(30);
      setStatus('กำลังฝังลายเซ็น...');

      const buf = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      const sigImg = await pdfDoc.embedPng(sigBuf);

      setProgress(60);

      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1]; // ใส่หน้าสุดท้าย
      const { width, height } = lastPage.getSize();

      const sigW = width * sizePct;
      const sigH = (sigImg.height / sigImg.width) * sigW;
      const x = width * posX - sigW / 2;
      const y = height * (1 - posY) - sigH / 2;

      lastPage.drawImage(sigImg, { x, y, width: sigW, height: sigH });

      setProgress(85);
      setStatus('กำลังบันทึก...');

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile.name.replace('.pdf', '_signed.pdf');
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('ฝังลายเซ็นสำเร็จ — ดาวน์โหลดแล้ว');
    } catch (e) {
      setStatus('เกิดข้อผิดพลาด: ' + e.message, true);
    }

    updateBtn();
  }

  function renderPage() {
    pdfFile = null;
    hasSignature = false;

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 05</span>
          <h1 class="page-title">Sign <em>PDF</em></h1>
          <p class="page-desc">วาดลายเซ็นด้วยเมาส์หรือนิ้ว แล้วฝังลงใน PDF โดยตรง</p>
        </div>

        <div id="sign-file-info"></div>

        <div class="drop-zone" id="sign-drop-zone" onclick="document.getElementById('sign-file-input').click()" style="margin-bottom:20px">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือก PDF ที่จะเซ็น</p>
          <p class="drop-sub"><strong>คลิกหรือลากไฟล์ PDF มาวาง</strong></p>
          <input type="file" id="sign-file-input" accept=".pdf" style="display:none"/>
        </div>

        <!-- Signature Canvas -->
        <div style="max-width:600px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text-3)">วาดลายเซ็น</span>
            <button class="action-btn action-btn--danger" onclick="SignPdf.clearCanvas()">ล้างลายเซ็น</button>
          </div>
          <div style="border:1px solid var(--border2);border-radius:var(--r);overflow:hidden;background:#fff;cursor:crosshair">
            <canvas id="sign-canvas" width="580" height="180" style="display:block;width:100%;touch-action:none"></canvas>
          </div>
          <p style="font-size:11px;color:var(--text-3);margin-top:6px;font-family:'DM Mono',monospace">วาดด้วยเมาส์ หรือใช้นิ้วบนหน้าจอสัมผัส</p>
        </div>

        <!-- Position & Size Controls -->
        <div style="max-width:600px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px">
            <span style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace;display:block;margin-bottom:8px">ตำแหน่ง X</span>
            <input type="range" id="sign-pos-x" min="10" max="90" value="75" style="width:100%;accent-color:var(--gold)"/>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px">
            <span style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace;display:block;margin-bottom:8px">ตำแหน่ง Y</span>
            <input type="range" id="sign-pos-y" min="10" max="90" value="85" style="width:100%;accent-color:var(--gold)"/>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px">
            <span style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace;display:block;margin-bottom:8px">ขนาด</span>
            <input type="range" id="sign-size" min="10" max="50" value="25" style="width:100%;accent-color:var(--gold)"/>
          </div>
        </div>

        <div class="print-bar" style="max-width:600px;margin-top:16px">
          <span class="selected-summary">วาดลายเซ็น + เลือก PDF ก่อน</span>
          <button class="btn btn--primary" id="sign-apply-btn" disabled onclick="SignPdf.applySignature()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12c2-4 4-8 5-8s0 4 2 4 2-4 3-4M2 14h12"/>
            </svg>
            ฝังลายเซ็น & Download
          </button>
        </div>
        <div class="progress-track" id="sign-track" style="max-width:600px"><div class="progress-fill" id="sign-fill"></div></div>
        <div class="status-text" id="sign-status"></div>
      </div>
    `;

    const dz = document.getElementById('sign-drop-zone');
    const fi = document.getElementById('sign-file-input');
    fi.addEventListener('change', e => { if (e.target.files[0]) { setFile(e.target.files[0]); e.target.value = ''; } });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) setFile(f);
    });

    setupCanvas();
  }

  return { renderPage, clearCanvas, clearFile, applySignature };
})();
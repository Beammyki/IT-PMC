const PdfRedactor = (() => {
  let fileBuffer = null;
  let fileName = '';
  let pdfPage = null; // pdf.js page
  let pdfLibDoc = null; // pdf-lib document
  
  let canvas, ctx;
  let scale = 1;
  let pdfDims = { width: 0, height: 0 };
  
  let rects = [];
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function setStatus(msg, isError=false) {
    const el = document.getElementById('pr-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setStatus('กรุณาอัปโหลดไฟล์ PDF เท่านั้น', true);
      return;
    }
    fileName = file.name;
    document.getElementById('pr-drop-zone').style.display = 'none';
    document.getElementById('pr-workspace').style.display = 'block';
    setStatus('กำลังโหลด PDF...');
    
    fileBuffer = await file.arrayBuffer();
    try {
      // Load with pdf-lib to get dimensions and count
      const { PDFDocument } = PDFLib;
      pdfLibDoc = await PDFDocument.load(fileBuffer);
      const total = pdfLibDoc.getPageCount();
      document.getElementById('pr-info').textContent = \`ไฟล์: \${file.name} (\${total} หน้า)\`;
      
      // Load with pdf.js to render canvas
      const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
      const pdf = await loadingTask.promise;
      pdfPage = await pdf.getPage(1);
      
      initCanvas();
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('ไฟล์ PDF ไม่ถูกต้องหรือไม่สามารถอ่านได้', true);
    }
  }

  async function initCanvas() {
    canvas = document.getElementById('pr-canvas');
    ctx = canvas.getContext('2d');
    
    const viewport = pdfPage.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Original PDF dimensions from pdf-lib (page 1)
    const p1 = pdfLibDoc.getPages()[0];
    pdfDims = p1.getSize();
    
    scale = pdfDims.width / canvas.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    await pdfPage.render(renderContext).promise;
    
    // Save base image
    canvas.style.backgroundImage = \`url(\${canvas.toDataURL()})\`;
    canvas.style.backgroundSize = 'contain';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Event listeners
    canvas.onmousedown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
    };
    canvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      currentX = e.clientX - rect.left;
      currentY = e.clientY - rect.top;
      drawRects();
      
      // Draw current
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
    };
    canvas.onmouseup = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      rects.push({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        w: Math.abs(currentX - startX),
        h: Math.abs(currentY - startY)
      });
      drawRects();
    };
  }

  function drawRects() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    rects.forEach(r => {
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
  }

  function undo() {
    rects.pop();
    drawRects();
  }

  async function processRedact() {
    if (!fileBuffer || rects.length === 0) {
      setStatus('กรุณาลากกล่องดำเพื่อเซ็นเซอร์ข้อมูลก่อน', true);
      return;
    }
    const btn = document.getElementById('pr-btn-save');
    btn.disabled = true;
    setStatus('กำลังเซ็นเซอร์เอกสาร...');

    try {
      const applyAll = document.getElementById('pr-apply-all').checked;
      const { rgb } = PDFLib;
      const pages = pdfLibDoc.getPages();
      
      const targetPages = applyAll ? pages : [pages[0]];
      
      targetPages.forEach(page => {
        const { height } = page.getSize();
        
        rects.forEach(r => {
          // Convert canvas coords to PDF coords
          const pdfX = r.x * scale;
          const pdfW = r.w * scale;
          const pdfH = r.h * scale;
          // PDF y is from bottom left
          const pdfY = height - (r.y * scale) - pdfH;
          
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(0, 0, 0)
          });
        });
      });

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      let newName = fileName;
      if (newName.endsWith('.pdf')) newName = newName.substring(0, newName.length - 4);
      a.download = \`\${newName}_redacted.pdf\`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('เซ็นเซอร์ข้อมูลสำเร็จแล้ว!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    fileBuffer = null;
    fileName = '';
    pdfPage = null;
    pdfLibDoc = null;
    rects = [];
    document.getElementById('pr-drop-zone').style.display = 'flex';
    document.getElementById('pr-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = \`
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">Document <em>Redactor</em></h1>
          <p class="page-desc">เซ็นเซอร์ข้อมูลส่วนบุคคล (PDPA) ลากกล่องดำทับข้อความสำคัญก่อนแชร์ไฟล์</p>
        </div>

        <div class="drop-zone" id="pr-drop-zone" onclick="document.getElementById('pr-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ PDF</p>
          <p class="drop-sub">คลิกหรือลากไฟล์มาวาง</p>
          <input type="file" id="pr-input" accept=".pdf" style="display:none" onchange="PdfRedactor.handleFile(this.files[0])" />
        </div>

        <div id="pr-workspace" style="display:none; max-width:1000px;">
          <div style="display:grid; grid-template-columns: 1fr 300px; gap: 20px;">
            <!-- Left: Canvas -->
            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--r); overflow:auto; display:flex; justify-content:center; padding:20px; max-height:700px;">
              <canvas id="pr-canvas" style="cursor:crosshair; max-width:100%; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></canvas>
            </div>

            <!-- Right: Settings -->
            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); height:fit-content;">
              <h3 style="font-size: 14px; margin-bottom: 16px; color:var(--gold);">เครื่องมือเซ็นเซอร์</h3>
              <p style="font-size: 12px; color:var(--text-2); margin-bottom: 20px;">
                วิธีใช้: คลิกแล้วลากเมาส์บนเอกสารด้านซ้าย เพื่อสร้างกล่องดำปิดบังข้อความที่ต้องการปกปิด
              </p>
              
              <div id="pr-info" style="font-weight: 500; font-size: 13px; margin-bottom: 16px;"></div>

              <div style="margin-bottom: 20px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px;">
                  <input type="checkbox" id="pr-apply-all" /> นำไปใช้กับทุกหน้าใน PDF ตำแหน่งเดียวกัน
                </label>
              </div>

              <button class="btn btn--ghost" onclick="PdfRedactor.undo()" style="width:100%; margin-bottom:12px;">เลิกทำล่าสุด (Undo)</button>
              
              <button class="btn btn--primary" id="pr-btn-save" onclick="PdfRedactor.processRedact()" style="width:100%; margin-bottom:8px;">
                บันทึกไฟล์ & ดาวน์โหลด
              </button>
              
              <button class="btn btn--ghost" onclick="PdfRedactor.reset()" style="width:100%;">ยกเลิก / ปิด</button>
              
              <div id="pr-status" style="font-size:13px; margin-top:16px; display:none; text-align:center;"></div>
            </div>
          </div>
        </div>
      </div>
    \`;
  }

  return { renderPage, handleFile, processRedact, undo, reset };
})();

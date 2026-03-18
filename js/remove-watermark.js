const RemoveWatermark = (() => {
  let img = null;
  let canvas, ctx;
  let maskCanvas, maskCtx; 
  let isDrawing = false;
  let tool = 'brush'; 
  let brushSize = 30;
  let fillColor = '#ffffff';
  let history = [];
  let originalFileName = 'removed_watermark';
  let isPdfFile = false;

  // ตั้งค่า PDF.js Worker (จำเป็นสำหรับการอ่าน PDF บน Browser)
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('wm-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function saveHistory() {
    if (!canvas) return;
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 20) history.shift();
  }

  function undo() {
    if (!history.length) return;
    ctx.putImageData(history.pop(), 0, 0);
    if (maskCtx) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  }

  function applyBrush(x, y) {
    const r = brushSize / 2;

    if (tool === 'brush') {
      // วาดลง Mask สำหรับ OpenCV
      maskCtx.fillStyle = 'white';
      maskCtx.beginPath();
      maskCtx.arc(x, y, r, 0, Math.PI * 2);
      maskCtx.fill();

      // วาดสีแดงโปร่งแสงให้ User เห็น
      ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

    } else if (tool === 'blur') {
      const size = brushSize * 2;
      const x0 = Math.max(0, x - r);
      const y0 = Math.max(0, y - r);
      const imageData = ctx.getImageData(x0, y0, size, size);
      const d = imageData.data;
      const blurred = new Uint8ClampedArray(d.length);
      const w = size * 4;
      for (let i = 0; i < d.length; i += 4) {
        let rr = 0, gg = 0, bb = 0, n = 0;
        const row = Math.floor(i / w);
        const col = (i % w) / 4;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const ni = ((row + dy) * size + (col + dx)) * 4;
            if (ni >= 0 && ni < d.length) { rr += d[ni]; gg += d[ni+1]; bb += d[ni+2]; n++; }
          }
        }
        blurred[i] = rr/n; blurred[i+1] = gg/n; blurred[i+2] = bb/n; blurred[i+3] = d[i+3];
      }
      for (let i = 0; i < d.length; i++) imageData.data[i] = blurred[i];
      ctx.putImageData(imageData, x0, y0);

    } else if (tool === 'color') {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function processInpaint() {
    if (tool !== 'brush') return;
    if (typeof cv === 'undefined' || typeof cv.imread === 'undefined') {
      alert('ระบบ AI กำลังเตรียมความพร้อม (อาจใช้เวลา 1-3 วินาทีในครั้งแรก) กรุณารอสักครู่แล้วลองขีดใหม่ครับ...');
      ctx.putImageData(history[history.length - 1], 0, 0);
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      return;
    }

    setStatus('⏳ กำลังประมวลผลลบลายน้ำด้วย AI...');

    setTimeout(() => {
      try {
        ctx.putImageData(history[history.length - 1], 0, 0);

        let src = cv.imread(canvas.id);
        let mask = cv.imread(maskCanvas.id);
        let dst = new cv.Mat();

        cv.cvtColor(mask, mask, cv.COLOR_RGBA2GRAY, 0);
        cv.inpaint(src, mask, dst, 5, cv.INPAINT_TELEA); 

        cv.imshow(canvas.id, dst);

        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        src.delete(); mask.delete(); dst.delete();
        
        setStatus('✨ ลบสำเร็จแล้ว วาดจุดต่อไปได้เลย — Scroll เพื่อ zoom, Space+ลาก เพื่อเลื่อน');
      } catch (err) {
        console.error("OpenCV Error:", err);
        setStatus('❌ เกิดข้อผิดพลาดในการประมวลผล', true);
      }
    }, 50);
  }

  function setupCanvas() {
    let scale = 1;
    let offsetX = 0, offsetY = 0;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let spaceDown = false;
    const wrap = document.getElementById('wm-canvas-wrap');

    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { 
        x: (src.clientX - rect.left) * (canvas.width / rect.width), 
        y: (src.clientY - rect.top) * (canvas.height / rect.height) 
      };
    }

    function redraw() {
      if (!img) return;
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    function updateZoomLabel() {
      const el = document.getElementById('wm-zoom-val');
      if (el) el.textContent = Math.round(scale * 100) + '%';
    }

    function zoom(factor) {
      const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2;
      const newScale = Math.min(8, Math.max(0.1, scale * factor));
      offsetX = cx - (cx - offsetX) * (newScale / scale);
      offsetY = cy - (cy - offsetY) * (newScale / scale);
      scale = newScale;
      redraw(); updateZoomLabel();
    }

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(8, Math.max(0.1, scale * delta));
      offsetX = mx - (mx - offsetX) * (newScale / scale);
      offsetY = my - (my - offsetY) * (newScale / scale);
      scale = newScale;
      redraw(); updateZoomLabel();
    }, { passive: false });

    document.getElementById('wm-zoom-in').onclick    = () => zoom(1.25);
    document.getElementById('wm-zoom-out').onclick   = () => zoom(0.8);
    document.getElementById('wm-zoom-reset').onclick = () => {
      scale = 1; offsetX = 0; offsetY = 0; redraw(); updateZoomLabel();
    };

    window.addEventListener('keydown', e => {
      if (e.code === 'Space') { spaceDown = true; wrap.style.cursor = 'grab'; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') { spaceDown = false; wrap.style.cursor = 'crosshair'; }
    });

    wrap.addEventListener('mousedown', e => {
      if(e.target !== canvas && e.target !== wrap) return;
      e.preventDefault();
      if (spaceDown || e.button === 1) {
        isPanning = true;
        panStart = { x: e.clientX - offsetX, y: e.clientY - offsetY };
        wrap.style.cursor = 'grabbing';
      } else {
        saveHistory(); 
        isDrawing = true;
        const p = toCanvas(e);
        applyBrush(p.x, p.y);
      }
    });

    wrap.addEventListener('mousemove', e => {
      e.preventDefault();
      if (isPanning) {
        offsetX = e.clientX - panStart.x;
        offsetY = e.clientY - panStart.y;
        redraw();
      } else if (isDrawing) {
        const p = toCanvas(e);
        applyBrush(p.x, p.y);
      }
    });

    window.addEventListener('mouseup', e => { 
      if (isDrawing && tool === 'brush') processInpaint();
      isDrawing = false; 
      isPanning = false; 
      wrap.style.cursor = spaceDown ? 'grab' : 'crosshair'; 
    });

    wrap.addEventListener('mouseleave', () => { 
      if (isDrawing && tool === 'brush') processInpaint();
      isDrawing = false; 
      isPanning = false; 
    });

    let lastDist = 0;
    wrap.addEventListener('touchstart', e => {
      if(e.target !== canvas && e.target !== wrap) return;
      e.preventDefault();
      if (e.touches.length === 2) {
        if (isDrawing && tool === 'brush') processInpaint();
        isDrawing = false;
        lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else {
        saveHistory(); 
        isDrawing = true;
        const p = toCanvas(e);
        applyBrush(p.x, p.y);
      }
    }, { passive: false });

    wrap.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastDist > 0) {
           const factor = dist / lastDist;
           const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
           const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
           const rect = wrap.getBoundingClientRect();
           const mx = cx - rect.left;
           const my = cy - rect.top;
           const newScale = Math.min(8, Math.max(0.1, scale * factor));
           offsetX = mx - (mx - offsetX) * (newScale / scale);
           offsetY = my - (my - offsetY) * (newScale / scale);
           scale = newScale;
           redraw(); updateZoomLabel();
        }
        lastDist = dist;
      } else if (isDrawing) {
        const p = toCanvas(e);
        applyBrush(p.x, p.y);
      }
    }, { passive: false });

    wrap.addEventListener('touchend', e => { 
      if (isDrawing && tool === 'brush') processInpaint();
      isDrawing = false; 
      lastDist = 0; 
    }, { passive: false });
  }

  // ตั้งค่าขนาดและ UI ให้พร้อมทำงาน ก่อนวาดรูป
  function initializeCanvasWithImage(width, height) {
    const wrap = document.getElementById('wm-canvas-wrap');
    
    // ตั้งค่าขนาด Canvas เสมอ
    canvas.width  = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.objectFit = 'none';
    
    // เตรียม Mask Canvas สำหรับ OpenCV
    maskCanvas = document.createElement('canvas');
    maskCanvas.id = 'wm-mask-canvas';
    maskCanvas.width = width;
    maskCanvas.height = height;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, width, height);

    history = [];
    document.getElementById('wm-drop-zone').style.display = 'none';
    wrap.style.display = 'block'; 
    document.getElementById('wm-zoom-reset').click();
    
    setStatus('วาดทับบริเวณที่ต้องการลบได้เลย (ลบเสร็จปล่อยเมาส์) — Scroll เพื่อ zoom, Space+ลาก เพื่อเลื่อน');
  }

  // ฟังก์ชันโหลดไฟล์ (Image & PDF)
  function loadFile(file) {
    if (!file) return;
    setStatus('⏳ กำลังโหลดไฟล์...');
    originalFileName = file.name.replace(/\.[^/.]+$/, ""); // ตัดนามสกุลทิ้ง
    
    if (file.type === 'application/pdf') {
      isPdfFile = true;
      if (typeof pdfjsLib === 'undefined') {
        alert('ไม่พบ PDF.js library กรุณาตรวจสอบแท็ก script ใน HTML');
        return;
      }
      
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          const page = await pdf.getPage(1); // โหลดหน้า 1 เสมอ
          const viewport = page.getViewport({ scale: 2.0 }); 
          
          // กำหนดขนาดให้ Canvas ก่อน!
          initializeCanvasWithImage(viewport.width, viewport.height);
          
          // แล้วค่อย Render PDF ลงไป
          const renderContext = { canvasContext: ctx, viewport: viewport };
          await page.render(renderContext).promise;
          img = true; 
          
        } catch (error) {
          console.error('PDF Load Error:', error);
          setStatus('❌ ไม่สามารถอ่านไฟล์ PDF ได้', true);
        }
      };
      fileReader.readAsArrayBuffer(file);
      
    } else {
      isPdfFile = false;
      const reader = new FileReader();
      reader.onload = e => {
        const image = new Image();
        image.onload = () => {
          img = image;
          
          // กำหนดขนาดให้ Canvas ก่อน!
          initializeCanvasWithImage(image.width, image.height);
          
          // แล้วค่อยวาดรูปลงไป
          ctx.drawImage(image, 0, 0); 
        };
        image.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // ระบบดาวน์โหลดไฟล์แบบฉลาด
  async function downloadResult() {
    if (!img) return;
    setStatus('⏳ กำลังเตรียมไฟล์ดาวน์โหลด...');

    if (isPdfFile && typeof PDFLib !== 'undefined') {
      try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([canvas.width, canvas.height]);
        
        const pngUrl = canvas.toDataURL('image/png');
        const pngImageBytes = await fetch(pngUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);
        
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
        });
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = originalFileName + '_clean.pdf';
        a.click();
        
      } catch (err) {
        console.error(err);
        fallbackDownloadImage(); 
      }
    } else {
      fallbackDownloadImage();
    }
    
    setStatus('✓ ดาวน์โหลดสำเร็จ!');
  }

  function fallbackDownloadImage() {
    const a = document.createElement('a');
    a.download = originalFileName + '_clean.png';
    a.href = canvas.toDataURL('image/png', 1.0);
    a.click();
  }

  function setTool(t) {
    tool = t;
    document.querySelectorAll('.wm-tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === t);
    });
  }

  function renderPage() {
    img = null; history = []; isPdfFile = false;

    document.getElementById('page-container').innerHTML = `
      <div class="page" style="padding:20px 24px;display:flex;flex-direction:column;height:calc(100vh - 56px);box-sizing:border-box;">

        <div id="wm-tools" style="flex-shrink:0;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)">
            <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-3);letter-spacing:1px">TOOL</span>
            <button class="wm-tool-btn action-btn active" data-tool="brush" onclick="RemoveWatermark.setTool('brush')" style="font-family:'DM Mono',monospace;font-size:10px">AUTO FILL (AI)</button>
            <button class="wm-tool-btn action-btn" data-tool="blur" onclick="RemoveWatermark.setTool('blur')" style="font-family:'DM Mono',monospace;font-size:10px">BLUR</button>
            <button class="wm-tool-btn action-btn" data-tool="color" onclick="RemoveWatermark.setTool('color')" style="font-family:'DM Mono',monospace;font-size:10px">COLOR FILL</button>
            <div style="width:1px;height:18px;background:var(--border);margin:0 2px"></div>
            <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-3);letter-spacing:1px">SIZE</span>
            <input type="range" min="5" max="80" value="30" step="1" style="width:80px;accent-color:var(--cyan)"
              oninput="RemoveWatermark.setBrush(this.value);document.getElementById('wm-size-val').textContent=this.value"/>
            <span id="wm-size-val" style="font-size:11px;font-family:'DM Mono',monospace;color:var(--cyan);min-width:24px">30</span>
            <div style="width:1px;height:18px;background:var(--border);margin:0 2px"></div>
            <span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--text-3);letter-spacing:1px">COLOR</span>
            <input type="color" value="#ffffff" style="width:26px;height:26px;border:1px solid var(--border2);border-radius:4px;background:none;cursor:none;padding:2px"
              oninput="RemoveWatermark.setColor(this.value)"/>
            <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
              <button class="action-btn" id="wm-zoom-out" style="font-family:'DM Mono',monospace;font-size:12px;padding:3px 9px">−</button>
              <span id="wm-zoom-val" style="font-size:11px;font-family:'DM Mono',monospace;color:var(--cyan);min-width:40px;text-align:center">100%</span>
              <button class="action-btn" id="wm-zoom-in" style="font-family:'DM Mono',monospace;font-size:12px;padding:3px 9px">+</button>
              <button class="action-btn" id="wm-zoom-reset" style="font-family:'DM Mono',monospace;font-size:10px">FIT</button>
              <div style="width:1px;height:18px;background:var(--border)"></div>
              <button class="action-btn" onclick="RemoveWatermark.undo()" style="font-family:'DM Mono',monospace;font-size:10px">↩ UNDO</button>
              <button class="btn btn--primary" onclick="RemoveWatermark.downloadResult()" style="font-size:10px;padding:6px 16px">↓ DOWNLOAD</button>
            </div>
          </div>
        </div>

        <div class="drop-zone" id="wm-drop-zone"
          onclick="document.getElementById('wm-input').click()"
          style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;max-width:100%;border-radius:var(--r)">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์ภาพ หรือ PDF</p>
          <p class="drop-sub">รองรับ JPG, PNG, WEBP และ PDF (ดึงหน้าแรก)<br/><strong>คลิกหรือลากรูปมาวาง</strong></p>
          <input type="file" id="wm-input" accept="image/*,application/pdf" style="display:none"/>
        </div>

        <div id="wm-canvas-wrap" style="display:none;flex:1;border:1px solid var(--border);border-radius:var(--r);overflow:hidden;cursor:crosshair;position:relative;background:#000">
          <canvas id="wm-canvas" style="display:block;touch-action:none;transform-origin:0 0;"></canvas>
        </div>

        <div class="status-text" id="wm-status" style="flex-shrink:0;margin-top:6px"></div>
      </div>
    `;

    if (!document.getElementById('wm-style')) {
      const s = document.createElement('style');
      s.id = 'wm-style';
      s.textContent = `.wm-tool-btn.active{background:var(--cyan-dim)!important;color:var(--cyan)!important;border-color:var(--border2)!important;}`;
      document.head.appendChild(s);
    }

    canvas = document.getElementById('wm-canvas');
    canvas.id = 'wm-canvas'; 
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    setupCanvas();

    const dz = document.getElementById('wm-drop-zone');
    const fi = document.getElementById('wm-input');
    fi.addEventListener('change', e => { if (e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ''; } });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
  }

  function setBrush(v) { brushSize = parseInt(v); }
  function setColor(v) { fillColor = v; }

  return { renderPage, undo, downloadResult, setTool, setBrush, setColor };
})();
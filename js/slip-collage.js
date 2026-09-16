const SlipCollage = (() => {
  let fileList = [];

  function setStatus(msg, isError=false) {
    const el = document.getElementById('sc-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    // Filter only images
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) {
      setStatus('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น', true);
      return;
    }
    
    fileList = [...fileList, ...newFiles];
    document.getElementById('sc-drop-zone').style.display = 'none';
    document.getElementById('sc-workspace').style.display = 'block';
    
    document.getElementById('sc-info').textContent = `เตรียมจัดเรียงทั้งหมด ${fileList.length} รูป`;
    document.getElementById('sc-btn-process').disabled = fileList.length === 0;
    setStatus('');
  }

  async function processCollage() {
    if (fileList.length === 0) return;
    const btn = document.getElementById('sc-btn-process');
    btn.disabled = true;
    setStatus('กำลังสร้าง PDF กรุณารอสักครู่...');
    
    try {
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.create();
      
      const layout = parseInt(document.getElementById('sc-layout').value); // 2, 4, or 9
      let cols = 2, rows = 2;
      if (layout === 2) { cols = 1; rows = 2; }
      else if (layout === 4) { cols = 2; rows = 2; }
      else if (layout === 9) { cols = 3; rows = 3; }
      
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const margin = 20;
      
      const contentW = A4_WIDTH - (margin * 2);
      const contentH = A4_HEIGHT - (margin * 2);
      
      const cellW = contentW / cols;
      const cellH = contentH / rows;
      
      let currentPage = null;
      let imgIndex = 0;
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const arrayBuffer = await file.arrayBuffer();
        
        let pdfImage;
        if (file.type === 'image/jpeg') {
          pdfImage = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          // If WebP or other, we need to convert to PNG via Canvas first
          const blobUrl = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobUrl; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          const pngBuf = await pngBlob.arrayBuffer();
          pdfImage = await pdfDoc.embedPng(pngBuf);
          URL.revokeObjectURL(blobUrl);
        }
        
        if (imgIndex % (cols * rows) === 0) {
          currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        }
        
        const posInPage = imgIndex % (cols * rows);
        const colIdx = posInPage % cols;
        const rowIdx = Math.floor(posInPage / cols);
        
        // Calculate drawing box (with small padding inside cell)
        const pad = 10;
        const drawBoxW = cellW - (pad * 2);
        const drawBoxH = cellH - (pad * 2);
        
        // Fit image into drawing box
        const imgDims = pdfImage.scale(1);
        const scaleW = drawBoxW / imgDims.width;
        const scaleH = drawBoxH / imgDims.height;
        const scale = Math.min(scaleW, scaleH); // Keep aspect ratio
        
        const finalW = imgDims.width * scale;
        const finalH = imgDims.height * scale;
        
        // Center in cell
        const x = margin + (colIdx * cellW) + (cellW - finalW) / 2;
        const y = A4_HEIGHT - margin - ((rowIdx + 1) * cellH) + (cellH - finalH) / 2;
        
        currentPage.drawImage(pdfImage, {
          x: x,
          y: y,
          width: finalW,
          height: finalH,
        });
        
        imgIndex++;
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Slip_Collage_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('สร้างเอกสาร PDF สำเร็จ!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    fileList = [];
    document.getElementById('sc-drop-zone').style.display = 'flex';
    document.getElementById('sc-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Image Tools</span>
          <h1 class="page-title">Receipt / Slip <em>Collage</em></h1>
          <p class="page-desc">จัดเรียงสลิปโอนเงิน หรือใบเสร็จหลายๆ รูป ลงในหน้ากระดาษ A4 เพื่อสั่งปริ้น</p>
        </div>

        <div class="drop-zone" id="sc-drop-zone" onclick="document.getElementById('sc-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดรูปภาพสลิป / ใบเสร็จ</p>
          <p class="drop-sub">ไฟล์ JPG, PNG (เลือกหลายไฟล์ได้พร้อมกัน)</p>
          <input type="file" id="sc-input" accept="image/*" multiple style="display:none" onchange="SlipCollage.handleFiles(this.files)" />
        </div>

        <div id="sc-workspace" style="display:none; max-width:600px;">
          <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
            <div id="sc-info" style="font-weight: 500; font-size: 15px; margin-bottom: 20px;"></div>
            
            <div style="margin-bottom: 20px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">รูปแบบการจัดวางบนกระดาษ A4</label>
              <select id="sc-layout" style="width:100%; padding:10px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit; font-size:14px;">
                <option value="2">2 รูป / หน้า (ขนาดใหญ่)</option>
                <option value="4" selected>4 รูป / หน้า (ขนาดมาตรฐาน)</option>
                <option value="9">9 รูป / หน้า (ขนาดเล็ก)</option>
              </select>
            </div>

            <div style="display:flex; gap: 8px;">
              <button class="btn btn--ghost" style="flex:1;" onclick="SlipCollage.reset()">ยกเลิก / เริ่มใหม่</button>
              <button class="btn btn--primary" style="flex:2;" id="sc-btn-process" onclick="SlipCollage.processCollage()">
                สร้างไฟล์ PDF สำหรับปริ้น
              </button>
            </div>
          </div>
          <div id="sc-status" style="font-size:14px; margin-top:16px; display:none; text-align:center;"></div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('sc-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, handleFiles, processCollage, reset };
})();

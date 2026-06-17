const AddWatermark = (() => {
  let fileBuffer = null;
  let fileName = '';

  function setStatus(msg, isError=false) {
    const el = document.getElementById('aw-status');
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
    document.getElementById('aw-drop-zone').style.display = 'none';
    document.getElementById('aw-workspace').style.display = 'block';
    
    fileBuffer = await file.arrayBuffer();
    try {
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const total = pdfDoc.getPageCount();
      document.getElementById('aw-info').textContent = `ไฟล์: ${file.name} (${total} หน้า)`;
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('ไฟล์ PDF ไม่ถูกต้องหรือไม่สามารถอ่านได้', true);
    }
  }

  async function processPdf() {
    if (!fileBuffer) return;
    const btn = document.getElementById('aw-btn-save');
    btn.disabled = true;
    setStatus('กำลังประทับลายน้ำ...');

    try {
      const text = document.getElementById('aw-text').value;
      const opacity = parseFloat(document.getElementById('aw-opacity').value);
      const size = parseInt(document.getElementById('aw-size').value);
      const isDiagonal = document.getElementById('aw-layout').value === 'diagonal';
      
      const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      pages.forEach(page => {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, size);
        const textHeight = font.heightAtSize(size);
        
        let x = (width / 2) - (textWidth / 2);
        let y = (height / 2) - (textHeight / 2);
        let rotate = degrees(0);

        if (isDiagonal) {
          rotate = degrees(45);
          // adjust x, y for rotation center
          x = (width / 2) - (textWidth / 2) * Math.cos(Math.PI/4) + (textHeight / 2) * Math.sin(Math.PI/4);
          y = (height / 2) - (textWidth / 2) * Math.sin(Math.PI/4) - (textHeight / 2) * Math.cos(Math.PI/4);
        }

        page.drawText(text, {
          x: x,
          y: y,
          size: size,
          font: font,
          color: rgb(0.8, 0.2, 0.2), // Light Red default
          opacity: opacity,
          rotate: rotate
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      let newName = fileName;
      if (newName.endsWith('.pdf')) newName = newName.substring(0, newName.length - 4);
      a.download = `${newName}_watermarked.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('ประทับลายน้ำสำเร็จแล้ว!');
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
    document.getElementById('aw-drop-zone').style.display = 'flex';
    document.getElementById('aw-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">Add <em>Watermark</em></h1>
          <p class="page-desc">ประทับตราข้อความลายน้ำลงบนไฟล์ PDF เพื่อป้องกันการคัดลอก</p>
        </div>

        <div class="drop-zone" id="aw-drop-zone" onclick="document.getElementById('aw-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ PDF</p>
          <p class="drop-sub">คลิกหรือลากไฟล์มาวาง</p>
          <input type="file" id="aw-input" accept=".pdf" style="display:none" onchange="AddWatermark.handleFile(this.files[0])" />
        </div>

        <div id="aw-workspace" style="display:none; max-width:600px;">
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 16px;">
            <div id="aw-info" style="font-weight: 500; font-size: 14px; margin-bottom: 16px;"></div>
            
            <div style="margin-bottom: 16px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ข้อความลายน้ำ (รองรับภาษาอังกฤษ)</label>
              <input type="text" id="aw-text" value="CONFIDENTIAL" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit; font-size:14px;" />
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ความทึบแสง</label>
                <select id="aw-opacity" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="0.2">20% (จางมาก)</option>
                  <option value="0.4" selected>40% (จางปานกลาง)</option>
                  <option value="0.6">60% (เข้มปานกลาง)</option>
                  <option value="0.8">80% (เข้มมาก)</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ขนาดตัวอักษร</label>
                <input type="number" id="aw-size" value="60" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
              </div>
              <div>
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">รูปแบบการวาง</label>
                <select id="aw-layout" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="diagonal">ทแยงมุม 45°</option>
                  <option value="center">แนวนอนตรงกลาง</option>
                </select>
              </div>
            </div>

            <div style="display:flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn--ghost" onclick="AddWatermark.reset()">ยกเลิก</button>
              <button class="btn btn--primary" id="aw-btn-save" onclick="AddWatermark.processPdf()">
                ใส่ลายน้ำ & ดาวน์โหลด
              </button>
            </div>
          </div>
          <div id="aw-status" style="font-size:13px; display:none;"></div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('aw-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, handleFile, processPdf, reset };
})();

const PageNum = (() => {
  let fileBuffer = null;
  let fileName = '';

  function setStatus(msg, isError=false) {
    const el = document.getElementById('pn-status');
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
    document.getElementById('pn-drop-zone').style.display = 'none';
    document.getElementById('pn-workspace').style.display = 'block';
    
    fileBuffer = await file.arrayBuffer();
    try {
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const total = pdfDoc.getPageCount();
      document.getElementById('pn-info').textContent = `ไฟล์: ${file.name} (${total} หน้า)`;
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('ไฟล์ PDF ไม่ถูกต้องหรือไม่สามารถอ่านได้', true);
    }
  }

  async function processPdf() {
    if (!fileBuffer) return;
    const btn = document.getElementById('pn-btn-save');
    btn.disabled = true;
    setStatus('กำลังรันเลขหน้า...');

    try {
      const format = document.getElementById('pn-format').value;
      const position = document.getElementById('pn-position').value;
      
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const totalPages = pages.length;

      pages.forEach((page, idx) => {
        const pageNumber = idx + 1;
        let text = format.replace('{n}', pageNumber).replace('{total}', totalPages);
        
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        let x = 0;
        let y = 30; // 30 points from bottom by default
        
        if (position === 'bc') {
          x = (width / 2) - (textWidth / 2);
        } else if (position === 'br') {
          x = width - textWidth - 30;
        } else if (position === 'bl') {
          x = 30;
        } else if (position === 'tr') {
          x = width - textWidth - 30;
          y = height - 30;
        }

        page.drawText(text, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      let newName = fileName;
      if (newName.endsWith('.pdf')) newName = newName.substring(0, newName.length - 4);
      a.download = `${newName}_numbered.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('รันเลขหน้าสำเร็จแล้ว!');
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
    document.getElementById('pn-drop-zone').style.display = 'flex';
    document.getElementById('pn-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">Add Page <em>Numbers</em></h1>
          <p class="page-desc">รันเลขหน้าอัตโนมัติลงในเอกสาร PDF ของคุณ</p>
        </div>

        <div class="drop-zone" id="pn-drop-zone" onclick="document.getElementById('pn-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ PDF</p>
          <p class="drop-sub">คลิกหรือลากไฟล์มาวาง</p>
          <input type="file" id="pn-input" accept=".pdf" style="display:none" onchange="PageNum.handleFile(this.files[0])" />
        </div>

        <div id="pn-workspace" style="display:none; max-width:600px;">
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 16px;">
            <div id="pn-info" style="font-weight: 500; font-size: 14px; margin-bottom: 16px;"></div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">รูปแบบเลขหน้า</label>
                <select id="pn-format" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="{n}">{n} (เช่น 1, 2, 3)</option>
                  <option value="- {n} -">- {n} -</option>
                  <option value="Page {n}">Page {n}</option>
                  <option value="Page {n} of {total}">Page {n} of {total}</option>
                  <option value="หน้า {n}">หน้า {n}</option>
                  <option value="หน้า {n}/{total}">หน้า {n}/{total}</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ตำแหน่ง</label>
                <select id="pn-position" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="bc">ตรงกลาง ด้านล่าง</option>
                  <option value="br">มุมขวา ด้านล่าง</option>
                  <option value="bl">มุมซ้าย ด้านล่าง</option>
                  <option value="tr">มุมขวา ด้านบน</option>
                </select>
              </div>
            </div>

            <div style="display:flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn--ghost" onclick="PageNum.reset()">ยกเลิก</button>
              <button class="btn btn--primary" id="pn-btn-save" onclick="PageNum.processPdf()">
                รันเลขหน้า & ดาวน์โหลด
              </button>
            </div>
          </div>
          <div id="pn-status" style="font-size:13px; display:none;"></div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('pn-drop-zone');
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

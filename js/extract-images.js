const ExtractImages = (() => {
  let fileName = '';

  function setStatus(msg, isError=false) {
    const el = document.getElementById('ex-status');
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
    document.getElementById('ex-drop-zone').style.display = 'none';
    document.getElementById('ex-workspace').style.display = 'block';
    document.getElementById('ex-filename').textContent = `กำลังประมวลผล: ${file.name}`;
    setStatus('กำลังดึงรูปภาพ...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      const zip = new JSZip();
      let imageCount = 0;
      
      for (let i = 1; i <= numPages; i++) {
        setStatus(`กำลังค้นหารูปภาพหน้าที่ ${i}/${numPages}...`);
        const page = await pdf.getPage(i);
        const ops = await page.getOperatorList();
        
        for (let j = 0; j < ops.fnArray.length; j++) {
          if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
            const objId = ops.argsArray[j][0];
            const img = await page.objs.get(objId);
            
            if (img && img.data) {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              const imgData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
              ctx.putImageData(imgData, 0, 0);
              
              const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
              if (blob) {
                imageCount++;
                zip.file(`image_${imageCount.toString().padStart(3, '0')}.png`, blob);
              }
            }
          }
        }
      }
      
      if (imageCount === 0) {
        setStatus('ไม่พบรูปภาพในไฟล์ PDF นี้', true);
        document.getElementById('ex-btn-reset').style.display = 'inline-block';
        return;
      }
      
      setStatus(`พบรูปภาพทั้งหมด ${imageCount} รูป กำลังสร้างไฟล์ ZIP...`);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      let newName = fileName;
      if (newName.endsWith('.pdf')) newName = newName.substring(0, newName.length - 4);
      a.download = `${newName}_images.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus(`ดาวน์โหลดรูปภาพสำเร็จ (${imageCount} รูป)`);
      document.getElementById('ex-btn-reset').style.display = 'inline-block';
      
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
      document.getElementById('ex-btn-reset').style.display = 'inline-block';
    }
  }

  function reset() {
    fileName = '';
    document.getElementById('ex-drop-zone').style.display = 'flex';
    document.getElementById('ex-workspace').style.display = 'none';
    document.getElementById('ex-btn-reset').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">Extract <em>Images</em></h1>
          <p class="page-desc">ดึงรูปภาพทุกรูปที่แทรกอยู่ในไฟล์ PDF ออกมาเป็นรูปภาพ (ดาวน์โหลดเป็น ZIP)</p>
        </div>

        <div class="drop-zone" id="ex-drop-zone" onclick="document.getElementById('ex-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ PDF</p>
          <p class="drop-sub">คลิกหรือลากไฟล์มาวาง</p>
          <input type="file" id="ex-input" accept=".pdf" style="display:none" onchange="ExtractImages.handleFile(this.files[0])" />
        </div>

        <div id="ex-workspace" style="display:none; max-width:600px;">
          <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <div id="ex-filename" style="font-weight: 500; font-size: 14px; margin-bottom: 16px;"></div>
            <div id="ex-status" style="font-size:14px; margin-bottom:16px; color:var(--gold);"></div>
            <button class="btn btn--ghost" id="ex-btn-reset" onclick="ExtractImages.reset()" style="display:none; margin:0 auto;">ทำใหม่</button>
          </div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('ex-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, handleFile, reset };
})();

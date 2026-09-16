const OcrTool = (() => {
  let fileBlob = null;

  function setStatus(msg, isError=false) {
    const el = document.getElementById('ocr-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('กรุณาอัปโหลดไฟล์รูปภาพ (JPG, PNG) เท่านั้น', true);
      return;
    }
    fileBlob = file;
    document.getElementById('ocr-drop-zone').style.display = 'none';
    document.getElementById('ocr-workspace').style.display = 'block';
    
    const url = URL.createObjectURL(file);
    document.getElementById('ocr-preview').src = url;
    setStatus('');
    document.getElementById('ocr-result').value = '';
    document.getElementById('ocr-result').style.display = 'none';
  }

  async function processOcr() {
    if (!fileBlob) return;
    const btn = document.getElementById('ocr-btn-process');
    btn.disabled = true;
    setStatus('กำลังอ่านข้อความ... อาจใช้เวลา 5-10 วินาทีในครั้งแรก');
    document.getElementById('ocr-result').style.display = 'none';
    
    try {
      const lang = document.getElementById('ocr-lang').value;
      
      const worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setStatus(`กำลังอ่านข้อความ... ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      await worker.loadLanguage(lang);
      await worker.initialize(lang);
      
      const { data: { text } } = await worker.recognize(fileBlob);
      await worker.terminate();
      
      const resultEl = document.getElementById('ocr-result');
      resultEl.value = text;
      resultEl.style.display = 'block';
      
      setStatus('อ่านข้อความสำเร็จ!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function copyText() {
    const text = document.getElementById('ocr-result').value;
    if (text) {
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('ocr-btn-copy');
      const original = btn.textContent;
      btn.textContent = 'คัดลอกแล้ว!';
      setTimeout(() => btn.textContent = original, 2000);
    }
  }

  function reset() {
    fileBlob = null;
    document.getElementById('ocr-drop-zone').style.display = 'flex';
    document.getElementById('ocr-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Image Tools</span>
          <h1 class="page-title">Image to Text <em>(OCR)</em></h1>
          <p class="page-desc">ดึงข้อความจากรูปภาพ เอกสารสแกน หรือสลิป (รองรับภาษาไทย)</p>
        </div>

        <div class="drop-zone" id="ocr-drop-zone" onclick="document.getElementById('ocr-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดรูปภาพ</p>
          <p class="drop-sub">ไฟล์ JPG, PNG หรือลากไฟล์มาวาง</p>
          <input type="file" id="ocr-input" accept="image/*" style="display:none" onchange="OcrTool.handleFile(this.files[0])" />
        </div>

        <div id="ocr-workspace" style="display:none; max-width:800px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Left: Preview -->
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <img id="ocr-preview" style="max-width:100%; max-height:400px; border-radius:4px; object-fit:contain; background:#fff;" />
              
              <div style="margin-top: 16px; text-align: left;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">เลือกภาษาในภาพ</label>
                <select id="ocr-lang" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit; margin-bottom:16px;">
                  <option value="tha+eng">ภาษาไทย + ภาษาอังกฤษ (Thai + Eng)</option>
                  <option value="tha">ภาษาไทย (Thai)</option>
                  <option value="eng">ภาษาอังกฤษ (English)</option>
                </select>
                
                <div style="display:flex; gap: 8px;">
                  <button class="btn btn--ghost" style="flex:1;" onclick="OcrTool.reset()">เปลี่ยนรูปภาพ</button>
                  <button class="btn btn--primary" style="flex:2;" id="ocr-btn-process" onclick="OcrTool.processOcr()">ดึงข้อความ</button>
                </div>
              </div>
            </div>

            <!-- Right: Result -->
            <div style="display:flex; flex-direction:column;">
              <div id="ocr-status" style="font-size:13px; margin-bottom:8px; display:none;"></div>
              <textarea id="ocr-result" style="flex:1; width:100%; min-height:300px; padding:12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit; font-size:14px; resize:none; display:none;" placeholder="ข้อความที่ดึงได้จะแสดงที่นี่..."></textarea>
              <button class="btn btn--ghost" id="ocr-btn-copy" onclick="OcrTool.copyText()" style="margin-top:8px;">คัดลอกข้อความ (Copy)</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('ocr-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, handleFile, processOcr, copyText, reset };
})();

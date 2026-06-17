const BulkResizer = (() => {
  let fileList = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError=false) {
    const el = document.getElementById('br-status');
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
    document.getElementById('br-drop-zone').style.display = 'none';
    document.getElementById('br-workspace').style.display = 'block';
    
    renderFileList();
    setStatus('');
  }

  function renderFileList() {
    const listEl = document.getElementById('br-file-list');
    listEl.innerHTML = '';
    
    let totalSize = 0;
    
    fileList.forEach((file, idx) => {
      totalSize += file.size;
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; align-items:center;';
      item.innerHTML = `
        <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${file.name}</div>
        <div style="color:var(--text-2); display:flex; align-items:center; gap:12px;">
          <span>${fmt(file.size)}</span>
          <button class="btn btn--ghost" style="padding:2px 6px; font-size:11px;" onclick="BulkResizer.removeFile(${idx})">ลบ</button>
        </div>
      `;
      listEl.appendChild(item);
    });
    
    document.getElementById('br-info').textContent = `จำนวน ${fileList.length} รูป (รวม ${fmt(totalSize)})`;
    document.getElementById('br-btn-process').disabled = fileList.length === 0;
  }

  function removeFile(idx) {
    fileList.splice(idx, 1);
    if (fileList.length === 0) reset();
    else renderFileList();
  }

  async function processFiles() {
    if (fileList.length === 0) return;
    const btn = document.getElementById('br-btn-process');
    btn.disabled = true;
    
    try {
      const mode = document.getElementById('br-mode').value;
      const resizeVal = parseInt(document.getElementById('br-resize-val').value) || 100;
      const format = document.getElementById('br-format').value;
      const quality = parseInt(document.getElementById('br-quality').value) / 100;
      
      const zip = new JSZip();
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setStatus(`กำลังประมวลผลรูปที่ ${i + 1}/${fileList.length}: ${file.name}`);
        
        const blob = await convertImage(file, mode, resizeVal, format, quality);
        
        // Generate new filename
        let baseName = file.name;
        const lastDot = baseName.lastIndexOf('.');
        if (lastDot !== -1) baseName = baseName.substring(0, lastDot);
        
        let ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
        zip.file(`${baseName}_resized.${ext}`, blob);
      }
      
      setStatus('กำลังแพ็คไฟล์ ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `resized_images_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('ดาวน์โหลดรูปภาพสำเร็จ!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function convertImage(file, mode, resizeVal, format, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let newW = img.width;
        let newH = img.height;
        
        if (mode === 'percent' && resizeVal !== 100) {
          newW = Math.round(img.width * (resizeVal / 100));
          newH = Math.round(img.height * (resizeVal / 100));
        } else if (mode === 'width' && img.width > resizeVal) {
          const ratio = resizeVal / img.width;
          newW = resizeVal;
          newH = Math.round(img.height * ratio);
        } else if (mode === 'height' && img.height > resizeVal) {
          const ratio = resizeVal / img.height;
          newH = resizeVal;
          newW = Math.round(img.width * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        
        // Fill white background for JPEG converting from PNG
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, newW, newH);
        }
        
        ctx.drawImage(img, 0, 0, newW, newH);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, format, quality);
      };
      img.onerror = () => reject(new Error('Cannot load image'));
      img.src = url;
    });
  }

  function updateUi() {
    const mode = document.getElementById('br-mode').value;
    const valLabel = document.getElementById('br-val-label');
    if (mode === 'percent') valLabel.textContent = 'ขนาดเปอร์เซ็นต์ (%)';
    else if (mode === 'width') valLabel.textContent = 'ความกว้างสูงสุด (px)';
    else valLabel.textContent = 'ความสูงสูงสุด (px)';
  }

  function reset() {
    fileList = [];
    document.getElementById('br-drop-zone').style.display = 'flex';
    document.getElementById('br-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Image Tools</span>
          <h1 class="page-title">Bulk Image <em>Resizer</em></h1>
          <p class="page-desc">ย่อขนาดภาพและแปลงนามสกุลรูปภาพทีละหลายๆ รูปพร้อมกัน</p>
        </div>

        <div class="drop-zone" id="br-drop-zone" onclick="document.getElementById('br-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดรูปภาพหลายๆ รูป</p>
          <p class="drop-sub">ไฟล์ JPG, PNG หรือ WebP</p>
          <input type="file" id="br-input" accept="image/*" multiple style="display:none" onchange="BulkResizer.handleFiles(this.files)" />
        </div>

        <div id="br-workspace" style="display:none; max-width:800px;">
          <div style="display:grid; grid-template-columns: 300px 1fr; gap: 20px;">
            <!-- Left: Settings -->
            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
              <h3 style="font-size: 14px; margin-bottom: 16px; color:var(--gold);">ตั้งค่าการแปลงไฟล์</h3>
              
              <div style="margin-bottom: 12px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">วิธีปรับขนาด (Resize)</label>
                <select id="br-mode" onchange="BulkResizer.updateUi()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="percent">ย่อ/ขยายตามสัดส่วน (%)</option>
                  <option value="width">จำกัดความกว้างสูงสุด</option>
                  <option value="height">จำกัดความสูงสูงสุด</option>
                </select>
              </div>
              
              <div style="margin-bottom: 16px;">
                <label id="br-val-label" style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ขนาดเปอร์เซ็นต์ (%)</label>
                <input type="number" id="br-resize-val" value="100" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
              </div>

              <div style="margin-bottom: 12px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">แปลงไฟล์เป็นนามสกุล</label>
                <select id="br-format" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="image/jpeg">JPEG (.jpg)</option>
                  <option value="image/png">PNG (.png) - ทะลุโปร่งแสงได้</option>
                  <option value="image/webp">WebP (.webp) - ไฟล์เล็กสุด</option>
                </select>
              </div>

              <div style="margin-bottom: 24px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">คุณภาพ (Quality)</label>
                <select id="br-quality" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="100">100% (ชัดสุด)</option>
                  <option value="90">90% (แนะนำ)</option>
                  <option value="80">80% (คุณภาพดี/ไฟล์เล็กลงมาก)</option>
                  <option value="60">60% (ลดขนาดไฟล์สุดๆ)</option>
                </select>
              </div>

              <button class="btn btn--primary" id="br-btn-process" onclick="BulkResizer.processFiles()" style="width:100%;">เริ่มแปลงและโหลด ZIP</button>
              <button class="btn btn--ghost" onclick="BulkResizer.reset()" style="width:100%; margin-top:8px;">ยกเลิก</button>
            </div>

            <!-- Right: List -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div id="br-info" style="font-size:13px; font-weight:500;"></div>
                <button class="btn btn--ghost" style="padding:4px 8px; font-size:12px;" onclick="document.getElementById('br-input').click()">+ เพิ่มรูปภาพ</button>
              </div>
              
              <div id="br-file-list" style="max-height: 400px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--r);"></div>
              
              <div id="br-status" style="font-size:13px; margin-top:16px; display:none;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('br-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, handleFiles, processFiles, removeFile, updateUi, reset };
})();

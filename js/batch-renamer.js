const BatchRenamer = (() => {
  let fileList = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError=false) {
    const el = document.getElementById('rn-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    fileList = [...fileList, ...Array.from(files)];
    document.getElementById('rn-drop-zone').style.display = 'none';
    document.getElementById('rn-workspace').style.display = 'block';
    
    updatePreview();
  }

  function removeFile(idx) {
    fileList.splice(idx, 1);
    if (fileList.length === 0) reset();
    else updatePreview();
  }

  function getNewName(oldName, idx) {
    let name = oldName;
    const lastDot = name.lastIndexOf('.');
    let ext = '';
    if (lastDot !== -1) {
      ext = name.substring(lastDot);
      name = name.substring(0, lastDot);
    }
    
    const prefix = document.getElementById('rn-prefix').value;
    const suffix = document.getElementById('rn-suffix').value;
    const findText = document.getElementById('rn-find').value;
    const replaceText = document.getElementById('rn-replace').value;
    const numPadding = parseInt(document.getElementById('rn-num').value); // 0 = none, 1, 2, 3
    
    if (findText) {
      // replace all
      name = name.split(findText).join(replaceText);
    }
    
    let result = name;
    if (prefix) result = prefix + result;
    if (suffix) result = result + suffix;
    
    if (numPadding > 0) {
      const numStr = (idx + 1).toString().padStart(numPadding, '0');
      // Append number with underscore if result is not empty
      if (result) result += '_' + numStr;
      else result = numStr;
    }
    
    // Fallback if empty
    if (!result) result = 'file_' + (idx + 1);
    
    return result + ext;
  }

  function updatePreview() {
    const listEl = document.getElementById('rn-file-list');
    listEl.innerHTML = '';
    
    fileList.forEach((file, idx) => {
      const newName = getNewName(file.name, idx);
      const isChanged = newName !== file.name;
      
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; align-items:center;';
      
      let nameHtml = \`
        <div style="display:flex; flex-direction:column;">
          <span style="color:var(--text-2); text-decoration:line-through; font-size:11px;">\${file.name}</span>
          <span style="color:\${isChanged ? 'var(--gold)' : '#fff'};">\${newName}</span>
        </div>
      \`;
      
      if (!isChanged) {
        nameHtml = \`<div>\${file.name}</div>\`;
      }
      
      item.innerHTML = \`
        \${nameHtml}
        <div style="color:var(--text-2); display:flex; align-items:center; gap:12px;">
          <button class="btn btn--ghost" style="padding:2px 6px; font-size:11px;" onclick="BatchRenamer.removeFile(\${idx})">ลบ</button>
        </div>
      \`;
      listEl.appendChild(item);
    });
    
    document.getElementById('rn-info').textContent = \`รายการไฟล์ (\${fileList.length})\`;
    document.getElementById('rn-btn-process').disabled = fileList.length === 0;
  }

  async function processRename() {
    if (fileList.length === 0) return;
    const btn = document.getElementById('rn-btn-process');
    btn.disabled = true;
    setStatus('กำลังเตรียมไฟล์ ZIP...');
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const newName = getNewName(file.name, i);
        zip.file(newName, file);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = \`Renamed_Files_\${Date.now()}.zip\`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus('ดาวน์โหลดไฟล์สำเร็จ!');
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    fileList = [];
    document.getElementById('rn-drop-zone').style.display = 'flex';
    document.getElementById('rn-workspace').style.display = 'none';
    
    document.getElementById('rn-prefix').value = '';
    document.getElementById('rn-suffix').value = '';
    document.getElementById('rn-find').value = '';
    document.getElementById('rn-replace').value = '';
    document.getElementById('rn-num').value = '0';
    
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = \`
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Data Tools</span>
          <h1 class="page-title">Batch File <em>Renamer</em></h1>
          <p class="page-desc">เปลี่ยนชื่อไฟล์ทีละหลายๆ ไฟล์พร้อมกันอย่างเป็นระบบ (ดาวน์โหลดเป็น ZIP)</p>
        </div>

        <div class="drop-zone" id="rn-drop-zone" onclick="document.getElementById('rn-input').click()" style="max-width:600px; margin-bottom:16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ที่ต้องการเปลี่ยนชื่อ</p>
          <p class="drop-sub">เลือกไฟล์ได้ทุกประเภททีละหลายไฟล์</p>
          <input type="file" id="rn-input" multiple style="display:none" onchange="BatchRenamer.handleFiles(this.files)" />
        </div>

        <div id="rn-workspace" style="display:none; max-width:800px;">
          <div style="display:grid; grid-template-columns: 300px 1fr; gap: 20px;">
            <!-- Left: Settings -->
            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
              <h3 style="font-size: 14px; margin-bottom: 16px; color:var(--gold);">ตั้งค่าการเปลี่ยนชื่อ</h3>
              
              <div style="margin-bottom: 12px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">เติมคำนำหน้า (Prefix)</label>
                <input type="text" id="rn-prefix" placeholder="เช่น Report_" oninput="BatchRenamer.updatePreview()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
              </div>
              
              <div style="margin-bottom: 16px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">เติมคำลงท้าย (Suffix)</label>
                <input type="text" id="rn-suffix" placeholder="เช่น _v2" oninput="BatchRenamer.updatePreview()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom: 16px;">
                <div>
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ค้นหาคำ (Find)</label>
                  <input type="text" id="rn-find" placeholder="คำเดิม" oninput="BatchRenamer.updatePreview()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
                </div>
                <div>
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">แทนที่ด้วย (Replace)</label>
                  <input type="text" id="rn-replace" placeholder="คำใหม่" oninput="BatchRenamer.updatePreview()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
                </div>
              </div>

              <div style="margin-bottom: 24px;">
                <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ใส่เลขลำดับ (Numbering)</label>
                <select id="rn-num" onchange="BatchRenamer.updatePreview()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                  <option value="0">ไม่ใส่เลข</option>
                  <option value="1">1, 2, 3...</option>
                  <option value="2">01, 02, 03...</option>
                  <option value="3">001, 002, 003...</option>
                </select>
              </div>

              <button class="btn btn--primary" id="rn-btn-process" onclick="BatchRenamer.processRename()" style="width:100%;">เริ่มเปลี่ยนชื่อ & โหลด ZIP</button>
              <button class="btn btn--ghost" onclick="BatchRenamer.reset()" style="width:100%; margin-top:8px;">ยกเลิก / เริ่มใหม่</button>
            </div>

            <!-- Right: Preview -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div id="rn-info" style="font-size:13px; font-weight:500;"></div>
                <button class="btn btn--ghost" style="padding:4px 8px; font-size:12px;" onclick="document.getElementById('rn-input').click()">+ เพิ่มไฟล์</button>
              </div>
              
              <div id="rn-file-list" style="max-height: 400px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--r);"></div>
              
              <div id="rn-status" style="font-size:13px; margin-top:16px; display:none;"></div>
            </div>
          </div>
        </div>
      </div>
    \`;

    const dropZone = document.getElementById('rn-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, handleFiles, removeFile, updatePreview, processRename, reset };
})();

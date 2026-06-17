const CsvMerger = (() => {
  let fileList = [];
  let mode = 'merge'; // 'merge' or 'split'
  
  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError=false) {
    const el = document.getElementById('cm-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files).filter(f => f.name.endsWith('.csv') || f.type === 'text/csv');
    if (newFiles.length === 0) {
      setStatus('กรุณาอัปโหลดไฟล์ CSV เท่านั้น', true);
      return;
    }
    
    fileList = [...fileList, ...newFiles];
    document.getElementById('cm-drop-zone').style.display = 'none';
    document.getElementById('cm-workspace').style.display = 'block';
    
    updateList();
  }

  function removeFile(idx) {
    fileList.splice(idx, 1);
    if (fileList.length === 0) reset();
    else updateList();
  }

  function updateList() {
    const listEl = document.getElementById('cm-file-list');
    listEl.innerHTML = '';
    
    fileList.forEach((file, idx) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; align-items:center;';
      item.innerHTML = \`
        <div>\${file.name}</div>
        <div style="color:var(--text-2); display:flex; align-items:center; gap:12px;">
          <span>\${fmt(file.size)}</span>
          <button class="btn btn--ghost" style="padding:2px 6px; font-size:11px;" onclick="CsvMerger.removeFile(\${idx})">ลบ</button>
        </div>
      \`;
      listEl.appendChild(item);
    });
    
    document.getElementById('cm-info').textContent = \`รายการไฟล์ (\${fileList.length})\`;
    
    if (mode === 'merge') {
      document.getElementById('cm-btn-process').disabled = fileList.length < 2;
      if (fileList.length < 2) setStatus('การรวมไฟล์ ต้องอัปโหลดอย่างน้อย 2 ไฟล์ขึ้นไป', true);
      else setStatus('');
    } else {
      document.getElementById('cm-btn-process').disabled = fileList.length === 0;
      if (fileList.length > 1) {
        // Only keep first file for splitting
        fileList = [fileList[0]];
        updateList();
        setStatus('โหมดหั่นไฟล์ จะประมวลผลทีละ 1 ไฟล์เท่านั้น (เลือกไฟล์แรกแล้ว)', true);
      } else {
        setStatus('');
      }
    }
  }

  function switchMode(newMode) {
    mode = newMode;
    document.getElementById('cm-btn-mode-merge').className = \`btn \${mode === 'merge' ? 'btn--primary' : 'btn--ghost'}\`;
    document.getElementById('cm-btn-mode-split').className = \`btn \${mode === 'split' ? 'btn--primary' : 'btn--ghost'}\`;
    
    document.getElementById('cm-opt-merge').style.display = mode === 'merge' ? 'block' : 'none';
    document.getElementById('cm-opt-split').style.display = mode === 'split' ? 'block' : 'none';
    
    document.getElementById('cm-btn-process').textContent = mode === 'merge' ? 'รวมไฟล์ (Merge)' : 'หั่นไฟล์เป็นส่วนๆ (Split)';
    
    updateList();
  }

  async function processData() {
    if (mode === 'merge' && fileList.length < 2) return;
    if (mode === 'split' && fileList.length !== 1) return;
    
    const btn = document.getElementById('cm-btn-process');
    btn.disabled = true;
    setStatus('กำลังประมวลผลข้อมูล...');
    
    try {
      if (mode === 'merge') {
        await doMerge();
      } else {
        await doSplit();
      }
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) { resolve(results); },
        error: function(err) { reject(err); }
      });
    });
  }

  async function doMerge() {
    const keepHeader = document.getElementById('cm-keep-header').value === 'all'; // all or first
    
    let combinedData = [];
    let allHeaders = new Set();
    
    for (let i = 0; i < fileList.length; i++) {
      setStatus(\`กำลังอ่านไฟล์ที่ \${i+1}/\${fileList.length}...\`);
      const results = await parseCsvFile(fileList[i]);
      results.meta.fields.forEach(f => allHeaders.add(f));
      
      // If we don't care about strict headers, just merge data array
      combinedData = combinedData.concat(results.data);
    }
    
    setStatus('กำลังสร้างไฟล์รวม...');
    
    const csvStr = Papa.unparse(combinedData, {
      header: true,
      columns: Array.from(allHeaders)
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel Thai support
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = \`Merged_Data_\${Date.now()}.csv\`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    setStatus('ดาวน์โหลดไฟล์สำเร็จ!');
  }

  async function doSplit() {
    const splitBy = document.getElementById('cm-split-by').value; // rows or col
    
    setStatus('กำลังอ่านไฟล์...');
    const results = await parseCsvFile(fileList[0]);
    const data = results.data;
    
    if (data.length === 0) throw new Error('ไฟล์ว่างเปล่า');
    
    const zip = new JSZip();
    let fileCount = 0;
    
    if (splitBy === 'rows') {
      const rowsPerFile = parseInt(document.getElementById('cm-split-rows').value) || 1000;
      for (let i = 0; i < data.length; i += rowsPerFile) {
        const chunk = data.slice(i, i + rowsPerFile);
        const csvStr = Papa.unparse(chunk);
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
        zip.file(\`part_\${(i/rowsPerFile)+1}.csv\`, blob);
        fileCount++;
      }
    } else {
      // Group by column
      // We don't have column name easily, just use first column for simplicity if user didn't specify
      const colName = document.getElementById('cm-split-col').value || results.meta.fields[0];
      
      if (!results.meta.fields.includes(colName)) {
        throw new Error(\`ไม่พบคอลัมน์ชื่อ "\${colName}"\`);
      }
      
      const groups = {};
      data.forEach(row => {
        const val = row[colName] || 'unknown';
        if (!groups[val]) groups[val] = [];
        groups[val].push(row);
      });
      
      for (const [key, rows] of Object.entries(groups)) {
        const csvStr = Papa.unparse(rows);
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
        const safeName = String(key).replace(/[^a-zA-Z0-9ก-ฮ]/g, '_');
        zip.file(\`group_\${safeName}.csv\`, blob);
        fileCount++;
      }
    }
    
    setStatus(\`กำลังแพ็คไฟล์ ZIP (\${fileCount} ไฟล์)...\`);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = \`Split_Data_\${Date.now()}.zip\`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    setStatus(\`หั่นไฟล์สำเร็จ (\${fileCount} ไฟล์)\`);
  }

  function updateSplitUi() {
    const val = document.getElementById('cm-split-by').value;
    document.getElementById('cm-split-rows-ui').style.display = val === 'rows' ? 'block' : 'none';
    document.getElementById('cm-split-col-ui').style.display = val === 'col' ? 'block' : 'none';
  }

  function reset() {
    fileList = [];
    document.getElementById('cm-drop-zone').style.display = 'flex';
    document.getElementById('cm-workspace').style.display = 'none';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = \`
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Data Tools</span>
          <h1 class="page-title">CSV Data <em>Tools</em></h1>
          <p class="page-desc">เครื่องมือจัดการไฟล์ข้อมูล (CSV) ทั้งรวมหลายไฟล์เป็นไฟล์เดียว หรือหั่นไฟล์ใหญ่ให้เล็กลง</p>
        </div>

        <div style="display:flex; gap:16px; margin-bottom:20px; justify-content:center;">
          <button class="btn btn--primary" id="cm-btn-mode-merge" onclick="CsvMerger.switchMode('merge')">รวมไฟล์ (Merge CSV)</button>
          <button class="btn btn--ghost" id="cm-btn-mode-split" onclick="CsvMerger.switchMode('split')">หั่นไฟล์ (Split CSV)</button>
        </div>

        <div class="drop-zone" id="cm-drop-zone" onclick="document.getElementById('cm-input').click()" style="max-width:600px; margin: 0 auto 16px;">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="drop-title">อัปโหลดไฟล์ข้อมูล CSV</p>
          <p class="drop-sub">เลือกหลายๆ ไฟล์พร้อมกันได้</p>
          <input type="file" id="cm-input" accept=".csv" multiple style="display:none" onchange="CsvMerger.handleFiles(this.files)" />
        </div>

        <div id="cm-workspace" style="display:none; max-width:800px; margin: 0 auto;">
          <div style="display:grid; grid-template-columns: 300px 1fr; gap: 20px;">
            <!-- Left: Settings -->
            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
              <h3 style="font-size: 14px; margin-bottom: 16px; color:var(--gold);">ตั้งค่าการประมวลผล</h3>
              
              <!-- Merge Options -->
              <div id="cm-opt-merge">
                <div style="margin-bottom: 16px;">
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ส่วนหัวคอลัมน์ (Header)</label>
                  <select id="cm-keep-header" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                    <option value="first">ใช้หัวคอลัมน์ร่วมกัน</option>
                  </select>
                  <p style="font-size:11px; color:var(--text-2); margin-top:4px;">*ไฟล์ที่จะนำมารวมกัน ควรมีชื่อคอลัมน์เหมือนกัน</p>
                </div>
              </div>

              <!-- Split Options -->
              <div id="cm-opt-split" style="display:none;">
                <div style="margin-bottom: 12px;">
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">เงื่อนไขการหั่นไฟล์</label>
                  <select id="cm-split-by" onchange="CsvMerger.updateSplitUi()" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                    <option value="rows">หั่นตามจำนวนบรรทัด</option>
                    <option value="col">หั่นตามข้อมูลในคอลัมน์ (Group By)</option>
                  </select>
                </div>
                
                <div id="cm-split-rows-ui" style="margin-bottom: 16px;">
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">จำนวนบรรทัดต่อ 1 ไฟล์</label>
                  <input type="number" id="cm-split-rows" value="1000" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
                </div>
                
                <div id="cm-split-col-ui" style="display:none; margin-bottom: 16px;">
                  <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ชื่อหัวคอลัมน์ (ภาษาอังกฤษหรือไทยเป๊ะๆ)</label>
                  <input type="text" id="cm-split-col" placeholder="เว้นว่างไว้เพื่อใช้คอลัมน์แรก" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
                </div>
              </div>

              <button class="btn btn--primary" id="cm-btn-process" onclick="CsvMerger.processData()" style="width:100%; margin-top:16px;">เริ่มดำเนินการ</button>
              <button class="btn btn--ghost" onclick="CsvMerger.reset()" style="width:100%; margin-top:8px;">ยกเลิก / เริ่มใหม่</button>
            </div>

            <!-- Right: List -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div id="cm-info" style="font-size:13px; font-weight:500;"></div>
                <button class="btn btn--ghost" style="padding:4px 8px; font-size:12px;" onclick="document.getElementById('cm-input').click()">+ เพิ่มไฟล์</button>
              </div>
              
              <div id="cm-file-list" style="max-height: 400px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--r);"></div>
              
              <div id="cm-status" style="font-size:13px; margin-top:16px; display:none;"></div>
            </div>
          </div>
        </div>
      </div>
    \`;

    const dropZone = document.getElementById('cm-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255,255,255,0.1)');
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, handleFiles, removeFile, switchMode, processData, updateSplitUi, reset };
})();

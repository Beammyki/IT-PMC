const DataCleaner = (() => {
  function setStatus(msg, isError=false) {
    const el = document.getElementById('dc-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleCsv(file) {
    if (!file) return;
    Papa.parse(file, {
      complete: function(results) {
        // Just convert everything back to a structured text block for now
        // For simplicity, we just join rows with tabs and newlines
        const text = results.data.map(row => row.join('\\t')).join('\\n');
        document.getElementById('dc-input').value = text;
        updateCounts();
      }
    });
  }

  function updateCounts() {
    const textIn = document.getElementById('dc-input').value;
    const linesIn = textIn.split('\\n').length;
    document.getElementById('dc-count-in').textContent = \`บรรทัด: \${textIn === '' ? 0 : linesIn}\`;

    const textOut = document.getElementById('dc-output').value;
    const linesOut = textOut.split('\\n').length;
    document.getElementById('dc-count-out').textContent = \`บรรทัด: \${textOut === '' ? 0 : linesOut}\`;
  }

  function processData() {
    let lines = document.getElementById('dc-input').value.split('\\n');
    
    const optTrim = document.getElementById('dc-opt-trim').checked;
    const optEmpty = document.getElementById('dc-opt-empty').checked;
    const optDup = document.getElementById('dc-opt-dup').checked;
    const optSort = document.getElementById('dc-opt-sort').checked;
    const optCase = document.getElementById('dc-opt-case').value; // 'none', 'upper', 'lower'
    
    // Process
    if (optTrim) {
      lines = lines.map(l => l.trim());
    }
    if (optEmpty) {
      lines = lines.filter(l => l !== '');
    }
    if (optCase === 'upper') {
      lines = lines.map(l => l.toUpperCase());
    } else if (optCase === 'lower') {
      lines = lines.map(l => l.toLowerCase());
    }
    if (optDup) {
      lines = [...new Set(lines)];
    }
    if (optSort) {
      lines.sort((a, b) => a.localeCompare(b, 'th'));
    }
    
    document.getElementById('dc-output').value = lines.join('\\n');
    updateCounts();
    setStatus('ประมวลผลเสร็จสิ้น');
    setTimeout(() => setStatus(''), 2000);
  }

  function copyText() {
    const text = document.getElementById('dc-output').value;
    if (text) {
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('dc-btn-copy');
      const original = btn.textContent;
      btn.textContent = 'คัดลอกแล้ว!';
      setTimeout(() => btn.textContent = original, 2000);
    }
  }

  function downloadCsv() {
    const text = document.getElementById('dc-output').value;
    if (!text) return;
    
    // We can export as TXT or CSV depending on content. We'll use CSV extension.
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = \`cleaned_data_\${Date.now()}.csv\`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reset() {
    document.getElementById('dc-input').value = '';
    document.getElementById('dc-output').value = '';
    updateCounts();
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = \`
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Data Tools</span>
          <h1 class="page-title">Data <em>Cleaner</em></h1>
          <p class="page-desc">เครื่องมือจัดการรายชื่อ ทำความสะอาดข้อมูลขยะ ลบข้อมูลซ้ำ และจัดเรียงตัวอักษร</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 250px 1fr; gap: 16px; max-width:1200px; height: 500px;">
          
          <!-- Left: Input -->
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:14px; font-weight:500;">ข้อมูลดิบ (นำเข้า)</label>
              <div style="display:flex; gap:8px;">
                <button class="btn btn--ghost" style="padding:2px 6px; font-size:11px;" onclick="document.getElementById('dc-csv-input').click()">โหลด CSV</button>
                <input type="file" id="dc-csv-input" accept=".csv" style="display:none" onchange="DataCleaner.handleCsv(this.files[0])" />
              </div>
            </div>
            <textarea id="dc-input" oninput="DataCleaner.updateCounts()" style="flex:1; padding:12px; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:var(--r); font-family:var(--font-mono); font-size:13px; resize:none; line-height:1.5; white-space:pre;" wrap="off" placeholder="วางข้อมูลของคุณที่นี่..."></textarea>
            <div id="dc-count-in" style="font-size:12px; color:var(--text-2); margin-top:4px; text-align:right;">บรรทัด: 0</div>
          </div>

          <!-- Middle: Controls -->
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column;">
            <h3 style="font-size: 13px; margin-bottom: 16px; color:var(--gold);">เลือกการจัดการ</h3>
            
            <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer; font-size:13px;">
              <input type="checkbox" id="dc-opt-trim" checked /> ตัดช่องว่างหน้า-หลัง (Trim)
            </label>
            <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer; font-size:13px;">
              <input type="checkbox" id="dc-opt-empty" checked /> ลบบรรทัดว่างทิ้ง
            </label>
            <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer; font-size:13px;">
              <input type="checkbox" id="dc-opt-dup" checked /> ลบข้อมูลซ้ำ (Remove Duplicates)
            </label>
            <label style="display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer; font-size:13px;">
              <input type="checkbox" id="dc-opt-sort" /> เรียงลำดับ A-Z / ก-ฮ
            </label>

            <div style="margin-bottom: 16px; margin-top:8px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ขนาดตัวอักษร</label>
              <select id="dc-opt-case" style="width:100%; padding:6px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit; font-size:12px;">
                <option value="none">คงเดิม</option>
                <option value="upper">พิมพ์ใหญ่ทั้งหมด (UPPERCASE)</option>
                <option value="lower">พิมพ์เล็กทั้งหมด (lowercase)</option>
              </select>
            </div>

            <div style="margin-top:auto;">
              <button class="btn btn--primary" onclick="DataCleaner.processData()" style="width:100%; margin-bottom:8px;">
                ประมวลผล ▶
              </button>
              <button class="btn btn--ghost" onclick="DataCleaner.reset()" style="width:100%;">ล้างค่า</button>
              <div id="dc-status" style="font-size:12px; margin-top:8px; text-align:center;"></div>
            </div>
          </div>

          <!-- Right: Output -->
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:14px; font-weight:500; color:var(--gold);">ผลลัพธ์ (ส่งออก)</label>
              <div style="display:flex; gap:8px;">
                <button class="btn btn--ghost" id="dc-btn-copy" style="padding:2px 6px; font-size:11px;" onclick="DataCleaner.copyText()">คัดลอก (Copy)</button>
                <button class="btn btn--ghost" style="padding:2px 6px; font-size:11px;" onclick="DataCleaner.downloadCsv()">โหลด CSV</button>
              </div>
            </div>
            <textarea id="dc-output" readonly style="flex:1; padding:12px; background:rgba(0,0,0,0.3); color:#fff; border:1px solid var(--gold); border-radius:var(--r); font-family:var(--font-mono); font-size:13px; resize:none; line-height:1.5; white-space:pre;" wrap="off" placeholder="ผลลัพธ์จะแสดงที่นี่..."></textarea>
            <div id="dc-count-out" style="font-size:12px; color:var(--text-2); margin-top:4px; text-align:right;">บรรทัด: 0</div>
          </div>

        </div>
      </div>
    \`;
  }

  return { renderPage, handleCsv, updateCounts, processData, copyText, downloadCsv, reset };
})();

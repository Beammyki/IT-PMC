const BatchQr = (() => {
  let items = [];

  function setStatus(msg, isError=false) {
    const el = document.getElementById('qr-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  function handleCsv(file) {
    if (!file) return;
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: function(results) {
        // Assume first column contains the text to convert to QR
        const parsed = results.data.map(row => row[0]).filter(val => val && val.trim() !== '');
        if (parsed.length > 0) {
          const textarea = document.getElementById('qr-input-text');
          textarea.value = (textarea.value ? textarea.value + '\n' : '') + parsed.join('\n');
          updateCount();
        }
      }
    });
  }

  function updateCount() {
    const text = document.getElementById('qr-input-text').value;
    items = text.split('\\n').map(t => t.trim()).filter(t => t !== '');
    document.getElementById('qr-count').textContent = `จำนวนที่ต้องสร้าง: ${items.length} รายการ`;
    document.getElementById('qr-btn-process').disabled = items.length === 0;
  }

  async function generateQRCodes() {
    if (items.length === 0) return;
    const btn = document.getElementById('qr-btn-process');
    btn.disabled = true;
    setStatus('กำลังสร้าง QR Code...');
    
    try {
      const zip = new JSZip();
      const margin = parseInt(document.getElementById('qr-margin').value) || 2;
      const width = parseInt(document.getElementById('qr-size').value) || 300;
      const colorDark = document.getElementById('qr-color').value || '#000000';
      
      for (let i = 0; i < items.length; i++) {
        const text = items[i];
        
        // Use qrcode to generate data URL
        const dataUrl = await QRCode.toDataURL(text, {
          width: width,
          margin: margin,
          color: {
            dark: colorDark,
            light: '#FFFFFF'
          }
        });
        
        // Convert dataURL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        
        // Make safe filename
        let safeName = text.substring(0, 30).replace(/[^a-zA-Z0-9ก-ฮ]/g, '_');
        if (!safeName) safeName = `qr_${i+1}`;
        
        zip.file(`${safeName}_${i+1}.png`, blob);
      }
      
      setStatus('กำลังแพ็คไฟล์ ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = \`Batch_QRCode_\${Date.now()}.zip\`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus(\`สร้างสำเร็จ \${items.length} รูป!\`);
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    items = [];
    document.getElementById('qr-input-text').value = '';
    updateCount();
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = \`
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Data Tools</span>
          <h1 class="page-title">Batch QR <em>Code</em></h1>
          <p class="page-desc">สร้าง QR Code จำนวนมากๆ อัตโนมัติจากรายชื่อข้อความ หรือ URL โหลดเป็นไฟล์ ZIP</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 300px; gap: 20px; max-width:1000px;">
          <!-- Left: Input -->
          <div style="display:flex; flex-direction:column; gap: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:14px; font-weight:500;">วางข้อความ / URL (1 บรรทัดต่อ 1 QR Code)</label>
              <button class="btn btn--ghost" style="padding:4px 8px; font-size:12px;" onclick="document.getElementById('qr-csv-input').click()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                โหลดจากไฟล์ CSV
              </button>
              <input type="file" id="qr-csv-input" accept=".csv" style="display:none" onchange="BatchQr.handleCsv(this.files[0])" />
            </div>
            
            <textarea id="qr-input-text" oninput="BatchQr.updateCount()" style="width:100%; height:400px; padding:12px; background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:var(--r); font-family:var(--font-mono); font-size:13px; resize:none; line-height:1.6;" placeholder="https://google.com\\nhttps://facebook.com\\nรหัสสินค้า001\\n..."></textarea>
            
            <div id="qr-count" style="font-size:13px; color:var(--gold);">จำนวนที่ต้องสร้าง: 0 รายการ</div>
          </div>

          <!-- Right: Settings -->
          <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05); height:fit-content;">
            <h3 style="font-size: 14px; margin-bottom: 16px; color:var(--gold);">ตั้งค่า QR Code</h3>
            
            <div style="margin-bottom: 16px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ขนาดกว้าง/ยาว (px)</label>
              <input type="number" id="qr-size" value="300" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;" />
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">สี QR Code</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="color" id="qr-color" value="#000000" style="width:40px; height:36px; padding:0; background:none; border:none; cursor:pointer;" />
                <span style="font-size:13px; color:var(--text-2);">สีพื้นหลังจะเป็นสีขาวเสมอ</span>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display:block; font-size:12px; color:var(--text-2); margin-bottom:6px;">ขอบขาว (Margin)</label>
              <select id="qr-margin" style="width:100%; padding:8px 12px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-family:inherit;">
                <option value="0">ไม่มีขอบ</option>
                <option value="1">แคบ</option>
                <option value="2" selected>ปานกลาง (ปกติ)</option>
                <option value="4">กว้าง</option>
              </select>
            </div>

            <button class="btn btn--primary" id="qr-btn-process" onclick="BatchQr.generateQRCodes()" style="width:100%;" disabled>สร้างและดาวน์โหลด ZIP</button>
            <button class="btn btn--ghost" onclick="BatchQr.reset()" style="width:100%; margin-top:8px;">เคลียร์ข้อมูล</button>
            
            <div id="qr-status" style="font-size:13px; margin-top:16px; display:none;"></div>
          </div>
        </div>
      </div>
    \`;
  }

  return { renderPage, handleCsv, updateCount, generateQRCodes, reset };
})();

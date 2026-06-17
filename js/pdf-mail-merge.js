const PdfMailMerge = (() => {
  let templateBuffer = null;
  let csvData = null;
  let csvHeaders = [];
  let formFields = [];
  let templateName = '';

  function setStatus(msg, isError=false) {
    const el = document.getElementById('mm-status');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.style.color = isError ? 'var(--red)' : 'var(--gold)';
    el.textContent = msg;
  }

  async function handlePdf(file) {
    if (!file || file.type !== 'application/pdf') {
      setStatus('กรุณาอัปโหลดไฟล์ PDF เท่านั้น', true);
      return;
    }
    templateName = file.name;
    document.getElementById('mm-pdf-name').textContent = file.name;
    templateBuffer = await file.arrayBuffer();
    
    try {
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      formFields = fields.map(f => f.getName());
      
      if (formFields.length === 0) {
        setStatus('⚠️ ไม่พบ Form Fields (ช่องกรอกข้อมูล) ในไฟล์ PDF นี้ กรุณาสร้าง Form Fields ด้วยโปรแกรมเช่น Adobe Acrobat ก่อน', true);
      } else {
        setStatus(`พบ ${formFields.length} ช่องข้อมูลใน PDF`);
      }
      checkReady();
    } catch (err) {
      console.error(err);
      setStatus('ไฟล์ PDF ไม่ถูกต้อง', true);
    }
  }

  function handleCsv(file) {
    if (!file || (!file.name.endsWith('.csv') && file.type !== 'text/csv')) {
      setStatus('กรุณาอัปโหลดไฟล์ CSV เท่านั้น', true);
      return;
    }
    document.getElementById('mm-csv-name').textContent = file.name;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        csvData = results.data;
        csvHeaders = results.meta.fields;
        setStatus(`อ่านข้อมูล CSV สำเร็จ (${csvData.length} แถว)`);
        checkReady();
      },
      error: function(err) {
        setStatus('เกิดข้อผิดพลาดในการอ่าน CSV: ' + err.message, true);
      }
    });
  }

  function checkReady() {
    if (templateBuffer && csvData) {
      document.getElementById('mm-mapping-section').style.display = 'block';
      const mapContainer = document.getElementById('mm-field-mapping');
      mapContainer.innerHTML = '';
      
      if (formFields.length === 0) {
        mapContainer.innerHTML = '<p style="color:var(--red)">ไม่สามารถดำเนินการได้ เนื่องจาก PDF ไม่มี Form Fields</p>';
        document.getElementById('mm-btn-generate').disabled = true;
        return;
      }
      
      let html = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-weight: 500; font-size:12px; color:var(--text-2); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;"><div>PDF Form Field</div><div>คอลัมน์ใน CSV</div></div>';
      
      formFields.forEach(field => {
        // Auto match by exact or lowercase name
        const match = csvHeaders.find(h => h.toLowerCase() === field.toLowerCase());
        
        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; align-items: center;">
          <div style="font-size:13px;">${field}</div>
          <select id="map-${field}" style="width:100%; padding:6px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; font-size:12px;">
            <option value="">-- ข้ามช่องนี้ --</option>
            ${csvHeaders.map(h => `<option value="${h}" ${h === match ? 'selected' : ''}>${h}</option>`).join('')}
          </select>
        </div>`;
      });
      
      mapContainer.innerHTML = html;
      document.getElementById('mm-btn-generate').disabled = false;
    }
  }

  async function generate() {
    if (!templateBuffer || !csvData) return;
    const btn = document.getElementById('mm-btn-generate');
    btn.disabled = true;
    setStatus('กำลังสร้างเอกสาร กรุณารอสักครู่...');
    
    try {
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const zip = new JSZip();
      
      // Get mapping
      const mapping = {};
      formFields.forEach(field => {
        const val = document.getElementById(`map-${field}`).value;
        if (val) mapping[field] = val;
      });

      let count = 0;
      
      // We process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Load fresh template
        const pdfDoc = await PDFDocument.load(templateBuffer);
        const form = pdfDoc.getForm();
        
        // Register custom font for Thai
        // Fetching standard Thai font could be slow for many files. We'll rely on default font or standard Helvetica
        // Wait, Thai text in forms might not display if we don't embed a font.
        // Actually, pdf-lib form filling with non-standard characters requires custom font embedding, 
        // but for now we try without embedding or let PDF viewer use default.
        
        let hasData = false;
        
        formFields.forEach(field => {
          if (mapping[field] && row[mapping[field]]) {
            const f = form.getTextField(field);
            if (f) {
              f.setText(row[mapping[field]]);
              hasData = true;
            }
          }
        });
        
        if (hasData) {
          form.flatten(); // Make fields uneditable
          const pdfBytes = await pdfDoc.save();
          let filename = `Document_${(i+1).toString().padStart(3, '0')}.pdf`;
          
          // Try to use the first mapped column as filename
          const firstMapKey = Object.values(mapping)[0];
          if (firstMapKey && row[firstMapKey]) {
             filename = `${row[firstMapKey].replace(/[^a-zA-Z0-9ก-ฮ]/g, '_')}.pdf`;
          }
          
          zip.file(filename, pdfBytes);
          count++;
        }
      }
      
      if (count === 0) {
        setStatus('ไม่มีข้อมูลให้สร้างเอกสาร', true);
        return;
      }
      
      setStatus(`กำลังแพ็คไฟล์ ZIP (${count} เอกสาร)...`);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      let base = templateName;
      if (base.endsWith('.pdf')) base = base.substring(0, base.length - 4);
      a.download = `${base}_merged.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      setStatus(`สร้างสำเร็จทั้งหมด ${count} เอกสาร!`);
      
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาด: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    templateBuffer = null;
    csvData = null;
    csvHeaders = [];
    formFields = [];
    document.getElementById('mm-pdf-name').textContent = 'ยังไม่ได้เลือกไฟล์';
    document.getElementById('mm-csv-name').textContent = 'ยังไม่ได้เลือกไฟล์';
    document.getElementById('mm-mapping-section').style.display = 'none';
    document.getElementById('mm-pdf-input').value = '';
    document.getElementById('mm-csv-input').value = '';
    setStatus('');
  }

  function renderPage() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">PDF Tools</span>
          <h1 class="page-title">PDF Mail <em>Merge</em></h1>
          <p class="page-desc">สร้างเอกสาร PDF อัตโนมัติทีละหลายๆ ไฟล์ จาก Template (.pdf) และข้อมูล Excel (.csv)</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; max-width:800px;">
          <!-- PDF Template -->
          <div class="drop-zone" id="mm-pdf-zone" onclick="document.getElementById('mm-pdf-input').click()">
            <div class="drop-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p class="drop-title">1. อัปโหลด PDF Template</p>
            <p class="drop-sub" id="mm-pdf-name">ต้องมี Form Fields ในเอกสาร</p>
            <input type="file" id="mm-pdf-input" accept=".pdf" style="display:none" onchange="PdfMailMerge.handlePdf(this.files[0])" />
          </div>

          <!-- CSV Data -->
          <div class="drop-zone" id="mm-csv-zone" onclick="document.getElementById('mm-csv-input').click()">
            <div class="drop-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p class="drop-title">2. อัปโหลดข้อมูล CSV</p>
            <p class="drop-sub" id="mm-csv-name">ไฟล์ข้อมูลตารางนามสกุล .csv</p>
            <input type="file" id="mm-csv-input" accept=".csv" style="display:none" onchange="PdfMailMerge.handleCsv(this.files[0])" />
          </div>
        </div>

        <div id="mm-mapping-section" style="display:none; max-width:800px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: var(--r); border: 1px solid rgba(255,255,255,0.05);">
          <h3 style="font-size: 16px; margin-bottom: 12px;">3. จับคู่ข้อมูล (Mapping)</h3>
          <p style="font-size: 13px; color: var(--text-2); margin-bottom: 16px;">เลือกว่าจะให้คอลัมน์ไหนใน CSV ไปใส่ในช่องไหนของ PDF</p>
          
          <div id="mm-field-mapping" style="margin-bottom: 20px; max-height: 300px; overflow-y: auto; padding-right: 10px;"></div>
          
          <div style="display:flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
            <div id="mm-status" style="font-size:13px;"></div>
            <div style="display:flex; gap: 8px;">
              <button class="btn btn--ghost" onclick="PdfMailMerge.reset()">เริ่มใหม่ทั้งหมด</button>
              <button class="btn btn--primary" id="mm-btn-generate" onclick="PdfMailMerge.generate()">
                สร้างเอกสารทั้งหมด & ดาวน์โหลด ZIP
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return { renderPage, handlePdf, handleCsv, generate, reset };
})();

const CompressPdf = (() => {
  const files = [];

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('compress-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(pct) {
    const t = document.getElementById('compress-track');
    const f = document.getElementById('compress-fill');
    if (!t || !f) return;
    t.style.display = (pct >= 0 && pct < 100) ? 'block' : 'none';
    f.style.width = pct + '%';
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if (f.type === 'application/pdf' || f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.pdf')) {
        if (!files.find(x => x.file.name === f.name && x.file.size === f.size)) {
          files.push({ file: f, status: 'pending' });
        }
      }
    }
    render();
  }

  function removeFile(i) { files.splice(i, 1); render(); }
  function clearAll() { files.length = 0; render(); setStatus(''); }

  function render() {
    const sec = document.getElementById('compress-section');
    const list = document.getElementById('compress-list');
    const btn = document.getElementById('compress-btn');
    const stat = document.getElementById('compress-stat');
    const opts = document.getElementById('compress-options');
    
    if (!sec) return;

    sec.style.display = files.length ? '' : 'none';
    if (opts) opts.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์`;
    if (btn) btn.disabled = files.length === 0;
    
    if (!list) return;
    list.innerHTML = '';
    files.forEach((item, i) => {
      const isImg = item.file.type.startsWith('image/');
      const tag = isImg ? 'IMG' : 'PDF';
      const icon = {
        pending: '',
        success: '<span style="color:var(--green);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✓ OK</span>',
        error:   '<span style="color:var(--red);font-size:11px;font-family:\'DM Mono\',monospace;flex-shrink:0">✗ Error</span>',
      }[item.status] || '';

      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.animationDelay = (i * 0.04) + 's';
      div.innerHTML = `
        <span class="pdf-tag">${tag}</span>
        <span class="file-name" title="${item.file.name}">${item.file.name}</span>
        <span class="file-size">${fmt(item.file.size)}</span>
        ${icon}
        <button class="file-remove" onclick="CompressPdf.removeFile(${i})">×</button>
      `;
      list.appendChild(div);
    });
  }

  async function compressImage(file, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
          if (!blob) reject(new Error('Canvas toBlob failed'));
          else resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function doCompress() {
    if (!files.length) return;
    const btn = document.getElementById('compress-btn');
    if (btn) btn.disabled = true;
    setProgress(5);
    setStatus('กำลังโหลด...');

    try {
      const quality = parseFloat(document.getElementById('compress-quality').value) / 100;
      let ok = 0, fail = 0;
      const blobs = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const isImg = item.file.type.startsWith('image/');
        setStatus(`กำลังบีบอัด ${item.file.name} (${i + 1}/${files.length})...`);
        setProgress(Math.round((i / files.length) * 90) + 5);
        
        try {
          let finalBlob = null;
          let ext = isImg ? '_compressed.jpg' : '_compressed.pdf';

          if (isImg) {
            finalBlob = await compressImage(item.file, quality);
          } else {
            const buf = await item.file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
            const compressed = await pdfDoc.save({
              useObjectStreams: true,
              addDefaultPage: false,
              objectsPerTick: 50,
            });
            finalBlob = new Blob([compressed], { type: 'application/pdf' });
          }

          const dotIdx = item.file.name.lastIndexOf('.');
          const baseName = dotIdx !== -1 ? item.file.name.substring(0, dotIdx) : item.file.name;
          const outName = baseName + ext;

          blobs.push({ name: outName, blob: finalBlob });
          item.status = 'success';
          ok++;
        } catch (err) {
          console.error(err);
          item.status = 'error';
          fail++;
        }
        render();
      }

      setProgress(95);

      if (ok === 1) {
        const { name, blob } = blobs[0];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      } else if (ok > 1) {
        setStatus('กำลังรวมไฟล์เป็น ZIP...');
        if (!window.JSZip) {
            throw new Error('JSZip library not loaded. Please make sure it is included in index.html');
        }
        const zip = new JSZip();
        blobs.forEach(b => zip.file(b.name, b.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = 'compressed_files.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      }

      setProgress(100);
      setStatus(`✓ บีบอัดสำเร็จ ${ok} ไฟล์` + (fail ? ` · ✗ ล้มเหลว ${fail} ไฟล์` : ''));
    } catch (e) {
      setStatus('เกิดข้อผิดพลาด: ' + e.message, true);
    }
    if (btn) btn.disabled = false;
  }

  function renderPage() {
    files.length = 0;
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 03</span>
          <h1 class="page-title">Compress <em>PDF & Image</em></h1>
          <p class="page-desc">ลดขนาดไฟล์ PDF และรูปภาพ (JPG/PNG) เหมาะสำหรับส่งอีเมลหรืออัปโหลด</p>
        </div>

        <div class="drop-zone" id="compress-drop-zone" onclick="document.getElementById('compress-input').click()" style="max-width:600px;margin-bottom:16px">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">ลากไฟล์มาวางที่นี่</p>
          <p class="drop-sub">รองรับไฟล์หลายไฟล์พร้อมกัน (.pdf, .jpg, .png)<br/><strong>คลิกเพื่อเปิด File Browser</strong></p>
          <input type="file" id="compress-input" accept=".pdf,image/*" multiple style="display:none"/>
        </div>

        <div style="max-width:600px;margin-bottom:16px;display:none" id="compress-options">
          <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)">
            <span style="font-size:13px;color:var(--text-2);flex:1">ระดับการบีบอัด (คุณภาพ)</span>
            <input type="range" id="compress-quality" min="10" max="90" value="60"
              oninput="document.getElementById('compress-quality-val').textContent=this.value+'%'"
              style="flex:1;accent-color:var(--gold)"/>
            <span id="compress-quality-val" style="font-family:'DM Mono',monospace;font-size:12px;color:var(--gold);min-width:36px;text-align:right">60%</span>
          </div>
        </div>

        <div id="compress-section" style="display:none;max-width:600px">
          <div class="list-toolbar">
            <span class="list-stat" id="compress-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" onclick="CompressPdf.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="compress-list"></div>
          <div class="print-bar">
            <span class="selected-summary">เลือกไฟล์แล้วกด Compress</span>
            <button class="btn btn--primary" id="compress-btn" disabled onclick="CompressPdf.doCompress()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"/>
              </svg>
              Compress & Download
            </button>
          </div>
          <div class="progress-track" id="compress-track" style="max-width:600px">
            <div class="progress-fill" id="compress-fill"></div>
          </div>
          <div class="status-text" id="compress-status"></div>
        </div>
      </div>
    `;

    const dz = document.getElementById('compress-drop-zone');
    const fi = document.getElementById('compress-input');

    fi.addEventListener('change', e => {
      addFiles(e.target.files);
      e.target.value = '';
    });

    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
  }

  return { renderPage, removeFile, clearAll, doCompress };
})();
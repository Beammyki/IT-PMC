const CompressPdf = (() => {
  const files = [];
  let isCompressing = false;
  let pendingDownload = null;
  let hasDownloaded = false;

  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatPercent(percent) {
    if (percent > 0 && percent < 1) return '<1%';
    return Math.round(percent) + '%';
  }

  function describeSizeChange(originalSize, outputSize) {
    const difference = originalSize - outputSize;
    if (!difference) return `ขนาดเท่าเดิม ${fmt(outputSize)}`;
    const percent = originalSize ? Math.abs(difference) / originalSize * 100 : 0;
    return difference > 0
      ? `ลด ${formatPercent(percent)} เหลือ ${fmt(outputSize)}`
      : `เพิ่ม ${formatPercent(percent)} เป็น ${fmt(outputSize)}`;
  }

  function renderPreview() {
    const preview = document.getElementById('compress-preview');
    if (!preview) return;
    if (!pendingDownload) {
      preview.hidden = true;
      preview.innerHTML = '';
      preview.className = 'compress-preview';
      return;
    }

    const difference = pendingDownload.originalSize - pendingDownload.blob.size;
    const changePercent = pendingDownload.originalSize
      ? Math.abs(difference) / pendingDownload.originalSize * 100
      : 0;
    const changeLabel = difference > 0
      ? `ลด ${formatPercent(changePercent)}`
      : difference < 0
        ? `เพิ่ม ${formatPercent(changePercent)}`
        : 'ขนาดเท่าเดิม';
    const changeClass = difference > 0
      ? 'compress-preview--reduced'
      : difference < 0
        ? 'compress-preview--larger'
        : 'compress-preview--same';
    const outputLabel = pendingDownload.successCount > 1
      ? 'ขนาดไฟล์ ZIP ที่จะดาวน์โหลด'
      : 'ขนาดไฟล์ที่จะดาวน์โหลด';
    const failureNote = pendingDownload.failureCount
      ? `<p class="compress-preview__note">คำนวณจาก ${pendingDownload.successCount} ไฟล์ที่สำเร็จ · มี ${pendingDownload.failureCount} ไฟล์ที่บีบอัดไม่สำเร็จ</p>`
      : '';

    preview.className = `compress-preview ${changeClass}`;
    preview.hidden = false;
    preview.innerHTML = `
      <div class="compress-preview__header">
        <div>
          <strong class="compress-preview__title">ผลการบีบอัด</strong>
          <span class="compress-preview__quality">คุณภาพ ${pendingDownload.qualityPercent}%</span>
        </div>
        <span class="compress-preview__badge">${changeLabel}</span>
      </div>
      <div class="compress-preview__sizes">
        <div class="compress-preview__size">
          <span>ขนาดรวมเดิม</span>
          <strong>${fmt(pendingDownload.originalSize)}</strong>
        </div>
        <span class="compress-preview__arrow" aria-hidden="true">→</span>
        <div class="compress-preview__size">
          <span>${outputLabel}</span>
          <strong>${fmt(pendingDownload.blob.size)}</strong>
        </div>
      </div>
      <p class="compress-preview__detail">${describeSizeChange(pendingDownload.originalSize, pendingDownload.blob.size)}</p>
      ${failureNote}
    `;
  }

  function clearPreparedResult() {
    pendingDownload = null;
    hasDownloaded = false;
    files.forEach(item => {
      item.status = 'pending';
      delete item.resultSize;
      delete item.savedPercent;
      delete item.detail;
    });
    renderPreview();
  }

  function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  function isImage(file) {
    return file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name);
  }

  function setStatus(message, isError = false) {
    const el = document.getElementById('compress-status');
    if (!el) return;
    el.textContent = message;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function setProgress(percent) {
    const track = document.getElementById('compress-track');
    const fill = document.getElementById('compress-fill');
    if (!track || !fill) return;
    track.style.display = percent >= 0 && percent < 100 ? 'block' : 'none';
    fill.style.width = percent + '%';
  }

  function addFiles(newFiles) {
    if (isCompressing) return;
    let changed = false;
    for (const file of newFiles) {
      if (!isPdf(file) && !isImage(file)) continue;
      if (!files.some(item => item.file.name === file.name && item.file.size === file.size)) {
        files.push({ file, status: 'pending' });
        changed = true;
      }
    }
    if (changed) {
      clearPreparedResult();
      setStatus('');
    }
    render();
  }

  function removeFile(index) {
    if (isCompressing) return;
    clearPreparedResult();
    files.splice(index, 1);
    render();
    setStatus('');
  }

  function clearAll() {
    if (isCompressing) return;
    clearPreparedResult();
    files.length = 0;
    render();
    setStatus('');
  }

  function updateQuality(value) {
    const label = document.getElementById('compress-quality-val');
    if (label) label.textContent = value + '%';
    if (isCompressing) return;
    if (pendingDownload || files.some(item => item.status !== 'pending')) {
      clearPreparedResult();
      render();
      setStatus('เปลี่ยนคุณภาพแล้ว กดบีบอัดเพื่อดูผลใหม่ก่อนดาวน์โหลด');
    }
  }

  function render() {
    const section = document.getElementById('compress-section');
    const list = document.getElementById('compress-list');
    const button = document.getElementById('compress-btn');
    const stat = document.getElementById('compress-stat');
    const options = document.getElementById('compress-options');
    const clearButton = document.getElementById('compress-clear-btn');
    const fileInput = document.getElementById('compress-input');
    const dropZone = document.getElementById('compress-drop-zone');
    const qualityInput = document.getElementById('compress-quality');
    if (!section) return;

    section.style.display = files.length ? '' : 'none';
    if (options) options.style.display = files.length ? '' : 'none';
    if (stat) stat.innerHTML = `<strong>${files.length}</strong> ไฟล์`;
    if (button) {
      button.disabled = files.length === 0 || isCompressing;
      const label = pendingDownload
        ? (hasDownloaded ? 'ดาวน์โหลดอีกครั้ง' : 'ดาวน์โหลดไฟล์')
        : 'บีบอัดและดูผล';
      button.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"/></svg>${label}`;
    }
    if (clearButton) clearButton.disabled = !files.length || isCompressing;
    if (fileInput) fileInput.disabled = isCompressing;
    if (qualityInput) qualityInput.disabled = isCompressing;
    if (dropZone) dropZone.classList.toggle('is-disabled', isCompressing);
    const selectedSummary = section.querySelector('.selected-summary');
    if (selectedSummary) {
      selectedSummary.textContent = pendingDownload
        ? 'ตรวจสอบขนาดแล้ว กดดาวน์โหลดเมื่อพร้อม'
        : 'บีบอัดเพื่อดูเปอร์เซ็นต์และขนาดก่อนดาวน์โหลด';
    }
    if (!list) return;

    list.innerHTML = '';
    files.forEach((item, index) => {
      const image = isImage(item.file) && !isPdf(item.file);
      const badge = {
        success: `<span class="compress-result-badge">✓ ลด ${item.savedPercent ? item.savedPercent + '%' : '&lt;1%'}</span>`,
        unchanged: '<span class="compress-result-badge compress-result-badge--same">ขนาดเดิมเหมาะกว่า</span>',
        error: '<span class="compress-result-badge compress-result-badge--error">✗ Error</span>',
      }[item.status] || '';
      const sizeLabel = item.resultSize === undefined
        ? fmt(item.file.size)
        : `${fmt(item.file.size)} → ${fmt(item.resultSize)}`;
      const detail = item.detail ? `<span class="compress-file-detail">${escapeHtml(item.detail)}</span>` : '';
      const row = document.createElement('div');
      row.className = 'file-item compress-file-item';
      row.style.animationDelay = (index * 0.04) + 's';
      row.innerHTML = `
        <span class="pdf-tag">${image ? 'IMG' : 'PDF'}</span>
        <span class="file-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}${detail}</span>
        <span class="file-size">${sizeLabel}</span>
        ${badge}
        <button class="file-remove" type="button" aria-label="ลบ ${escapeHtml(item.file.name)}" ${isCompressing ? 'disabled' : ''} onclick="CompressPdf.removeFile(${index})">×</button>
      `;
      list.appendChild(row);
    });
    renderPreview();
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('ไม่สามารถสร้างไฟล์ภาพที่บีบอัดได้'));
      }, type, quality);
    });
  }

  function loadImage(file) {
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('เปิดไฟล์รูปภาพไม่ได้'));
      };
      image.src = url;
    });
  }

  async function compressImage(file, quality) {
    const image = await loadImage(file);
    let bestBlob = file;
    let scale = 1;

    // If quality alone does not reduce an already optimized image, progressively
    // reduce its pixel dimensions while keeping the selected JPEG quality.
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการบีบอัดรูปภาพ');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      canvas.width = 0;
      canvas.height = 0;
      if (blob.size < bestBlob.size) bestBlob = blob;
      if (bestBlob.size < file.size) break;
      scale *= 0.84;
    }

    const reduced = bestBlob.size < file.size;
    const originalExtension = (file.name.split('.').pop() || 'img').toLowerCase();
    return {
      blob: bestBlob,
      mode: reduced ? 'jpeg' : 'original',
      extension: reduced ? 'jpg' : originalExtension,
    };
  }

  async function rasterizePdf(file, quality, onPageProgress) {
    if (!window.pdfjsLib || !window.PDFLib) {
      throw new Error('โหลดเครื่องมือ PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const task = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    let source;

    try {
      source = await task.promise;
      const output = await PDFLib.PDFDocument.create();
      const pageCount = source.numPages;

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        onPageProgress(pageNumber, pageCount);
        const sourcePage = await source.getPage(pageNumber);
        const baseViewport = sourcePage.getViewport({ scale: 1 });
        const qualityScale = 0.72 + quality * 1.45;
        const maxPixelsScale = Math.sqrt(6000000 / (baseViewport.width * baseViewport.height));
        const maxDimensionScale = 2600 / Math.max(baseViewport.width, baseViewport.height);
        const scale = Math.min(qualityScale, maxPixelsScale, maxDimensionScale);
        const viewport = sourcePage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการเรนเดอร์ PDF');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await sourcePage.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;

        const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
        const embeddedImage = await output.embedJpg(await jpeg.arrayBuffer());
        const page = output.addPage([viewport.width / scale, viewport.height / scale]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale,
        });
        canvas.width = 0;
        canvas.height = 0;
        sourcePage.cleanup();
      }

      const bytes = await output.save({ useObjectStreams: true, objectsPerTick: 50 });
      return new Blob([bytes], { type: 'application/pdf' });
    } finally {
      try {
        if (source) await source.destroy();
        else await task.destroy();
      } catch (_) {}
    }
  }

  async function compressPdf(file, quality, onPageProgress) {
    const candidates = [{ blob: file, mode: 'original' }];
    try {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const bytes = await source.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
      });
      const optimized = new Blob([bytes], { type: 'application/pdf' });
      if (optimized.size < file.size) candidates.push({ blob: optimized, mode: 'optimized' });
    } catch (_) {
      // Rasterizing below remains the quality-controlled compression path.
    }

    const rasterized = await rasterizePdf(file, quality, onPageProgress);
    candidates.push({ blob: rasterized, mode: 'rasterized' });
    candidates.sort((a, b) => a.blob.size - b.blob.size);
    return candidates[0];
  }

  function makeUniqueName(name, usedNames) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';
    let suffix = 2;
    let candidate = `${base} (${suffix})${extension}`;
    while (usedNames.has(candidate)) candidate = `${base} (${++suffix})${extension}`;
    usedNames.add(candidate);
    return candidate;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function doCompress() {
    if (!files.length || isCompressing) return;
    if (pendingDownload) {
      download(pendingDownload.blob, pendingDownload.filename);
      hasDownloaded = true;
      render();
      setStatus(`✓ ดาวน์โหลดสำเร็จ · ${describeSizeChange(pendingDownload.originalSize, pendingDownload.blob.size)}`);
      return;
    }

    const button = document.getElementById('compress-btn');
    const qualityInput = document.getElementById('compress-quality');
    const qualityPercent = Math.max(10, Math.min(90, Number(qualityInput && qualityInput.value) || 60));
    const quality = qualityPercent / 100;
    clearPreparedResult();
    isCompressing = true;
    render();
    setProgress(5);
    setStatus(`กำลังเตรียมบีบอัดที่คุณภาพ ${qualityPercent}%...`);

    let successCount = 0;
    let failureCount = 0;
    const outputs = [];
    const usedNames = new Set();

    try {
      for (let index = 0; index < files.length; index++) {
        const item = files[index];
        const pdf = isPdf(item.file);
        const baseName = item.file.name.replace(/\.[^.]+$/, '') || item.file.name;
        item.status = 'pending';
        item.resultSize = undefined;
        item.detail = '';
        setStatus(`กำลังบีบอัด ${item.file.name} (${index + 1}/${files.length})...`);
        setProgress(Math.round(5 + (index / files.length) * 88));

        try {
          let result;
          if (pdf) {
            result = await compressPdf(item.file, quality, (page, total) => {
              const progress = 5 + ((index + page / total) / files.length) * 88;
              setProgress(Math.round(progress));
              setStatus(`กำลังบีบอัด PDF ${item.file.name} · หน้า ${page}/${total} · คุณภาพ ${qualityPercent}%`);
            });
          } else {
            result = await compressImage(item.file, quality);
          }

          const extension = pdf ? 'pdf' : result.extension;
          const outputName = makeUniqueName(`${baseName}_compressed.${extension}`, usedNames);
          const savedPercent = Math.max(0, Math.round((1 - result.blob.size / item.file.size) * 100));
          item.resultSize = result.blob.size;
          item.savedPercent = savedPercent;
          item.status = result.blob.size < item.file.size ? 'success' : 'unchanged';
          if (pdf && result.mode === 'rasterized') {
            item.detail = 'หน้า PDF ถูกแปลงเป็นภาพ';
          } else if (pdf && result.mode === 'optimized') {
            item.detail = 'ปรับโครงสร้างโดยคงข้อความไว้';
          } else if (result.mode === 'original') {
            item.detail = 'ไฟล์เดิมเล็กกว่าไฟล์ที่แปลงได้';
          }
          outputs.push({ name: outputName, blob: result.blob, originalSize: item.file.size });
          successCount++;
        } catch (error) {
          console.error(error);
          item.status = 'error';
          item.detail = error.message || 'ไม่สามารถบีบอัดไฟล์นี้ได้';
          failureCount++;
        }
        render();
      }

      if (!outputs.length) {
        setProgress(100);
        setStatus(`บีบอัดไม่สำเร็จ ${failureCount} ไฟล์ กรุณาตรวจสอบไฟล์แล้วลองใหม่`, true);
        return;
      }

      let downloadBlob;
      let downloadName;
      if (outputs.length === 1) {
        downloadBlob = outputs[0].blob;
        downloadName = outputs[0].name;
      } else {
        if (!window.JSZip) throw new Error('โหลดเครื่องมือ ZIP ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        setStatus('กำลังรวมไฟล์ที่บีบอัดเป็น ZIP...');
        const zip = new JSZip();
        outputs.forEach(output => zip.file(output.name, output.blob));
        downloadBlob = await zip.generateAsync({ type: 'blob' }, metadata => {
          setProgress(Math.round(92 + metadata.percent * 0.08));
        });
        downloadName = 'compressed_files.zip';
      }

      const originalTotal = outputs.reduce((sum, output) => sum + output.originalSize, 0);
      pendingDownload = {
        blob: downloadBlob,
        filename: downloadName,
        originalSize: originalTotal,
        qualityPercent,
        successCount,
        failureCount,
      };
      hasDownloaded = false;
      render();
      setProgress(100);
      setStatus(`เตรียมไฟล์สำเร็จ ${successCount} ไฟล์ · ${describeSizeChange(originalTotal, downloadBlob.size)} · ตรวจสอบผลก่อนดาวน์โหลด` + (failureCount ? ` · ไม่สำเร็จ ${failureCount} ไฟล์` : ''));
    } catch (error) {
      setStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
      isCompressing = false;
      render();
      if (button) button.disabled = files.length === 0;
    }
  }

  function renderPage() {
    files.length = 0;
    pendingDownload = null;
    hasDownloaded = false;
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

        <div class="compress-options" id="compress-options" style="display:none">
          <div class="compress-quality-row">
            <label for="compress-quality">ระดับคุณภาพ</label>
            <input type="range" id="compress-quality" min="10" max="90" value="60"
              oninput="CompressPdf.updateQuality(this.value)" />
            <span id="compress-quality-val">60%</span>
          </div>
          <p class="compress-note">เปอร์เซ็นต์นี้คือระดับคุณภาพ ไม่ใช่เปอร์เซ็นต์ที่ลดจริง ผลลดจริงและขนาดไฟล์จะแสดงก่อนดาวน์โหลด · PDF อาจถูกแปลงเป็นภาพจนเลือกหรือค้นหาข้อความไม่ได้ หากไฟล์เดิมเล็กกว่า ระบบจะเก็บไฟล์เดิมไว้ · รูปภาพจะแปลงเป็น JPG และพื้นหลังโปร่งใสเป็นสีขาว</p>
        </div>

        <div id="compress-section" class="compress-section" style="display:none">
          <div class="list-toolbar">
            <span class="list-stat" id="compress-stat">0 ไฟล์</span>
            <button class="action-btn action-btn--danger" id="compress-clear-btn" type="button" onclick="CompressPdf.clearAll()">ล้างทั้งหมด</button>
          </div>
          <div class="file-list" id="compress-list"></div>
          <div class="compress-preview" id="compress-preview" role="status" aria-live="polite" hidden></div>
          <div class="print-bar">
            <span class="selected-summary">บีบอัดเพื่อดูเปอร์เซ็นต์และขนาดก่อนดาวน์โหลด</span>
            <button class="btn btn--primary" id="compress-btn" disabled onclick="CompressPdf.doCompress()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"/></svg>
              บีบอัดและดูผล
            </button>
          </div>
          <div class="progress-track" id="compress-track"><div class="progress-fill" id="compress-fill"></div></div>
          <div class="status-text" id="compress-status" aria-live="polite"></div>
        </div>
      </div>
    `;

    const dropZone = document.getElementById('compress-drop-zone');
    const fileInput = document.getElementById('compress-input');
    fileInput.addEventListener('change', event => {
      addFiles(event.target.files);
      event.target.value = '';
    });
    dropZone.addEventListener('dragover', event => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', event => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');
      addFiles(event.dataTransfer.files);
    });
    render();
  }

  return { renderPage, removeFile, clearAll, updateQuality, doCompress };
})();

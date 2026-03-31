const ScheduledPrint = (() => {
  let pdfFile = null;
  let timer = null;
  let currentRound = 0;
  let totalRounds = 0;
  let pdfUrl = null;

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function setStatus(msg, isError = false) {
    const el = document.getElementById('sp-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }

  function updateUI(running) {
    const startBtn = document.getElementById('sp-start');
    const stopBtn  = document.getElementById('sp-stop');
    const inputs   = document.querySelectorAll('.sp-input');
    if (startBtn) startBtn.disabled = running || !pdfFile;
    if (stopBtn)  stopBtn.disabled  = !running;
    inputs.forEach(el => el.disabled = running);
  }

  function updateProgress() {
    const bar   = document.getElementById('sp-progress-bar');
    const label = document.getElementById('sp-round-label');
    const pct   = totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;
    if (bar)   bar.style.width = pct + '%';
    if (label) label.textContent = `รอบที่ ${currentRound} / ${totalRounds}`;
  }

  function setFile(f) {
    pdfFile = f;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(f);
    const info = document.getElementById('sp-file-info');
    if (info) info.innerHTML = `
      <div class="file-item selected" style="max-width:560px;margin-bottom:16px">
        <span class="pdf-tag">PDF</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">${fmt(f.size)}</span>
        <button class="file-remove" onclick="ScheduledPrint.clearFile()">×</button>
      </div>`;
    updateUI(false);
    setStatus('');
  }

  function clearFile() {
    pdfFile = null;
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; }
    const info = document.getElementById('sp-file-info');
    if (info) info.innerHTML = '';
    updateUI(false);
  }

  function doPrint() {
    const copies  = parseInt(document.getElementById('sp-copies').value)   || 1;
    const win = window.open(pdfUrl);
    if (!win) {
      setStatus('Popup ถูกบล็อก — กรุณาอนุญาต popup แล้วลองใหม่', true);
      return;
    }
    win.onload = () => {
      setTimeout(() => {
        win.print();
        // ส่งข้อความจำนวน copies ไปแสดงใน print dialog
      }, 500);
    };
  }

  function start() {
    const copies   = parseInt(document.getElementById('sp-copies').value)   || 1;
    const interval = parseInt(document.getElementById('sp-interval').value) || 10;
    const rounds   = parseInt(document.getElementById('sp-rounds').value)   || 1;

    if (!pdfFile) { setStatus('กรุณาเลือกไฟล์ PDF ก่อนครับ', true); return; }
    if (copies < 1 || interval < 1 || rounds < 1) {
      setStatus('กรุณากรอกค่าให้ถูกต้องครับ', true); return;
    }

    currentRound = 0;
    totalRounds  = rounds;
    updateUI(true);
    updateProgress();

    // รอบแรกทันที
    runRound(copies);

    if (rounds > 1) {
      timer = setInterval(() => {
        if (currentRound >= totalRounds) {
          stop();
          return;
        }
        runRound(copies);
      }, interval * 60 * 1000);
    }
  }

  function runRound(copies) {
    currentRound++;
    updateProgress();

    const now = new Date().toLocaleTimeString('th-TH');
    setStatus(`รอบที่ ${currentRound} — ปริ้น ${copies} ชุด (${now})`);

    // เปิด print ตาม copies
    for (let i = 0; i < copies; i++) {
      setTimeout(() => {
        const win = window.open(pdfUrl);
        if (win) win.onload = () => setTimeout(() => win.print(), 500);
      }, i * 1200); // หน่วงเล็กน้อยระหว่างแต่ละชุด
    }

    if (currentRound >= totalRounds) {
      setTimeout(() => stop(), (copies * 1200) + 1000);
    }
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    updateUI(false);
    if (currentRound >= totalRounds && totalRounds > 0) {
      setStatus(`✓ ปริ้นครบ ${totalRounds} รอบแล้ว`);
    } else {
      setStatus('หยุดการปริ้นแล้ว');
    }
  }

  function renderPage() {
    pdfFile = null; timer = null; currentRound = 0; totalRounds = 0;

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="page-header">
          <span class="page-eyebrow">Tool 09</span>
          <h1 class="page-title">Scheduled <em>Print</em></h1>
          <p class="page-desc">ตั้งจำนวนชุด ช่วงเวลา และจำนวนรอบ — ระบบจะเปิด print dialog ให้อัตโนมัติทุกรอบ</p>
        </div>

        <!-- File -->
        <div class="drop-zone" id="sp-drop-zone"
          onclick="document.getElementById('sp-input').click()"
          style="max-width:560px;padding:32px 24px;text-align:center;margin-bottom:16px">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p class="drop-title">เลือกไฟล์ PDF</p>
          <p class="drop-sub"><strong>คลิกหรือลากไฟล์มาวาง</strong></p>
          <input type="file" id="sp-input" accept=".pdf" style="display:none"/>
        </div>

        <div id="sp-file-info"></div>

        <!-- Settings -->
        <div style="max-width:560px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px">
            <p style="font-size:10px;font-family:'DM Mono',monospace;color:var(--cyan);letter-spacing:1px;margin-bottom:8px">ชุดต่อรอบ</p>
            <input type="number" id="sp-copies" class="sp-input" min="1" max="100" value="10"
              style="width:100%;font-size:20px;font-weight:500;font-family:'DM Mono',monospace;
                background:none;border:none;color:var(--text);outline:none"/>
            <p style="font-size:10px;color:var(--text-3);margin-top:4px">ชุด</p>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px">
            <p style="font-size:10px;font-family:'DM Mono',monospace;color:var(--cyan);letter-spacing:1px;margin-bottom:8px">ช่วงเวลา</p>
            <input type="number" id="sp-interval" class="sp-input" min="1" max="1440" value="10"
              style="width:100%;font-size:20px;font-weight:500;font-family:'DM Mono',monospace;
                background:none;border:none;color:var(--text);outline:none"/>
            <p style="font-size:10px;color:var(--text-3);margin-top:4px">นาที / รอบ</p>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px">
            <p style="font-size:10px;font-family:'DM Mono',monospace;color:var(--cyan);letter-spacing:1px;margin-bottom:8px">จำนวนรอบ</p>
            <input type="number" id="sp-rounds" class="sp-input" min="1" max="999" value="5"
              style="width:100%;font-size:20px;font-weight:500;font-family:'DM Mono',monospace;
                background:none;border:none;color:var(--text);outline:none"/>
            <p style="font-size:10px;color:var(--text-3);margin-top:4px">รอบ</p>
          </div>
        </div>

        <!-- Summary -->
        <div style="max-width:560px;padding:12px 16px;background:var(--surface);
          border:1px solid var(--border);border-radius:var(--r);margin-bottom:16px;
          font-size:12px;font-family:'DM Mono',monospace;color:var(--text-2)">
          รวมทั้งหมด:
          <span id="sp-summary" style="color:var(--gold)">50 ชุด ใน 40 นาที</span>
        </div>

        <!-- Progress -->
        <div style="max-width:560px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span id="sp-round-label" style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-3)">รอบที่ 0 / 0</span>
          </div>
          <div style="height:2px;background:var(--border);border-radius:2px;overflow:hidden">
            <div id="sp-progress-bar" style="height:100%;width:0%;background:var(--cyan);border-radius:2px;transition:width 0.3s"></div>
          </div>
        </div>

        <!-- Buttons -->
        <div style="max-width:560px;display:flex;gap:10px">
          <button class="btn btn--primary" id="sp-start" disabled onclick="ScheduledPrint.start()" style="flex:1;justify-content:center">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/>
            </svg>
            เริ่มปริ้น
          </button>
          <button class="btn btn--ghost" id="sp-stop" disabled onclick="ScheduledPrint.stop()" style="padding:9px 20px">
            หยุด
          </button>
        </div>

        <div class="status-text" id="sp-status" style="margin-top:10px"></div>
      </div>
    `;

    // คำนวณ summary
    function updateSummary() {
      const c = parseInt(document.getElementById('sp-copies').value)   || 0;
      const i = parseInt(document.getElementById('sp-interval').value) || 0;
      const r = parseInt(document.getElementById('sp-rounds').value)   || 0;
      const el = document.getElementById('sp-summary');
      if (el) el.textContent = `${c * r} ชุด ใน ${i * (r - 1)} นาที`;
    }

    document.querySelectorAll('.sp-input').forEach(el => {
      el.addEventListener('input', updateSummary);
    });
    updateSummary();

    // Drop zone
    const dz = document.getElementById('sp-drop-zone');
    const fi = document.getElementById('sp-input');
    fi.addEventListener('change', e => { if (e.target.files[0]) { setFile(e.target.files[0]); e.target.value = ''; } });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
  }

  return { renderPage, start, stop, clearFile };
})();
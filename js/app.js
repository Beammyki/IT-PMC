'use strict';

/* ═══════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════ */
(function initCursor() {
  const cursor    = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  if (!cursor || !cursorDot) return;
  let mx = 0, my = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursorDot.style.left = mx + 'px';
    cursorDot.style.top  = my + 'px';
  });
  function animateCursor() {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
})();

/* ═══════════════════════════════
   PAGES
   ═══════════════════════════════ */
const PAGES = {
  home:      { title: 'Overview',           render: renderHome },
  pdf:       { title: 'PDF Batch Print',    render: () => PdfPrint.renderPage() },
  merge:     { title: 'Merge PDF',          render: () => MergePdf.renderPage() },
  compress:  { title: 'Compress PDF',       render: () => CompressPdf.renderPage() },
  convert:   { title: 'Convert Files',      render: () => ConvertFiles.renderPage() },
  split:     { title: 'Split & Organize',   render: () => SplitPdf.renderPage() },
  pagenum:   { title: 'Add Page Numbers',   render: () => PageNum.renderPage() },
  extract:   { title: 'Extract Images',     render: () => ExtractImages.renderPage() },
  mailmerge: { title: 'PDF Mail Merge',     render: () => PdfMailMerge.renderPage() },

  lock:      { title: 'PDF Lock',           render: () => PdfLock.renderPage() },
  unlock:    { title: 'PDF Unlock',         render: () => PdfUnlock.renderPage() },
  watermark: { title: 'Remove Watermark',   render: () => RemoveWatermark.renderPage() },
  'add-wm':  { title: 'Add Watermark',      render: () => AddWatermark.renderPage() },
  redactor:  { title: 'Document Redactor',  render: () => PdfRedactor.renderPage() },
  
  ocr:       { title: 'Image to Text (OCR)',render: () => OcrTool.renderPage() },
  resizer:   { title: 'Bulk Resizer',       render: () => BulkResizer.renderPage() },
  collage:   { title: 'Slip Collage',       render: () => SlipCollage.renderPage() },
  
  qr:        { title: 'Batch QR Code',      render: () => BatchQr.renderPage() },
  cleaner:   { title: 'Data Cleaner',       render: () => DataCleaner.renderPage() },
  renamer:   { title: 'Batch Renamer',      render: () => BatchRenamer.renderPage() },
  csv:       { title: 'CSV Merger/Splitter',render: () => CsvMerger.renderPage() },
  
  schedprint: { title: 'Scheduled Print',   render: () => ScheduledPrint.renderPage() },
};

/* ═══════════════════════════════
   ROUTER
   ═══════════════════════════════ */
let currentPage = null;

function navigate(pageId) {
  if (!PAGES[pageId]) pageId = 'home';
  if (currentPage === pageId) return;
  currentPage = pageId;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = PAGES[pageId].title;
  PAGES[pageId].render();
  document.getElementById('sidebar').classList.remove('open');
  history.replaceState(null, '', '#' + pageId);
}

/* ═══════════════════════════════
   HOME PAGE
   ═══════════════════════════════ */
function renderHome() {
  const sections = [
    {
      label: 'PDF Tools',
      items: [
        { id:'pdf',       num:'01', title:'PDF Batch Print',  desc:'เลือกและปริ้น PDF หลายไฟล์พร้อมกัน',     icon:'card-icon--gold', svg:'M4 6V1.5h5l2 2V6M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3A1.5 1.5 0 0113.5 12H12M4 9.5h8V15H4z' },
        { id:'merge',     num:'02', title:'Merge PDF',         desc:'รวมหลาย PDF เป็นไฟล์เดียว',              icon:'card-icon--blue', svg:'M3 4h10M3 8h7M3 12h4' },
        { id:'split',     num:'03', title:'Split & Organize',  desc:'แยกหน้า สลับหน้า หรือลบหน้า PDF ทิ้ง',     icon:'card-icon--gold', svg:'M4 2v12M12 2v12M1 6h6M9 10h6' },
        { id:'pagenum',   num:'04', title:'Add Page Numbers',  desc:'รันเลขหน้าอัตโนมัติลงใน PDF',            icon:'card-icon--gold', svg:'M2 2h8v12H2zM8 12h2' },
        { id:'extract',   num:'05', title:'Extract Images',    desc:'ดึงรูปภาพทุกรูปออกจากไฟล์ PDF',           icon:'card-icon--teal', svg:'M2 14h12M4 10l4-4 4 4M8 6v8' },
        { id:'mailmerge', num:'06', title:'PDF Mail Merge',    desc:'สร้างเอกสาร 100 ไฟล์จาก Excel',           icon:'card-icon--rose', svg:'M2 4h12v8H2zM2 4l6 4 6-4' },
        { id:'compress',  num:'07', title:'Compress PDF & Image',desc:'บีบอัด PDF และรูปภาพให้เล็กลง',         icon:'card-icon--teal', svg:'M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3' },
        { id:'convert',   num:'08', title:'Convert Files',     desc:'แปลงไฟล์ PDF ↔ Word ↔ Image',            icon:'card-icon--blue', svg:'M2 8h12M10 4l4 4-4 4' },
        { id:'lock',      num:'09', title:'PDF Lock',          desc:'ใส่รหัสผ่าน PDF หลายไฟล์พร้อมกัน',        icon:'card-icon--gold', svg:'M3 7h10v8H3zM5 7V5a3 3 0 016 0v2' },
        { id:'unlock',    num:'10', title:'PDF Unlock',        desc:'ปลดล็อค PDF รหัสผ่านหลายไฟล์',           icon:'card-icon--gold', svg:'M3 7h10v8H3zM5 7V5a3 3 0 016 0' },
        { id:'watermark', num:'11', title:'Remove Watermark',  desc:'ลบโลโก้และลายน้ำออกจากไฟล์',            icon:'card-icon--rose', svg:'M3 3l10 10M3 13l10-10M8 1v2M8 13v2M1 8h2M13 8h2' },
        { id:'add-wm',    num:'12', title:'Add Watermark',     desc:'ประทับตราลายน้ำลงในเอกสาร PDF',      icon:'card-icon--blue', svg:'M12 4L4 12M4 4l8 8' },
        { id:'redactor',  num:'13', title:'Document Redactor', desc:'เซ็นเซอร์ข้อมูลส่วนบุคคลก่อนส่งไฟล์',      icon:'card-icon--rose', svg:'M3 3h10v10H3z' },
      ]
    },
    {
      label: 'General Tools',
      items: [
        { id:'schedprint', num:'12', title:'Scheduled Print', desc:'ตั้งเวลาปริ้นอัตโนมัติ กำหนดรอบและช่วงเวลาได้', icon:'card-icon--blue', svg:'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3.5l2.5 1.5' },
      ]
    },
    {
      label: 'HR',
      items: [
        { id:'cert',   num:'09', title:'Certificate',       desc:'ระบบออกใบรับรองพนักงาน',          icon:'card-icon--gold', svg:'M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z',     url:'https://hr-certificate.pages.dev/' },
      ]
    },
    {
      label: 'Data Tools',
      items: [
        { id:'qr',      num:'16', title:'Batch QR Code', desc:'สร้าง QR Code หลายรูปพร้อมกันจากลิงก์หรือข้อความ', icon:'card-icon--gold', svg:'M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4M9 13h4M13 9v4' },
        { id:'cleaner', num:'17', title:'Data Cleaner',  desc:'ลบขยะ ลบข้อความซ้ำ จัดเรียงข้อมูล',              icon:'card-icon--rose', svg:'M4 3h8M4 8h8M4 13h8M2 3v0M2 8v0M2 13v0' },
        { id:'renamer', num:'18', title:'Batch Renamer', desc:'เปลี่ยนชื่อไฟล์ทีละหลายๆ ไฟล์',                  icon:'card-icon--teal', svg:'M2 4h12v8H2zM2 8h12M6 4v8' },
        { id:'csv',     num:'19', title:'CSV Tools',     desc:'รวมไฟล์ หรือ หั่นไฟล์ CSV',                     icon:'card-icon--blue', svg:'M2 4v8l4-2v-4L2 4zM14 4v8l-4-2v-4l4-2z' },
      ]
    },
    {
      label: 'Image Tools',
      items: [
        { id:'ocr',     num:'13', title:'Image to Text (OCR)', desc:'ดึงข้อความจากรูปภาพ (รองรับภาษาไทย)', icon:'card-icon--teal', svg:'M4 10h8M4 6h8M4 14h8' },
        { id:'resizer', num:'14', title:'Bulk Resizer',        desc:'ย่อขนาดและแปลงสกุลรูปภาพทีละหลายรูป', icon:'card-icon--gold', svg:'M2 14l5-5m0 0H3m4 0v4M14 2L9 7m0 0h4M9 7V3' },
        { id:'collage', num:'15', title:'Slip Collage',        desc:'จัดเรียงสลิปลง A4 อัตโนมัติ',        icon:'card-icon--blue', svg:'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z' },
      ]
    },
    {
      label: 'Office',
      items: [
        { id:'meeting', num:'11', title:'จองห้องประชุม', desc:'ระบบจองห้องประชุมออนไลน์', icon:'card-icon--blue', svg:'M2 3h12v9H2zM5 12v2M11 12v2M5 14h6M8 6v3M6 7h4', url:'https://script.google.com/macros/s/AKfycbzN7DJXgZyuFlz12GjAJjcDVe15B6fNAG7aLszXeyIBvWwD6AdzZlZUPPmcZ3StF5s/exec' },
      ]
    },
    {
      label: 'Admin',
      items: [
        { id:'excel', num:'12', title:'Excel Admin', desc:'ระบบจัดการข้อมูล Excel', icon:'card-icon--teal', svg:'M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12', url:'https://script.google.com/macros/s/AKfycbzM47RYLjJBJ0a7QLcT-InU2NOtC7eS_gBFJFabXdmrBWYfV3GZ7osqz1yrJiR8D0xC/exec' },
        { id:'excel', num:'12', title:'Excel Admin PGSN', desc:'ระบบจัดการข้อมูล Excel PGSN', icon:'card-icon--teal', svg:'M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12', url:'https://script.google.com/macros/s/AKfycbxufah9Ub9ul7khRX3iaJSlVZtjD5Z6wPL6Mdy-iV-iCWsO6UaVxA7QLFtxXz_2WkT5/exec' },
        // หา section Admin แล้วเพิ่ม item นี้ต่อจาก Excel Admin
        { id:'express', num:'13', title:'Express Admin', desc:'ระบบจัดการ Express backend', icon:'card-icon--rose', svg:'M2 3h12v10H2zM2 7h12M6 3v10M1 5l2-2M15 5l-2-2', url:'https://4439ab01.pegasus-stock.pages.dev/' },
      ]
    },
  ];

  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <span class="page-eyebrow">Toolbox — File Utilities</span>
        <h1 class="page-title">เครื่องมือ<em>ของคุณ</em></h1>
        <p class="page-desc">ชุดเครื่องมือจัดการ PDF และไฟล์ — ทำงานบนเบราว์เซอร์ของคุณทั้งหมด ไม่มีการส่งข้อมูลออกไปไหน</p>
      </div>

      ${sections.map(sec => `
        <div style="margin-bottom:32px">
          <p style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:2px;text-transform:uppercase;color:var(--text-3);margin-bottom:12px">${sec.label}</p>
          <div class="tool-grid">
            ${sec.items.map(t => `
              <div class="tool-card" onclick="${t.url ? `window.open('${t.url}','_blank')` : `navigate('${t.id}')`}">
                <span class="card-number">${t.num}</span>
                <div class="card-icon ${t.icon}">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${t.svg}"/>
                  </svg>
                </div>
                <h3 class="card-title">${t.title}</h3>
                <p class="card-desc">${t.desc}</p>
                <div class="card-arrow">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ═══════════════════════════════
   COMING SOON PAGE
   ═══════════════════════════════ */
function renderComingSoon(name, desc, svgPath) {
  document.getElementById('page-container').innerHTML = `
    <div class="page">
      <div class="coming-soon-page">
        <div class="coming-soon-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="${svgPath}"/>
          </svg>
        </div>
        <h2 class="coming-soon-title">${name}</h2>
        <div class="coming-soon-divider"></div>
        <p class="coming-soon-desc">${desc}<br/><br/>กำลังพัฒนาอยู่ครับ เร็ว ๆ นี้จะใช้ได้</p>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════
   MODAL
   ═══════════════════════════════ */
const overlay = document.getElementById('modal-overlay');
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-confirm').addEventListener('click', () => {
  closeModal();
  PdfPrint.executePrint();
});
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
function closeModal() { overlay.classList.remove('open'); }
window.openPrintModal = function() { PdfPrint.openConfirm(); };

/* ═══════════════════════════════
   SIDEBAR + MOBILE TOGGLE
   ═══════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    if (el.href && !el.dataset.page) return;
    e.preventDefault();
    const page = el.dataset.page;
    if (page && !el.classList.contains('nav-item--soon')) navigate(page);
  });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ═══════════════════════════════
   INIT
   ═══════════════════════════════ */
(function init() {
  const hash = window.location.hash.replace('#', '');
  navigate(PAGES[hash] ? hash : 'home');
})();

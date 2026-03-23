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
  sign:      { title: 'Sign PDF',           render: () => SignPdf.renderPage() },
  lock:      { title: 'PDF Lock',           render: () => PdfLock.renderPage() },
  unlock:    { title: 'PDF Unlock',         render: () => PdfUnlock.renderPage() },
  watermark: { title: 'Remove Watermark',   render: () => RemoveWatermark.renderPage() },
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
      label: 'Tools',
      items: [
        { id:'pdf',       num:'01', title:'PDF Batch Print',  desc:'เลือกและปริ้น PDF หลายไฟล์พร้อมกัน',     icon:'card-icon--gold', svg:'M4 6V1.5h5l2 2V6M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3A1.5 1.5 0 0113.5 12H12M4 9.5h8V15H4z' },
        { id:'merge',     num:'02', title:'Merge PDF',         desc:'รวมหลาย PDF เป็นไฟล์เดียว',              icon:'card-icon--blue', svg:'M3 4h10M3 8h7M3 12h4' },
        { id:'compress',  num:'03', title:'Compress PDF',      desc:'บีบอัด PDF ให้เล็กลง',                   icon:'card-icon--teal', svg:'M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3' },
        { id:'convert',   num:'04', title:'Convert Files',     desc:'แปลงไฟล์ PDF ↔ Word ↔ Image',            icon:'card-icon--blue', svg:'M2 8h12M10 4l4 4-4 4' },
        { id:'sign',      num:'05', title:'Sign PDF',           desc:'เซ็นเอกสารด้วยลายเซ็นดิจิทัล',         icon:'card-icon--rose', svg:'M2 12c2-4 4-8 5-8s0 4 2 4 2-4 3-4M2 14h12' },
        { id:'lock',      num:'06', title:'PDF Lock',           desc:'ใส่รหัสผ่าน PDF หลายไฟล์พร้อมกัน',     icon:'card-icon--gold', svg:'M3 7h10v8H3zM5 7V5a3 3 0 016 0v2' },
        { id:'unlock',    num:'07', title:'PDF Unlock',         desc:'ปลดล็อค PDF รหัสผ่านหลายไฟล์',         icon:'card-icon--gold', svg:'M3 7h10v8H3zM5 7V5a3 3 0 016 0' },
        { id:'watermark', num:'08', title:'Remove Watermark',  desc:'ลบโลโก้และ watermark ออกจากรูป',        icon:'card-icon--rose', svg:'M3 3l10 10M3 13l10-10M8 1v2M8 13v2M1 8h2M13 8h2' },
      ]
    },
    {
      label: 'HR',
      items: [
        { id:'cert',   num:'09', title:'Certificate',       desc:'ระบบออกใบรับรองพนักงาน',          icon:'card-icon--gold', svg:'M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z',     url:'https://hr-certificate.pages.dev/' },
        { id:'salary', num:'10', title:'ระบบเงินเดือน HR', desc:'ระบบจัดการเงินเดือนพนักงาน',      icon:'card-icon--teal', svg:'M2 4h12v8H2zM5 4V2h6v2M8 7v3M6 9h4',          url:'http://192.168.78.36:8501/' },
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
        // หา section Admin แล้วเพิ่ม item นี้ต่อจาก Excel Admin
        { id:'express', num:'13', title:'Express Admin', desc:'ระบบจัดการ Express backend', icon:'card-icon--rose', svg:'M2 3h12v10H2zM2 7h12M6 3v10M1 5l2-2M15 5l-2-2', url:'https://express-admin.naravichku.workers.dev/' },
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
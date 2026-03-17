/* ─────────────────────────────────────────────
   app.js — Main Router & UI Logic
   ───────────────────────────────────────────── */

'use strict';

/* ═══════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════ */
(function initCursor() {
  const cursor    = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  if (!cursor || !cursorDot) return;

  let mx = 0, my = 0;
  let cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
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
   ROUTER
   ═══════════════════════════════ */
const PAGES = {
  home:     { title: 'Overview',        render: renderHome },
  pdf:      { title: 'PDF Batch Print', render: () => PdfPrint.renderPage() },
  merge:    { title: 'Merge PDF',       render: () => MergePdf.renderPage() },
  compress: { title: 'Compress PDF',    render: () => CompressPdf.renderPage() },
  convert:  { title: 'Convert Files',   render: () => ConvertFiles.renderPage() },
  sign:     { title: 'Sign PDF',        render: () => SignPdf.renderPage() },
};

let currentPage = null;

function navigate(pageId) {
  if (!PAGES[pageId]) pageId = 'home';
  if (currentPage === pageId) return;
  currentPage = pageId;

  /* Update nav active state */
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  /* Update breadcrumb */
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = PAGES[pageId].title;

  /* Render page */
  PAGES[pageId].render();

  /* Close mobile sidebar */
  document.getElementById('sidebar').classList.remove('open');

  /* Update URL hash */
  history.replaceState(null, '', '#' + pageId);
}


/* ═══════════════════════════════
   HOME PAGE
   ═══════════════════════════════ */
function renderHome() {
  const tools = [
    {
      id: 'pdf',
      num: '01',
      title: 'PDF Batch Print',
      desc: 'เลือกและปริ้น PDF หลายไฟล์พร้อมกัน ยืนยันก่อนปริ้นทุกครั้ง',
      icon: 'card-icon--gold',
      live: true,
      svg: 'M4 6V1.5h5l2 2V6M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3A1.5 1.5 0 0113.5 12H12M4 9.5h8V15H4V9.5z'
    },
    {
      id: 'merge',
      num: '02',
      title: 'Merge PDF',
      desc: 'รวมหลาย PDF เป็นไฟล์เดียว เรียงลำดับหน้าได้',
      icon: 'card-icon--blue',
      live: true,
      svg: 'M3 4h10M3 8h7M3 12h4'
    },
    {
      id: 'compress',
      num: '03',
      title: 'Compress PDF',
      desc: 'บีบอัด PDF ให้เล็กลง ส่งอีเมลหรืออัปโหลดได้ง่ายขึ้น',
      icon: 'card-icon--teal',
      live: true,
      svg: 'M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3'
    },
    {
      id: 'convert',
      num: '04',
      title: 'Convert Files',
      desc: 'แปลงไฟล์ระหว่าง PDF, Word, JPG, PNG ได้ครบ',
      icon: 'card-icon--blue',
      live: true,
      svg: 'M2 8h12M10 4l4 4-4 4'
    },
    {
      id: 'sign',
      num: '05',
      title: 'Sign PDF',
      desc: 'เซ็นเอกสารด้วยลายเซ็นดิจิทัล ไม่ต้องพิมพ์',
      icon: 'card-icon--rose',
      live: true,
      svg: 'M2 12c2-4 4-8 5-8s0 4 2 4 2-4 3-4M2 14h12'
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

      <div class="tool-grid">
        ${tools.map(t => `
          <div class="tool-card${!t.live ? ' tool-card--soon' : ''}"
               ${t.live ? `onclick="navigate('${t.id}')"` : ''}>
            ${!t.live ? '<span class="card-soon-tag">เร็ว ๆ นี้</span>' : ''}
            <span class="card-number">${t.num}</span>
            <div class="card-icon ${t.icon}">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="${t.svg}"/>
              </svg>
            </div>
            <h3 class="card-title">${t.title}</h3>
            <p class="card-desc">${t.desc}</p>
            ${t.live ? `
              <div class="card-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
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

overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

function closeModal() {
  overlay.classList.remove('open');
}

/* Expose for PdfPrint to call */
window.openPrintModal = function() {
  PdfPrint.openConfirm();
};


/* ═══════════════════════════════
   SIDEBAR + MOBILE TOGGLE
   ═══════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    // ถ้าเป็น external link ให้เปิดปกติ ไม่ต้อง preventDefault
    if (el.href && !el.dataset.page) return;
    e.preventDefault();
    const page = el.dataset.page;
    if (page && !el.classList.contains('nav-item--soon')) {
      navigate(page);
    }
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

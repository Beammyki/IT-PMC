'use strict';

const ICONS = Object.freeze({
  print: 'M6 9V3h9l3 3v3M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  merge: 'M5 7h14M5 12h10M5 17h6',
  split: 'M7 3v18M17 3v18M3 8h8M13 16h8',
  page: 'M5 3h12v18H5zM14 17h5V7',
  extract: 'M4 20h16M7 15l5-5 5 5M12 10v10',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  remove: 'm5 5 14 14M5 19 19 5M12 2v3M12 19v3',
  add: 'M12 4v16M4 12h16',
  redact: 'M4 4h16v16H4zM7 10h10M7 14h7',
  compress: 'M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5',
  convert: 'M4 8h16M16 4l4 4-4 4M20 16H4M8 12l-4 4 4 4',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  unlock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 7-2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v6l4 2',
  ocr: 'M4 4h5M4 4v5M20 4h-5M20 4v5M4 20h5M4 20v-5M20 20h-5M20 20v-5M8 12h8',
  resize: 'm4 20 7-7M4 20h6M4 20v-6M20 4l-7 7M20 4h-6M20 4v6',
  collage: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3z',
  cleaner: 'M6 5h14M6 12h14M6 19h14M3 5h.01M3 12h.01M3 19h.01',
  rename: 'M4 6h16v12H4zM4 10h16M10 6v12',
  csv: 'M3 6v12l7-3V9L3 6zM21 6v12l-7-3V9l7-3z',
  cert: 'm12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z',
  meeting: 'M3 5h18v13H3zM8 18v3M16 18v3M8 21h8M12 9v5M9.5 11.5h5',
  table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  admin: 'M3 5h18v14H3zM3 10h18M9 5v14'
});

const TOOL_DATA = [
  { id:'pdf', group:'PDF Tools', title:'PDF Batch Print', thai:'พิมพ์ PDF หลายไฟล์', desc:'เลือกและพิมพ์เอกสาร PDF หลายไฟล์พร้อมกัน', icon:'print', tone:'blue', badge:'LIVE' },
  { id:'merge', group:'PDF Tools', title:'Merge PDF', thai:'รวมไฟล์ PDF', desc:'รวมไฟล์ PDF หลายรายการเป็นเอกสารเดียว', icon:'merge', tone:'red', badge:'LIVE' },
  { id:'split', group:'PDF Tools', title:'Split & Organize', thai:'แยกและจัดหน้า PDF', desc:'แยก ลบ หรือจัดลำดับหน้าเอกสารใหม่', icon:'split', tone:'orange', badge:'NEW' },
  { id:'pagenum', group:'PDF Tools', title:'Add Page Numbers', thai:'เพิ่มเลขหน้า', desc:'ใส่เลขหน้าอัตโนมัติลงในเอกสาร PDF', icon:'page', tone:'violet', badge:'NEW' },
  { id:'extract', group:'PDF Tools', title:'Extract Images', thai:'ดึงรูปภาพจาก PDF', desc:'แยกรูปภาพทั้งหมดออกจากไฟล์ PDF', icon:'extract', tone:'green', badge:'NEW' },
  { id:'mailmerge', group:'PDF Tools', title:'PDF Mail Merge', thai:'สร้างเอกสารหลายชุด', desc:'สร้างเอกสารจากข้อมูล CSV แบบอัตโนมัติ', icon:'mail', tone:'pink', badge:'NEW' },
  { id:'watermark', group:'PDF Tools', title:'Remove Watermark', thai:'ลบลายน้ำ', desc:'ลบโลโก้หรือลายน้ำออกจากเอกสาร', icon:'remove', tone:'red', badge:'LIVE' },
  { id:'add-wm', group:'PDF Tools', title:'Add Watermark', thai:'เพิ่มลายน้ำ', desc:'ประทับข้อความหรือลายน้ำลงใน PDF', icon:'add', tone:'pink', badge:'NEW' },
  { id:'redactor', group:'PDF Tools', title:'Document Redactor', thai:'ปกปิดข้อมูลเอกสาร', desc:'ปกปิดข้อมูลสำคัญก่อนส่งต่อไฟล์', icon:'redact', tone:'slate', badge:'NEW' },
  { id:'compress', group:'PDF Tools', title:'Compress PDF & Image', thai:'บีบอัด PDF และรูปภาพ', desc:'ลดขนาดไฟล์ PDF และรูปภาพให้เล็กลง', icon:'compress', tone:'green', badge:'LIVE' },
  { id:'convert', group:'PDF Tools', title:'Convert Files', thai:'แปลงไฟล์', desc:'แปลงเอกสาร PDF, Word และรูปภาพ', icon:'convert', tone:'blue', badge:'LIVE' },
  { id:'lock', group:'PDF Tools', title:'PDF Lock', thai:'ล็อกไฟล์ PDF', desc:'เพิ่มรหัสผ่านให้เอกสารหลายไฟล์', icon:'lock', tone:'orange', badge:'LIVE' },
  { id:'unlock', group:'PDF Tools', title:'PDF Unlock', thai:'ปลดล็อกไฟล์ PDF', desc:'นำรหัสผ่านออกจากเอกสาร PDF', icon:'unlock', tone:'green', badge:'LIVE' },
  { id:'schedprint', group:'General Tools', title:'Scheduled Print', thai:'ตั้งเวลาพิมพ์เอกสาร', desc:'กำหนดเวลา รอบ และจำนวนสำเนาที่ต้องการพิมพ์', icon:'clock', tone:'violet', badge:'LIVE' },
  { id:'ocr', group:'Image Tools', title:'Image to Text (OCR)', thai:'แปลงรูปเป็นข้อความ', desc:'อ่านข้อความไทยและอังกฤษจากรูปภาพ', icon:'ocr', tone:'blue', badge:'NEW' },
  { id:'resizer', group:'Image Tools', title:'Bulk Resizer', thai:'ย่อรูปภาพหลายไฟล์', desc:'ปรับขนาดและแปลงชนิดรูปภาพพร้อมกัน', icon:'resize', tone:'teal', badge:'NEW' },
  { id:'collage', group:'Image Tools', title:'Slip Collage', thai:'จัดเรียงสลิป', desc:'จัดรูปภาพหรือสลิปลงกระดาษ A4 อัตโนมัติ', icon:'collage', tone:'orange', badge:'NEW' },
  { id:'qr', group:'Data Tools', title:'Batch QR Code', thai:'สร้าง QR Code หลายรายการ', desc:'สร้าง QR Code จากลิงก์หรือข้อความพร้อมกัน', icon:'qr', tone:'violet', badge:'NEW' },
  { id:'cleaner', group:'Data Tools', title:'Data Cleaner', thai:'ทำความสะอาดข้อมูล', desc:'ลบข้อมูลซ้ำและจัดรูปแบบรายการข้อความ', icon:'cleaner', tone:'green', badge:'NEW' },
  { id:'renamer', group:'Data Tools', title:'Batch Renamer', thai:'เปลี่ยนชื่อไฟล์หลายรายการ', desc:'ตั้งชื่อไฟล์ใหม่ตามรูปแบบที่กำหนด', icon:'rename', tone:'blue', badge:'NEW' },
  { id:'csv', group:'Data Tools', title:'CSV Merger/Splitter', thai:'รวมและแบ่งไฟล์ CSV', desc:'จัดการไฟล์ CSV หลายไฟล์ในครั้งเดียว', icon:'csv', tone:'teal', badge:'NEW' },
  { id:'cert', group:'HR / Office', title:'Certificate', thai:'ระบบออกใบรับรอง', desc:'เปิดระบบออกใบรับรองพนักงาน', icon:'cert', tone:'orange', url:'https://hr-certificate.pages.dev/' },
  { id:'meeting', group:'HR / Office', title:'จองห้องประชุม', thai:'Meeting Room Booking', desc:'เปิดระบบจองห้องประชุมออนไลน์', icon:'meeting', tone:'blue', url:'https://script.google.com/macros/s/AKfycbzN7DJXgZyuFlz12GjAJjcDVe15B6fNAG7aLszXeyIBvWwD6AdzZlZUPPmcZ3StF5s/exec' },
  { id:'excel', group:'Admin', title:'Excel Admin', thai:'ระบบจัดการ Excel', desc:'เปิดระบบจัดการข้อมูล Excel', icon:'table', tone:'green', url:'https://script.google.com/macros/s/AKfycbzM47RYLjJBJ0a7QLcT-InU2NOtC7eS_gBFJFabXdmrBWYfV3GZ7osqz1yrJiR8D0xC/exec' },
  { id:'excel-pgsn', group:'Admin', title:'Excel Admin PGSN', thai:'ระบบจัดการ Excel PGSN', desc:'เปิดระบบจัดการข้อมูล Excel PGSN', icon:'table', tone:'teal', url:'https://script.google.com/macros/s/AKfycbxufah9Ub9ul7khRX3iaJSlVZtjD5Z6wPL6Mdy-iV-iCWsO6UaVxA7QLFtxXz_2WkT5/exec' },
  { id:'express', group:'Admin', title:'Express Admin', thai:'ระบบจัดการ Express', desc:'เปิดระบบจัดการ Express', icon:'admin', tone:'red', url:'https://4439ab01.pegasus-stock.pages.dev/' }
];

const TOOL_MAP = new Map(TOOL_DATA.map(tool => [tool.id, tool]));
const PAGES = {
  home: { title:'Dashboard', render:renderHome },
  pdf: { title:'PDF Batch Print', render:() => PdfPrint.renderPage() },
  merge: { title:'Merge PDF', render:() => MergePdf.renderPage() },
  split: { title:'Split & Organize', render:() => SplitPdf.renderPage() },
  pagenum: { title:'Add Page Numbers', render:() => PageNum.renderPage() },
  extract: { title:'Extract Images', render:() => ExtractImages.renderPage() },
  mailmerge: { title:'PDF Mail Merge', render:() => PdfMailMerge.renderPage() },
  watermark: { title:'Remove Watermark', render:() => RemoveWatermark.renderPage() },
  'add-wm': { title:'Add Watermark', render:() => AddWatermark.renderPage() },
  redactor: { title:'Document Redactor', render:() => PdfRedactor.renderPage() },
  compress: { title:'Compress PDF & Image', render:() => CompressPdf.renderPage() },
  convert: { title:'Convert Files', render:() => ConvertFiles.renderPage() },
  lock: { title:'PDF Lock', render:() => PdfLock.renderPage() },
  unlock: { title:'PDF Unlock', render:() => PdfUnlock.renderPage() },
  schedprint: { title:'Scheduled Print', render:() => ScheduledPrint.renderPage() },
  ocr: { title:'Image to Text (OCR)', render:() => OcrTool.renderPage() },
  resizer: { title:'Bulk Resizer', render:() => BulkResizer.renderPage() },
  collage: { title:'Slip Collage', render:() => SlipCollage.renderPage() },
  qr: { title:'Batch QR Code', render:() => BatchQr.renderPage() },
  cleaner: { title:'Data Cleaner', render:() => DataCleaner.renderPage() },
  renamer: { title:'Batch Renamer', render:() => BatchRenamer.renderPage() },
  csv: { title:'CSV Merger/Splitter', render:() => CsvMerger.renderPage() }
};

const STORAGE_KEYS = Object.freeze({
  favorites:'toolbox_favorites', usage:'toolbox_usage', recent:'toolbox_recent', sidebar:'toolbox_sidebar_collapsed'
});

let currentPage = null;
let selectedSearchIndex = -1;

function iconSvg(tool, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[tool.icon]}"/></svg>`;
}

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === typeof fallback ? value : fallback;
  } catch (_) { return fallback; }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage can be disabled */ }
}

function getFavorites() { return readStore(STORAGE_KEYS.favorites, []); }

function toggleFavorite(id) {
  const items = getFavorites();
  const next = items.includes(id) ? items.filter(item => item !== id) : [...items, id];
  writeStore(STORAGE_KEYS.favorites, next);
  renderUtilityPanel();
  if (currentPage === 'home') renderHome();
}

function recordUse(id) {
  if (!TOOL_MAP.has(id)) return;
  const usage = readStore(STORAGE_KEYS.usage, {});
  usage[id] = (Number(usage[id]) || 0) + 1;
  writeStore(STORAGE_KEYS.usage, usage);
  const recent = readStore(STORAGE_KEYS.recent, []).filter(item => item.id !== id);
  recent.unshift({ id, timestamp:Date.now() });
  writeStore(STORAGE_KEYS.recent, recent.slice(0, 5));
  renderUtilityPanel();
}

function formatRelativeTime(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp));
  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
}

function routeTo(pageId, options = {}) {
  const target = PAGES[pageId] ? pageId : 'home';
  const hash = `#${target}`;
  if (window.location.hash !== hash) {
    if (options.replace) history.replaceState({ page:target }, '', hash);
    else history.pushState({ page:target }, '', hash);
  }
  renderRoute(target);
  if (options.track !== false && target !== 'home') recordUse(target);
}

function renderRoute(pageId) {
  const isValidRoute = Boolean(PAGES[pageId]);
  const target = isValidRoute ? pageId : 'home';
  if (!isValidRoute && window.location.hash !== '#home') {
    history.replaceState({ page:'home' }, '', '#home');
  }
  currentPage = target;
  document.querySelectorAll('.nav-item[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === target));
  document.getElementById('breadcrumb-current').textContent = PAGES[target].title;
  document.getElementById('app-shell').classList.toggle('tool-route', target !== 'home');
  document.body.dataset.route = target;
  PAGES[target].render();
  closeMobileSidebar();
  const container = document.getElementById('page-container');
  container.scrollTop = 0;
  container.focus({ preventScroll:true });
}

function navigateToTool(pageId) { routeTo(pageId); }
window.navigate = navigateToTool;
window.navigateToTool = navigateToTool;

function toolHref(tool) { return tool.url || `#${tool.id}`; }

function renderToolCard(tool) {
  const favorite = getFavorites().includes(tool.id);
  const attributes = tool.url
    ? `href="${tool.url}" target="_blank" rel="noopener noreferrer" data-external-id="${tool.id}"`
    : `href="#${tool.id}" data-page="${tool.id}"`;
  return `
    <article class="tool-card tool-card--${tool.tone}">
      <button class="favorite-button${favorite ? ' is-favorite' : ''}" type="button" data-favorite-id="${tool.id}" aria-label="${favorite ? 'นำออกจาก' : 'เพิ่มใน'}รายการโปรด: ${tool.title}" aria-pressed="${favorite}">★</button>
      <a class="tool-card-link" ${attributes}>
        <span class="card-icon">${iconSvg(tool)}</span>
        <span class="card-copy"><strong class="card-title">${tool.title}</strong><small class="card-desc">${tool.thai}</small></span>
        ${tool.badge ? `<span class="card-badge card-badge--${tool.badge.toLowerCase()}">${tool.badge}</span>` : '<span class="external-card-icon">↗</span>'}
        <span class="card-arrow" aria-hidden="true">→</span>
      </a>
    </article>`;
}

function renderHome() {
  const groups = ['PDF Tools', 'Image Tools', 'Data Tools', 'HR / Office', 'General Tools', 'Admin'];
  const groupClasses = {
    'PDF Tools':'pdf', 'Image Tools':'image', 'Data Tools':'data',
    'HR / Office':'office', 'General Tools':'general', 'Admin':'admin'
  };
  const groupMeta = {
    'PDF Tools': ['เครื่องมือ PDF', 'จัดการเอกสาร PDF ครบทุกขั้นตอน', 'red'],
    'General Tools': ['เครื่องมือทั่วไป', 'งานเอกสารประจำวัน', 'violet'],
    'Image Tools': ['เครื่องมือรูปภาพ', 'จัดการรูปภาพและอ่านข้อความ', 'green'],
    'Data Tools': ['เครื่องมือข้อมูล', 'จัดระเบียบข้อมูลและไฟล์ CSV', 'blue'],
    'HR / Office': ['HR และสำนักงาน', 'เชื่อมต่อระบบงานภายใน', 'orange'],
    'Admin': ['ระบบผู้ดูแล', 'เข้าถึงระบบจัดการข้อมูล', 'slate']
  };
  document.getElementById('page-container').innerHTML = `
    <div class="dashboard-page">
      <section class="hero-panel">
        <div class="hero-content">
          <span class="hero-kicker"><span></span>YOUR FILE WORKSPACE</span>
          <h1>👋 ยินดีต้อนรับ, Beam</h1>
          <p>จัดการไฟล์ PDF รูปภาพ และข้อมูลทั้งหมดได้จากหน้าจอเดียว<br/>รวดเร็ว ปลอดภัย และประมวลผลบนเครื่องของคุณ</p>
          <div class="quick-action-wrap">
            <button class="quick-action-button" id="quick-action-button" type="button" aria-haspopup="menu" aria-expanded="false"><span class="quick-action-plus">＋</span><span class="quick-action-label">เริ่มใช้งาน</span><span class="chevron">⌄</span></button>
            <div class="quick-action-menu" id="quick-action-menu" role="menu" hidden>
              ${['merge','pdf','compress','convert','ocr','qr'].map(id => {
                const tool = TOOL_MAP.get(id);
                return `<button type="button" role="menuitem" data-page="${id}"><span class="mini-icon mini-icon--${tool.tone}">${iconSvg(tool)}</span><span><strong>${tool.title}</strong><small>${tool.thai}</small></span></button>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="hero-illustration" aria-hidden="true">
          <span class="orbit-dot orbit-dot--one"></span><span class="orbit-dot orbit-dot--two"></span><span class="orbit-dot orbit-dot--three"></span>
          <div class="file-sheet"><span></span><span></span><b>PDF</b></div>
          <div class="folder"><div class="folder-tab"></div><div class="folder-front"></div></div>
          <span class="floating-file floating-file--image">◇</span><span class="floating-file floating-file--data">▥</span><span class="floating-file floating-file--lock">⌑</span>
        </div>
      </section>
      <div class="dashboard-sections">
        ${groups.map(group => {
          const [label, desc, tone] = groupMeta[group];
          const items = TOOL_DATA.filter(tool => tool.group === group);
          return `<section class="tool-section tool-section--${groupClasses[group]}">
            <div class="section-heading"><div><span class="section-icon section-icon--${tone}">${group === 'PDF Tools' ? '▱' : group === 'Image Tools' ? '▧' : group === 'Data Tools' ? '▤' : group === 'General Tools' ? '◷' : group === 'Admin' ? '⌘' : '♢'}</span><span><h2>${label}</h2><p>${desc}</p></span></div><span class="section-count">${items.length} เครื่องมือ</span></div>
            <div class="tool-grid">${items.map(renderToolCard).join('')}</div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
}

function utilityItem(tool, suffix = '') {
  const attrs = tool.url
    ? `href="${tool.url}" target="_blank" rel="noopener noreferrer" data-external-id="${tool.id}"`
    : `href="#${tool.id}" data-page="${tool.id}"`;
  return `<a class="utility-item" ${attrs}><span class="mini-icon mini-icon--${tool.tone}">${iconSvg(tool)}</span><span><strong>${tool.title}</strong>${suffix ? `<small>${suffix}</small>` : `<small>${tool.thai}</small>`}</span><span class="utility-arrow">${tool.url ? '↗' : '›'}</span></a>`;
}

function renderUtilityPanel() {
  const favorites = getFavorites().map(id => TOOL_MAP.get(id)).filter(Boolean).slice(0, 5);
  const recent = readStore(STORAGE_KEYS.recent, []).map(item => ({ ...item, tool:TOOL_MAP.get(item.id) })).filter(item => item.tool).slice(0, 5);
  const usage = readStore(STORAGE_KEYS.usage, {});
  const frequent = Object.entries(usage).filter(([id, count]) => TOOL_MAP.has(id) && Number(count) > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const empty = text => `<div class="empty-state"><span>◇</span><p>${text}</p></div>`;
  document.getElementById('favorites-list').innerHTML = favorites.length ? favorites.map(tool => utilityItem(tool)).join('') : empty('ยังไม่มีรายการโปรด');
  document.getElementById('recent-list').innerHTML = recent.length ? recent.map(item => utilityItem(item.tool, formatRelativeTime(item.timestamp))).join('') : empty('ยังไม่มีประวัติการใช้งาน');
  document.getElementById('frequent-list').innerHTML = frequent.length ? frequent.map(([id, count]) => utilityItem(TOOL_MAP.get(id), `เปิดใช้งาน ${count} ครั้ง`)).join('') : empty('ยังไม่มีเครื่องมือที่ใช้บ่อย');
  document.getElementById('clear-recent').disabled = !recent.length;
}

function renderSearchResults(query) {
  const resultBox = document.getElementById('search-results');
  const input = document.getElementById('tool-search');
  const normalized = query.trim().toLocaleLowerCase('th');
  if (!normalized) {
    resultBox.hidden = true;
    resultBox.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    selectedSearchIndex = -1;
    return;
  }
  const matches = TOOL_DATA.filter(tool => `${tool.title} ${tool.thai} ${tool.desc} ${tool.group}`.toLocaleLowerCase('th').includes(normalized));
  resultBox.innerHTML = matches.length
    ? matches.map((tool, index) => `<a class="search-result" role="option" aria-selected="false" data-search-index="${index}" ${tool.url ? `href="${tool.url}" target="_blank" rel="noopener noreferrer" data-external-id="${tool.id}"` : `href="#${tool.id}" data-page="${tool.id}"`}><span class="mini-icon mini-icon--${tool.tone}">${iconSvg(tool)}</span><span><strong>${tool.title}</strong><small>${tool.thai} · ${tool.group}</small></span><span>${tool.url ? '↗' : '›'}</span></a>`).join('')
    : '<div class="search-empty">ไม่พบเครื่องมือที่ค้นหา</div>';
  resultBox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  selectedSearchIndex = -1;
}

function updateSearchSelection(index) {
  const options = [...document.querySelectorAll('.search-result')];
  if (!options.length) return;
  selectedSearchIndex = (index + options.length) % options.length;
  options.forEach((option, i) => {
    const active = i === selectedSearchIndex;
    option.classList.toggle('is-selected', active);
    option.setAttribute('aria-selected', String(active));
  });
  options[selectedSearchIndex].scrollIntoView({ block:'nearest' });
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('open');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const button = document.getElementById('menu-toggle');
  if (window.matchMedia('(max-width: 767px)').matches) {
    const open = sidebar.classList.toggle('open');
    document.getElementById('drawer-backdrop').classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  } else {
    const shell = document.getElementById('app-shell');
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    writeStore(STORAGE_KEYS.sidebar, collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
  }
}

function initModalAccessibility() {
  const overlay = document.getElementById('modal-overlay');
  let previousFocus = null;
  const syncModal = () => {
    const open = overlay.classList.contains('open');
    overlay.setAttribute('aria-hidden', String(!open));
    if (open) {
      previousFocus = document.activeElement;
      requestAnimationFrame(() => document.getElementById('modal-cancel').focus());
    } else if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  new MutationObserver(syncModal).observe(overlay, { attributes:true, attributeFilter:['class'] });
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => { closeModal(); PdfPrint.executePrint(); });
  overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') { closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.openPrintModal = function() { PdfPrint.openConfirm(); };
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function initEvents() {
  document.addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite-id]');
    if (favorite) { event.preventDefault(); event.stopPropagation(); toggleFavorite(favorite.dataset.favoriteId); return; }

    const routeLink = event.target.closest('[data-page]');
    if (routeLink && !routeLink.closest('#search-results[hidden]')) {
      event.preventDefault();
      routeTo(routeLink.dataset.page);
      renderSearchResults('');
      document.getElementById('tool-search').value = '';
      return;
    }

    const external = event.target.closest('[data-external-id]');
    if (external) recordUse(external.dataset.externalId);

    const quickButton = event.target.closest('#quick-action-button');
    if (quickButton) {
      const menu = document.getElementById('quick-action-menu');
      const open = menu.hidden;
      menu.hidden = !open;
      quickButton.setAttribute('aria-expanded', String(open));
      quickButton.closest('.hero-panel')?.classList.toggle('is-quick-menu-open', open);
      return;
    }

    if (!event.target.closest('.quick-action-wrap')) {
      const menu = document.getElementById('quick-action-menu');
      const button = document.getElementById('quick-action-button');
      if (menu) menu.hidden = true;
      if (button) {
        button.setAttribute('aria-expanded', 'false');
        button.closest('.hero-panel')?.classList.remove('is-quick-menu-open');
      }
    }

    const profileButton = event.target.closest('#profile-button');
    if (profileButton) {
      const menu = document.getElementById('profile-menu');
      const open = menu.hidden;
      menu.hidden = !open;
      profileButton.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!event.target.closest('.profile-wrap')) {
      document.getElementById('profile-menu').hidden = true;
      document.getElementById('profile-button').setAttribute('aria-expanded', 'false');
    }
  });

  document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeMobileSidebar);
  document.getElementById('drawer-backdrop').addEventListener('click', closeMobileSidebar);
  document.getElementById('logout-button').addEventListener('click', () => window.ToolboxAuth.logout());
  document.getElementById('clear-recent').addEventListener('click', () => { writeStore(STORAGE_KEYS.recent, []); renderUtilityPanel(); });

  const search = document.getElementById('tool-search');
  search.addEventListener('input', () => renderSearchResults(search.value));
  search.addEventListener('keydown', event => {
    const count = document.querySelectorAll('.search-result').length;
    if (event.key === 'ArrowDown' && count) { event.preventDefault(); updateSearchSelection(selectedSearchIndex + 1); }
    else if (event.key === 'ArrowUp' && count) { event.preventDefault(); updateSearchSelection(selectedSearchIndex - 1); }
    else if (event.key === 'Enter' && selectedSearchIndex >= 0) { event.preventDefault(); document.querySelectorAll('.search-result')[selectedSearchIndex].click(); }
    else if (event.key === 'Escape') { renderSearchResults(''); search.blur(); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); search.select(); }
  });
  window.addEventListener('popstate', () => renderRoute(window.location.hash.slice(1)));
  window.addEventListener('hashchange', () => {
    const target = window.location.hash.slice(1);
    if (target !== currentPage) renderRoute(target);
  });
}

(function init() {
  initEvents();
  initModalAccessibility();
  renderUtilityPanel();
  const collapsed = readStore(STORAGE_KEYS.sidebar, false) === true;
  document.getElementById('app-shell').classList.toggle('sidebar-collapsed', collapsed);
  document.getElementById('menu-toggle').setAttribute('aria-expanded', String(!collapsed));
  const initial = window.location.hash.slice(1);
  routeTo(PAGES[initial] ? initial : 'home', { replace:true, track:false });
})();

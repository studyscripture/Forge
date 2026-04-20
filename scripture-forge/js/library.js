/* ============================================================
   library.js — Scripture Library reader (all 3 corpora)
   ============================================================ */
let readerState = { corpus:'bible', book:null, chapter:1, testament:'OT', readerTrans:'Yusuf Ali' };
let otCollapsed = false, ntCollapsed = false;

function initLibrary() {
  populateBibleBooks();
  populateQuranSurahs();
  populateGitaChapters();
}

function refreshLibrarySidebar(corpusId) {
  if (corpusId === 'quran') populateQuranSurahs();
  if (corpusId === 'hindu') populateGitaChapters();
}

/* ── Bible ── */
function populateBibleBooks() {
  const otEl = document.getElementById('ot-books');
  const ntEl = document.getElementById('nt-books');
  if (!otEl || !ntEl) return;
  otEl.innerHTML = OT_BOOKS.filter(b => getChapters('bible',b).length > 0)
    .map(b => `<button class="book-btn" data-book="${escA(b)}" onclick="selectBook('bible','${escA(b)}','OT')">${escHtml(b)}</button>`).join('');
  ntEl.innerHTML = NT_BOOKS.filter(b => getChapters('bible',b).length > 0)
    .map(b => `<button class="book-btn" data-book="${escA(b)}" onclick="selectBook('bible','${escA(b)}','NT')">${escHtml(b)}</button>`).join('');
}

/* ── Quran ── */
function populateQuranSurahs() {
  const el = document.getElementById('quran-surahs');
  if (!el) return;
  const books = getBooks('quran');
  if (!books.length) { el.innerHTML = '<div style="padding:8px 16px;font-size:13px;color:var(--text-3)">Enable Qurʾān in header to load</div>'; return; }
  el.innerHTML = books.map(b => `<button class="book-btn" data-book="${escA(b)}" onclick="selectBook('quran','${escA(b)}','quran')">${escHtml(b)}</button>`).join('');
}

/* ── Gita ── */
function populateGitaChapters() {
  const el = document.getElementById('gita-chapters');
  if (!el) return;
  const books = getBooks('hindu');
  if (!books.length) { el.innerHTML = '<div style="padding:8px 16px;font-size:13px;color:var(--text-3)">Enable Bhagavad Gīta in header to load</div>'; return; }
  el.innerHTML = books.map(b => `<button class="book-btn" data-book="${escA(b)}" onclick="selectBook('hindu','${escA(b)}','hindu')">${escHtml(b)}</button>`).join('');
}

function toggleTestament(which) {
  if (which === 'OT') {
    otCollapsed = !otCollapsed;
    document.getElementById('ot-books').style.display = otCollapsed ? 'none' : '';
    document.getElementById('ot-toggle').textContent = otCollapsed ? '▸' : '▾';
  } else {
    ntCollapsed = !ntCollapsed;
    document.getElementById('nt-books').style.display = ntCollapsed ? 'none' : '';
    document.getElementById('nt-toggle').textContent = ntCollapsed ? '▸' : '▾';
  }
}

function selectBook(corpus, book, testament) {
  readerState = { ...readerState, corpus, book, testament, chapter:1 };

  // Highlight active button
  document.querySelectorAll('.book-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.book-btn[data-book="${escA(book)}"]`).forEach(b => b.classList.add('active'));

  document.getElementById('reader-empty').classList.add('hidden');
  document.getElementById('reader-content').classList.remove('hidden');

  // Quran bar visibility
  const quranBar = document.getElementById('reader-quran-bar');
  quranBar.classList.toggle('hidden', corpus !== 'quran');

  // Populate chapter select
  const chapters = getChapters(corpus, book);
  const chapSel = document.getElementById('reader-chapter-select');
  chapSel.innerHTML = chapters.map(c => `<option value="${c}">Chapter ${c}</option>`).join('');
  chapSel.value = 1;

  loadChapter(chapters[0] || 1);
}

function loadChapter(chNum) {
  readerState.chapter = chNum;
  const chSel = document.getElementById('reader-chapter-select');
  if (chSel) chSel.value = chNum;

  const { corpus, book } = readerState;
  document.getElementById('reader-title').textContent = `${book} — Ch. ${chNum}`;

  const verses = getVerses(corpus, book, chNum);
  const container = document.getElementById('reader-verses');

  if (corpus === 'quran' && readerState.readerTrans === 'all') {
    container.innerHTML = verses.map(v => `
      <div class="reader-verse-multi" onclick="openVerseModal('${encodeURIComponent(JSON.stringify({r:v.r,b:v.b,c:v.c,vn:v.v,t:v.t,corpus:'quran',translations:v.translations}))}')">
        <div class="rvm-header">
          <span class="rvm-num">${v.v}</span>
          <span class="rvm-ref">${escHtml(v.r)}</span>
        </div>
        ${Object.entries(v.translations||{}).map(([name,text]) => `
          <div class="rvm-row">
            <span class="rvm-tname">${escHtml(name)}</span>
            <span class="rvm-text">${escHtml(text)}</span>
          </div>`).join('')}
      </div>
    `).join('');
  } else {
    container.innerHTML = verses.map(v => {
      const text = corpus === 'quran' ? getQuranText(v, readerState.readerTrans) : v.t;
      return `<div class="reader-verse-line" onclick="openVerseModal('${encodeURIComponent(JSON.stringify({r:v.r,b:v.b,c:v.c,vn:v.v,t:text,corpus,translations:v.translations||null}))}')">
        <span class="reader-verse-num">${v.v}</span>
        <span class="reader-verse-text">${escHtml(text)}</span>
      </div>`;
    }).join('');
  }
  container.scrollTop = 0;
}

function setReaderTrans(trans, btn) {
  readerState.readerTrans = trans;
  document.querySelectorAll('.trans-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadChapter(readerState.chapter);
}

function prevChapter() {
  const chapters = getChapters(readerState.corpus, readerState.book);
  const idx = chapters.indexOf(readerState.chapter);
  if (idx > 0) {
    loadChapter(chapters[idx-1]);
    document.getElementById('reader-chapter-select').value = chapters[idx-1];
  } else {
    // Go to prev book
    const books = getBooks(readerState.corpus);
    const bi = books.indexOf(readerState.book);
    if (bi > 0) {
      selectBook(readerState.corpus, books[bi-1], readerState.testament);
      const newChaps = getChapters(readerState.corpus, books[bi-1]);
      loadChapter(newChaps[newChaps.length-1]);
    }
  }
}

function nextChapter() {
  const chapters = getChapters(readerState.corpus, readerState.book);
  const idx = chapters.indexOf(readerState.chapter);
  if (idx < chapters.length-1) {
    loadChapter(chapters[idx+1]);
    document.getElementById('reader-chapter-select').value = chapters[idx+1];
  } else {
    const books = getBooks(readerState.corpus);
    const bi = books.indexOf(readerState.book);
    if (bi < books.length-1) selectBook(readerState.corpus, books[bi+1], readerState.testament);
  }
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escA(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/* ============================================================
   parallel.js — Side-by-side parallel viewer (all 3 corpora)
   ============================================================ */
let parallelState = {
  a: { corpus:'bible', book:null, chapter:null, verseStart:1, verseEnd:10 },
  b: { corpus:'quran', book:null, chapter:null, verseStart:1, verseEnd:7 },
};

function initParallel() {
  populateParallelBookSelect('a');
  populateParallelBookSelect('b');
  updateParallelChapters('a');
  updateParallelChapters('b');
}

function onParCorpusChange(side) {
  const corpus = document.getElementById(`par-corpus-${side}`).value;
  parallelState[side].corpus = corpus;
  populateParallelBookSelect(side);
  updateParallelChapters(side);
  // Update pane header color
  const tradEl = document.getElementById(`pane-${side}-trad`);
  if (tradEl) {
    tradEl.textContent = CORPORA[corpus].label;
    tradEl.className = `pane-tradition ${corpus}-color`;
  }
}

function populateParallelBookSelect(side) {
  const corpus = document.getElementById(`par-corpus-${side}`).value;
  parallelState[side].corpus = corpus;
  const books = getBooks(corpus);
  const sel = document.getElementById(`par-book-${side}`);
  sel.innerHTML = books.map(b => `<option value="${escA(b)}">${escHtml(b)}</option>`).join('');
  if (books[0]) sel.value = books[0];
}

function updateParallelChapters(side) {
  const corpus = document.getElementById(`par-corpus-${side}`).value;
  const book = document.getElementById(`par-book-${side}`).value;
  parallelState[side].corpus = corpus;
  parallelState[side].book = book;

  const chapters = getChapters(corpus, book);
  const chSel = document.getElementById(`par-chap-${side}`);
  chSel.innerHTML = chapters.map(c => `<option value="${c}">Ch. ${c}</option>`).join('');
  if (chapters[0]) { chSel.value = chapters[0]; parallelState[side].chapter = chapters[0]; }
  updateParallelVerses(side);
}

function updateParallelVerses(side) {
  const corpus = document.getElementById(`par-corpus-${side}`).value;
  const book = document.getElementById(`par-book-${side}`).value;
  const chapter = parseInt(document.getElementById(`par-chap-${side}`).value);
  parallelState[side] = { ...parallelState[side], corpus, book, chapter };

  const verses = getVerses(corpus, book, chapter);
  const count = verses.length;
  const startSel = document.getElementById(`par-verse-start-${side}`);
  const endSel = document.getElementById(`par-verse-end-${side}`);
  startSel.innerHTML = verses.map(v => `<option value="${v.v}">${v.v}</option>`).join('');
  endSel.innerHTML = verses.map(v => `<option value="${v.v}">${v.v}</option>`).join('');
  startSel.value = verses[0]?.v || 1;
  endSel.value = verses[Math.min(count - 1, 14)]?.v || count;
  updateParallel();
}

function updateParallel() {
  for (const side of ['a','b']) {
    const corpus = document.getElementById(`par-corpus-${side}`).value;
    const book = document.getElementById(`par-book-${side}`).value;
    const chapter = parseInt(document.getElementById(`par-chap-${side}`).value);
    const vs = parseInt(document.getElementById(`par-verse-start-${side}`).value);
    const ve = parseInt(document.getElementById(`par-verse-end-${side}`).value);
    parallelState[side] = { corpus, book, chapter, verseStart:vs, verseEnd:ve };
    renderPane(side);
  }
}

function renderPane(side) {
  const { corpus, book, chapter, verseStart, verseEnd } = parallelState[side];
  const quranTrans = document.getElementById('par-quran-trans').value;

  const refEl = document.getElementById(`pane-${side}-ref`);
  const tradEl = document.getElementById(`pane-${side}-trad`);
  if (refEl) refEl.textContent = book ? `${book} ${chapter}:${verseStart}–${verseEnd}` : '';
  if (tradEl) {
    tradEl.textContent = CORPORA[corpus]?.label || corpus;
    tradEl.className = `pane-tradition ${corpus}-color`;
  }

  const versesEl = document.getElementById(`pane-${side}-verses`);
  if (!versesEl || !book) { if(versesEl) versesEl.innerHTML = '<div style="color:var(--text-3);padding:16px">Select a passage above.</div>'; return; }

  const allVerses = getVerses(corpus, book, chapter);
  const slice = allVerses.filter(v => v.v >= verseStart && v.v <= verseEnd);
  if (!slice.length) { versesEl.innerHTML = '<div style="color:var(--text-3);padding:16px">No verses in range.</div>'; return; }

  versesEl.innerHTML = slice.map(v => {
    const text = corpus === 'quran' ? getQuranText(v, quranTrans) : v.t;
    return `<div class="verse-line">
      <span class="verse-num">${v.v}</span>
      <span class="verse-body">${escHtml(text)}</span>
    </div>`;
  }).join('');
}

async function runAIComparison() {
  const panel = document.getElementById('parallel-ai-panel');
  const textEl = document.getElementById('parallel-ai-text');
  panel.classList.remove('hidden');
  textEl.innerHTML = '<div class="ai-loading"><span></span><span></span><span></span></div> Generating comparative analysis…';

  const quranTrans = document.getElementById('par-quran-trans').value;
  const parts = [];

  for (const side of ['a','b']) {
    const { corpus, book, chapter, verseStart, verseEnd } = parallelState[side];
    const verses = getVerses(corpus, book, chapter).filter(v => v.v >= verseStart && v.v <= verseEnd);
    const textBlock = verses.map(v => {
      const text = corpus === 'quran' ? getQuranText(v, quranTrans) : v.t;
      return `[${v.r}] ${text}`;
    }).join('\n');
    parts.push({ label: `${CORPORA[corpus]?.label} — ${book} ${chapter}:${verseStart}–${verseEnd}`, text: textBlock });
  }

  const prompt = `You are a scholarly comparative religion analyst. Compare these two scripture passages side by side.

PASSAGE A (${parts[0].label}):
${parts[0].text}

PASSAGE B (${parts[1].label}):
${parts[1].text}

Write a concise academic comparative analysis (5–7 sentences): shared themes, theological resonances, key distinctions, intertextual echoes, and scholarly significance. Be precise and objective.`;

  try {
    const result = await callAI(prompt, 750);
    textEl.textContent = result;
  } catch(e) {
    textEl.textContent = 'AI comparison unavailable. Check your connection.';
  }
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escA(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

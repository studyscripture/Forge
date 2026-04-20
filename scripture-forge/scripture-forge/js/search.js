/* ============================================================
   search.js — Keyword + AI semantic search, compare & grid views
   ============================================================ */
let searchMode = 'keyword';
let currentResults = {}; // { bible:[], quran:[], hindu:[] }
let currentQuery = '';
let currentLayout = 'compare';
let infiniteOffset = {};
let infiniteObserver = null;
let isInfiniteMode = false;

function setSearchMode(mode) {
  searchMode = mode;
  document.getElementById('mode-keyword').classList.toggle('active', mode === 'keyword');
  document.getElementById('mode-semantic').classList.toggle('active', mode === 'semantic');
}

function quickSearch(q) {
  document.getElementById('search-input').value = q;
  executeSearch();
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  currentResults = {}; currentQuery = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('compare-columns').innerHTML = '';
  document.getElementById('results-count').textContent = '';
  document.getElementById('search-empty').classList.add('hidden');
  document.getElementById('search-hint').classList.remove('hidden');
  document.getElementById('semantic-summary-panel').classList.add('hidden');
  document.getElementById('compare-view').classList.add('hidden');
  document.getElementById('grid-view').classList.add('hidden');
  if (infiniteObserver) { infiniteObserver.disconnect(); infiniteObserver = null; }
}

function applyLayout() {
  currentLayout = document.getElementById('filter-layout').value;
  if (currentQuery) renderAllResults();
}

function applyFilters() {
  if (currentQuery) renderAllResults();
}

/* ─── MAIN SEARCH ENTRY ─── */
async function executeSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  currentQuery = query;

  document.getElementById('search-hint').classList.add('hidden');
  document.getElementById('search-empty').classList.add('hidden');
  document.getElementById('semantic-summary-panel').classList.add('hidden');
  document.getElementById('compare-view').classList.add('hidden');
  document.getElementById('grid-view').classList.add('hidden');
  document.getElementById('results-count').textContent = 'Searching…';
  if (infiniteObserver) { infiniteObserver.disconnect(); infiniteObserver = null; }

  if (searchMode === 'semantic') {
    await semanticSearch(query);
  } else {
    keywordSearch(query);
  }
}

/* ─── KEYWORD SEARCH ─── */
function keywordSearch(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const quranTrans = document.getElementById('filter-quran-trans').value;
  currentResults = {};

  for (const cid of activeCorpora) {
    const corpus = CORPORA[cid];
    if (!corpus || !corpus.loaded) continue;
    const scored = [];
    for (const v of corpus.verses) {
      const searchText = cid === 'quran'
        ? Object.values(v.translations || {}).join(' ').toLowerCase()
        : v.t.toLowerCase();
      let score = 0; let allMatch = true;
      for (const term of terms) {
        const count = (searchText.match(new RegExp(escapeRegex(term), 'g')) || []).length;
        if (count === 0) { allMatch = false; break; }
        score += count;
      }
      if (terms.length > 1 && searchText.includes(query.toLowerCase())) score += 5;
      if (allMatch) scored.push({...v, corpus: cid, score});
    }
    scored.sort((a,b) => b.score - a.score);
    currentResults[cid] = scored;
  }

  renderAllResults();

  const totalCount = Object.values(currentResults).reduce((s,a) => s + a.length, 0);
  if (totalCount === 0) {
    document.getElementById('search-empty').classList.remove('hidden');
    document.getElementById('results-count').textContent = '0 results';
  }
}

/* ─── AI SEMANTIC SEARCH ─── */
async function semanticSearch(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const quranTrans = document.getElementById('filter-quran-trans').value;
  currentResults = {};

  for (const cid of activeCorpora) {
    const corpus = CORPORA[cid];
    if (!corpus || !corpus.loaded) continue;
    const candidates = corpus.verses.filter(v => {
      const text = cid === 'quran'
        ? Object.values(v.translations || {}).join(' ').toLowerCase()
        : v.t.toLowerCase();
      return terms.some(t => text.includes(t));
    });
    currentResults[cid] = candidates.map(v => ({...v, corpus: cid}));
  }

  renderAllResults();

  // AI summary
  const panel = document.getElementById('semantic-summary-panel');
  const textEl = document.getElementById('semantic-summary-text');
  panel.classList.remove('hidden');
  textEl.innerHTML = '<div class="ai-loading"><span></span><span></span><span></span></div> Analyzing theme across traditions…';

  const activeList = [...activeCorpora].map(c => CORPORA[c].label).join(', ');
  const samples = [];
  for (const [cid, verses] of Object.entries(currentResults)) {
    const slice = verses.slice(0, 10);
    const label = CORPORA[cid].label;
    for (const v of slice) {
      const text = cid === 'quran' ? getQuranText(v, document.getElementById('filter-quran-trans').value) : v.t;
      samples.push(`[${label} — ${v.r}] ${text}`);
    }
  }

  const prompt = `You are a scholarly comparative religion analyst. The user searched for: "${query}" across: ${activeList}.

Sample matching passages:
${samples.slice(0,30).join('\n')}

Write a concise academic thematic analysis (4–6 sentences) of how this theme appears across the selected scripture(s). Note theological resonances, distinctions, and comparative significance. Be precise and academic.`;

  try {
    const summary = await callAI(prompt, 600);
    textEl.textContent = summary;
  } catch(e) {
    textEl.textContent = 'AI analysis unavailable. Showing keyword results.';
  }

  const total = Object.values(currentResults).reduce((s,a) => s + a.length, 0);
  document.getElementById('results-count').textContent = `${total.toLocaleString()} passages matched across traditions`;
}

/* ─── RENDER DISPATCHER ─── */
function renderAllResults() {
  currentLayout = document.getElementById('filter-layout').value;
  isInfiniteMode = document.getElementById('filter-limit').value === 'infinite';

  document.getElementById('compare-view').classList.toggle('hidden', currentLayout !== 'compare');
  document.getElementById('grid-view').classList.toggle('hidden', currentLayout !== 'grid');

  if (currentLayout === 'compare') {
    renderCompareLayout();
  } else {
    renderGridLayout();
  }
}

/* ─── TRADITION COMPARE LAYOUT ─── */
function renderCompareLayout() {
  const cols = document.getElementById('compare-columns');
  const activeCids = [...activeCorpora].filter(c => CORPORA[c].loaded);
  cols.className = `compare-columns cols-${activeCids.length}`;
  cols.innerHTML = '';

  const limit = isInfiniteMode ? Infinity : (parseInt(document.getElementById('filter-limit').value) || 100);
  const testament = document.getElementById('filter-testament').value;
  const quranTrans = document.getElementById('filter-quran-trans').value;

  let totalShown = 0;

  for (const cid of activeCids) {
    const verses = (currentResults[cid] || []).filter(v => {
      if (cid === 'bible' && testament !== 'all') return bookTestamentMap[v.b] === testament;
      return true;
    });
    const slice = isInfiniteMode ? verses : verses.slice(0, limit);
    totalShown += slice.length;

    const col = document.createElement('div');
    col.className = `compare-col`;
    col.innerHTML = `
      <div class="compare-col-header ${cid}-header">
        <span class="compare-col-trad ${cid}">${CORPORA[cid].label}</span>
        <span class="compare-col-count">${verses.length.toLocaleString()} results${slice.length < verses.length ? ` · showing ${slice.length}` : ''}</span>
      </div>
      <div class="compare-col-body" id="compare-body-${cid}"></div>
    `;
    cols.appendChild(col);

    const body = col.querySelector(`#compare-body-${cid}`);
    infiniteOffset[cid] = 0;
    appendCompareItems(body, cid, slice, quranTrans);

    if (isInfiniteMode) setupInfiniteForColumn(body, cid, verses, quranTrans);
  }

  const total = Object.values(currentResults).reduce((s,a) => s + a.length, 0);
  document.getElementById('results-count').textContent =
    `${total.toLocaleString()} total results across ${activeCids.length} tradition${activeCids.length !== 1 ? 's' : ''}`;
}

function appendCompareItems(container, cid, verses, quranTrans) {
  const frag = document.createDocumentFragment();
  for (const v of verses) {
    const text = cid === 'quran' ? getQuranText(v, quranTrans) : v.t;
    const div = document.createElement('div');
    div.className = `compare-verse-item ${cid}`;
    div.innerHTML = `
      <div class="cvi-ref">${escHtml(v.r)}</div>
      <div class="cvi-text">${highlightText(text, currentQuery)}</div>
    `;
    div.onclick = () => openVerseModal(encodeURIComponent(JSON.stringify({r:v.r,b:v.b,c:v.c,vn:v.v,t:text,corpus:cid,translations:v.translations||null})));
    frag.appendChild(div);
  }
  container.appendChild(frag);
}

function setupInfiniteForColumn(container, cid, allVerses, quranTrans) {
  const CHUNK = 50;
  let offset = 0;

  const sentinel = document.createElement('div');
  sentinel.style.height = '20px';
  container.appendChild(sentinel);

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      offset += CHUNK;
      if (offset >= allVerses.length) { obs.disconnect(); sentinel.remove(); return; }
      appendCompareItems(container, cid, allVerses.slice(offset, offset + CHUNK), quranTrans);
      container.appendChild(sentinel);
    }
  }, { rootMargin: '200px' });
  obs.observe(sentinel);
}

/* ─── CARD GRID LAYOUT ─── */
function renderGridLayout() {
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  if (infiniteObserver) { infiniteObserver.disconnect(); infiniteObserver = null; }

  const testament = document.getElementById('filter-testament').value;
  const quranTrans = document.getElementById('filter-quran-trans').value;
  const limit = parseInt(document.getElementById('filter-limit').value) || 100;

  const allVerses = [];
  for (const cid of activeCorpora) {
    const verses = (currentResults[cid] || []).filter(v => {
      if (cid === 'bible' && testament !== 'all') return bookTestamentMap[v.b] === testament;
      return true;
    });
    verses.forEach(v => allVerses.push({...v, corpus:cid}));
  }
  // Interleave by score
  allVerses.sort((a,b) => (b.score||0) - (a.score||0));

  const slice = isInfiniteMode ? allVerses.slice(0, 100) : allVerses.slice(0, limit);
  renderGridChunk(container, slice, quranTrans);

  const total = allVerses.length;
  document.getElementById('results-count').textContent = `${total.toLocaleString()} results${!isInfiniteMode && slice.length < total ? ` · showing ${slice.length}` : ''}`;

  if (isInfiniteMode) {
    let offset = slice.length;
    const sentinel = document.getElementById('infinite-sentinel');
    infiniteObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && offset < allVerses.length) {
        const next = allVerses.slice(offset, offset + 50);
        renderGridChunk(container, next, quranTrans);
        offset += 50;
        if (offset >= allVerses.length) { infiniteObserver.disconnect(); }
      }
    }, { rootMargin: '400px' });
    infiniteObserver.observe(sentinel);
  }
}

function renderGridChunk(container, verses, quranTrans) {
  const frag = document.createDocumentFragment();
  for (const v of verses) {
    const text = v.corpus === 'quran' ? getQuranText(v, quranTrans) : v.t;
    const div = document.createElement('div');
    div.className = `verse-card ${v.corpus}`;
    div.innerHTML = `
      <div class="card-tradition ${v.corpus}">${CORPORA[v.corpus]?.shortLabel || v.corpus}</div>
      <div class="card-ref">${escHtml(v.r)}</div>
      <div class="card-text">${highlightText(text, currentQuery)}</div>
    `;
    div.onclick = () => openVerseModal(encodeURIComponent(JSON.stringify({r:v.r,b:v.b,c:v.c,vn:v.v,t:text,corpus:v.corpus,translations:v.translations||null})));
    frag.appendChild(div);
  }
  container.appendChild(frag);
}

/* ─── HELPERS ─── */
function highlightText(text, query) {
  if (!query) return escHtml(text);
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  let result = escHtml(text);
  for (const word of words) {
    result = result.replace(new RegExp(`(${escapeRegex(word)})`, 'gi'), '<em>$1</em>');
  }
  return result;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('search-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') executeSearch(); });
});

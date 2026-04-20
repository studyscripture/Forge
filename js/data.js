/* ============================================================
   data.js — Corpus registry and data loading
   ============================================================ */
const CORPORA = {
  bible: { id:'bible', label:'Bible (BSB)', shortLabel:'BSB', color:'bible', file:'data/bsb.json', loaded:false, verses:[], testament:true },
  quran: { id:'quran', label:'Qurʾān', shortLabel:'Qurʾān', color:'quran', file:'data/quran.json', loaded:false, verses:[], testament:false },
  hindu: { id:'hindu', label:'Bhagavad Gīta', shortLabel:'Gīta', color:'hindu', file:'data/hindu.json', loaded:false, verses:[], testament:false }
};

const OT_BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'];
const NT_BOOKS = ['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];

const bookTestamentMap = {};
OT_BOOKS.forEach(b => bookTestamentMap[b] = 'OT');
NT_BOOKS.forEach(b => bookTestamentMap[b] = 'NT');

const activeCorpora = new Set(['bible']);

function toggleCorpus(corpusId, enabled) {
  if (enabled) {
    activeCorpora.add(corpusId);
    // Load if not yet loaded
    if (CORPORA[corpusId] && !CORPORA[corpusId].loaded) {
      loadCorpus(corpusId).then(() => {
        buildIndex(corpusId);
        refreshLibrarySidebar(corpusId);
        const q = document.getElementById('search-input').value.trim();
        if (q) executeSearch();
      });
      return;
    }
  } else {
    activeCorpora.delete(corpusId);
  }
  const chip = document.getElementById(`chip-${corpusId}`);
  if (chip) chip.classList.toggle('active', enabled);
  const q = document.getElementById('search-input').value.trim();
  if (q) executeSearch();
}

async function loadCorpus(corpusId) {
  const corpus = CORPORA[corpusId];
  if (!corpus || corpus.loaded) return corpus;
  setLoadingDetail(`Loading ${corpus.label}…`);
  try {
    const resp = await fetch(corpus.file);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    corpus.verses = await resp.json();
    corpus.loaded = true;
    const chip = document.getElementById(`chip-${corpusId}`);
    if (chip) chip.classList.add('active');
    console.log(`[SF] ${corpus.label}: ${corpus.verses.length} entries`);
    return corpus;
  } catch(e) {
    console.warn(`[SF] Could not load ${corpus.label}:`, e.message);
    return null;
  }
}

function setLoadingDetail(t) { const el = document.getElementById('loading-detail'); if (el) el.textContent = t; }
function setLoadingProgress(p) { const el = document.getElementById('loading-fill'); if (el) el.style.width = p + '%'; }

function getAllVerses() {
  const out = [];
  for (const cid of activeCorpora) {
    const c = CORPORA[cid];
    if (c && c.loaded) c.verses.forEach(v => out.push({...v, corpus:cid}));
  }
  return out;
}

// Verse index: { corpusId: { book: { chapter: [verse,...] } } }
const verseIndex = {};

function buildIndex(corpusId) {
  const corpus = CORPORA[corpusId];
  if (!corpus || !corpus.loaded) return;
  verseIndex[corpusId] = {};
  for (const v of corpus.verses) {
    if (!verseIndex[corpusId][v.b]) verseIndex[corpusId][v.b] = {};
    if (!verseIndex[corpusId][v.b][v.c]) verseIndex[corpusId][v.b][v.c] = [];
    verseIndex[corpusId][v.b][v.c].push(v);
  }
}

function getVerses(corpusId, book, chapter) { return verseIndex[corpusId]?.[book]?.[chapter] || []; }

function getBooks(corpusId) {
  const idx = verseIndex[corpusId];
  if (!idx) return [];
  if (corpusId === 'bible') return [...OT_BOOKS, ...NT_BOOKS].filter(b => idx[b]);
  return Object.keys(idx);
}

function getChapters(corpusId, book) {
  const idx = verseIndex[corpusId];
  if (!idx || !idx[book]) return [];
  return Object.keys(idx[book]).map(Number).sort((a,b)=>a-b);
}

// Get Quran verse text for selected translation
function getQuranText(verse, trans) {
  if (verse.translations && verse.translations[trans]) return verse.translations[trans];
  return verse.t;
}

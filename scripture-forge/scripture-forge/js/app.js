/* ============================================================
   app.js — Bootstrap, view routing, lazy corpus loading
   ============================================================ */
let currentView = 'search';

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(`view-${view}`).classList.add('active-view');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

/* ── BOOTSTRAP ── */
window.addEventListener('DOMContentLoaded', async () => {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');

  try {
    // Load Bible first (primary corpus, always on)
    setLoadingDetail('Loading Bible (BSB)…'); setLoadingProgress(5);
    await loadCorpus('bible');
    setLoadingProgress(50);

    setLoadingDetail('Loading Qurʾān…');
    await loadCorpus('quran');
    setLoadingProgress(80);

    setLoadingDetail('Loading Bhagavad Gīta…');
    await loadCorpus('hindu');
    setLoadingProgress(92);

    setLoadingDetail('Building indices…');
    buildIndex('bible');
    buildIndex('quran');
    buildIndex('hindu');
    setLoadingProgress(97);

    setLoadingDetail('Initializing views…');
    initLibrary();
    initParallel();
    setLoadingProgress(100);

    await new Promise(r => setTimeout(r, 280));
    loadingScreen.classList.add('fade-out');
    app.classList.remove('hidden');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 700);

  } catch(e) {
    console.error('[ScriptureForge] Bootstrap error:', e);
    setLoadingDetail(`Error: ${e.message}`);
  }
});

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeVerseModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    switchView('search');
    setTimeout(() => document.getElementById('search-input')?.focus(), 100);
  }
});

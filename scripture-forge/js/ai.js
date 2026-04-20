/* ============================================================
   ai.js — Anthropic API integration + Verse Modal
   ============================================================ */
async function callAI(prompt, maxTokens=600) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages:[{role:'user', content:prompt}]
    })
  });
  if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message||`HTTP ${resp.status}`); }
  const data = await resp.json();
  return data.content?.map(c=>c.text||'').join('') || '';
}

let currentModalVerse = null;

function openVerseModal(encoded) {
  try { currentModalVerse = JSON.parse(decodeURIComponent(encoded)); } catch { return; }
  const v = currentModalVerse;

  // Corpus tag
  const tagEl = document.getElementById('modal-corpus-tag');
  tagEl.textContent = CORPORA[v.corpus]?.label || v.corpus;
  tagEl.className = `modal-corpus-tag ${v.corpus}`;

  document.getElementById('modal-ref').textContent = v.r;
  document.getElementById('modal-text').textContent = v.t;

  // Quran multi-translation panel
  const qPanel = document.getElementById('modal-quran-trans');
  if (v.corpus === 'quran' && v.translations) {
    qPanel.classList.remove('hidden');
    document.getElementById('qt-ali').textContent = v.translations['Yusuf Ali'] || '';
    document.getElementById('qt-pick').textContent = v.translations['Pickthall'] || '';
    document.getElementById('qt-shak').textContent = v.translations['Shakir'] || '';
    document.getElementById('modal-text').textContent = v.translations['Yusuf Ali'] || v.t;
  } else {
    qPanel.classList.add('hidden');
  }

  // Gita translator note
  if (v.corpus === 'hindu') {
    tagEl.textContent = 'Bhagavad Gīta — Edwin Arnold trans.';
  }

  document.getElementById('modal-ai-result').classList.add('hidden');
  document.getElementById('modal-ai-result').innerHTML = '';
  document.getElementById('verse-modal').classList.remove('hidden');
}

function closeVerseModal() {
  document.getElementById('verse-modal').classList.add('hidden');
  currentModalVerse = null;
}

function closeModal(e) {
  if (e.target === document.getElementById('verse-modal')) closeVerseModal();
}

function copyVerse() {
  if (!currentModalVerse) return;
  const v = currentModalVerse;
  const text = v.corpus === 'quran' && v.translations
    ? `${v.r} — "${v.translations['Yusuf Ali']}" (Yusuf Ali)`
    : `${v.r} — "${v.t}"`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.modal-actions button:nth-child(2)');
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(()=>btn.textContent='⊕ Copy', 1800); }
  });
}

function openInParallel() {
  if (!currentModalVerse) return;
  const v = currentModalVerse;
  switchView('parallel');
  closeVerseModal();
  setTimeout(() => {
    // Set corpus A to this verse's corpus
    const cSel = document.getElementById('par-corpus-a');
    if (cSel) {
      cSel.value = v.corpus;
      onParCorpusChange('a');
      setTimeout(() => {
        const bookSel = document.getElementById('par-book-a');
        if (bookSel) {
          bookSel.value = v.b;
          updateParallelChapters('a');
          setTimeout(() => {
            const chSel = document.getElementById('par-chap-a');
            if (chSel) { chSel.value = v.c; updateParallelVerses('a'); }
          }, 80);
        }
      }, 80);
    }
  }, 150);
}

async function sendToAI() {
  if (!currentModalVerse) return;
  const v = currentModalVerse;
  const resultEl = document.getElementById('modal-ai-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = '<div class="ai-loading"><span></span><span></span><span></span></div> Analyzing…';

  const corpusLabel = CORPORA[v.corpus]?.label || v.corpus;
  const textToAnalyze = (v.corpus === 'quran' && v.translations)
    ? Object.entries(v.translations).map(([t,tx]) => `${t}: "${tx}"`).join('\n')
    : `"${v.t}"`;

  const prompt = `Provide a concise academic analysis (4–6 sentences) of this passage from ${corpusLabel}:

${textToAnalyze}
(${v.r})

Cover: literary and historical context, theological significance, key concepts, and notable scholarly interpretations or cross-traditional resonances. Be precise and academic.`;

  try {
    resultEl.textContent = await callAI(prompt, 550);
  } catch(e) {
    resultEl.textContent = `Analysis unavailable: ${e.message}`;
  }
}

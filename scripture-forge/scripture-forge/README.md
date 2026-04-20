# ScriptureForge

**Comparative Sacred Text Platform** — Academic-grade side-by-side scripture study tool.

## Features

- **Scripture Library** — Full-text reader with book/chapter navigation (66 books, 31,086 Bible verses)
- **Keyword Search** — Fast full-text search across all loaded corpora with relevance scoring
- **AI Semantic Search** — Claude-powered thematic analysis across traditions
- **Parallel Viewer** — Side-by-side passage comparison with AI comparative analysis
- **Verse Modal** — Click any verse for AI scholarly analysis, copy, or send to Parallel Viewer

## Corpora

| Tradition | Status | Source |
|-----------|--------|--------|
| Bible (BSB) | ✅ Live | Berean Standard Bible (Public Domain) |
| Qurʾān | 🔜 Coming | — |
| Hindu Scriptures | 🔜 Coming | — |

## Hosting on GitHub Pages

1. Fork or clone this repo
2. Make sure `data/bsb.json` is present (run `scripts/build-data.sh` if missing)
3. Go to **Settings → Pages → Source: main branch / root**
4. Your site will be live at `https://yourusername.github.io/scripture-forge`

> **Note on AI features**: The AI semantic search and analysis call the Anthropic API directly from the browser. For public hosting, set up a lightweight proxy server (see `PROXY.md`) so your API key is not exposed. For local/private use, you can patch `js/ai.js` with your key directly.

## Local Development

```bash
# Python (simplest)
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

## Project Structure

```
scripture-forge/
├── index.html          # Main app shell
├── css/
│   └── style.css       # All styles
├── js/
│   ├── app.js          # Bootstrap & routing
│   ├── data.js         # Corpus registry & data loading
│   ├── search.js       # Keyword + AI semantic search
│   ├── parallel.js     # Parallel viewer
│   ├── library.js      # Scripture library reader
│   └── ai.js           # Anthropic API integration + modals
├── data/
│   ├── bsb.json        # Bible (BSB) — 31,086 verses
│   ├── quran.json      # (coming)
│   └── hindu.json      # (coming)
└── scripts/
    └── build-data.sh   # Data build scripts
```

## Adding a New Corpus (for developers)

1. Create `data/yourCorpus.json` as an array of verse objects:
   ```json
   [{"r":"Surah 1:1","b":"Al-Fatiha","c":1,"v":1,"t":"In the name of Allah..."}]
   ```
2. Add the corpus to `CORPORA` in `js/data.js`
3. Enable the corpus chip in `index.html`

## Credits

- Bible text: [Berean Standard Bible](https://berean.bible) (Public Domain)
- AI: [Anthropic Claude](https://anthropic.com)

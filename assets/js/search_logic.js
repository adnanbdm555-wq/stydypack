/* ========================================================
   STUDY PACK SMART AI SEARCH ENGINE & DYNAMIC LIVE FILTERING
   ======================================================== */

// Global Typo Map
const SEARCH_TYPO_MAP = {
  'englsih': 'english', 'engls': 'english', 'eng': 'english', 'englis': 'english',
  'oxfrd': 'oxford', 'oxfrod': 'oxford', 'oxforde': 'oxford', 'oup': 'oxford',
  'maths': 'math', 'mathes': 'math', 'mathmatics': 'mathematics', 'hisab': 'math',
  'cntdown': 'countdown', 'countdon': 'countdown', 'count down': 'countdown',
  'scince': 'science', 'scence': 'science', 'sience': 'science', 'sci': 'science',
  'chem': 'chemistry', 'chemstry': 'chemistry',
  'phy': 'physics', 'physic': 'physics',
  'urduu': 'urdu', 'sindhy': 'sindhi', 'sndhi': 'sindhi',
  'islamiat': 'islamic', 'islamyat': 'islamic', 'isl': 'islamic', 'deenyat': 'islamic',
  'cambrige': 'cambridge', 'cambredge': 'cambridge', 'cie': 'cambridge', 'igcse': 'cambridge',
  'paramont': 'paramount', 'spectrm': 'spectrum',
  'kifayat': 'kifayat', 'kifyat': 'kifayat', 'kaifayat': 'kifayat',
  'afaq': 'afaq', 'sun series': 'afaq', 'iqbal': 'afaq',
  'stbb': 'sindh', 'ptbb': 'punjab'
};

// Global Search Synonyms
const SEARCH_SYNONYMS = {
  'math': ['math', 'mathematics', 'countdown', 'hisab', 'maths'],
  'mathematics': ['math', 'mathematics', 'countdown', 'hisab', 'maths'],
  'countdown': ['countdown', 'count down', 'math', 'mathematics'],
  'science': ['science', 'amazing science', 'primary science', 'sci'],
  'english': ['english', 'oxford', 'broadway', 'grammar', 'english tree', 'eng'],
  'urdu': ['urdu', 'guldasta', 'narde', 'gul-e-lala', 'likhai'],
  'islamic': ['islamic', 'islamiat', 'islamyat', 'deenyat', 'islam'],
  'social': ['social studies', 'social', 'dunya', 'geography', 'history'],
  'computer': ['computer', 'whiz', 'it', 'keyboard', 'computing'],
  'oxford': ['oxford', 'oup', 'countdown', 'broadway'],
  'paramount': ['paramount'],
  'kifayat': ['kifayat'],
  'cambridge': ['cambridge', 'cie', 'igcse', 'o level', 'a level'],
  'afaq': ['afaq', 'sun series', 'iqbal'],
  'spectrum': ['spectrum'],
  'sindh': ['sindh', 'stbb', 'jamshoro'],
  'punjab': ['punjab', 'ptbb', 'lahore']
};

const SEARCH_STOP_WORDS = new Set(['ka', 'ki', 'ke', 'ko', 'in', 'for', 'of', 'and', 'the', 'a', 'an', 'book', 'books', 'series', 'edition', 'by', 'vol', 'volume']);

// Global Smart Match Item Function
window.smartMatchItem = function(item, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = rawQuery.toLowerCase().trim();
  const rawTokens = q.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  // Normalize tokens
  let tokens = rawTokens.map(t => SEARCH_TYPO_MAP[t] || t);

  // Filter out stop words ONLY if there are other tokens
  if (tokens.length > 1) {
    const filtered = tokens.filter(t => !SEARCH_STOP_WORDS.has(t));
    if (filtered.length > 0) tokens = filtered;
  }

  // Searchable text corpus for the item
  const title = String(item.title || item.name || '').toLowerCase();
  const pub = String(item.pub || item.publisher || '').toLowerCase();
  const cls = Array.isArray(item.cls) ? item.cls.join(' ').toLowerCase() : String(item.cls || item.class_name || '').toLowerCase();
  const subj = Array.isArray(item.subj) ? item.subj.join(' ').toLowerCase() : String(item.subj || item.subject || '').toLowerCase();
  const school = String(item.school || '').toLowerCase();
  const author = String(item.author || item.brand || '').toLowerCase();
  const itemId = String(item.id || '').toLowerCase();
  const cat = String(item.category || item.genre || '').toLowerCase();

  const fullStr = `${title} ${pub} ${cls} ${subj} ${school} ${author} ${itemId} ${cat}`;

  return tokens.every(token => {
    if (fullStr.includes(token)) return true;

    // Check Roman numerals / numbers
    if (token === '1' && (fullStr.includes('book 1') || fullStr.includes('class 1') || fullStr.includes('nursery') || fullStr.includes('grade 1'))) return true;
    if (token === '2' && (fullStr.includes('book 2') || fullStr.includes('class 2') || fullStr.includes('grade 2'))) return true;
    if (token === '3' && (fullStr.includes('book 3') || fullStr.includes('class 3') || fullStr.includes('grade 3'))) return true;
    if (token === '4' && (fullStr.includes('book 4') || fullStr.includes('class 4') || fullStr.includes('grade 4'))) return true;
    if (token === '5' && (fullStr.includes('book 5') || fullStr.includes('class 5') || fullStr.includes('grade 5'))) return true;
    if (token === '6' && (fullStr.includes('book 6') || fullStr.includes('class 6') || fullStr.includes('grade 6'))) return true;
    if (token === '7' && (fullStr.includes('book 7') || fullStr.includes('class 7') || fullStr.includes('grade 7'))) return true;
    if (token === '8' && (fullStr.includes('book 8') || fullStr.includes('class 8') || fullStr.includes('grade 8'))) return true;

    const syns = SEARCH_SYNONYMS[token];
    if (syns && syns.some(s => fullStr.includes(s))) return true;

    return false;
  });
};

// Global Smart Relevance Scoring Function
window.smartItemScore = function(item, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return 0;
  const q = rawQuery.toLowerCase().trim();
  const title = String(item.title || item.name || '').toLowerCase();

  if (title === q) return 1000;
  if (title.startsWith(q)) return 500;
  if (title.includes(q)) return 300;

  const rawTokens = q.split(/\s+/).filter(Boolean);
  let score = 0;
  rawTokens.forEach(t => {
    const norm = SEARCH_TYPO_MAP[t] || t;
    if (title.includes(norm)) score += 60;
    else score += 15;
  });
  return score;
};

// Detect if current page is the main books catalog page
function isBooksCatalogPage() {
  const p = window.location.pathname.toLowerCase();
  if (p === '/' || p.endsWith('/index.html') || p.endsWith('/index')) return false;
  return p.endsWith('/books') || p.endsWith('/books.html') || p.includes('books');
}

// Initialize Search Bar & Live Dropdown
document.addEventListener("DOMContentLoaded", function() {
  const searchForm = document.querySelector(".nav-search-bar");
  if (!searchForm) return;

  const searchInput = searchForm.querySelector("input");
  if (!searchInput) return;

  // Create Dropdown Container
  let dropdown = searchForm.querySelector(".ai-search-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "ai-search-dropdown";
    searchForm.appendChild(dropdown);
  }

  // Pre-populate search input if ?q= exists in URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = (urlParams.get('q') || '').trim();
  if (initialQuery) {
    searchInput.value = initialQuery;
    window.activeSearchQuery = initialQuery;
  }

  let searchTimeout;
  let liveFilterTimeout;

  // Input Event Handler
  searchInput.addEventListener("input", function(e) {
    clearTimeout(searchTimeout);
    clearTimeout(liveFilterTimeout);

    const rawQuery = e.target.value.trim();

    // If on books catalog page: live update grid without reload
    if (isBooksCatalogPage() && typeof window.applyFilters === 'function') {
      window.activeSearchQuery = rawQuery;
      
      try {
        if (rawQuery) {
          window.history.replaceState({ q: rawQuery }, '', `${window.location.pathname}?q=${encodeURIComponent(rawQuery)}`);
        } else {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch(err) {}

      // Debounce catalog filter update
      liveFilterTimeout = setTimeout(() => {
        window.applyFilters();
      }, 80);
    }

    // Handle Dropdown Suggestions
    if (rawQuery.length < 2) {
      dropdown.classList.remove("show");
      searchForm.classList.remove("expanded");
      return;
    }

    searchForm.classList.add("expanded");

    searchTimeout = setTimeout(() => {
      const rawCatalog = [];
      if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) rawCatalog.push(...SCRAPED_COURSES);
      if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) rawCatalog.push(...SCRAPED_BOOKS);
      if (typeof BOOKS !== 'undefined' && Array.isArray(BOOKS)) rawCatalog.push(...BOOKS);
      if (typeof SCRAPED_STATIONERY !== 'undefined' && Array.isArray(SCRAPED_STATIONERY)) rawCatalog.push(...SCRAPED_STATIONERY);
      if (typeof SCRAPED_TOYS !== 'undefined' && Array.isArray(SCRAPED_TOYS)) rawCatalog.push(...SCRAPED_TOYS);

      const catalog = [];
      const seenSearchIds = new Set();
      const seenSearchTitles = new Set();
      rawCatalog.forEach(item => {
        const id = String(item.id || '');
        const titleKey = (item.title || item.name || '').toLowerCase().trim();
        if (id && !seenSearchIds.has(id) && !seenSearchTitles.has(titleKey)) {
          seenSearchIds.add(id);
          if (titleKey) seenSearchTitles.add(titleKey);
          catalog.push(item);
        }
      });

      const results = catalog.filter(book => window.smartMatchItem(book, rawQuery));
      results.sort((a, b) => window.smartItemScore(b, rawQuery) - window.smartItemScore(a, rawQuery));

      renderResults(results, rawQuery);
    }, 120);
  });

  // Handle Form Submission (Enter key or Search button clicked)
  searchForm.addEventListener("submit", function(e) {
    e.preventDefault();
    dropdown.classList.remove("show");
    searchForm.classList.remove("expanded");

    const query = searchInput.value.trim();

    if (isBooksCatalogPage() && typeof window.applyFilters === 'function') {
      window.activeSearchQuery = query;
      try {
        if (query) {
          window.history.replaceState({ q: query }, '', `${window.location.pathname}?q=${encodeURIComponent(query)}`);
        } else {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch(err) {}
      window.applyFilters();

      // Smooth scroll to product grid
      const grid = document.getElementById('productGrid') || document.querySelector('.shop-layout');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Redirect from any other page to /books
      window.location.href = `/books${query ? ('?q=' + encodeURIComponent(query)) : ''}`;
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function(e) {
    if (!searchForm.contains(e.target)) {
      dropdown.classList.remove("show");
      searchForm.classList.remove("expanded");
    }
  });

  searchInput.addEventListener("focus", function() {
    if (this.value.trim().length >= 2) {
      this.dispatchEvent(new Event('input'));
    }
  });

  function renderResults(results, query) {
    dropdown.innerHTML = "";

    if (results.length === 0) {
      dropdown.innerHTML = `
        <div class="ai-empty-state" style="padding: 24px; text-align: center; color: #475569;">
          <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
          <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Koi item nahi mila for "<strong>${escapeHtml(query)}</strong>"</div>
          <div style="font-size: 12.5px; color: #64748B;">Class ya subject (e.g. English, Math, Oxford, Science, Urdu) search karein.</div>
        </div>
      `;
      dropdown.classList.add("show");
      return;
    }

    const header = document.createElement("div");
    header.className = "ai-search-header";
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:600; color:#475569;";
    header.innerHTML = `<span>Found ${results.length} results</span><span style="background:#1565C0; color:#fff; padding:2px 8px; border-radius:12px; font-size:11px;">Study Pack Store</span>`;
    dropdown.appendChild(header);

    const list = document.createElement("div");
    list.className = "ai-results-list";
    list.style.cssText = "max-height: 380px; overflow-y: auto;";

    results.slice(0, 8).forEach(book => {
      const item = document.createElement("a");
      item.href = `/books?q=${encodeURIComponent(book.title || '')}`;
      item.className = "search-result-item";
      item.style.cssText = "display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid #f1f5f9; text-decoration:none; transition:0.2s; background:#fff; cursor:pointer;";

      const img = book.img || 'assets/images/studypack_logo.png';
      const price = typeof money === 'function' ? money(book.price) : 'PKR ' + Number(book.price || 0).toLocaleString();
      const cls = book.cls || book.grade || 'All Grades';
      const pub = book.pub || book.school || book.author || 'Study Pack';

      item.innerHTML = `
        <div style="width:44px; height:56px; border-radius:6px; overflow:hidden; background:#f1f5f9; flex-shrink:0; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center;">
          <img src="${img}" alt="${escapeHtml(book.title)}" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='assets/images/studypack_logo.png'">
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13.5px; font-weight:600; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px;">${highlightMatch(book.title || '', query)}</div>
          <div style="font-size:11.5px; color:#64748B;">${escapeHtml(cls)} • ${escapeHtml(pub)}</div>
        </div>
        <div style="font-size:13.5px; font-weight:700; color:#1565C0; white-space:nowrap;">${price}</div>
      `;

      item.addEventListener("mouseenter", () => item.style.background = "#EFF6FF");
      item.addEventListener("mouseleave", () => item.style.background = "#ffffff");

      item.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.remove("show");
        searchForm.classList.remove("expanded");

        searchInput.value = book.title;

        if (isBooksCatalogPage() && typeof window.applyFilters === 'function') {
          window.activeSearchQuery = book.title;
          try {
            window.history.replaceState({ q: book.title }, '', `${window.location.pathname}?q=${encodeURIComponent(book.title)}`);
          } catch(err) {}
          window.applyFilters();
          const grid = document.getElementById('productGrid') || document.querySelector('.shop-layout');
          if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = `/books?q=${encodeURIComponent(book.title)}`;
        }
      });

      list.appendChild(item);
    });

    dropdown.appendChild(list);

    if (results.length > 8) {
      const footer = document.createElement("div");
      footer.style.cssText = "padding:10px 16px; background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0; cursor:pointer;";
      footer.innerHTML = `<span style="font-size:12.5px; font-weight:700; color:#1565C0;">Tamam ${results.length} results dekhein &rarr;</span>`;
      footer.addEventListener("click", function(e) {
        e.preventDefault();
        dropdown.classList.remove("show");
        searchForm.classList.remove("expanded");

        if (isBooksCatalogPage() && typeof window.applyFilters === 'function') {
          window.activeSearchQuery = query;
          try {
            window.history.replaceState({ q: query }, '', `${window.location.pathname}?q=${encodeURIComponent(query)}`);
          } catch(err) {}
          window.applyFilters();
          const grid = document.getElementById('productGrid') || document.querySelector('.shop-layout');
          if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = `/books?q=${encodeURIComponent(query)}`;
        }
      });
      dropdown.appendChild(footer);
    }

    dropdown.classList.add("show");
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const rawTokens = query.split(/\s+/).filter(Boolean);
    let pattern = rawTokens.map(escapeRegex).join('|');
    if (!pattern) return escapeHtml(text);
    const regex = new RegExp(`(${pattern})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background:#FEF08A; color:#854D0E; padding:0 2px; border-radius:2px;">$1</mark>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});
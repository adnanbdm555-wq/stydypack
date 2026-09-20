
// ============================================================
// DYNAMIC GLOBAL PRICE RULES & OVERRIDES HELPER
// ============================================================
window.getAdjustedPrice = function(item) {
    let price = Number(item.price) || 0;
    if (item.id) {
        const courseOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
        if (courseOverrides[item.id] && courseOverrides[item.id].price) {
            return Number(courseOverrides[item.id].price);
        }
    }

    const rules = JSON.parse(localStorage.getItem('sp_global_price_rules') || '[]');
    if (rules.length > 0) {
        for (const r of rules) {
            let applies = false;
            const t = (item.title || '').toLowerCase();
            if (r.scope === 'all') applies = true;
            else if (r.scope === 'oxford' && t.includes('oxford')) applies = true;
            else if (r.scope === 'paramount' && t.includes('paramount')) applies = true;
            else if (r.scope === 'afaq' && (t.includes('afaq') || item.publisher === 'AFAQ')) applies = true;
            else if (r.scope === 'courses' && (item.school || item.category === 'School Courses')) applies = true;
            else if (r.scope === 'stationery' && (item.type === 'stationery' || item.category === 'Stationery')) applies = true;
            else if (r.scope === 'toys' && (item.type === 'toy' || item.category === 'Toys & Gifts')) applies = true;

            if (applies) {
                const multiplier = r.action === 'inc' ? (1 + r.percent / 100) : (1 - r.percent / 100);
                price = Math.round(price * multiplier);
                if (r.round) price = Math.round(price / 10) * 10;
                break;
            }
        }
    }
    return price;
};

// ============================================================
// STUDY PACK SMART SEARCH MATCHING ENGINE
// ============================================================
const DF_TYPO_MAP = {
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

const DF_SYNONYMS = {
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

const DF_STOP_WORDS = new Set(['ka', 'ki', 'ke', 'ko', 'in', 'for', 'of', 'and', 'the', 'a', 'an', 'book', 'books', 'series', 'edition', 'by', 'vol', 'volume']);

window.smartMatchItem = function(item, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = rawQuery.toLowerCase().trim();
  const rawTokens = q.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  let tokens = rawTokens.map(t => DF_TYPO_MAP[t] || t);
  if (tokens.length > 1) {
    const filtered = tokens.filter(t => !DF_STOP_WORDS.has(t));
    if (filtered.length > 0) tokens = filtered;
  }

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

    if (token === '1' && (fullStr.includes('book 1') || fullStr.includes('class 1') || fullStr.includes('nursery') || fullStr.includes('grade 1'))) return true;
    if (token === '2' && (fullStr.includes('book 2') || fullStr.includes('class 2') || fullStr.includes('grade 2'))) return true;
    if (token === '3' && (fullStr.includes('book 3') || fullStr.includes('class 3') || fullStr.includes('grade 3'))) return true;
    if (token === '4' && (fullStr.includes('book 4') || fullStr.includes('class 4') || fullStr.includes('grade 4'))) return true;
    if (token === '5' && (fullStr.includes('book 5') || fullStr.includes('class 5') || fullStr.includes('grade 5'))) return true;
    if (token === '6' && (fullStr.includes('book 6') || fullStr.includes('class 6') || fullStr.includes('grade 6'))) return true;
    if (token === '7' && (fullStr.includes('book 7') || fullStr.includes('class 7') || fullStr.includes('grade 7'))) return true;
    if (token === '8' && (fullStr.includes('book 8') || fullStr.includes('class 8') || fullStr.includes('grade 8'))) return true;

    const syns = DF_SYNONYMS[token];
    if (syns && syns.some(s => fullStr.includes(s))) return true;

    return false;
  });
};

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
    const norm = DF_TYPO_MAP[t] || t;
    if (title.includes(norm)) score += 60;
    else score += 15;
  });
  return score;
};

// Global helper to clear all filters & search query
window.clearAllCatalogFilters = function() {
  const sidebar = document.getElementById('filterCard');
  if (sidebar) {
    sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    sidebar.querySelectorAll('.acc-badge').forEach(b => { b.textContent = '0'; b.classList.remove('show'); });
  }
  const priceRange = document.getElementById('priceRange');
  const priceVal = document.getElementById('priceVal');
  if (priceRange) {
    priceRange.value = 10000;
    if (priceVal) priceVal.innerText = 'Rs 10,000';
  }
  const searchInput = document.querySelector('.nav-search-bar input');
  if (searchInput) searchInput.value = '';
  window.activeSearchQuery = '';
  try {
    window.history.replaceState({}, '', window.location.pathname);
  } catch(e){}
  if (typeof window.applyFilters === 'function') window.applyFilters();
};

window.currentPage = 1;
window.ITEMS_PER_PAGE = 9;
window.currentBooks = [];
const initUrlParams = new URLSearchParams(window.location.search);
window.activeSearchQuery = (initUrlParams.get('q') || '').trim();

function getCatalogData(type) {
    let items = [];

    if (type === 'books') {
        // 1. Prepend custom books added from Dashboard
        try {
            const customProds = JSON.parse(localStorage.getItem('sp_custom_products') || '[]');
            if (Array.isArray(customProds) && customProds.length > 0) {
                const mappedCustom = customProds.filter(p => (p.category || 'Books').toLowerCase().includes('book') || !p.category || p.category === 'Books').map(cp => ({
                    ...cp,
                    pub: cp.pub || cp.publisher || cp.province || 'Other Publisher',
                    publisher: cp.pub || cp.publisher || cp.province || 'Other Publisher'
                }));
                items = items.concat(mappedCustom);
            }
        } catch(e){}

        // 2. Base books catalog
        if (typeof BOOKS !== 'undefined' && BOOKS.length > 0) items = items.concat(BOOKS);
        else if (typeof SCRAPED_BOOKS !== 'undefined' && SCRAPED_BOOKS.length > 0) items = items.concat(SCRAPED_BOOKS);
        
        // 3. Merge all School Course Packs + Dashboard newly added courses
        let allCoursesList = [];
        if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) {
            allCoursesList = allCoursesList.concat(SCRAPED_COURSES);
        }
        try {
            const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
            if (newCourses && newCourses.length > 0) {
                allCoursesList = newCourses.concat(allCoursesList);
            }
        } catch(e){}

        if (allCoursesList.length > 0) {
            const courseItems = allCoursesList.map(c => {
                const rawClass = c.class_name || (Array.isArray(c.cls) ? c.cls[0] : c.cls) || 'General';
                return {
                    id: c.id || ('course_' + Math.random().toString(36).substr(2, 9)),
                    title: c.title,
                    price: Number(c.price) || 0,
                    img: c.img || 'assets/images/studypack_logo.png',
                    category: 'School Courses',
                    school: c.school || 'School Syllabus',
                    class_name: rawClass,
                    cls: rawClass,
                    pub: c.school ? (c.school + ' Course') : 'School Syllabus',
                    inStock: true
                };
            });
            items = items.concat(courseItems);
        }
    } else if (type === 'stationery') {
        try {
            const customProds = JSON.parse(localStorage.getItem('sp_custom_products') || '[]');
            if (Array.isArray(customProds)) {
                items = items.concat(customProds.filter(p => (p.category || '').toLowerCase().includes('stationery')));
            }
        } catch(e){}
        if (typeof STATIONERY !== 'undefined' && STATIONERY.length > 0) items = items.concat(STATIONERY);
        else if (typeof SCRAPED_STATIONERY !== 'undefined' && SCRAPED_STATIONERY.length > 0) items = items.concat(SCRAPED_STATIONERY);
        else if (typeof BOOKS !== 'undefined') items = items.concat(BOOKS.filter(b => (b.category||'').toLowerCase().includes('stationery')));
    } else if (type === 'toys') {
        try {
            const customProds = JSON.parse(localStorage.getItem('sp_custom_products') || '[]');
            if (Array.isArray(customProds)) {
                items = items.concat(customProds.filter(p => (p.category || '').toLowerCase().includes('toy')));
            }
        } catch(e){}
        if (typeof TOYS !== 'undefined' && TOYS.length > 0) items = items.concat(TOYS);
        else if (typeof SCRAPED_TOYS !== 'undefined' && SCRAPED_TOYS.length > 0) items = items.concat(SCRAPED_TOYS);
        else if (typeof BOOKS !== 'undefined') items = items.concat(BOOKS.filter(b => (b.category||'').toLowerCase().includes('toy')));
    }

    // Apply dashboard product overrides & stock status to ALL items
    try {
        const overrides = JSON.parse(localStorage.getItem('sp_product_overrides') || '{}');
        const stockOverrides = JSON.parse(localStorage.getItem('sp_stock_overrides') || '{}');
        items = items.map(item => {
            let updated = { ...item };
            const itemId = String(item.id || '');
            if (overrides[itemId]) {
                updated = { ...updated, ...overrides[itemId] };
            }
            if (stockOverrides[itemId] !== undefined) {
                updated.inStock = stockOverrides[itemId];
                updated.stock = stockOverrides[itemId];
            }
            return updated;
        }).filter(item => !overrides[String(item.id || '')]?.deleted);
    } catch(e){}

    // Strict deduplication by ID and Title
    const uniqueItems = [];
    const seenItemIds = new Set();
    const seenItemTitles = new Set();
    items.forEach(it => {
        const id = String(it.id || '');
        const titleKey = (it.title || '').toLowerCase().trim();
        if (id && !seenItemIds.has(id) && !seenItemTitles.has(titleKey)) {
            seenItemIds.add(id);
            if (titleKey) seenItemTitles.add(titleKey);
            uniqueItems.push(it);
        }
    });

    return uniqueItems;
}

const GRADE_NATURAL_ORDER = {
    'pre-nursery': 1, 'playgroup': 2, 'nursery': 3, 'kg': 4, 'class kg': 5, 'kindergarten': 6,
    'class 1': 10, 'grade 1': 10, 'class 2': 20, 'grade 2': 20, 'class 3': 30, 'grade 3': 30,
    'class 4': 40, 'grade 4': 40, 'class 5': 50, 'grade 5': 50, 'class 6': 60, 'grade 6': 60,
    'class 7': 70, 'grade 7': 70, 'class 8': 80, 'grade 8': 80, 'class 9': 90, 'grade 9': 90,
    'class 10': 100, 'grade 10': 100, 'matric': 105, 'class 11': 110, 'grade 11': 110,
    'class 12': 120, 'grade 12': 120, 'o-level': 130, 'a-level': 140, 'general': 200
};

function sortClassesNaturally(arr) {
    return arr.sort((a, b) => {
        const keyA = (a || '').toLowerCase().trim();
        const keyB = (b || '').toLowerCase().trim();
        const valA = GRADE_NATURAL_ORDER[keyA] !== undefined ? GRADE_NATURAL_ORDER[keyA] : (parseInt(keyA.replace(/\D/g, '')) || 99);
        const valB = GRADE_NATURAL_ORDER[keyB] !== undefined ? GRADE_NATURAL_ORDER[keyB] : (parseInt(keyB.replace(/\D/g, '')) || 99);
        return valA - valB;
    });
}

function renderSchoolCoursesFilterGroup(schools, booksList) {
    if (!schools || schools.length === 0) return '';
    
    // Build map of school -> unique classes
    const schoolClassMap = {};
    booksList.forEach(b => {
        if (b.school && b.school !== 'School Syllabus') {
            const clsName = b.class_name || (Array.isArray(b.cls) ? b.cls[0] : b.cls) || 'General';
            schoolClassMap[b.school] = schoolClassMap[b.school] || new Set();
            schoolClassMap[b.school].add(clsName);
        }
    });

    let html = `<div class="accordion-item active">
        <div class="acc-head">
          <span>School Syllabi / Courses</span> 
          <span class="acc-badge" id="schoolFilterBadge">0</span> 
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="acc-arrow"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="acc-body" style="max-height: 420px; overflow-y: auto; padding-right: 4px;">`;

    schools.forEach(school => {
        const rawClasses = Array.from(schoolClassMap[school] || []);
        const classes = sortClassesNaturally(rawClasses);
        const safeId = 'sch_' + school.replace(/[^a-zA-Z0-9]/g, '_');

        html += `
        <div class="school-filter-block" style="border-bottom: 1px solid #F1F5F9; padding: 6px 0;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <label class="glass-check" style="margin:0; flex:1; cursor:pointer;">
              <input type="checkbox" class="dyn-school" value="${escapeHtml(school)}" data-target="${safeId}" onchange="handleSchoolCheckboxToggle(this, '${safeId}')"> 
              <span class="chk-box"></span> 
              <span style="font-weight:600; color:#1E293B; font-size:13px;">${escapeHtml(school)}</span>
            </label>
            ${classes.length > 0 ? `
              <button type="button" class="btn-toggle-classes" onclick="toggleSchoolClassesDrawer('${safeId}', this)" title="Toggle Classes" style="background:#F8FAFC; border:1px solid #CBD5E1; padding:2px 8px; border-radius:12px; cursor:pointer; font-size:11px; color:#475569; font-weight:700; display:flex; align-items:center; gap:3px; transition:0.2s;">
                <span>${classes.length} classes</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-icon" style="width:12px; height:12px; transition:transform 0.2s;"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            ` : ''}
          </div>

          ${classes.length > 0 ? `
            <div class="school-classes-drawer" id="${safeId}" style="display:none; margin-top:8px; padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px;">
              <div style="font-size:10.5px; font-weight:800; color:#64748B; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.4px;">Select Class / Grade:</div>
              <div style="display:flex; flex-wrap:wrap; gap:5px;">
                ${classes.map(cls => `
                  <label class="class-chip-wrap" style="cursor:pointer; margin:0;">
                    <input type="checkbox" class="dyn-school-class" data-school="${escapeHtml(school)}" value="${escapeHtml(cls)}" style="display:none;" onchange="handleClassChipChange(this)">
                    <span class="class-chip" style="display:inline-block; font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px; background:#ffffff; border:1.5px solid #CBD5E1; color:#334155; transition:all 0.15s ease;">
                      ${escapeHtml(cls)}
                    </span>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>`;
    });

    html += `</div></div>`;
    return html;
}

window.handleSchoolCheckboxToggle = function(input, drawerId) {
    const drawer = document.getElementById(drawerId);
    if (drawer) {
        if (input.checked) {
            drawer.style.display = 'block';
            const btn = input.closest('.school-filter-block').querySelector('.chevron-icon');
            if (btn) btn.style.transform = 'rotate(180deg)';
        } else {
            // If school is unchecked, uncheck its classes
            drawer.querySelectorAll('.dyn-school-class').forEach(cb => {
                cb.checked = false;
                const span = cb.parentElement.querySelector('.class-chip');
                if (span) {
                    span.style.background = '#ffffff';
                    span.style.color = '#334155';
                    span.style.borderColor = '#CBD5E1';
                    span.style.boxShadow = 'none';
                }
            });
            drawer.style.display = 'none';
            const btn = input.closest('.school-filter-block').querySelector('.chevron-icon');
            if (btn) btn.style.transform = 'rotate(0deg)';
        }
    }
    updateSchoolFilterBadge();
    if (typeof window.applyFilters === 'function') window.applyFilters();
};

window.toggleSchoolClassesDrawer = function(drawerId, btn) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    const isHidden = (drawer.style.display === 'none' || !drawer.style.display);
    drawer.style.display = isHidden ? 'block' : 'none';
    const chevron = btn.querySelector('.chevron-icon');
    if (chevron) {
        chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
};

window.handleClassChipChange = function(input) {
    const span = input.parentElement.querySelector('.class-chip');
    const school = input.getAttribute('data-school');
    
    // Auto-check parent school checkbox if a class is selected
    if (input.checked && school) {
        const schoolCb = document.querySelector(`.dyn-school[value="${CSS.escape(school)}"]`);
        if (schoolCb && !schoolCb.checked) {
            schoolCb.checked = true;
        }
    }

    if (span) {
        if (input.checked) {
            span.style.background = '#1565C0';
            span.style.color = '#ffffff';
            span.style.borderColor = '#1565C0';
            span.style.boxShadow = '0 2px 6px rgba(21,101,192,0.25)';
        } else {
            span.style.background = '#ffffff';
            span.style.color = '#334155';
            span.style.borderColor = '#CBD5E1';
            span.style.boxShadow = 'none';
        }
    }
    updateSchoolFilterBadge();
    if (typeof window.applyFilters === 'function') window.applyFilters();
};

function updateSchoolFilterBadge() {
    const checkedSchools = document.querySelectorAll('.dyn-school:checked').length;
    const checkedClasses = document.querySelectorAll('.dyn-school-class:checked').length;
    const badge = document.getElementById('schoolFilterBadge');
    if (badge) {
        const total = checkedClasses > 0 ? `${checkedSchools} (${checkedClasses} classes)` : checkedSchools;
        badge.textContent = total;
        if (checkedSchools > 0 || checkedClasses > 0) badge.classList.add('show');
        else badge.classList.remove('show');
    }
}

function inferBookProperties(book) {
    const title = (book.title || '').toLowerCase();
    const cls = (Array.isArray(book.cls) ? book.cls.join(' ') : (book.cls || '')).toLowerCase();
    const rawPub = (book.pub || book.publisher || '').toLowerCase();
    const idStr = String(book.id || '').toLowerCase();
    const author = String(book.author || '').toLowerCase();
    
    // Normalize Publisher
    let pub = 'General Publisher';
    if (rawPub.includes('oxford') || rawPub.includes('oup') || idStr.includes('oup_') || title.includes('oxford') || cls.includes('oxford')) {
        pub = 'Oxford Books';
    } else if (rawPub.includes('paramount') || idStr.includes('paramount') || title.includes('paramount')) {
        pub = 'Paramount';
    } else if (rawPub.includes('bookmark') || idStr.includes('bookmark') || title.includes('bookmark')) {
        pub = 'Bookmark';
    } else if (rawPub.includes('kifayat') || idStr.includes('kifayat') || title.includes('kifayat')) {
        pub = 'Kifayat Publishers';
    } else if (title.includes('cambridge') || rawPub.includes('cambridge') || (book.author && String(book.author).toLowerCase().includes('cambridge')) || idStr.includes('cambridge')) {
        pub = 'Cambridge University Press';
    } else if (title.includes('eri ') || cls.includes('eri ') || rawPub.includes('eri')) {
        pub = 'ERI Publishers';
    } else if (title.includes('afaq') || cls.includes('afaq') || rawPub.includes('afaq') || idStr.includes('afaq')) {
        pub = 'AFAQ Publishers';
    } else if (title.includes('spectrum') || cls.includes('spectrum') || rawPub.includes('spectrum')) {
        pub = 'Spectrum Books';
    } else if (title.includes('sindh') || rawPub.includes('sindh') || title.includes('stbb') || title.includes('jamshoro')) {
        pub = 'Sindh Text Book';
    } else if (book.pub && book.pub !== 'Books' && book.pub !== 'School Books' && book.pub !== 'Other') {
        pub = book.pub;
    }
    book.pub = pub;
    
    // Language
    let lang = 'English';
    if (title.includes('urdu') || cls.includes('urdu')) lang = 'Urdu';
    else if (title.includes('sindhi') || cls.includes('sindhi')) lang = 'Sindhi';
    else if (title.includes('arabic') || cls.includes('arabic') || title.includes('islam') || title.includes('quran')) lang = 'Arabic/Islamic';
    book.language = lang;
    
    // Age / Class Group
    let age = 'General';
    if (title.includes('nursery') || title.includes('play group') || title.includes('montessori')) age = 'Early Years (3-5)';
    else if (title.includes('grade 1') || title.includes('grade 2') || title.includes('grade 3') || title.includes('class 1') || title.includes('class 2') || title.includes('class 3')) age = 'Primary (6-8)';
    else if (title.includes('grade 4') || title.includes('grade 5') || title.includes('class 4') || title.includes('class 5')) age = 'Upper Primary (9-11)';
    else if (title.match(/grade [6-8]/) || title.match(/class [6-8]/)) age = 'Middle (12-14)';
    else if (title.match(/grade [9]|10/) || title.match(/class [9]|10/)) age = 'Secondary (15-16)';
    book.age_group = age;
    
    // Genre
    let genre = 'General';
    if (title.includes('science')) genre = 'Science';
    else if (title.includes('math')) genre = 'Mathematics';
    else if (title.includes('english')) genre = 'English';
    else if (title.includes('urdu')) genre = 'Urdu';
    else if (title.includes('islam')) genre = 'Islamic Studies';
    else if (title.includes('computer')) genre = 'Computer';
    else if (title.includes('history') || title.includes('social')) genre = 'Social Studies';
    else if (book.subj) genre = Array.isArray(book.subj) ? book.subj[0] : book.subj;
    book.genre = genre;
}

function inferStationeryProperties(item) {
    const title = (item.title || '').toLowerCase();
    let type = 'Writing';
    if (title.includes('pen') || title.includes('pencil') || title.includes('marker') || title.includes('highlighter')) type = 'Writing';
    else if (title.includes('notebook') || title.includes('paper') || title.includes('register') || title.includes('diary')) type = 'Paper & Notebooks';
    else if (title.includes('color') || title.includes('paint') || title.includes('brush') || title.includes('art')) type = 'Art & Craft';
    else if (title.includes('file') || title.includes('folder') || title.includes('stapler') || title.includes('punch')) type = 'Office Supplies';
    else if (title.includes('bag') || title.includes('pouch') || title.includes('geometry')) type = 'Bags & Geometry';
    item.item_type = type;
}

function inferToysProperties(item) {
    const title = (item.title || '').toLowerCase();
    let type = 'Vehicles & RC Toys';
    if (title.includes('car') || title.includes('vehicle') || title.includes('rc') || title.includes('track')) type = 'Vehicles & RC Toys';
    else if (title.includes('doll') || title.includes('figure') || title.includes('barbie')) type = 'Dolls & Figures';
    else if (title.includes('board') || title.includes('puzzle') || title.includes('game') || title.includes('educational')) type = 'Educational & Games';
    else if (title.includes('outdoor') || title.includes('ride') || title.includes('sports') || title.includes('ball')) type = 'Outdoor & Sports';
    else if (title.includes('gift') || title.includes('hamper')) type = 'Gifts & Sets';
    item.item_type = type;
}

function extractUniqueOptions(products, prop) {
    const vals = new Set();
    products.forEach(p => {
        if (p[prop]) vals.add(p[prop]);
    });
    return Array.from(vals).filter(Boolean).sort();
}

function renderFilterGroup(title, options, inputClass) {
    if (!options || options.length === 0) return '';
    let html = `<div class="accordion-item active">
        <div class="acc-head">${title} <span class="acc-badge">0</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="acc-arrow"><path d="m6 9 6 6 6-6"/></svg></div>
        <div class="acc-body">`;
    options.forEach(opt => {
        html += `<label class="glass-check"><input type="checkbox" class="${inputClass}" value="${opt}"> <span class="chk-box"></span> ${opt}</label>`;
    });
    html += `</div></div>`;
    return html;
}

function getPriceRangeHtml() {
    return `<div style="background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);">
        <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: var(--navy);">Max Price</h4>
        <input type="range" id="priceRange" min="100" max="10000" step="100" value="10000" style="width: 100%;">
        <div style="display:flex; justify-content:space-between; font-size: 12px; color: #475569; margin-top:8px;">
            <span>Rs 100</span><span id="priceVal">Rs 10,000</span>
        </div>
    </div>`;
}

function getAvailabilityHtml() {
    return `<div style="background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);">
        <label class="glass-check" style="margin:0;"><input type="checkbox" id="inStockOnly"> <span class="chk-box"></span> In Stock Only</label>
    </div>`;
}

function setupAccordions() {
    const accHeads = document.querySelectorAll(".acc-head");
    accHeads.forEach(head => {
        head.onclick = function() {
            this.parentElement.classList.toggle("active");
        };
    });
}

function injectSidebarHTML(html) {
    const sidebar = document.getElementById('filterCard');
    if (!sidebar) return;
    
    const header = `
        <div class="fc-head" style="padding: 24px 24px 10px 24px;">
          <h4 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--navy);">Filters</h4>
          <button class="icon-btn" id="closeFilterMobile" style="display: none;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>
        <div style="padding: 0 24px;">
    `;
    const footer = `
          <button id="clearFilters" style="width: 100%; margin-bottom: 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px; font-weight: 600; cursor: pointer; transition: 0.3s;">Clear All Filters</button>
        </div>
    `;
    
    sidebar.innerHTML = header + html + footer;
    setupAccordions();
    
    // Checkboxes change & badges
    sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const parentAcc = cb.closest('.accordion-item');
            if (parentAcc) {
                const badge = parentAcc.querySelector('.acc-badge');
                if (badge) {
                    const checked = parentAcc.querySelectorAll('input:checked').length;
                    badge.textContent = checked;
                    if (checked > 0) badge.classList.add('show');
                    else badge.classList.remove('show');
                }
            }
            if (typeof window.applyFilters === 'function') window.applyFilters();
        });
    });
    
    // Price range
    const priceRange = document.getElementById('priceRange');
    const priceVal = document.getElementById('priceVal');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            if (priceVal) priceVal.innerText = 'Rs ' + parseInt(e.target.value).toLocaleString();
        });
        priceRange.addEventListener('change', () => { if (typeof window.applyFilters === 'function') window.applyFilters(); });
    }
    
    // Clear filters
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            sidebar.querySelectorAll('.acc-badge').forEach(b => { b.textContent = '0'; b.classList.remove('show'); });
            if (priceRange) {
                priceRange.value = 10000;
                if (priceVal) priceVal.innerText = 'Rs 10,000';
            }
            
            // Clear search bar input & active query
            const searchInput = document.querySelector('.nav-search-bar input');
            if (searchInput) searchInput.value = '';
            window.activeSearchQuery = '';
            
            // Silently clean URL
            try {
                window.history.replaceState({}, '', window.location.pathname);
            } catch(e){}

            if (typeof window.applyFilters === 'function') window.applyFilters();
        });
    }
}

window.renderProducts = function(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    const start = ((window.currentPage || 1) - 1) * window.ITEMS_PER_PAGE;
    const pageItems = list.slice(start, start + window.ITEMS_PER_PAGE);
    
    const resultCount = document.getElementById('resultCount');
    // resultCount removed
    
    const heroCount = document.getElementById('heroBookCount');
    // heroCount removed

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #64748B;">
            <h3>Koi item nahi mila</h3>
            <p>Filter clear karein ya koi doosra subject search karein.</p>
        </div>`;
        return;
    }

    grid.innerHTML = pageItems.map(b => {
        const id = b.id || '';
        const title = b.title || b.name || '';
        const author = b.author || b.brand || b.publisher || 'Study Pack';
        const price = Number(b.price || 0);
        const img = b.img || '';
        const cls = b.cls || 'Misc';
        const subj = b.subj || 'General';
        const pub = b.pub || '';
        const rating = b.rating || 5;
        const rv = b.rv || 0;
        const stock = b.stock !== false;
        const oldPrice = b.old || '';
        const tag = b.tag || '';

        let badgeHtml = '';
        if (tag === 'best') badgeHtml += '<span class="pill best">Bestseller</span>';
        if (tag === 'new') badgeHtml += '<span class="pill new">New</span>';
        if (oldPrice) badgeHtml += '<span class="pill off">-'+Math.round(100-(price/oldPrice*100))+'%</span>';

        const moneyStr = typeof window.money === 'function' ? window.money(price) : 'PKR ' + price.toLocaleString();
        const oldStr = oldPrice ? (typeof window.money === 'function' ? window.money(oldPrice) : 'PKR ' + Number(oldPrice).toLocaleString()) : '';
        const starsStr = typeof window.starString === 'function' ? window.starString(rating) : '★★★★★';

        return `
<div class="p-card" style="min-width:0; overflow:hidden;" data-id="${id}">
      <div class="p-cover-wrap">
        <div class="p-cover" style="background:${img ? '#fff' : (b.grad || 'var(--grey)')}; padding: ${img ? '0' : '10px'}">
          <div class="badges-row">
            ${badgeHtml}
          </div>
          <div class="quick-actions">
            <button class="qa-btn" title="Wishlist" onclick="showToast('Added to wishlist')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
            <button class="qa-btn" title="Quick View" onclick="openQuickView('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="qa-btn" title="Compare" onclick="showToast('Added to compare')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5"/></svg></button>
          </div>
          ${img ? `<img src="${img}" alt="${escapeHtml(title)}" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:contain; border-radius:inherit; mix-blend-mode:multiply;">` : `<div class="p-title" style="text-align:center;">${escapeHtml(title)}</div>`}
        </div>
      </div>
      <div class="p-meta" style="min-width:0;"><span>${cls}</span><span>${subj}</span></div>
      <div class="p-name">${escapeHtml(title)}</div>
      <div class="p-author">by ${escapeHtml(author)} ${pub ? '• ' + escapeHtml(pub) : ''}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:4px;">
        <div class="p-rating" style="margin-bottom:0;"><span class="stars">${starsStr}</span><span class="rv">(${rv})</span></div>
        <div class="p-stock" style="margin-bottom:0;"><span class="d" style="background:${stock ? '#2e7d32' : '#c62828'}"></span>${stock ? 'In Stock' : 'Out of Stock'}</div>
      </div>
      <div class="p-price-row">
        <div class="p-price"><span class="now">${moneyStr}</span>${oldStr ? '<span class="old">' + oldStr + '</span>' : ''}</div>
      </div>
      <div class="p-actions" style="display:flex; flex-direction:column; gap:8px;">
        <button class="btn-cart" onclick="addToCart('${id}')" style="width:100%; justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg> Add to Cart</button>
        <button class="btn-buy" onclick="addToCart('${id}'); openCart();" style="width:100%; justify-content:center;">Buy Now</button>
      </div>
    </div>`;
    }).join('');

    renderPagination(list.length);
};

function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / window.ITEMS_PER_PAGE));
    const el = document.getElementById('pagination');
    if (!el) return;
    
    const currentPage = window.currentPage || 1;
    let html = `<button class="nav-arrow" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>`;
    
    for(let i = 1; i <= pages; i++){
        if(i === 1 || i === pages || (i >= currentPage - 1 && i <= currentPage + 1)){
            html += `<button class="pg-num ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
        } else if(i === currentPage - 2 || i === currentPage + 2){
            html += `<span class="dots">...</span>`;
        }
    }
    
    html += `<button class="nav-arrow" onclick="goPage(${currentPage + 1})" ${currentPage === pages ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>`;
    el.innerHTML = html;
}

window.goPage = function(p) {
    const total = window.currentBooks ? window.currentBooks.length : 0;
    const pages = Math.max(1, Math.ceil(total / window.ITEMS_PER_PAGE));
    if (p < 1 || p > pages) return;
    
    window.currentPage = p;
    window.renderProducts(window.currentBooks || []);
    const grid = document.getElementById('productGrid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function processAndSort(filtered) {
    const sortSelect = document.getElementById('sortSelect');
    const sort = sortSelect ? sortSelect.value : 'pop';
    
    if (sort === 'low') filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === 'high') filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === 'rating') filtered.sort((a, b) => (Number(b.rating) || 5) - (Number(a.rating) || 5));
    
    window.currentBooks = filtered;
    window.currentPage = 1;
    window.renderProducts(window.currentBooks);
}

function initDynamicFilters() {
    const path = window.location.pathname.toLowerCase();
    const page = path.split('/').pop() || 'index.html';
    
    if (page.includes('toys')) {
        generateToysFilters();
    } else if (page.includes('stationery')) {
        generateStationeryFilters();
    } else {
        generateBooksFilters();
    }
}

function generateBooksFilters() {
    const rawBooks = getCatalogData('books');
    const actualBooks = rawBooks.filter(b => {
        const cat = (b.category || b.cats || '').toLowerCase();
        if (cat.includes('toy') || cat.includes('stationery')) return false;
        return true;
    });
    actualBooks.forEach(inferBookProperties);
    
    const basePubs = extractUniqueOptions(actualBooks, 'pub');
    const requestedPubs = ['Oxford Books', 'Paramount', 'Bookmark', 'Kifayat Publishers', 'Cambridge University Press', 'AFAQ Publishers', 'Spectrum Books', 'Sindh Text Book'];
    const pubs = Array.from(new Set([...requestedPubs, ...basePubs])).filter(p => p && !p.includes('Course') && !p.includes('School') && p !== 'Other' && p !== 'Other Publisher').sort();
    
    const schools = extractUniqueOptions(actualBooks, 'school').filter(s => s && s !== 'School Syllabus').sort();
    const genres = extractUniqueOptions(actualBooks, 'genre');
    const langs = extractUniqueOptions(actualBooks, 'language');
    const ages = extractUniqueOptions(actualBooks, 'age_group');
    
    let html = '';
    if (schools.length > 0) {
        html += renderSchoolCoursesFilterGroup(schools, actualBooks);
    }
    html += renderFilterGroup('Publisher', pubs, 'dyn-pub');
    html += renderFilterGroup('Subject / Genre', genres, 'dyn-genre');
    html += renderFilterGroup('Language', langs, 'dyn-lang');
    html += renderFilterGroup('General Class / Age Group', ages, 'dyn-age');
    html += getPriceRangeHtml();
    html += getAvailabilityHtml();
    
    injectSidebarHTML(html);
    
    // Pre-check filters based on URL Parameters (e.g. ?pub=Oxford or ?cat=...)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const pubParam = (urlParams.get('pub') || urlParams.get('publisher') || '').toLowerCase();
        const catParam = (urlParams.get('cat') || urlParams.get('category') || '').toLowerCase();
        
        if (pubParam) {
            document.querySelectorAll('.dyn-pub').forEach(cb => {
                if (cb.value.toLowerCase().includes(pubParam)) {
                    cb.checked = true;
                }
            });
        }
        if (catParam) {
            document.querySelectorAll('.dyn-pub, .dyn-genre').forEach(cb => {
                if (cb.value.toLowerCase().includes(catParam)) {
                    cb.checked = true;
                }
            });
        }
    } catch(e){}

    window.applyFilters = function() {
        const checkedSchools = Array.from(document.querySelectorAll('.dyn-school:checked')).map(cb => cb.value);
        const checkedClasses = Array.from(document.querySelectorAll('.dyn-school-class:checked')).map(cb => ({
            school: cb.getAttribute('data-school'),
            cls: cb.value
        }));
        const checkedPubs = Array.from(document.querySelectorAll('.dyn-pub:checked')).map(cb => cb.value);
        const checkedGenres = Array.from(document.querySelectorAll('.dyn-genre:checked')).map(cb => cb.value);
        const checkedLangs = Array.from(document.querySelectorAll('.dyn-lang:checked')).map(cb => cb.value);
        const checkedAges = Array.from(document.querySelectorAll('.dyn-age:checked')).map(cb => cb.value);
        
        const priceRangeEl = document.getElementById('priceRange');
        const maxPrice = (priceRangeEl && Number(priceRangeEl.value) > 0) ? Number(priceRangeEl.value) : 100000;
        const inStockEl = document.getElementById('inStockOnly');
        const inStockOnly = inStockEl ? inStockEl.checked : false;
        
        const query = (window.activeSearchQuery !== undefined ? window.activeSearchQuery : (new URLSearchParams(window.location.search).get('q') || '')).trim();
        
        const filtered = actualBooks.filter(b => {
            // School & Class filtering
            if (checkedSchools.length > 0) {
                if (!checkedSchools.includes(b.school)) return false;
                
                // If specific classes for this school are selected, filter strictly
                const schoolSpecificClasses = checkedClasses.filter(c => c.school === b.school).map(c => c.cls);
                if (schoolSpecificClasses.length > 0) {
                    const itemClass = (b.class_name || (Array.isArray(b.cls) ? b.cls[0] : b.cls) || '').toLowerCase().trim();
                    const titleLower = (b.title || '').toLowerCase();
                    
                    const match = schoolSpecificClasses.some(chosen => {
                        const target = chosen.toLowerCase().trim();
                        if (itemClass === target) return true;
                        
                        // Word boundary matching in title (avoid 'class 1' matching 'class 11')
                        const escaped = target.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                        const regex = new RegExp('(?:^|\\s|[^a-zA-Z0-9])' + escaped + '(?:$|\\s|[^a-zA-Z0-9])', 'i');
                        if (regex.test(titleLower)) {
                            if (target === 'class 1' && (titleLower.includes('class 10') || titleLower.includes('class 11') || titleLower.includes('class 12'))) {
                                return false;
                            }
                            return true;
                        }
                        return false;
                    });
                    
                    if (!match) return false;
                }
            } else if (checkedClasses.length > 0) {
                // If classes selected without school checkbox checked
                const itemClass = (b.class_name || (Array.isArray(b.cls) ? b.cls[0] : b.cls) || '').toLowerCase().trim();
                const titleLower = (b.title || '').toLowerCase();
                const match = checkedClasses.some(c => {
                    const target = c.cls.toLowerCase().trim();
                    return itemClass === target || titleLower.includes(target);
                });
                if (!match) return false;
            }

            // Publisher filtering (smart matching)
            if (checkedPubs.length > 0) {
                const bTitle = (b.title || '').toLowerCase();
                const bPub = (b.pub || b.publisher || '').toLowerCase();
                const bId = String(b.id || '').toLowerCase();
                const bAuthor = String(b.author || '').toLowerCase();
                const bCls = (Array.isArray(b.cls) ? b.cls.join(' ') : String(b.cls || '')).toLowerCase();
                
                const matchPub = checkedPubs.some(chosen => {
                    const c = chosen.toLowerCase();
                    if (c.includes('oxford') || c.includes('oup')) {
                        return bPub.includes('oxford') || bPub.includes('oup') || bId.includes('oup_') || bTitle.includes('oxford') || bCls.includes('oxford');
                    }
                    if (c.includes('paramount')) {
                        return bPub.includes('paramount') || bId.includes('paramount') || bTitle.includes('paramount');
                    }
                    if (c.includes('bookmark') || c.includes('book mark')) {
                        return bPub.includes('bookmark') || bId.includes('bookmark') || bTitle.includes('bookmark') || bPub.includes('book mark');
                    }
                    if (c.includes('kifayat')) {
                        return bPub.includes('kifayat') || bId.includes('kifayat') || bTitle.includes('kifayat');
                    }
                    if (c.includes('cambridge')) {
                        return bPub.includes('cambridge') || bTitle.includes('cambridge') || bAuthor.includes('cambridge') || bId.includes('cambridge');
                    }
                    if (c.includes('eri')) {
                        return bPub.includes('eri') || bTitle.includes('eri') || bCls.includes('eri');
                    }
                    if (c.includes('afaq')) {
                        return bPub.includes('afaq') || bTitle.includes('afaq') || bId.includes('afaq');
                    }
                    if (c.includes('spectrum')) {
                        return bPub.includes('spectrum') || bTitle.includes('spectrum');
                    }
                    if (c.includes('sindh') || c.includes('stbb')) {
                        return bPub.includes('sindh') || bTitle.includes('sindh') || bTitle.includes('stbb') || bTitle.includes('jamshoro');
                    }
                    if (c.includes('general')) {
                        return bPub.includes('general') || (!bPub.includes('oxford') && !bPub.includes('paramount') && !bPub.includes('bookmark') && !bPub.includes('kifayat') && !bPub.includes('cambridge') && !bPub.includes('afaq') && !bPub.includes('spectrum') && !bPub.includes('sindh'));
                    }
                    return bPub === c || bPub.includes(c) || bTitle.includes(c);
                });
                
                if (!matchPub) return false;
            }
            if (checkedGenres.length > 0 && !checkedGenres.includes(b.genre)) return false;
            if (checkedLangs.length > 0 && !checkedLangs.includes(b.language)) return false;
            if (checkedAges.length > 0 && !checkedAges.includes(b.age_group)) return false;
            if (Number(b.price || 0) > maxPrice) return false;
            if (inStockOnly && b.stock === false) return false;
            
            // Smart Search Match
            if (query) {
                if (typeof window.smartMatchItem === 'function') {
                    if (!window.smartMatchItem(b, query)) return false;
                } else {
                    const searchStr = `${b.title||''} ${b.cls||''} ${b.pub||''} ${b.school||''} ${b.genre||''} ${b.author||''} ${b.subj||''}`.toLowerCase();
                    if (!searchStr.includes(query.toLowerCase())) return false;
                }
            }
            return true;
        });

        // Deduplicate identical books in general catalog view so customers do not see duplicate entries
        let displayList = filtered;
        if (checkedSchools.length === 0 && checkedClasses.length === 0) {
            const seenTitles = new Set();
            displayList = [];
            for (const b of filtered) {
                const normTitle = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!seenTitles.has(normTitle)) {
                    seenTitles.add(normTitle);
                    displayList.push(b);
                }
            }
        }
        
        // If searching, sort by relevance score
        if (query && typeof window.smartItemScore === 'function') {
            displayList.sort((a, b) => window.smartItemScore(b, query) - window.smartItemScore(a, query));
        }

        processAndSort(displayList);
    };
    
    window.applyFilters();
}

function generateStationeryFilters() {
    const rawStat = getCatalogData('stationery');
    rawStat.forEach(inferStationeryProperties);
    
    const types = extractUniqueOptions(rawStat, 'item_type');
    let html = '';
    html += renderFilterGroup('Product Type', types, 'dyn-type');
    html += getPriceRangeHtml();
    html += getAvailabilityHtml();
    
    injectSidebarHTML(html);
    
    window.applyFilters = function() {
        const checkedTypes = Array.from(document.querySelectorAll('.dyn-type:checked')).map(cb => cb.value);
        const priceRangeEl = document.getElementById('priceRange');
        const maxPrice = (priceRangeEl && Number(priceRangeEl.value) > 0) ? Number(priceRangeEl.value) : 100000;
        const inStockEl = document.getElementById('inStockOnly');
        const inStockOnly = inStockEl ? inStockEl.checked : false;
        const query = (window.activeSearchQuery !== undefined ? window.activeSearchQuery : (new URLSearchParams(window.location.search).get('q') || '')).trim();
        
        const filtered = rawStat.filter(b => {
            if (checkedTypes.length > 0 && !checkedTypes.includes(b.item_type)) return false;
            if (Number(b.price || 0) > maxPrice) return false;
            if (inStockOnly && b.stock === false) return false;
            if (query) {
                if (typeof window.smartMatchItem === 'function') {
                    if (!window.smartMatchItem(b, query)) return false;
                } else {
                    const searchStr = `${b.title||''} ${b.item_type||''} ${b.brand||''}`.toLowerCase();
                    if (!searchStr.includes(query.toLowerCase())) return false;
                }
            }
            return true;
        });
        
        if (query && typeof window.smartItemScore === 'function') {
            filtered.sort((a, b) => window.smartItemScore(b, query) - window.smartItemScore(a, query));
        }

        processAndSort(filtered);
    };
    
    window.applyFilters();
}

function generateToysFilters() {
    const rawToys = getCatalogData('toys');
    rawToys.forEach(inferToysProperties);
    
    const types = extractUniqueOptions(rawToys, 'item_type');
    let html = '';
    html += renderFilterGroup('Toy Type', types, 'dyn-type');
    html += getPriceRangeHtml();
    html += getAvailabilityHtml();
    
    injectSidebarHTML(html);
    
    window.applyFilters = function() {
        const checkedTypes = Array.from(document.querySelectorAll('.dyn-type:checked')).map(cb => cb.value);
        const priceRangeEl = document.getElementById('priceRange');
        const maxPrice = (priceRangeEl && Number(priceRangeEl.value) > 0) ? Number(priceRangeEl.value) : 100000;
        const inStockEl = document.getElementById('inStockOnly');
        const inStockOnly = inStockEl ? inStockEl.checked : false;
        const query = (window.activeSearchQuery !== undefined ? window.activeSearchQuery : (new URLSearchParams(window.location.search).get('q') || '')).trim();
        
        const filtered = rawToys.filter(b => {
            if (checkedTypes.length > 0 && !checkedTypes.includes(b.item_type)) return false;
            if (Number(b.price || 0) > maxPrice) return false;
            if (inStockOnly && b.stock === false) return false;
            if (query) {
                if (typeof window.smartMatchItem === 'function') {
                    if (!window.smartMatchItem(b, query)) return false;
                } else {
                    const searchStr = `${b.title||''} ${b.item_type||''} ${b.brand||''}`.toLowerCase();
                    if (!searchStr.includes(query.toLowerCase())) return false;
                }
            }
            return true;
        });
        
        if (query && typeof window.smartItemScore === 'function') {
            filtered.sort((a, b) => window.smartItemScore(b, query) - window.smartItemScore(a, query));
        }

        processAndSort(filtered);
    };
    
    window.applyFilters();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Auto init on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    initDynamicFilters();
    setTimeout(initDynamicFilters, 250);
});

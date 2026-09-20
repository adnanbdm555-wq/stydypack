/* ============================================================
   Categories Module — Dynamic Catalog Categories & Custom Manager
   ============================================================ */

const DEFAULT_CATEGORIES = [
    { name: 'School Syllabi & Course Packs', type: 'Course Set', icon: 'graduation-cap' },
    { name: 'Oxford University Press (OUP)', type: 'Publisher', icon: 'book-open' },
    { name: 'Cambridge Assessment International', type: 'Curriculum', icon: 'award' },
    { name: 'Paramount Books', type: 'Publisher', icon: 'bookmark' },
    { name: 'Bookmark Pakistan', type: 'Publisher', icon: 'book' },
    { name: 'Kifayat Publishers', type: 'Publisher', icon: 'book-open' },
    { name: 'Spectrum Series', type: 'Publisher', icon: 'layers' },
    { name: 'AFAQ Publishers', type: 'Publisher', icon: 'book' },
    { name: 'Early Learning & Pre-School', type: 'Grade Level', icon: 'smile' },
    { name: 'Primary Classes (1 - 5)', type: 'Grade Level', icon: 'users' },
    { name: 'Middle Classes (6 - 8)', type: 'Grade Level', icon: 'user-check' },
    { name: 'Secondary & Matric (9 - 10)', type: 'Grade Level', icon: 'file-text' },
    { name: 'O / A Levels', type: 'Curriculum', icon: 'compass' },
    { name: 'Stationery & School Supplies', type: 'Stationery', icon: 'edit' },
    { name: 'Educational Toys & Learning Games', type: 'Toys', icon: 'gift' }
];

function getCategoryProductCount(catName) {
    let count = 0;
    const nameLow = catName.toLowerCase();

    if (nameLow.includes('school syllabi') || nameLow.includes('course')) {
        return (typeof SCRAPED_COURSES !== 'undefined') ? SCRAPED_COURSES.length : 2434;
    }
    if (nameLow.includes('stationery')) {
        return (typeof SCRAPED_STATIONERY !== 'undefined') ? SCRAPED_STATIONERY.length : 250;
    }
    if (nameLow.includes('toy')) {
        return (typeof SCRAPED_TOYS !== 'undefined') ? SCRAPED_TOYS.length : 90;
    }

    if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) {
        if (nameLow.includes('oxford') || nameLow.includes('oup')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('oxford') || (b.title || '').toLowerCase().includes('oxford')).length;
        }
        if (nameLow.includes('cambridge')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('cambridge') || (b.title || '').toLowerCase().includes('cambridge')).length;
        }
        if (nameLow.includes('paramount')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('paramount') || (b.title || '').toLowerCase().includes('paramount')).length;
        }
        if (nameLow.includes('bookmark')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('bookmark') || (b.title || '').toLowerCase().includes('bookmark')).length;
        }
        if (nameLow.includes('kifayat')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('kifayat') || (b.title || '').toLowerCase().includes('kifayat') || String(b.id || '').toLowerCase().includes('kifayat')).length;
        }
        if (nameLow.includes('spectrum')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('spectrum') || (b.title || '').toLowerCase().includes('spectrum')).length;
        }
        if (nameLow.includes('afaq')) {
            return SCRAPED_BOOKS.filter(b => (b.publisher || '').toLowerCase().includes('afaq') || (b.title || '').toLowerCase().includes('afaq')).length;
        }
        if (nameLow.includes('early learning') || nameLow.includes('pre-school')) {
            return SCRAPED_BOOKS.filter(b => ['nursery', 'kg', 'playgroup', 'step-1', 'step 1'].some(k => (b.title || '').toLowerCase().includes(k))).length;
        }
        if (nameLow.includes('primary')) {
            return SCRAPED_BOOKS.filter(b => ['class 1', 'class 2', 'class 3', 'class 4', 'class 5', 'book 1', 'book 2', 'book 3', 'book 4', 'book 5'].some(k => (b.title || '').toLowerCase().includes(k))).length;
        }
        if (nameLow.includes('middle')) {
            return SCRAPED_BOOKS.filter(b => ['class 6', 'class 7', 'class 8', 'book 6', 'book 7', 'book 8'].some(k => (b.title || '').toLowerCase().includes(k))).length;
        }
        if (nameLow.includes('matric') || nameLow.includes('secondary')) {
            return SCRAPED_BOOKS.filter(b => ['class 9', 'class 10', 'matric'].some(k => (b.title || '').toLowerCase().includes(k))).length;
        }
        if (nameLow.includes('o / a level') || nameLow.includes('o-level') || nameLow.includes('a-level')) {
            return SCRAPED_BOOKS.filter(b => ['o level', 'a level', 'igcse', 'cambridge'].some(k => (b.title || '').toLowerCase().includes(k))).length;
        }
    }
    return 150;
}

window.renderCategories = function() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    // Load custom categories from local storage or Firestore
    const customCats = JSON.parse(localStorage.getItem('sp_custom_categories') || '[]');
    const firestoreCats = (window.AppData && window.AppData.categories) || [];
    
    // Combine defaults with custom
    const allCategories = [...DEFAULT_CATEGORIES];
    [...customCats, ...firestoreCats].forEach(cc => {
        if (!allCategories.some(c => c.name.toLowerCase() === cc.name.toLowerCase())) {
            allCategories.push(cc);
        }
    });

    tbody.innerHTML = allCategories.map((c, idx) => {
        const count = getCategoryProductCount(c.name);
        const isCustom = idx >= DEFAULT_CATEGORIES.length;
        return `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:6px; background:rgba(37,99,235,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">
                        🏷️
                    </div>
                    <div style="font-weight:600; color:var(--text-main); font-size:13.5px;">${escapeHtml(c.name)}</div>
                </div>
            </td>
            <td><span class="badge" style="background:rgba(59,130,246,0.1); color:#3B82F6; font-size:11.5px; font-weight:700;">${escapeHtml(c.type || 'Category')}</span></td>
            <td><strong style="color:var(--text-main); font-size:13px;">${count.toLocaleString()} Products</strong></td>
            <td style="text-align:right;">
                ${isCustom ? `
                    <button class="icon-btn-sm text-danger" onclick="deleteCategory('${escapeHtml(c.name)}')" title="Delete"><i data-lucide="trash-2"></i></button>
                ` : `
                    <span class="badge badge-success" style="font-size:11px;">Active System Category</span>
                `}
            </td>
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openCategoryModal = function() {
    document.getElementById('categoryForm')?.reset();
    document.getElementById('categoryModal')?.classList.add('show');
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal')?.classList.remove('show');
};

document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('categoryName').value.trim();
    const type = document.getElementById('categoryType').value;
    if (!name) return;

    const customCats = JSON.parse(localStorage.getItem('sp_custom_categories') || '[]');
    customCats.push({ name, type });
    localStorage.setItem('sp_custom_categories', JSON.stringify(customCats));

    if (typeof db !== 'undefined') {
        try {
            await db.collection('categories').add({ name, type });
        } catch(e){}
    }

    showToast('Category created successfully!');
    closeCategoryModal();
    window.renderCategories();
});

window.deleteCategory = function(name) {
    if (!confirm(`Delete category "${name}"?`)) return;
    let customCats = JSON.parse(localStorage.getItem('sp_custom_categories') || '[]');
    customCats = customCats.filter(c => c.name !== name);
    localStorage.setItem('sp_custom_categories', JSON.stringify(customCats));
    showToast('Category removed');
    window.renderCategories();
};

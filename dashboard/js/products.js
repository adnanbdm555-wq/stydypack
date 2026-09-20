/* ============================================================
   Products module — Full 6,300+ Catalog Search, Edit, Create,
   Image Upload, LocalStorage & Firestore Live Sync.
   ============================================================ */

const PRODUCTS_PER_PAGE = 15;
let __productsPage = 1;

function getAllCombinedProducts() {
    let list = [];
    
    // Helper to infer clean publisher
    function detectPublisher(item) {
        const rawPub = (item.pub || item.publisher || '').toLowerCase();
        const t = (item.title || '').toLowerCase();
        const id = String(item.id || '').toLowerCase();
        const author = String(item.author || '').toLowerCase();

        if (rawPub.includes('oxford') || rawPub.includes('oup') || id.includes('oup_') || t.includes('oxford')) return 'Oxford Books';
        if (rawPub.includes('paramount') || id.includes('paramount') || t.includes('paramount')) return 'Paramount';
        if (rawPub.includes('bookmark') || id.includes('bookmark') || t.includes('bookmark')) return 'Bookmark';
        if (rawPub.includes('kifayat') || id.includes('kifayat') || t.includes('kifayat')) return 'Kifayat Publishers';
        if (rawPub.includes('cambridge') || t.includes('cambridge') || author.includes('cambridge') || id.includes('cambridge')) return 'Cambridge University Press';
        if (rawPub.includes('afaq') || id.includes('afaq') || t.includes('afaq')) return 'AFAQ Publishers';
        if (rawPub.includes('spectrum') || t.includes('spectrum')) return 'Spectrum Books';
        if (rawPub.includes('sindh') || t.includes('sindh') || t.includes('stbb') || t.includes('jamshoro')) return 'Sindh Text Book';
        if (item.school) return item.school + ' Course';
        if (item.pub && item.pub !== 'Books' && item.pub !== 'School Books' && item.pub !== 'Other') return item.pub;
        return 'General Publisher';
    }

    // 1. Gather all static catalog products
    if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) {
        list = list.concat(SCRAPED_BOOKS.map(b => {
            const pubName = detectPublisher(b);
            return {
                id: String(b.id),
                title: b.title || '',
                category: 'Books',
                price: Number(b.price) || 0,
                purchase_price: Number(b.purchase_price) || 0,
                d_price: b.d_price ? Number(b.d_price) : null,
                pub: pubName,
                publisher: pubName,
                province: pubName,
                cls: b.cls || b.grade || '',
                subj: b.subject || b.subj || '',
                img: b.img || '',
                stock: b.stock !== false && b.inStock !== false
            };
        }));
    }

    if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) {
        list = list.concat(SCRAPED_COURSES.map(c => ({
            id: String(c.id),
            title: `${c.school ? c.school + ' - ' : ''}${c.title || ''}`,
            category: 'School Courses',
            price: Number(c.price) || 0,
            purchase_price: 0,
            d_price: null,
            pub: c.school ? (c.school + ' Course') : 'School Syllabus',
            publisher: c.school ? (c.school + ' Course') : 'School Syllabus',
            province: c.school || '',
            cls: c.cls || c.grade || '',
            subj: 'Course Pack',
            img: c.img || '../assets/images/studypack_logo.png',
            stock: c.inStock !== false
        })));
    }

    if (typeof SCRAPED_STATIONERY !== 'undefined' && Array.isArray(SCRAPED_STATIONERY)) {
        list = list.concat(SCRAPED_STATIONERY.map(s => ({
            id: String(s.id),
            title: s.title || '',
            category: 'Stationery',
            price: Number(s.price) || 0,
            purchase_price: 0,
            d_price: null,
            pub: 'Stationery',
            publisher: 'Stationery',
            province: '',
            cls: 'General',
            subj: 'Stationery',
            img: s.img || '',
            stock: s.stock !== false
        })));
    }

    if (typeof SCRAPED_TOYS !== 'undefined' && Array.isArray(SCRAPED_TOYS)) {
        list = list.concat(SCRAPED_TOYS.map(t => ({
            id: String(t.id),
            title: t.title || '',
            category: 'Toys & Gifts',
            price: Number(t.price) || 0,
            purchase_price: 0,
            d_price: null,
            pub: 'Educational Toys',
            publisher: 'Educational Toys',
            province: '',
            cls: 'General',
            subj: 'Toys',
            img: t.img || '',
            stock: t.stock !== false
        })));
    }

    if (typeof SCRAPED_AFAQ !== 'undefined' && Array.isArray(SCRAPED_AFAQ)) {
        list = list.concat(SCRAPED_AFAQ.map(a => ({
            id: String(a.id),
            title: a.title || '',
            category: 'Books',
            price: Number(a.price) || 0,
            purchase_price: 0,
            d_price: null,
            pub: 'AFAQ Publishers',
            publisher: 'AFAQ Publishers',
            province: 'AFAQ Publishers',
            cls: a.cls || 'General',
            subj: 'Academic',
            img: a.img || '',
            stock: a.stock !== false
        })));
    }

    // 2. Merge custom added products from LocalStorage
    const customProds = JSON.parse(localStorage.getItem('sp_custom_products') || '[]');
    if (customProds && customProds.length > 0) {
        list = customProds.concat(list);
    }

    // 3. Merge LocalStorage Overrides
    const overrides = JSON.parse(localStorage.getItem('sp_product_overrides') || '{}');
    const stockOverrides = JSON.parse(localStorage.getItem('sp_stock_overrides') || '{}');

    list = list.map(item => {
        let updated = { ...item };
        if (overrides[item.id]) {
            updated = { ...updated, ...overrides[item.id] };
        }
        if (stockOverrides[item.id] !== undefined) {
            updated.stock = stockOverrides[item.id];
        }
        return updated;
    });

    // 4. Merge Firestore products if any
    const firestoreProds = (window.AppData && window.AppData.products) || [];
    if (firestoreProds.length > 0) {
        firestoreProds.forEach(fp => {
            const idx = list.findIndex(x => String(x.id) === String(fp.id));
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...fp };
            } else {
                list.unshift(fp);
            }
        });
    }

    return list;
}

function populateCategoryFilters() {
    const pubSel = document.getElementById('filterPublisher');
    const clsSel = document.getElementById('filterClass');
    if (!clsSel) return;

    const currentPub = pubSel ? pubSel.value : '';
    const currentCls = clsSel.value;

    const products = getAllCombinedProducts();
    const dynamicPubs = products.map(p => p.pub || p.publisher).filter(Boolean);
    const pubs = [...new Set(dynamicPubs)].filter(p => p !== 'Stationery' && p !== 'Educational Toys').sort();
    const classes = [...new Set(products.map(p => p.cls).filter(Boolean))].sort();

    const keepFirst = (sel) => sel && sel.options[0] ? sel.options[0].outerHTML : '';
    if (pubSel) {
        pubSel.innerHTML = keepFirst(pubSel) + pubs.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        if (currentPub) pubSel.value = currentPub;
    }
    clsSel.innerHTML = keepFirst(clsSel) + classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (currentCls) clsSel.value = currentCls;
}

function formatImgUrl(url) {
    if (!url) return 'https://placehold.co/100x100?text=No+Image';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('../')) return url;
    if (url.startsWith('/')) return '..' + url;
    return '../' + url;
}

window.renderProducts = function() {
    const tbody = document.getElementById('productsTbody');
    if (!tbody) return;

    populateCategoryFilters();

    let products = getAllCombinedProducts();
    const search = (document.getElementById('prodSearch')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('filterCategory')?.value;
    const pub = document.getElementById('filterPublisher')?.value;
    const cls = document.getElementById('filterClass')?.value;
    const stockFilter = document.getElementById('filterStock')?.value;

    products = products.filter(p => {
        if (search) {
            const combined = `${p.title} ${p.id} ${p.category} ${p.pub||''} ${p.subj||''} ${p.cls||''}`.toLowerCase();
            if (!combined.includes(search)) return false;
        }
        if (cat && p.category !== cat) return false;
        if (pub) {
            const chosen = pub.toLowerCase();
            const bTitle = (p.title || '').toLowerCase();
            const bPub = (p.pub || p.publisher || '').toLowerCase();
            const bId = String(p.id || '').toLowerCase();
            
            let matches = false;
            if (chosen.includes('oxford') || chosen.includes('oup')) {
                matches = bPub.includes('oxford') || bPub.includes('oup') || bId.includes('oup_') || bTitle.includes('oxford');
            } else if (chosen.includes('paramount')) {
                matches = bPub.includes('paramount') || bId.includes('paramount') || bTitle.includes('paramount');
            } else if (chosen.includes('bookmark') || chosen.includes('book mark')) {
                matches = bPub.includes('bookmark') || bId.includes('bookmark') || bTitle.includes('bookmark') || bPub.includes('book mark');
            } else if (chosen.includes('kifayat')) {
                matches = bPub.includes('kifayat') || bId.includes('kifayat') || bTitle.includes('kifayat');
            } else if (chosen.includes('cambridge')) {
                matches = bPub.includes('cambridge') || bTitle.includes('cambridge') || bId.includes('cambridge');
            } else if (chosen.includes('afaq')) {
                matches = bPub.includes('afaq') || bTitle.includes('afaq') || bId.includes('afaq');
            } else if (chosen.includes('spectrum')) {
                matches = bPub.includes('spectrum') || bTitle.includes('spectrum');
            } else if (chosen.includes('sindh')) {
                matches = bPub.includes('sindh') || bTitle.includes('sindh') || bTitle.includes('stbb') || bTitle.includes('jamshoro');
            } else {
                matches = (p.pub === pub || p.publisher === pub || bPub.includes(chosen));
            }
            if (!matches) return false;
        }
        if (cls && p.cls !== cls) return false;
        if (stockFilter === 'in' && p.stock === false) return false;
        if (stockFilter === 'out' && p.stock !== false) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
    if (__productsPage > totalPages) __productsPage = totalPages;
    const pageItems = products.slice((__productsPage - 1) * PRODUCTS_PER_PAGE, __productsPage * PRODUCTS_PER_PAGE);

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="package-x"></i><p>No products found</p></div></td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map(p => {
            const imgSrc = formatImgUrl(p.img);
            return `
            <tr>
                <td><img src="${escapeHtml(imgSrc)}" onerror="this.src='https://placehold.co/100x100?text=No+Image'" style="width:44px;height:44px;object-fit:contain;background:#f8fafc;border:1px solid var(--border-color);border-radius:8px;"></td>
                <td>
                    <div style="font-weight:600; color:var(--text-main); font-size:13.5px;">${escapeHtml(p.title)}</div>
                    <div class="text-muted mono" style="font-size:0.75rem;">ID: ${escapeHtml(p.id || 'N/A')}</div>
                </td>
                <td>
                    <span class="badge badge-info" style="font-size:11.5px; font-weight:700;">${escapeHtml(p.category || 'Books')}</span>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px; font-weight:600;">${escapeHtml(p.pub || p.publisher || 'General')}</div>
                    ${p.subj ? `<div class="text-muted" style="font-size:0.72rem;">${escapeHtml(p.cls || '')} • ${escapeHtml(p.subj)}</div>` : ''}
                </td>
                <td>
                    <strong style="color:var(--gold); font-size:13.5px;">PKR ${Number(p.price).toLocaleString()}</strong>
                    ${p.d_price ? `<del class="text-muted" style="font-size:0.75rem; margin-left:4px;">PKR ${Number(p.d_price).toLocaleString()}</del>` : ''}
                </td>
                <td>${p.stock !== false ? `<span class="badge badge-success">In Stock</span>` : `<span class="badge badge-danger">Out of Stock</span>`}</td>
                <td style="text-align:right;">
                    <button class="icon-btn-sm" onclick="openProductModal('${escapeHtml(p.id)}')" title="Edit"><i data-lucide="edit-2"></i></button>
                    <button class="icon-btn-sm danger" onclick="deleteProduct('${escapeHtml(p.id)}')" title="Delete"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    renderPagination('productsPagination', products.length, __productsPage, totalPages, (p) => { __productsPage = p; window.renderProducts(); });
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function renderPagination(containerId, totalItems, currentPage, totalPages, onPage) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (totalItems === 0) { el.innerHTML = ''; return; }

    let btns = '';
    const maxBtns = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);
    for (let i = start; i <= end; i++) {
        btns += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    el.innerHTML = `
        <span class="page-info">${totalItems.toLocaleString()} total</span>
        <div class="page-btns">
            <button data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
            ${btns}
            <button data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
        </div>`;

    el.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.page;
            if (val === 'prev') onPage(Math.max(1, currentPage - 1));
            else if (val === 'next') onPage(Math.min(totalPages, currentPage + 1));
            else onPage(Number(val));
        });
    });
}
window.renderPagination = renderPagination;

document.addEventListener('DOMContentLoaded', () => {
    ['prodSearch', 'filterCategory', 'filterClass', 'filterStock'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => { __productsPage = 1; window.renderProducts(); });
        document.getElementById(id)?.addEventListener('change', () => { __productsPage = 1; window.renderProducts(); });
    });
});

/* ---------------- Modal ---------------- */
window.openProductModal = function(prodId) {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    
    // Always reset form fields first
    document.getElementById('productForm')?.reset();
    document.getElementById('prodImgFile').value = '';
    document.getElementById('prodId').value = '';
    document.getElementById('prodImg').value = '';
    document.getElementById('prodImgPreview').src = 'https://placehold.co/80x80';
    document.getElementById('prodStock').checked = true;

    if (prodId) {
        document.getElementById('modalTitle').textContent = 'Edit Product';
        const allProds = getAllCombinedProducts();
        const p = allProds.find(x => String(x.id) === String(prodId));
        
        if (p) {
            document.getElementById('prodId').value = p.id;
            document.getElementById('prodTitle').value = p.title || '';
            document.getElementById('prodCategory').value = p.category || 'Books';
            document.getElementById('prodPrice').value = p.price || '';
            document.getElementById('prodPurchasePrice').value = p.purchase_price || '';
            document.getElementById('prodDiscPrice').value = p.d_price || '';
            const pubVal = p.pub || p.publisher || p.province || '';
            if (document.getElementById('prodPublisher')) document.getElementById('prodPublisher').value = pubVal;
            if (document.getElementById('prodProvince')) document.getElementById('prodProvince').value = pubVal;
            document.getElementById('prodClass').value = p.cls || '';
            document.getElementById('prodSubject').value = p.subj || '';
            document.getElementById('prodImg').value = p.img || '';
            document.getElementById('prodImgPreview').src = formatImgUrl(p.img);
            document.getElementById('prodStock').checked = p.stock !== false;
            calculateMargin();
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Product';
        calculateMargin();
    }
    
    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeProductModal = function() {
    document.getElementById('productModal')?.classList.remove('show');
};

document.getElementById('prodImgFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => { document.getElementById('prodImgPreview').src = evt.target.result; };
    reader.readAsDataURL(file);
});

window.calculateMargin = function() {
    const p = parseFloat(document.getElementById('prodPurchasePrice').value) || 0;
    const s = parseFloat(document.getElementById('prodPrice').value) || 0;
    const display = document.getElementById('marginDisplay');
    if (!display) return;
    if (s > 0 && p > 0) {
        const profit = s - p;
        const margin = ((profit / s) * 100).toFixed(1);
        display.textContent = `Profit Margin: ${margin}% (Rs. ${profit.toLocaleString()})`;
        display.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
    } else {
        display.textContent = 'Profit Margin: 0% (Rs. 0)';
        display.style.color = 'var(--text-secondary)';
    }
};

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;

    try {
        const id = document.getElementById('prodId').value || ('prod_' + Date.now());
        let imageUrl = document.getElementById('prodImg').value;

        const fileInput = document.getElementById('prodImgFile');
        if (fileInput && fileInput.files.length > 0) {
            btn.textContent = 'Uploading Image...';
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('image', file);
            const imgBB_API_KEY = 'f14a4449997d84ded74a12b023bc2a02';
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) imageUrl = result.data.url;
            else throw new Error('Image upload failed: ' + (result.error ? result.error.message : 'Unknown error'));
        }

        btn.textContent = 'Saving...';
        const data = {
            id: id.toString(),
            title: document.getElementById('prodTitle').value.trim(),
            price: Number(document.getElementById('prodPrice').value) || 0,
            purchase_price: Number(document.getElementById('prodPurchasePrice').value) || 0,
            d_price: document.getElementById('prodDiscPrice').value ? Number(document.getElementById('prodDiscPrice').value) : null,
            pub: (document.getElementById('prodPublisher')?.value || document.getElementById('prodProvince')?.value || '').trim(),
            publisher: (document.getElementById('prodPublisher')?.value || document.getElementById('prodProvince')?.value || '').trim(),
            province: (document.getElementById('prodPublisher')?.value || document.getElementById('prodProvince')?.value || '').trim(),
            cls: document.getElementById('prodClass').value.trim(),
            subj: document.getElementById('prodSubject').value.trim(),
            img: imageUrl || '',
            stock: document.getElementById('prodStock').checked,
            category: document.getElementById('prodCategory').value || 'Books',
            updatedAt: Date.now()
        };

        // 1. If this is a newly created product, add to sp_custom_products
        let customProds = JSON.parse(localStorage.getItem('sp_custom_products') || '[]');
        const existingIdx = customProds.findIndex(x => String(x.id) === String(id));
        if (existingIdx >= 0) {
            customProds[existingIdx] = { ...customProds[existingIdx], ...data };
        } else if (!document.getElementById('prodId').value) {
            // New custom product
            customProds.unshift(data);
        }
        localStorage.setItem('sp_custom_products', JSON.stringify(customProds));

        // 2. Save override locally for instant UI update & storefront sync
        const overrides = JSON.parse(localStorage.getItem('sp_product_overrides') || '{}');
        overrides[id] = data;
        localStorage.setItem('sp_product_overrides', JSON.stringify(overrides));

        // 2. Also save stock status
        const stockOverrides = JSON.parse(localStorage.getItem('sp_stock_overrides') || '{}');
        stockOverrides[id] = data.stock;
        localStorage.setItem('sp_stock_overrides', JSON.stringify(stockOverrides));

        // 3. Save to Firestore if database is initialized
        if (typeof db !== 'undefined') {
            try {
                await db.collection('products').doc(id).set(data, { merge: true });
            } catch(dbErr) {
                console.warn('Firestore sync note:', dbErr.message);
            }
        }

        showToast('Product saved and synced successfully!');
        closeProductModal();
        window.renderProducts();
    } catch (err) {
        console.error(err);
        showToast('Error saving product: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

window.deleteProduct = async function(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
        const overrides = JSON.parse(localStorage.getItem('sp_product_overrides') || '{}');
        overrides[id] = { deleted: true };
        localStorage.setItem('sp_product_overrides', JSON.stringify(overrides));

        if (typeof db !== 'undefined') {
            try {
                await db.collection('products').doc(String(id)).delete();
            } catch(e){}
        }
        showToast('Product deleted');
        window.renderProducts();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
};

window.exportProductsCSV = function() {
    const products = getAllCombinedProducts();
    if (products.length === 0) return showToast('No products to export', 'error');
    let csv = 'ID,Title,Category,Class,Subject,Purchase Price,Sale Price,In Stock\n';
    products.forEach(p => {
        csv += `"${p.id}","${(p.title || '').replace(/"/g, '""')}","${p.category || ''}","${p.cls || ''}","${p.subj || ''}",${p.purchase_price || 0},${p.price || 0},${p.stock !== false ? 'Yes' : 'No'}\n`;
    });
    downloadCSV(csv, `Products_Export_${new Date().toISOString().split('T')[0]}.csv`);
};

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
window.downloadCSV = downloadCSV;

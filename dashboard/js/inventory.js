/* ============================================================
   Inventory Module — Complete 6,300+ Catalog Stock Management
   ============================================================ */

let invCurrentPage = 1;
const INV_PER_PAGE = 20;

function getAllInventoryProducts() {
    let all = [];
    
    if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) {
        all = all.concat(SCRAPED_BOOKS.map(b => ({
            id: String(b.id),
            title: b.title || 'Product',
            category: b.category || b.cls || 'General Books',
            price: Number(b.price) || 0,
            type: 'book'
        })));
    }
    
    if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) {
        all = all.concat(SCRAPED_COURSES.map(c => ({
            id: String(c.id),
            title: `${c.school} - ${c.title}`,
            category: `Course (${c.school})`,
            price: Number(c.price) || 0,
            type: 'course'
        })));
    }

    if (typeof SCRAPED_STATIONERY !== 'undefined' && Array.isArray(SCRAPED_STATIONERY)) {
        all = all.concat(SCRAPED_STATIONERY.map(s => ({
            id: String(s.id),
            title: s.title || 'Stationery Item',
            category: 'Stationery',
            price: Number(s.price) || 0,
            type: 'stationery'
        })));
    }

    if (typeof SCRAPED_TOYS !== 'undefined' && Array.isArray(SCRAPED_TOYS)) {
        all = all.concat(SCRAPED_TOYS.map(t => ({
            id: String(t.id),
            title: t.title || 'Toy / Game',
            category: 'Toys & Gifts',
            price: Number(t.price) || 0,
            type: 'toy'
        })));
    }

    // Merge stock overrides
    const stockOverrides = JSON.parse(localStorage.getItem('sp_stock_overrides') || '{}');
    all.forEach(item => {
        if (stockOverrides[item.id] !== undefined) {
            item.stock = stockOverrides[item.id];
        } else {
            item.stock = true;
        }
    });

    return all;
}

window.renderInventory = function() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const allProducts = getAllInventoryProducts();
    const search = (document.getElementById('invSearch')?.value || '').toLowerCase().trim();
    const filter = document.getElementById('invStockFilter')?.value || 'all';

    let filtered = allProducts.filter(p => {
        if (search && !p.title.toLowerCase().includes(search) && !p.id.toLowerCase().includes(search)) return false;
        if (filter === 'in' && p.stock === false) return false;
        if (filter === 'out' && p.stock !== false) return false;
        return true;
    });

    const totalCount = filtered.length;
    const countEl = document.getElementById('invTotalCount');
    if (countEl) countEl.textContent = `${totalCount.toLocaleString()} Items`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Koi product nahi mila</p></div></td></tr>`;
        return;
    }

    const start = (invCurrentPage - 1) * INV_PER_PAGE;
    const paginated = filtered.slice(start, start + INV_PER_PAGE);

    tbody.innerHTML = paginated.map(p => {
        const inStock = p.stock !== false;
        return `
        <tr class="${!inStock ? 'low-stock-row' : ''}">
            <td>
                <div style="font-weight:600; color:var(--text-main); font-size:13.5px;">${escapeHtml(p.title)}</div>
                <div class="text-muted mono" style="font-size:0.75rem;">ID: ${escapeHtml(p.id)} · PKR ${Number(p.price).toLocaleString()}</div>
            </td>
            <td><span class="badge" style="background:rgba(59,130,246,0.1); color:#3B82F6; font-size:11.5px; font-weight:700;">${escapeHtml(p.category)}</span></td>
            <td>
                ${inStock 
                    ? `<span class="badge badge-success" style="font-size:11.5px; font-weight:700;">In Stock</span>` 
                    : `<span class="badge badge-danger" style="font-size:11.5px; font-weight:700;">Out of Stock</span>`
                }
            </td>
            <td style="text-align:right;">
                <button class="btn ${inStock ? 'btn-outline' : 'btn-primary'}" style="padding:0.35rem 0.8rem; font-size:0.8rem; font-weight:700;" onclick="toggleStock('${escapeHtml(p.id)}', ${inStock})">
                    ${inStock ? '❌ Mark Out of Stock' : '✅ Mark In Stock'}
                </button>
            </td>
        </tr>`;
    }).join('');

    renderInvPagination(totalCount);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function renderInvPagination(total) {
    let container = document.getElementById('invPagination');
    if (!container) {
        const table = document.querySelector('#inventoryTableBody')?.closest('.card');
        if (table) {
            container = document.createElement('div');
            container.id = 'invPagination';
            container.className = 'pagination';
            container.style.marginTop = '15px';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.gap = '6px';
            table.appendChild(container);
        }
    }
    if (!container) return;

    const pages = Math.ceil(total / INV_PER_PAGE);
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = `<button ${invCurrentPage === 1 ? 'disabled' : ''} onclick="changeInvPage(${invCurrentPage - 1})">Prev</button>`;
    for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || (p >= invCurrentPage - 2 && p <= invCurrentPage + 2)) {
            html += `<button class="${p === invCurrentPage ? 'active' : ''}" onclick="changeInvPage(${p})">${p}</button>`;
        } else if (p === invCurrentPage - 3 || p === invCurrentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    html += `<button ${invCurrentPage === pages ? 'disabled' : ''} onclick="changeInvPage(${invCurrentPage + 1})">Next</button>`;
    container.innerHTML = html;
}

window.changeInvPage = function(page) {
    invCurrentPage = page;
    window.renderInventory();
};

document.addEventListener('DOMContentLoaded', () => {
    ['invSearch', 'invStockFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            invCurrentPage = 1;
            window.renderInventory();
        });
        document.getElementById(id)?.addEventListener('change', () => {
            invCurrentPage = 1;
            window.renderInventory();
        });
    });
});

window.toggleStock = async function(id, currentlyInStock) {
    try {
        const stockOverrides = JSON.parse(localStorage.getItem('sp_stock_overrides') || '{}');
        stockOverrides[id] = !currentlyInStock;
        localStorage.setItem('sp_stock_overrides', JSON.stringify(stockOverrides));

        if (typeof db !== 'undefined') {
            try {
                await db.collection('inventory_overrides').doc(String(id)).set({
                    stock: !currentlyInStock,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch(e){}
        }

        showToast(currentlyInStock ? 'Marked Out of Stock' : 'Marked In Stock');
        window.renderInventory();
    } catch (e) {
        showToast('Error updating stock: ' + e.message, 'error');
    }
};

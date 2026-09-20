/* ============================================================
   Global Bulk Price & Markup Manager (Admin Dashboard)
   ============================================================ */

let allCatalogProducts = [];

window.initPriceAdjusterModule = function() {
    loadAllCatalogProducts();
    loadActivePricingRules();
};

window.renderPriceAdjuster = function() {
    loadAllCatalogProducts();
    loadActivePricingRules();
    updatePricePreview();
};

function loadAllCatalogProducts() {
    let list = [];
    if (typeof SCRAPED_BOOKS !== 'undefined') list = list.concat(SCRAPED_BOOKS);
    if (typeof SCRAPED_COURSES !== 'undefined') list = list.concat(SCRAPED_COURSES);
    if (typeof SCRAPED_STATIONERY !== 'undefined') list = list.concat(SCRAPED_STATIONERY);
    if (typeof SCRAPED_TOYS !== 'undefined') list = list.concat(SCRAPED_TOYS);
    if (typeof SCRAPED_AFAQ !== 'undefined') list = list.concat(SCRAPED_AFAQ);

    allCatalogProducts = list;
}

function loadActivePricingRules() {
    const rules = JSON.parse(localStorage.getItem('sp_global_price_rules') || '[]');
    const tbody = document.getElementById('activePriceRulesTbody');
    if (!tbody) return;

    if (rules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">Abhi koi active markup rule nahi hai (Standard catalog prices applied).</td></tr>`;
        return;
    }

    tbody.innerHTML = rules.map((r, idx) => {
        const badgeColor = r.action === 'inc' ? 'success' : 'warning';
        const sign = r.action === 'inc' ? '+' : '-';
        return `
        <tr>
            <td><strong>${escapeHtml(r.scopeLabel || r.scope)}</strong></td>
            <td><span class="badge ${badgeColor}">${sign}${r.percent}%</span></td>
            <td>${r.round ? 'Round to nearest 10' : 'Exact value'}</td>
            <td><span style="font-size:12px; color:var(--text-muted);">${new Date(r.date).toLocaleDateString()}</span></td>
            <td style="text-align:right;">
                <button class="icon-btn-sm text-danger" title="Remove Rule" onclick="removePriceRule(${idx})"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.updatePricePreview = function() {
    const scope = document.getElementById('priceScopeSelect')?.value || 'all';
    const action = document.getElementById('priceActionSelect')?.value || 'inc';
    const percent = Number(document.getElementById('pricePercentInput')?.value) || 0;
    const roundTo10 = document.getElementById('priceRoundCheck')?.checked;

    const previewCountEl = document.getElementById('previewItemCount');
    const previewTbody = document.getElementById('pricePreviewTbody');
    if (!previewTbody) return;

    let targetItems = allCatalogProducts.filter(item => {
        if (scope === 'all') return true;
        if (scope === 'oxford') return (item.title || '').toLowerCase().includes('oxford');
        if (scope === 'paramount') return (item.title || '').toLowerCase().includes('paramount');
        if (scope === 'afaq') return (item.title || '').toLowerCase().includes('afaq') || item.publisher === 'AFAQ';
        if (scope === 'courses') return item.school || item.type === 'course';
        if (scope === 'stationery') return item.type === 'stationery' || item.category === 'Stationery';
        if (scope === 'toys') return item.type === 'toy' || item.category === 'Toys & Gifts';
        return true;
    });

    if (previewCountEl) {
        previewCountEl.textContent = `${targetItems.length} Products Impacted`;
    }

    const sample = targetItems.slice(0, 8);
    const multiplier = action === 'inc' ? (1 + percent / 100) : (1 - percent / 100);

    previewTbody.innerHTML = sample.map(item => {
        const origPrice = Number(item.price) || 0;
        let newPrice = Math.round(origPrice * multiplier);
        if (roundTo10) newPrice = Math.round(newPrice / 10) * 10;
        const diff = newPrice - origPrice;
        const diffText = diff >= 0 ? `+PKR ${diff}` : `-PKR ${Math.abs(diff)}`;
        const diffColor = diff >= 0 ? '#10B981' : '#EF4444';

        return `
        <tr>
            <td>
                <div style="font-weight:700; color:var(--text-main); font-size:13px;">${escapeHtml(item.title || 'Product')}</div>
                <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.school || item.publisher || 'Study Pack')}</div>
            </td>
            <td><strong>PKR ${origPrice.toLocaleString()}</strong></td>
            <td><strong style="color:var(--gold); font-size:14px;">PKR ${newPrice.toLocaleString()}</strong></td>
            <td><strong style="color:${diffColor}; font-size:12px;">${diffText}</strong></td>
        </tr>`;
    }).join('');
};

window.applyGlobalPriceRule = async function(e) {
    e.preventDefault();
    const scope = document.getElementById('priceScopeSelect').value;
    const scopeLabel = document.getElementById('priceScopeSelect').options[document.getElementById('priceScopeSelect').selectedIndex].text;
    const action = document.getElementById('priceActionSelect').value;
    const percent = Number(document.getElementById('pricePercentInput').value) || 0;
    const roundTo10 = document.getElementById('priceRoundCheck').checked;

    if (percent <= 0) {
        alert('Please enter a percentage greater than 0');
        return;
    }

    const newRule = {
        id: 'rule_' + Date.now(),
        scope,
        scopeLabel,
        action,
        percent,
        round: roundTo10,
        date: Date.now()
    };

    let rules = JSON.parse(localStorage.getItem('sp_global_price_rules') || '[]');
    // Replace rule if scope already exists
    rules = rules.filter(r => r.scope !== scope);
    rules.unshift(newRule);
    localStorage.setItem('sp_global_price_rules', JSON.stringify(rules));

    // Save to Firestore if connected
    if (window.db) {
        try {
            await window.db.collection('site_settings').doc('pricing_rules').set({
                rules: rules,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.warn('Firestore pricing save fallback to local:', err);
        }
    }

    loadActivePricingRules();
    updatePricePreview();
    showToast(`Markup rule applied: ${action === 'inc' ? '+' : '-'}${percent}% across ${scopeLabel}! Website updated.`);
};

window.removePriceRule = async function(index) {
    let rules = JSON.parse(localStorage.getItem('sp_global_price_rules') || '[]');
    rules.splice(index, 1);
    localStorage.setItem('sp_global_price_rules', JSON.stringify(rules));

    if (window.db) {
        try {
            await window.db.collection('site_settings').doc('pricing_rules').set({
                rules: rules,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (err) {}
    }

    loadActivePricingRules();
    updatePricePreview();
    showToast('Markup rule removed.');
};

document.addEventListener('DOMContentLoaded', () => {
    ['priceScopeSelect', 'priceActionSelect', 'pricePercentInput', 'priceRoundCheck'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePricePreview);
        document.getElementById(id)?.addEventListener('change', updatePricePreview);
    });
});
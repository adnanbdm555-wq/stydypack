/* ============================================================
   Coupons module — now actually persisted to Firestore
   (previously these only lived in an in-memory array and
   vanished on every page refresh). The coupon CODE is used as
   the Firestore document ID so the storefront can validate a
   code with a single `.doc(code).get()` read.
   ============================================================ */

window.renderCoupons = function() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;

    const coupons = [...(window.AppData.coupons || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (coupons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i data-lucide="ticket-x"></i><p>No coupons yet</p></div></td></tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = coupons.map(c => {
        const valueDisplay = c.type === 'Percentage' ? `${c.value}%` : money(c.value);
        const expired = c.expiry && new Date(c.expiry) < new Date();
        const statusBadge = !c.active ? `<span class="badge badge-danger">Disabled</span>`
            : expired ? `<span class="badge badge-warning">Expired</span>`
            : `<span class="badge badge-success">Active</span>`;
        return `
        <tr>
            <td class="mono" style="font-weight:700;">${escapeHtml(c.code)}</td>
            <td>${escapeHtml(c.type || 'Percentage')}</td>
            <td>${valueDisplay}</td>
            <td>${c.used || 0}${c.usageLimit ? ' / ' + c.usageLimit : ''}</td>
            <td>${c.expiry || '—'}</td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
                <button class="icon-btn-sm" onclick="openCouponModal('${c._docId}')" title="Edit"><i data-lucide="edit-2"></i></button>
                <button class="icon-btn-sm danger" onclick="deleteCoupon('${c._docId}')" title="Delete"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
};

window.openCouponModal = function(docId) {
    document.getElementById('couponForm').reset();
    document.getElementById('couponDocId').value = '';
    document.getElementById('couponActive').checked = true;

    if (docId) {
        const c = (window.AppData.coupons || []).find(x => x._docId === docId);
        if (c) {
            document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
            document.getElementById('couponDocId').value = docId;
            document.getElementById('couponCode').value = c.code || '';
            document.getElementById('couponCode').disabled = true; // code is the doc id, don't allow changing it
            document.getElementById('couponType').value = c.type || 'Percentage';
            document.getElementById('couponValue').value = c.value || '';
            document.getElementById('couponExpiry').value = c.expiry || '';
            document.getElementById('couponUsageLimit').value = c.usageLimit || '';
            document.getElementById('couponActive').checked = c.active !== false;
        }
    } else {
        document.getElementById('couponModalTitle').textContent = 'Add Coupon';
        document.getElementById('couponCode').disabled = false;
    }
    document.getElementById('couponModal').classList.add('show');
    lucide.createIcons();
};

window.closeCouponModal = function() {
    document.getElementById('couponModal').classList.remove('show');
};

document.getElementById('couponForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const docId = document.getElementById('couponDocId').value;
        const code = document.getElementById('couponCode').value.trim().toUpperCase();
        if (!code) throw new Error('Coupon code is required');

        const data = {
            code,
            type: document.getElementById('couponType').value,
            value: Number(document.getElementById('couponValue').value) || 0,
            expiry: document.getElementById('couponExpiry').value || null,
            usageLimit: document.getElementById('couponUsageLimit').value ? Number(document.getElementById('couponUsageLimit').value) : null,
            active: document.getElementById('couponActive').checked,
            used: docId ? undefined : 0,
            createdAt: docId ? undefined : Date.now()
        };
        Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

        await db.collection('coupons').doc(docId || code).set(data, { merge: true });
        showToast('Coupon saved');
        closeCouponModal();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

window.deleteCoupon = async function(docId) {
    if (!confirm('Delete this coupon?')) return;
    try {
        await db.collection('coupons').doc(docId).delete();
        showToast('Coupon deleted');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
};

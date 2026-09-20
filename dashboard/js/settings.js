/* ============================================================
   Settings module — admin users / roles management.
   Adding a new admin here only registers their UID + role in
   Firestore; the Firebase Auth account itself must be created
   first in the Firebase Console (Authentication -> Add user),
   since creating auth users requires the Admin SDK which can't
   run from browser JS.
   ============================================================ */

window.renderAdmins = function() {
    const tbody = document.getElementById('adminsTableBody');
    if (!tbody) return;

    const admins = window.AppData.admins || [];
    if (admins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i data-lucide="user-x"></i><p>No admins registered yet</p></div></td></tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = admins.map(a => `
        <tr>
            <td style="font-weight:600;">${escapeHtml(a.name || '—')}</td>
            <td>${escapeHtml(a.email || '—')}</td>
            <td><span class="badge badge-info role-badge">${escapeHtml(a.role || 'staff')}</span></td>
            <td style="text-align:right;">
                ${a._docId === (window.currentAdmin && window.currentAdmin.uid)
                    ? `<span class="text-muted" style="font-size:0.8rem;">(you)</span>`
                    : `<button class="icon-btn-sm danger" onclick="removeAdmin('${a._docId}')" title="Remove"><i data-lucide="trash-2"></i></button>`
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
};

window.openAdminModal = function() {
    document.getElementById('adminForm').reset();
    document.getElementById('adminModal').classList.add('show');
    lucide.createIcons();
};
window.closeAdminModal = function() {
    document.getElementById('adminModal').classList.remove('show');
};

document.getElementById('adminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const uid = document.getElementById('adminUid').value.trim();
        if (!uid) throw new Error('User UID is required');
        const data = {
            name: document.getElementById('adminName').value.trim(),
            email: document.getElementById('adminEmail').value.trim(),
            role: document.getElementById('adminRole').value,
            addedBy: window.currentAdmin ? window.currentAdmin.email : null,
            addedAt: Date.now()
        };
        await db.collection('admins').doc(uid).set(data, { merge: true });
        showToast('Admin added');
        closeAdminModal();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

window.removeAdmin = async function(uid) {
    if (!confirm('Remove this admin? They will lose dashboard access immediately.')) return;
    try {
        await db.collection('admins').doc(uid).delete();
        showToast('Admin removed');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
};

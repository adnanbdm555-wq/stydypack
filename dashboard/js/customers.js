/* ============================================================
   Customers module — CRM view derived from orders, with a
   detail modal showing each customer's order history.
   ============================================================ */

window.renderCustomers = function() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    let customers = window.getCustomers();
    const search = (document.getElementById('custSearch')?.value || '').toLowerCase();
    if (search) {
        customers = customers.filter(c =>
            (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search)
        );
    }

    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="users"></i><p>No customers found</p></div></td></tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td style="font-weight:600;">${escapeHtml(c.name || 'Unknown')}</td>
            <td class="mono">${escapeHtml(c.phone)}</td>
            <td>${c.orderCount}</td>
            <td style="font-weight:700; color:var(--success);">${money(c.totalSpent)}</td>
            <td>${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-GB') : 'N/A'}</td>
            <td style="text-align:right;"><button class="icon-btn-sm" onclick="viewCustomer('${c.phone}')" title="View"><i data-lucide="eye"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
};

document.getElementById('custSearch')?.addEventListener('input', () => window.renderCustomers());

window.viewCustomer = function(phone) {
    const customers = window.getCustomers();
    const c = customers.find(x => x.phone === phone);
    if (!c) return;

    document.getElementById('custModalName').textContent = c.name || 'Customer';
    document.getElementById('custModalMeta').textContent = `${c.phone} · ${c.orderCount} orders · ${money(c.totalSpent)} total spent`;

    const sorted = [...c.orders].sort((a, b) => (b.date || 0) - (a.date || 0));
    document.getElementById('custModalOrders').innerHTML = sorted.map(o => `
        <tr>
            <td class="mono">#${escapeHtml(o.id)}</td>
            <td>${o.date ? new Date(o.date).toLocaleDateString('en-GB') : 'N/A'}</td>
            <td>${window.statusBadge(o.status)}</td>
            <td style="text-align:right; font-weight:600;">${money(o.total)}</td>
        </tr>
    `).join('');

    document.getElementById('customerModal').classList.add('show');
    lucide.createIcons();
};

window.closeCustomerModal = function() {
    document.getElementById('customerModal').classList.remove('show');
};

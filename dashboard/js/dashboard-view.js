/* ============================================================
   Dashboard view — KPI cards, revenue chart, top products chart,
   recent orders widget.
   ============================================================ */

let __revenueChartInstance = null;
let __topProductsChartInstance = null;

function chartTextColor() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return dark ? '#94A3B8' : '#6B7280';
}
function chartGridColor() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
}

window.renderDashboard = function() {
    const orders = window.AppData.orders || [];
    const products = window.AppData.products || [];

    let totalSales = 0, pending = 0, outOfStock = 0;
    orders.forEach(o => {
        if (o.status !== 'Cancelled') totalSales += Number(o.total || 0);
        if (o.status === 'Pending') pending++;
    });
    products.forEach(p => { if (p.stock === false) outOfStock++; });

    const customers = window.getCustomers ? window.getCustomers() : [];

    setText('dashTotalSales', money(totalSales));
    setText('dashTotalOrders', orders.length);
    setText('dashPendingOrders', pending);
    setText('dashTotalCustomers', customers.length);
    setText('dashTotalProducts', products.length);
    setText('dashOutOfStock', outOfStock);

    renderRecentOrders(orders.slice(0, 6));
    window.renderDashboardCharts();
};

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:2rem;">No orders yet</td></tr>`;
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td class="mono">#${o.id}</td>
            <td>${escapeHtml(o.customer || 'Unknown')}</td>
            <td>${(o.items || []).length} items</td>
            <td style="font-weight:700;">${money(o.total)}</td>
            <td>${statusBadge(o.status)}</td>
        </tr>
    `).join('');
}

window.statusBadge = function(status) {
    const s = status || 'Pending';
    let cls = 'badge-warning';
    if (s === 'Processing') cls = 'badge-info';
    if (s === 'Completed') cls = 'badge-success';
    if (s === 'Cancelled') cls = 'badge-danger';
    return `<span class="badge ${cls}">${s}</span>`;
};

window.escapeHtml = function(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
};

window.renderDashboardCharts = function() {
    if (typeof Chart === 'undefined') return;
    const orders = window.AppData.orders || [];
    const products = window.AppData.products || [];

    // ---- Revenue over last 14 days ----
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
    }
    const revenueByDay = days.map(d => {
        const next = new Date(d); next.setDate(next.getDate() + 1);
        return orders
            .filter(o => o.status !== 'Cancelled' && o.date >= d.getTime() && o.date < next.getTime())
            .reduce((s, o) => s + Number(o.total || 0), 0);
    });
    const dayLabels = days.map(d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

    const revCanvas = document.getElementById('revenueChart');
    if (revCanvas) {
        if (__revenueChartInstance) __revenueChartInstance.destroy();
        __revenueChartInstance = new Chart(revCanvas, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Revenue',
                    data: revenueByDay,
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37,99,235,0.18)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
                    y: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() }, beginAtZero: true }
                }
            }
        });
    }

    // ---- Top selling products (by qty across all non-cancelled orders) ----
    const qtyById = {};
    orders.forEach(o => {
        if (o.status === 'Cancelled') return;
        (o.items || []).forEach(item => {
            const pid = typeof item.id === 'object' ? item.id.id : item.id;
            if (!pid) return;
            qtyById[pid] = (qtyById[pid] || { title: item.title || pid, qty: 0 });
            qtyById[pid].qty += Number(item.qty || 1);
        });
    });
    const top = Object.values(qtyById).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const topCanvas = document.getElementById('topProductsChart');
    if (topCanvas) {
        if (__topProductsChartInstance) __topProductsChartInstance.destroy();
        __topProductsChartInstance = new Chart(topCanvas, {
            type: 'bar',
            data: {
                labels: top.map(t => t.title.length > 18 ? t.title.slice(0, 18) + '…' : t.title),
                datasets: [{
                    label: 'Units Sold',
                    data: top.map(t => t.qty),
                    backgroundColor: '#2563EB',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() }, beginAtZero: true },
                    y: { ticks: { color: chartTextColor() }, grid: { display: false } }
                }
            }
        });
    }
};

// Note: re-rendering on new data for the active view is handled centrally
// in app.js's `appDataLoaded` listener (which calls switchView on the
// currently active section), so no per-module listener is needed here.

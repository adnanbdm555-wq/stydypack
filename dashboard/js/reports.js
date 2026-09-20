/* ============================================================
   Financials & Profit / Loss (P&L) Accounting Engine
   Tracks: Gross Sales, Wholesale Purchase Costs, Shipping/Courier
   Expenses, Discounts, Payment Gateway Fees & Net Profit/Loss.
   ============================================================ */

let __pnlPage = 1;
const PNL_PER_PAGE = 15;

window.renderReports = function() {
    const orders = window.AppData.orders || [];
    const products = window.AppData.products || [];

    const dateFilter = document.getElementById('finDateFilter')?.value || 'all';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const purchasePrices = {};
    products.forEach(p => { 
        if (p.id) purchasePrices[String(p.id)] = Number(p.purchase_price || p.purchasePrice || 0); 
    });

    let totalRevenue = 0;
    let totalPurchaseCost = 0;
    let totalCourierCost = 0;
    let totalDiscount = 0;
    let totalTransferCharges = 0;
    let totalNetProfit = 0;
    let validOrdersCount = 0;

    const qtyById = {};

    // Filter orders by date
    const filteredOrders = orders.filter(o => {
        if (o.status === 'Cancelled') return false;
        const orderTime = o.date ? new Date(o.date).getTime() : 0;
        if (dateFilter === 'today') return orderTime >= startOfToday;
        if (dateFilter === 'week') return orderTime >= startOfWeek;
        if (dateFilter === 'month') return orderTime >= startOfMonth;
        return true;
    });

    filteredOrders.forEach(o => {
        let orderSubtotal = 0;
        let autoPurchaseCost = 0;

        (o.items || []).forEach(item => {
            const pId = typeof item.id === 'object' ? item.id.id : item.id;
            const price = Number(item.price || 0);
            const qty = Number(item.qty || 1);
            orderSubtotal += price * qty;

            const cost = purchasePrices[String(pId)] || Math.round(price * 0.75);
            autoPurchaseCost += cost * qty;

            if (pId) {
                qtyById[pId] = qtyById[pId] || { title: item.title || pId, qty: 0, revenue: 0, cost: 0 };
                qtyById[pId].qty += qty;
                qtyById[pId].revenue += price * qty;
                qtyById[pId].cost += cost * qty;
            }
        });

        const grossSale = Number(o.subtotal) || orderSubtotal || Number(o.total) || 0;
        const purchaseCost = Number(o.purchaseCost) !== undefined && o.purchaseCost !== '' && Number(o.purchaseCost) > 0 ? Number(o.purchaseCost) : autoPurchaseCost;
        const courierCost = Number(o.courierCost) || 0;
        const discount = Number(o.discount) || 0;
        const transferCharges = Number(o.transferCharges) || 0;
        const shippingCharged = Number(o.shipping) || 0;
        const codFee = Number(o.codFee) || 0;

        // Profit for this order:
        // Revenue collected (grossSale + shippingCharged + codFee) minus costs (purchaseCost + courierCost + discount + transferCharges)
        const orderProfit = (grossSale + shippingCharged + codFee) - (purchaseCost + courierCost + discount + transferCharges);

        totalRevenue += grossSale;
        totalPurchaseCost += purchaseCost;
        totalCourierCost += courierCost;
        totalDiscount += discount;
        totalTransferCharges += transferCharges;
        totalNetProfit += orderProfit;
        validOrdersCount++;
    });

    const margin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Update Top Stat Cards
    setText('finTotalRevenue', money(totalRevenue));
    setText('finTotalPurchaseCost', money(totalPurchaseCost));
    setText('finTotalCourierCost', money(totalCourierCost));
    setText('finTotalDiscount', money(totalDiscount));
    setText('finTotalTransferCharges', money(totalTransferCharges));
    
    const profitEl = document.getElementById('finTotalProfit');
    if (profitEl) {
        profitEl.textContent = money(totalNetProfit);
        profitEl.style.color = totalNetProfit >= 0 ? '#10b981' : '#ef4444';
    }

    const marginEl = document.getElementById('finProfitMarginText');
    if (marginEl) {
        marginEl.textContent = `Net Margin: ${margin}% (${validOrdersCount} active orders)`;
        marginEl.style.color = totalNetProfit >= 0 ? '#10b981' : '#ef4444';
    }

    // Render Order-by-Order P&L Table
    renderReportsTable(filteredOrders);

    // Render Best Sellers
    const best = Object.values(qtyById).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const tbody = document.getElementById('bestSellersBody');
    if (tbody) {
        tbody.innerHTML = best.length === 0
            ? `<tr><td colspan="5"><div class="empty-state"><i data-lucide="bar-chart-3"></i><p>No sales data in this period</p></div></td></tr>`
            : best.map(b => {
                const profit = b.revenue - b.cost;
                const pMargin = b.revenue > 0 ? ((profit / b.revenue) * 100).toFixed(0) : 0;
                return `
                <tr>
                    <td style="font-weight:600;">${escapeHtml(b.title)}</td>
                    <td><b>${b.qty}</b> units</td>
                    <td style="font-weight:700;">${money(b.revenue)}</td>
                    <td style="color:var(--text-secondary);">${money(b.cost)}</td>
                    <td style="font-weight:700; color:#10b981;">+${money(profit)} <span style="font-size:0.75rem; color:var(--text-secondary);">(${pMargin}%)</span></td>
                </tr>`;
            }).join('');
    }

    lucide.createIcons();
};

window.renderReportsTable = function(ordersList) {
    const tbody = document.getElementById('pnlTableBody');
    if (!tbody) return;

    let orders = ordersList;
    if (!orders) {
        const allOrders = window.AppData.orders || [];
        const dateFilter = document.getElementById('finDateFilter')?.value || 'all';
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        orders = allOrders.filter(o => {
            if (o.status === 'Cancelled') return false;
            const orderTime = o.date ? new Date(o.date).getTime() : 0;
            if (dateFilter === 'today') return orderTime >= startOfToday;
            if (dateFilter === 'week') return orderTime >= startOfWeek;
            if (dateFilter === 'month') return orderTime >= startOfMonth;
            return true;
        });
    }

    const search = (document.getElementById('pnlSearchInput')?.value || '').toLowerCase();
    if (search) {
        orders = orders.filter(o =>
            (o.id && String(o.id).toLowerCase().includes(search)) ||
            (o.customer && o.customer.toLowerCase().includes(search)) ||
            (o.city && o.city.toLowerCase().includes(search))
        );
    }

    const totalPages = Math.max(1, Math.ceil(orders.length / PNL_PER_PAGE));
    if (__pnlPage > totalPages) __pnlPage = totalPages;
    const pageItems = orders.slice((__pnlPage - 1) * PNL_PER_PAGE, __pnlPage * PNL_PER_PAGE);

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i data-lucide="calculator"></i><p>No orders found in this period</p></div></td></tr>`;
    } else {
        const products = window.AppData.products || [];
        const prodMap = new Map();
        products.forEach(p => { if (p.id) prodMap.set(String(p.id), p); });

        tbody.innerHTML = pageItems.map(o => {
            const dateStr = o.date ? new Date(o.date).toLocaleDateString('en-GB') : 'N/A';
            
            let orderSubtotal = 0;
            let autoPurchaseCost = 0;
            (o.items || []).forEach(item => {
                const pId = typeof item.id === 'object' ? item.id.id : item.id;
                const price = Number(item.price || 0);
                const qty = Number(item.qty || 1);
                orderSubtotal += price * qty;
                const prod = prodMap.get(String(pId));
                const cost = Number(item.purchase_price || (prod ? prod.purchase_price : 0)) || Math.round(price * 0.75);
                autoPurchaseCost += cost * qty;
            });

            const grossSale = Number(o.subtotal) || orderSubtotal || Number(o.total) || 0;
            const purchaseCost = Number(o.purchaseCost) || autoPurchaseCost;
            const courierCost = Number(o.courierCost) || 0;
            const discount = Number(o.discount) || 0;
            const transferCharges = Number(o.transferCharges) || 0;
            const shipping = Number(o.shipping) || 0;
            const codFee = Number(o.codFee) || 0;

            const netProfit = (grossSale + shipping + codFee) - (purchaseCost + courierCost + discount + transferCharges);
            const margin = grossSale > 0 ? ((netProfit / grossSale) * 100).toFixed(1) : 0;
            const isProfit = netProfit >= 0;

            return `
            <tr>
                <td>
                    <div style="font-weight:700;" class="mono">#${escapeHtml(o.id)}</div>
                    <div class="text-muted" style="font-size:0.75rem;">${dateStr}</div>
                </td>
                <td>
                    <div style="font-weight:600;">${escapeHtml(o.customer || 'Customer')}</div>
                    <div class="text-muted" style="font-size:0.75rem;">${escapeHtml(o.city || 'Karachi')}</div>
                </td>
                <td style="font-weight:700; color:var(--text-main);">${money(grossSale)}</td>
                <td style="color:#f59e0b; font-weight:600;">${money(purchaseCost)}</td>
                <td style="color:#3b82f6; font-weight:600;">${courierCost > 0 ? money(courierCost) : '<span style="color:var(--text-secondary); font-size:0.75rem;">Rs 0</span>'}</td>
                <td style="color:#ec4899;">${discount > 0 ? '- ' + money(discount) : 'Rs 0'}</td>
                <td style="color:#8b5cf6;">${transferCharges > 0 ? money(transferCharges) : 'Rs 0'}</td>
                <td>
                    <span style="font-weight:800; color:${isProfit ? '#10b981' : '#ef4444'};">${isProfit ? '+' : ''}${money(netProfit)}</span>
                    <div style="font-size:0.75rem; font-weight:700; color:${isProfit ? '#10b981' : '#ef4444'};">${margin}%</div>
                </td>
                <td style="text-align:right;">
                    <button class="btn btn-outline" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="viewOrder('${o.id}'); toggleOrderEdit();" title="Edit Order Financials">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i> Edit
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    renderPagination('pnlPagination', orders.length, __pnlPage, totalPages, (p) => { __pnlPage = p; renderReportsTable(orders); });
    lucide.createIcons();
};

window.exportFinancialsCSV = function() {
    const orders = window.AppData.orders || [];
    if (orders.length === 0) return showToast('No financial records to export', 'error');

    let csv = 'Order ID,Date,Customer,City,Gross Sale,Purchase Cost,Courier Cost,Discount,Transfer Fee,Delivery Charged,COD Fee,Net Profit,Status\n';
    
    orders.forEach(o => {
        if (o.status === 'Cancelled') return;
        const dateStr = o.date ? new Date(o.date).toLocaleDateString('en-GB') : '';
        const grossSale = Number(o.subtotal) || Number(o.total) || 0;
        const purchaseCost = Number(o.purchaseCost) || 0;
        const courierCost = Number(o.courierCost) || 0;
        const discount = Number(o.discount) || 0;
        const transferCharges = Number(o.transferCharges) || 0;
        const shipping = Number(o.shipping) || 0;
        const codFee = Number(o.codFee) || 0;
        const netProfit = (grossSale + shipping + codFee) - (purchaseCost + courierCost + discount + transferCharges);

        csv += `"${o.id}","${dateStr}","${(o.customer || '').replace(/"/g, '""')}","${(o.city || '').replace(/"/g, '""')}",${grossSale},${purchaseCost},${courierCost},${discount},${transferCharges},${shipping},${codFee},${netProfit},"${o.status}"\n`;
    });

    downloadCSV(csv, `StudyPack_Financials_PnL_${new Date().toISOString().split('T')[0]}.csv`);
};

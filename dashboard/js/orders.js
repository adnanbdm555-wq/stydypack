
const WC_DASHBOARD_CONFIG = {
    storeUrl: 'https://api.studypack.taleemihub.com',
    consumerKey: 'ck_9d3ebbf59738bb9cb7a3021067c90893476d32d7',
    consumerSecret: 'cs_75d5b1183e7985468ab5e374fc9be4ed0a5e2b3f'
};

window.fetchWooCommerceOrders = async function(showFeedback = true) {
    try {
        if (showFeedback && typeof showToast === 'function') showToast("WooCommerce se orders sync ho rahe hain...");
        const authHeader = 'Basic ' + btoa(WC_DASHBOARD_CONFIG.consumerKey + ':' + WC_DASHBOARD_CONFIG.consumerSecret);
        
        const res = await fetch(`${WC_DASHBOARD_CONFIG.storeUrl}/wp-json/wc/v3/orders?per_page=50`, {
            headers: {
                'Authorization': authHeader
            }
        });
        
        if (!res.ok) {
            console.warn("WC orders fetch failed:", res.status);
            return;
        }
        
        const wcOrders = await res.json();
        const formattedWcOrders = wcOrders.map(o => {
            const billing = o.billing || {};
            const shipping = o.shipping || {};
            const cust_name = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Customer';
            const phone = billing.phone || shipping.phone || 'N/A';
            const email = billing.email || 'customer@taleemihub.com';
            const address = [billing.address_1 || shipping.address_1, billing.address_2 || shipping.address_2].filter(Boolean).join(', ') || 'Karachi';
            const city = billing.city || shipping.city || 'Karachi';
            const province = billing.state || shipping.state || 'Sindh';
            const notes = o.customer_note || '';
            const paymentDetails = (o.meta_data || []).find(m => m.key === '_payment_account_number' || m.key === 'payment_account' || m.key === '_transaction_id' || m.key === 'account_number')?.value || '';
            let rawPay = (o.payment_method || o.payment_method_title || '').toLowerCase();
            let payMethod = 'cod';
            if (rawPay.includes('easy') || rawPay.includes('paisa')) payMethod = 'easypaisa';
            else if (rawPay.includes('jazz') || rawPay.includes('cash') && !rawPay.includes('delivery')) payMethod = 'jazzcash';
            else if (rawPay.includes('card') || rawPay.includes('visa') || rawPay.includes('master')) payMethod = 'card';
            else if (rawPay.includes('delivery') || rawPay.includes('cod')) payMethod = 'cod';
            else payMethod = o.payment_method_title || o.payment_method || 'cod';
            
            const items = (o.line_items || []).map(line => ({
                id: String(line.product_id || ''),
                title: line.name || 'Product',
                price: Number(line.price || 0),
                qty: Number(line.quantity || 1),
                total: Number(line.total || 0)
            }));
            
            const total = Number(o.total || 0);
            const shippingAmt = Number(o.shipping_total || 0);
            
            let status = (o.status || 'Pending').toLowerCase();
            if (status === 'on-hold' || status === 'pending') status = 'Pending';
            else if (status === 'processing') status = 'Processing';
            else if (status === 'completed') status = 'Completed';
            else if (status === 'cancelled') status = 'Cancelled';
            else status = status.charAt(0).toUpperCase() + status.slice(1);
            
            return {
                id: String(o.id),
                customer: cust_name,
                phone: phone,
                email: email,
                address: address,
                city: city,
                province: province,
                notes: notes,
                paymentDetails: paymentDetails,
                items: items,
                subtotal: total - shippingAmt,
                shipping: shippingAmt,
                shippingNote: shippingAmt > 0 ? `Rs ${shippingAmt}` : 'Weight ke mutabiq',
                codFee: 0,
                total: total,
                status: status,
                date: new Date(o.date_created).getTime() || Date.now(),
                paymentMethod: payMethod,
                source: 'woocommerce'
            };
        });
        
        // Merge with existing AppData.orders, deduplicating by ID
        const existing = window.AppData.orders || [];
        const map = new Map();
        
        // Add WooCommerce orders
        formattedWcOrders.forEach(o => map.set(String(o.id), o));
        // Add Firestore orders (merge so edited data or new firestore orders take precedence)
        existing.forEach(o => {
            const wc = map.get(String(o.id));
            if (wc) {
                map.set(String(o.id), { ...wc, ...o });
            } else {
                map.set(String(o.id), o);
            }
        });

        // Apply LocalStorage Overrides
        const overrides = JSON.parse(localStorage.getItem('sp_order_overrides') || '{}');
        map.forEach((val, key) => {
            if (overrides[key]) {
                map.set(key, { ...val, ...overrides[key] });
            }
        });
        
        const merged = Array.from(map.values());
        merged.sort((a,b) => (b.date || 0) - (a.date || 0));
        
        window.AppData.orders = merged;
        window.AppData.loaded.orders = true;
        
        if (typeof renderOrders === 'function') renderOrders();
        if (typeof renderDashboardView === 'function') renderDashboardView();
        if (typeof renderCustomers === 'function') renderCustomers();
        
        if (showFeedback && typeof showToast === 'function') showToast(`✅ ${formattedWcOrders.length} WooCommerce orders synced!`);
        
    } catch(err) {
        console.warn("Could not fetch WooCommerce orders:", err);
    }
};

// Auto fetch when script loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.fetchWooCommerceOrders(false);
    }, 1200);
});


window.recalcAdminOrderFinancials = function(manualCod=false) {
    if (!window.editingOrderState) return;
    let subtotal = 0;
    let autoPurchaseCost = 0;
    const products = window.AppData.products || [];
    const prodMap = new Map();
    products.forEach(p => { if (p.id) prodMap.set(String(p.id), p); });

    (window.editingOrderState.items || []).forEach(item => {
        const pId = typeof item.id === 'object' ? item.id.id : item.id;
        const price = Number(item.price) || 0;
        const qty = Number(item.qty) || 1;
        subtotal += price * qty;

        const prod = prodMap.get(String(pId));
        const itemCost = Number(item.purchase_price || (prod ? prod.purchase_price : 0)) || Math.round(price * 0.75);
        autoPurchaseCost += itemCost * qty;
    });
    
    const shipping = Number(document.getElementById('editOrderShipping')?.value) || 0;
    const courierCost = Number(document.getElementById('editOrderCourierCost')?.value) || 0;
    
    const purchaseCostInput = document.getElementById('editOrderPurchaseCost');
    let purchaseCost = Number(purchaseCostInput?.value);
    if (isNaN(purchaseCost) || purchaseCost === 0) {
        purchaseCost = autoPurchaseCost;
        if (purchaseCostInput && !purchaseCostInput.value) purchaseCostInput.value = autoPurchaseCost;
    }

    const discount = Number(document.getElementById('editOrderDiscount')?.value) || 0;
    const transferCharges = Number(document.getElementById('editOrderTransferCharges')?.value) || 0;

    const applyCod = document.getElementById('editOrderApplyCod')?.checked;
    let codFee = Number(document.getElementById('editOrderCodFee')?.value) || 0;
    
    if (!manualCod && applyCod) {
        codFee = Math.round((subtotal + shipping) * 0.04);
        const codInput = document.getElementById('editOrderCodFee');
        if (codInput) codInput.value = codFee;
    } else if (!applyCod) {
        codFee = 0;
        const codInput = document.getElementById('editOrderCodFee');
        if (codInput) codInput.value = 0;
    }
    
    const taxAmount = Number(document.getElementById('editOrderTaxAmount')?.value) || 0;
    const total = subtotal + shipping + codFee + taxAmount - discount;
    
    // Net Profit = (Revenue from customer) - (Wholesale Cost + Courier Cost + Discount + Gateway Fee)
    const netProfit = (subtotal + shipping + codFee) - (purchaseCost + courierCost + discount + transferCharges);
    const marginPercent = subtotal > 0 ? ((netProfit / subtotal) * 100).toFixed(1) : 0;

    const calcTotalEl = document.getElementById('editCalculatedTotal');
    if (calcTotalEl) calcTotalEl.textContent = 'Rs ' + total.toLocaleString();

    const calcProfitEl = document.getElementById('editCalculatedProfit');
    if (calcProfitEl) {
        calcProfitEl.textContent = `${netProfit >= 0 ? 'Rs ' + netProfit.toLocaleString() : '-Rs ' + Math.abs(netProfit).toLocaleString()} (${marginPercent}%)`;
        calcProfitEl.style.color = netProfit >= 0 ? '#10b981' : '#ef4444';
    }
};

/* ============================================================
   Orders module — list/search/filter, status update, view/edit
   modal, print invoice, pagination.
   ============================================================ */

const ORDERS_PER_PAGE = 15;
let __ordersPage = 1;

window.renderOrders = function() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const orders = window.AppData.orders || [];
    const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('orderStatusFilter')?.value;

    let filtered = orders;
    if (search) {
        filtered = filtered.filter(o =>
            (o.id && String(o.id).toLowerCase().includes(search)) ||
            (o.customer && o.customer.toLowerCase().includes(search)) ||
            (o.phone && o.phone.toLowerCase().includes(search)) ||
            (o.city && o.city.toLowerCase().includes(search)) ||
            (o.address && o.address.toLowerCase().includes(search)) ||
            (o.email && o.email.toLowerCase().includes(search))
        );
    }
    if (filterStatus) filtered = filtered.filter(o => o.status === filterStatus);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
    if (__ordersPage > totalPages) __ordersPage = totalPages;
    const pageItems = filtered.slice((__ordersPage - 1) * ORDERS_PER_PAGE, __ordersPage * ORDERS_PER_PAGE);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="shopping-cart"></i><p>No orders found</p></div></td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map(o => {
            const dateStr = o.date ? new Date(o.date).toLocaleDateString('en-GB') : 'N/A';
            const timeStr = o.date ? new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}` : null;

            const pMethod = (o.paymentMethod || 'cod').toLowerCase();
            const payBadge = pMethod.includes('jazzcash') ? '📱 JazzCash' :
                             pMethod.includes('easypaisa') ? '📱 EasyPaisa' :
                             pMethod.includes('card') ? '💳 Card' : '💵 Cash on Delivery';

            const itemsCount = (o.items || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
            const itemsSnippet = (o.items || []).map(i => `${escapeHtml(i.title || 'Item')} (x${i.qty || 1})`).slice(0, 2).join(', ') + ((o.items || []).length > 2 ? ` +${(o.items || []).length - 2} more` : '');

            return `
            <tr style="vertical-align:top;">
                <td>
                    <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);" class="mono">#${escapeHtml(o.id)}</div>
                    <div class="text-muted" style="font-size:0.75rem; margin-top:2px;">${dateStr} <span style="opacity:0.7;">${timeStr}</span></div>
                    <div style="margin-top:6px;">
                        <span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:6px; background:rgba(99,102,241,0.15); color:#818cf8;">
                            ${o.source === 'woocommerce' ? '🛒 WooCommerce' : '🌐 Web Store'}
                        </span>
                    </div>
                </td>
                <td>
                    <!-- Full Customer Details -->
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <span>${escapeHtml(o.customer || 'Unknown Customer')}</span>
                    </div>
                    
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:4px; font-size:0.85rem;">
                        <span style="font-weight:600; color:var(--text-main); display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="phone" style="width:13px; height:13px; color:var(--primary);"></i> ${escapeHtml(o.phone || 'N/A')}
                        </span>
                        ${waLink ? `
                        <a href="${waLink}" target="_blank" style="color:#25D366; background:rgba(37,211,102,0.12); padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Open WhatsApp Chat">
                            <i data-lucide="message-circle" style="width:12px; height:12px;"></i> WhatsApp
                        </a>` : ''}
                    </div>

                    ${o.email && o.email !== 'N/A' ? `
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:3px; display:flex; align-items:center; gap:4px;">
                        <i data-lucide="mail" style="width:12px; height:12px; opacity:0.7;"></i>
                        <a href="mailto:${escapeHtml(o.email)}" style="color:var(--text-secondary); text-decoration:none;">${escapeHtml(o.email)}</a>
                    </div>` : ''}

                    <div style="font-size:0.82rem; color:var(--text-main); margin-top:5px; line-height:1.35; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px; border-left:2px solid var(--primary);">
                        <i data-lucide="map-pin" style="width:12px; height:12px; color:var(--primary); display:inline; margin-right:2px;"></i>
                        <b>${escapeHtml(o.city || 'Karachi')}:</b> ${escapeHtml(o.address || 'Address not provided')}${o.province ? ', ' + escapeHtml(o.province) : ''}
                    </div>

                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:6px;">
                        <span style="font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(59,130,246,0.12); color:#3b82f6;">
                            ${payBadge}
                        </span>
                        ${o.paymentDetails ? `<span style="font-size:0.72rem; padding:2px 6px; border-radius:4px; background:rgba(139,92,246,0.12); color:#8b5cf6;">A/C: ${escapeHtml(o.paymentDetails)}</span>` : ''}
                        ${o.notes ? `<span style="font-size:0.72rem; padding:2px 6px; border-radius:4px; background:rgba(245,158,11,0.15); color:#f59e0b; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="Notes: ${escapeHtml(o.notes)}">📝 ${escapeHtml(o.notes)}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div style="font-weight:700; color:var(--text-main);">${itemsCount} items</div>
                    <div class="text-muted" style="font-size:0.75rem; margin-top:3px; max-width:180px; line-height:1.3;">${itemsSnippet || 'Products'}</div>
                </td>
                <td>
                    <div style="font-weight:800; font-size:1.05rem; color:var(--primary);">${money(o.total)}</div>
                    ${o.shipping > 0 ? `<div class="text-muted" style="font-size:0.72rem; margin-top:2px;">Incl. ${money(o.shipping)} del.</div>` : ''}
                </td>
                <td>
                    <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:0.4rem 0.6rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-main); color:var(--text-main); font-size:0.85rem; font-weight:600;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>🔄 Processing</option>
                        <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                    </select>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="icon-btn-sm" onclick="viewOrder('${o.id}')" title="View &amp; Edit Complete Order"><i data-lucide="eye"></i></button>
                    <button class="icon-btn-sm" onclick="printInvoice('${o.id}')" title="Print Invoice"><i data-lucide="printer"></i></button>
                    ${waLink ? `<a href="${waLink}" target="_blank" class="icon-btn-sm" style="display:inline-flex; align-items:center; justify-content:center; text-decoration:none; color:#25D366;" title="WhatsApp Customer"><i data-lucide="message-circle"></i></a>` : ''}
                </td>
            </tr>`;
        }).join('');
    }

    renderPagination('ordersPagination', filtered.length, __ordersPage, totalPages, (p) => { __ordersPage = p; window.renderOrders(); });
    lucide.createIcons();
};

document.getElementById('orderSearch')?.addEventListener('input', () => { __ordersPage = 1; window.renderOrders(); });
document.getElementById('orderStatusFilter')?.addEventListener('change', () => { __ordersPage = 1; window.renderOrders(); });

window.updateOrderStatus = async function(id, newStatus) {
    const o = window.AppData.orders.find(x => String(x.id) === String(id));
    if (o) o.status = newStatus;

    const orderOverrides = JSON.parse(localStorage.getItem('sp_order_overrides') || '{}');
    orderOverrides[id] = { ...(orderOverrides[id] || {}), status: newStatus };
    localStorage.setItem('sp_order_overrides', JSON.stringify(orderOverrides));

    if (typeof db !== 'undefined') {
        try {
            await db.collection('orders').doc(id).set({ status: newStatus }, { merge: true });
        } catch (e) {
            console.warn('Firestore sync note:', e.message);
        }
    }

    showToast('Order status updated to ' + newStatus);
    if (typeof renderOrders === 'function') renderOrders();
    if (typeof renderDashboardView === 'function') renderDashboardView();
    if (typeof renderReports === 'function') renderReports();
};

window.viewOrder = function(id) {
    const o = window.AppData.orders.find(x => String(x.id) === String(id));
    if (!o) return;

    document.getElementById('modalOrderId').textContent = `#${o.id}`;
    document.getElementById('modalOrderDate').textContent = o.date ? new Date(o.date).toLocaleString('en-GB') : 'N/A';

    const statusColors = {
        'Pending': 'background:rgba(245,158,11,0.15); color:#f59e0b;',
        'Processing': 'background:rgba(59,130,246,0.15); color:#3b82f6;',
        'Completed': 'background:rgba(16,185,129,0.15); color:#10b981;',
        'Cancelled': 'background:rgba(239,68,68,0.15); color:#ef4444;'
    };
    const badgeStyle = statusColors[o.status] || 'background:rgba(100,116,139,0.15); color:#64748b;';
    const statusBadgeEl = document.getElementById('modalOrderStatusBadge');
    if (statusBadgeEl) {
        statusBadgeEl.innerHTML = `<span style="padding:4px 12px; border-radius:20px; font-weight:700; font-size:12px; ${badgeStyle}">${escapeHtml(o.status || 'Pending')}</span>`;
    }

    const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}` : null;

    const payMethodTitle = (o.paymentMethod || 'cod').toLowerCase() === 'cod' ? '💵 Cash on Delivery (COD)' :
                           (o.paymentMethod || '').toLowerCase() === 'jazzcash' ? '📱 JazzCash' :
                           (o.paymentMethod || '').toLowerCase() === 'easypaisa' ? '📱 EasyPaisa' :
                           (o.paymentMethod || '').toLowerCase() === 'card' ? '💳 Credit/Debit Card' :
                           (o.paymentMethod || 'Other');

    document.getElementById('modalCustomerInfo').innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.9rem;">
            <div>
                <span style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Customer Name</span>
                <div style="font-weight:700; color:var(--text-main); font-size:1rem; margin-top:2px;">${escapeHtml(o.customer || 'Customer')}</div>
            </div>
            <div>
                <span style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Phone Number</span>
                <div style="font-weight:600; color:var(--text-main); margin-top:2px; display:flex; align-items:center; gap:6px;">
                    <span>${escapeHtml(o.phone || 'N/A')}</span>
                    ${waLink ? `<a href="${waLink}" target="_blank" style="color:#25D366; text-decoration:none; display:inline-flex; align-items:center;" title="Chat on WhatsApp"><i data-lucide="message-circle" style="width:16px;height:16px;"></i></a>` : ''}
                </div>
            </div>
            <div>
                <span style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Email Address</span>
                <div style="font-weight:500; color:var(--text-main); margin-top:2px;">${escapeHtml(o.email || 'N/A')}</div>
            </div>
            <div>
                <span style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Payment Method</span>
                <div style="font-weight:600; color:var(--primary); margin-top:2px;">${payMethodTitle}</div>
                ${o.paymentDetails ? `<div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">A/C: ${escapeHtml(o.paymentDetails)}</div>` : ''}
            </div>
            <div style="grid-column: 1 / -1;">
                <span style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Delivery Address &amp; Destination</span>
                <div style="font-weight:600; color:var(--text-main); margin-top:2px;">
                    ${escapeHtml(o.address || 'N/A')}, ${escapeHtml(o.city || 'Karachi')}${o.province ? ', ' + escapeHtml(o.province) : ''}
                </div>
            </div>
            ${o.notes ? `
            <div style="grid-column: 1 / -1; background:rgba(251,191,36,0.1); border:1px dashed #f59e0b; padding:8px 12px; border-radius:8px;">
                <span style="color:#b45309; font-size:0.75rem; text-transform:uppercase; font-weight:800;">Order Notes / Customer Instructions:</span>
                <div style="font-size:0.85rem; color:var(--text-main); margin-top:2px;">${escapeHtml(o.notes)}</div>
            </div>` : ''}
        </div>
    `;
    document.getElementById('modalCustomerInfo').style.display = 'block';
    document.getElementById('modalCustomerEdit').style.display = 'none';
    document.getElementById('saveOrderEditsBtn').style.display = 'none';

    const itemsList = document.getElementById('modalOrderItems');
    let subtotal = 0;
    let autoPurchaseCost = 0;
    const products = window.AppData.products || [];
    const prodMap = new Map();
    products.forEach(p => { if (p.id) prodMap.set(String(p.id), p); });

    if (o.items && o.items.length > 0) {
        itemsList.innerHTML = o.items.map(item => {
            const pId = typeof item.id === 'object' ? item.id.id : item.id;
            const price = Number(item.price || 0);
            const qty = Number(item.qty || 1);
            subtotal += price * qty;

            const prod = prodMap.get(String(pId));
            const itemCost = Number(item.purchase_price || (prod ? prod.purchase_price : 0)) || Math.round(price * 0.75);
            autoPurchaseCost += itemCost * qty;

            return `
            <tr>
                <td>
                    <div style="font-weight:600; color:var(--text-main);">${escapeHtml(item.title || 'Product')}</div>
                    <div class="text-muted mono" style="font-size:0.75rem;">SKU: ${escapeHtml(pId || '')}</div>
                </td>
                <td>${money(price)}</td>
                <td style="font-weight:600;">x${qty}</td>
                <td style="text-align:right; font-weight:700;">${money(price * qty)}</td>
            </tr>`;
        }).join('');
    } else {
        itemsList.innerHTML = `<tr><td colspan="4" style="text-align:center;">No items</td></tr>`;
    }

    const shipping = Number(o.shipping) || 0;
    const courierCost = Number(o.courierCost) || 0;
    const purchaseCost = Number(o.purchaseCost) || autoPurchaseCost;
    const discount = Number(o.discount) || 0;
    const transferCharges = Number(o.transferCharges) || 0;
    const codFee = Number(o.codFee) || 0;
    const taxAmount = Number(o.taxAmount) || 0;
    const grandTotal = Number(o.total || (subtotal + shipping + codFee + taxAmount - discount));

    // Calculate Net Profit
    const netProfit = (subtotal + shipping + codFee) - (purchaseCost + courierCost + discount + transferCharges);
    const profitMargin = subtotal > 0 ? ((netProfit / subtotal) * 100).toFixed(1) : 0;

    document.getElementById('modalSubtotal').textContent = money(subtotal);
    document.getElementById('modalPurchaseCost').textContent = money(purchaseCost);
    document.getElementById('modalShipping').textContent = shipping > 0 ? money(shipping) : (o.shippingNote || 'Weight ke mutabiq');
    document.getElementById('modalCourierExpense').textContent = courierCost > 0 ? money(courierCost) : 'Rs 0 (Not recorded)';

    const discDiv = document.getElementById('modalDiscountDiv');
    if (discDiv) {
        if (discount > 0) {
            discDiv.style.display = 'block';
            document.getElementById('modalDiscount').textContent = '- ' + money(discount);
        } else {
            discDiv.style.display = 'none';
        }
    }

    const codDiv = document.getElementById('modalCodFeeDiv');
    if (codDiv) {
        const isCod = !o.paymentMethod || o.paymentMethod.toLowerCase() === 'cod';
        if (isCod || codFee > 0) {
            codDiv.style.display = 'block';
            document.getElementById('modalCodFee').textContent = codFee > 0 ? money(codFee) : '4% (To be added)';
        } else {
            codDiv.style.display = 'none';
        }
    }

    const transferDiv = document.getElementById('modalTransferChargesDiv');
    if (transferDiv) {
        if (transferCharges > 0) {
            transferDiv.style.display = 'block';
            document.getElementById('modalTransferCharges').textContent = money(transferCharges);
        } else {
            transferDiv.style.display = 'none';
        }
    }
    
    if (taxAmount > 0) {
        document.getElementById('modalTaxDiv').style.display = 'block';
        document.getElementById('modalTaxNote').textContent = escapeHtml(o.taxNote || 'Tax');
        document.getElementById('modalTaxAmount').textContent = money(taxAmount);
    } else {
        document.getElementById('modalTaxDiv').style.display = 'none';
    }
    
    if (o.specialNote) {
        document.getElementById('modalSpecialNoteDiv').style.display = 'block';
        document.getElementById('modalSpecialNote').textContent = escapeHtml(o.specialNote);
    } else {
        document.getElementById('modalSpecialNoteDiv').style.display = 'none';
    }
    
    document.getElementById('modalTotal').textContent = money(grandTotal);
    
    const netProfitEl = document.getElementById('modalOrderNetProfit');
    const netProfitDiv = document.getElementById('modalOrderNetProfitDiv');
    if (netProfitEl && netProfitDiv) {
        netProfitEl.textContent = `${netProfit >= 0 ? '+' : ''}${money(netProfit)} (${profitMargin}% margin)`;
        if (netProfit >= 0) {
            netProfitDiv.style.background = 'rgba(16,185,129,0.12)';
            netProfitDiv.style.color = '#10b981';
        } else {
            netProfitDiv.style.background = 'rgba(239,68,68,0.12)';
            netProfitDiv.style.color = '#ef4444';
        }
    }

    document.getElementById('modalFinancialsDisplay').style.display = 'flex';
    document.getElementById('modalFinancialsEdit').style.display = 'none';

    document.getElementById('orderModal').classList.add('show');
    lucide.createIcons();
};

window.closeOrderModal = function() {
    document.getElementById('orderModal').classList.remove('show');
};

window.editingOrderState = null;

window.toggleOrderEdit = function() {
    const info = document.getElementById('modalCustomerInfo');
    const edit = document.getElementById('modalCustomerEdit');
    const saveBtn = document.getElementById('saveOrderEditsBtn');

    if (edit.style.display === 'none' || !edit.style.display) {
        const id = document.getElementById('modalOrderId').textContent.replace('#', '');
        const o = window.AppData.orders.find(x => String(x.id) === String(id));
        if (!o) return;
        window.editingOrderState = JSON.parse(JSON.stringify(o));

        info.style.display = 'none';
        edit.style.display = 'flex';
        saveBtn.style.display = 'inline-flex';
        
        document.getElementById('modalFinancialsDisplay').style.display = 'none';
        document.getElementById('modalFinancialsEdit').style.display = 'flex';

        document.getElementById('editOrderCustName').value = o.customer || '';
        document.getElementById('editOrderCustPhone').value = o.phone || '';
        document.getElementById('editOrderCustEmail').value = o.email || '';
        document.getElementById('editOrderCustCity').value = o.city || 'Karachi';
        document.getElementById('editOrderCustProvince').value = o.province || 'Sindh';
        document.getElementById('editOrderPayMethod').value = (o.paymentMethod || 'cod').toLowerCase();
        document.getElementById('editOrderPayDetails').value = o.paymentDetails || '';
        document.getElementById('editOrderCustAddress').value = o.address || '';
        document.getElementById('editOrderNotes').value = o.notes || '';
        
        document.getElementById('editOrderShipping').value = Number(o.shipping) || 0;
        document.getElementById('editOrderCourierCost').value = Number(o.courierCost) || 0;
        document.getElementById('editOrderPurchaseCost').value = Number(o.purchaseCost) || '';
        document.getElementById('editOrderDiscount').value = Number(o.discount) || 0;
        document.getElementById('editOrderTransferCharges').value = Number(o.transferCharges) || 0;

        const isCod = !o.paymentMethod || o.paymentMethod.toLowerCase() === 'cod';
        if (document.getElementById('editOrderApplyCod')) {
            document.getElementById('editOrderApplyCod').checked = isCod;
        }
        document.getElementById('editOrderCodFee').value = Number(o.codFee) || 0;
        document.getElementById('editOrderTaxNote').value = o.taxNote || '';
        document.getElementById('editOrderTaxAmount').value = Number(o.taxAmount) || 0;
        document.getElementById('editOrderSpecialNote').value = o.specialNote || '';
        
        recalcAdminOrderFinancials();
        renderEditableItems();
    } else {
        info.style.display = 'block';
        edit.style.display = 'none';
        saveBtn.style.display = 'none';
        document.getElementById('modalFinancialsDisplay').style.display = 'flex';
        document.getElementById('modalFinancialsEdit').style.display = 'none';
        const id = document.getElementById('modalOrderId').textContent.replace('#', '');
        viewOrder(id);
    }
};

window.renderEditableItems = function() {
    const itemsList = document.getElementById('modalOrderItems');
    if (!window.editingOrderState.items) window.editingOrderState.items = [];

    itemsList.innerHTML = window.editingOrderState.items.map((item, index) => {
        const pId = typeof item.id === 'object' ? item.id.id : item.id;
        return `
        <tr>
            <td>
                <input type="text" style="width:100%; padding:0.4rem; font-size:0.85rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color); border-radius:6px;" value="${escapeHtml(item.title || '')}" onchange="window.editingOrderState.items[${index}].title = this.value">
                <input type="text" style="width:100%; padding:0.4rem; font-size:0.75rem; margin-top:0.4rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color); border-radius:6px;" value="${escapeHtml(pId || '')}" placeholder="SKU" onchange="window.editingOrderState.items[${index}].id = this.value">
            </td>
            <td><input type="number" style="width:80px; padding:0.4rem; font-size:0.85rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color); border-radius:6px;" value="${item.price || 0}" onchange="window.editingOrderState.items[${index}].price = Number(this.value); recalcAdminOrderFinancials(); renderEditableItems()"></td>
            <td><input type="number" style="width:60px; padding:0.4rem; font-size:0.85rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-color); border-radius:6px;" value="${item.qty || 1}" onchange="window.editingOrderState.items[${index}].qty = Number(this.value); recalcAdminOrderFinancials(); renderEditableItems()"></td>
            <td style="text-align:right;">
                ${money((item.price || 0) * (item.qty || 1))}
                <button type="button" onclick="removeOrderItem(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; margin-left:0.5rem;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </td>
        </tr>`;
    }).join('') + `
        <tr><td colspan="4" style="text-align:center; padding-top:1rem;">
            <button type="button" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="addOrderItem()">+ Add Item</button>
        </td></tr>`;

    lucide.createIcons();
};

window.addOrderItem = function() {
    window.editingOrderState.items.push({ id: '', title: 'New Item', price: 0, qty: 1 });
    renderEditableItems();
};
window.removeOrderItem = function(index) {
    window.editingOrderState.items.splice(index, 1);
    renderEditableItems();
};

window.saveOrderEdits = async function() {
    const id = document.getElementById('modalOrderId').textContent.replace('#', '');
    const name = document.getElementById('editOrderCustName').value.trim();
    const phone = document.getElementById('editOrderCustPhone').value.trim();
    const email = document.getElementById('editOrderCustEmail').value.trim();
    const city = document.getElementById('editOrderCustCity').value.trim();
    const province = document.getElementById('editOrderCustProvince').value.trim();
    const payMethod = document.getElementById('editOrderPayMethod').value;
    const payDetails = document.getElementById('editOrderPayDetails').value.trim();
    const address = document.getElementById('editOrderCustAddress').value.trim();
    const notes = document.getElementById('editOrderNotes').value.trim();

    const shipping = Number(document.getElementById('editOrderShipping').value) || 0;
    const courierCost = Number(document.getElementById('editOrderCourierCost').value) || 0;
    const purchaseCost = Number(document.getElementById('editOrderPurchaseCost').value) || 0;
    const discount = Number(document.getElementById('editOrderDiscount').value) || 0;
    const transferCharges = Number(document.getElementById('editOrderTransferCharges').value) || 0;
    const codFee = Number(document.getElementById('editOrderCodFee').value) || 0;
    const taxNote = document.getElementById('editOrderTaxNote').value.trim();
    const taxAmount = Number(document.getElementById('editOrderTaxAmount').value) || 0;
    const specialNote = document.getElementById('editOrderSpecialNote').value.trim();

    let subtotal = 0;
    window.editingOrderState.items.forEach(item => { subtotal += (Number(item.price) || 0) * (Number(item.qty) || 1); });
    const total = subtotal + shipping + codFee + taxAmount - discount;

    const updatedData = {
        customer: name,
        phone: phone,
        email: email,
        city: city,
        province: province,
        paymentMethod: payMethod,
        paymentDetails: payDetails,
        address: address,
        notes: notes,
        items: window.editingOrderState.items, 
        subtotal: subtotal,
        shipping: shipping,
        courierCost: courierCost,
        purchaseCost: purchaseCost,
        discount: discount,
        transferCharges: transferCharges,
        codFee: codFee,
        shippingNote: shipping > 0 ? `Rs ${shipping}` : 'Weight ke mutabiq',
        taxNote: taxNote,
        taxAmount: taxAmount,
        specialNote: specialNote,
        total: total
    };

    // 1. Save in LocalStorage immediately
    const orderOverrides = JSON.parse(localStorage.getItem('sp_order_overrides') || '{}');
    orderOverrides[id] = updatedData;
    localStorage.setItem('sp_order_overrides', JSON.stringify(orderOverrides));

    // 2. Update memory state
    const o = window.AppData.orders.find(x => String(x.id) === String(id));
    if (o) {
        Object.assign(o, updatedData);
    }

    // 3. Sync to Firestore in background
    if (typeof db !== 'undefined') {
        try {
            await db.collection('orders').doc(id).set(updatedData, { merge: true });
        } catch (e) {
            console.warn('Firestore cloud sync note (saved locally):', e.message);
        }
    }

    showToast('✅ Order & Financials updated successfully!');
    toggleOrderEdit();
    if (typeof renderOrders === 'function') renderOrders();
    if (typeof renderReports === 'function') renderReports();
    if (typeof renderDashboardView === 'function') renderDashboardView();
};


window.printInvoice = function(id) {
    const o = window.AppData.orders.find(x => String(x.id) === String(id));
    if (!o) return;

    let itemsHtml = '';
    (o.items || []).forEach(item => {
        itemsHtml += `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(item.title || 'Product')}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${item.price || 0}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd;">${item.qty || 1}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">${(item.price || 0) * (item.qty || 1)}</td>
            </tr>`;
    });

    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write(`
        <html><head><title>Invoice #${o.id}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; background: #f9f9f9; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 15px rgba(0,0,0,0.1); background: #fff; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #2563EB; padding-bottom: 20px; }
            .header-left h2 { margin: 0; font-size: 28px; color: #0B132B; text-transform: uppercase; }
            .invoice-title { font-size: 32px; font-weight: bold; color: #0B132B; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; padding: 12px; background: #0B132B; color: white; }
            .totals-table { width: 300px; margin-left: auto; margin-top: 30px; }
            .totals-table td { border: none; padding: 5px 12px; }
            .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #0B132B !important; color: #0B132B; }
            .footer { margin-top: 50px; text-align: center; color: #777; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
                body { padding: 0; background: #fff; }
                .invoice-box { box-shadow: none; border: none; max-width: 100%; padding: 0; }
                .no-print { display: none !important; }
            }
            .btn-print { background: #0B132B; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; display: block; margin: 0 auto 30px auto; text-align: center; font-weight: bold; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <script>
            function downloadPDF() {
                const element = document.getElementById('invoiceContent');
                const opt = {
                    margin:       0.5,
                    filename:     'Invoice_${o.id}.pdf',
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
            }
        </script>
        </head>
        <body>
            <div class="no-print" style="text-align:center; margin-bottom: 30px; display: flex; justify-content: center; gap: 15px;">
                <button class="btn-print" onclick="downloadPDF()" style="margin:0; background: #007bff;">⬇️ Download PDF Direct</button>
                <button class="btn-print" onclick="window.print()" style="margin:0; background: #28a745;">🖨️ Print to Printer</button>
            </div>
            <div class="invoice-box" id="invoiceContent">
                <div class="header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; display:flex; flex-direction:column; align-items:flex-start;">
                        <img src="https://studypack-taleemihub.vercel.app/assets/images/studypack_logo.png" style="height:60px; margin-bottom:10px;" alt="Study Pack Logo">
                        <div>
                            <h2 style="margin:0; font-size:24px; color:#0B132B; text-transform:uppercase;">Study Pack</h2>
                            <p style="margin:2px 0 0 0; color:#777; font-size:14px;">Taleemihub.com</p>
                        </div>
                    </div>
                    <div style="flex:1; text-align:center;">
                        <div class="invoice-title" style="margin-bottom:10px;">INVOICE</div>
                        <p style="margin:4px 0; font-size:16px;"><strong>Order #:</strong> ${o.id}</p>
                        <p style="margin:4px 0; font-size:16px;"><strong>Date:</strong> ${o.date ? new Date(o.date).toLocaleDateString('en-GB') : ''}</p>
                    </div>
                    <div style="flex:1;"></div>
                </div>
                
                ${o.specialNote ? `<div style="margin-bottom: 20px; padding: 12px 15px; background: #fdfae5; border: 1px solid #fce8a1; border-radius: 6px; color: #8a6d3b; font-size: 15px;"><strong>Note:</strong> ${escapeHtml(o.specialNote)}</div>` : ''}

                <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                    <div>
                        <strong style="color:#0B132B; font-size:18px;">Bill To:</strong><br>
                        ${escapeHtml(o.customer || 'Customer')}<br>${escapeHtml(o.address || '')}<br>${escapeHtml(o.city || '')}<br>${escapeHtml(o.phone || '')}
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:#0B132B; font-size:18px;">Payment Info:</strong><br>
                        ${(o.paymentMethod || '').toLowerCase().includes('easy') ? 'EasyPaisa' : (o.paymentMethod || '').toLowerCase().includes('jazz') ? 'JazzCash' : (o.paymentMethod || '').toLowerCase().includes('card') ? 'Credit / Debit Card' : (o.paymentMethod || '').toLowerCase() === 'cod' || (o.paymentMethod || '').toLowerCase().includes('delivery') ? 'Cash on Delivery' : (o.paymentMethodTitle || o.paymentMethod || 'Cash on Delivery')}<br>
                        ${o.paymentDetails ? 'A/C: ' + escapeHtml(o.paymentDetails) : ''}
                    </div>
                </div>
                <table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th style="text-align:right;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
                <table class="totals-table">
                    <tr><td>Subtotal (Books):</td><td style="text-align:right;">Rs. ${(o.items || []).reduce((s,i)=>(Number(i.price)||0)*(Number(i.qty)||1) + s, 0)}</td></tr>
                    <tr><td>Delivery Charges:</td><td style="text-align:right;">Rs. ${o.shipping || 0}</td></tr>
                    ${(Number(o.codFee) || 0) > 0 ? `<tr><td>COD Courier Fee (4%):</td><td style="text-align:right;">Rs. ${o.codFee}</td></tr>` : ''}
                    ${(Number(o.taxAmount) || 0) > 0 ? `<tr><td>Tax (${escapeHtml(o.taxNote || '')}):</td><td style="text-align:right;">Rs. ${o.taxAmount}</td></tr>` : ''}
                    <tr><td class="grand-total">Total Payable:</td><td class="grand-total" style="text-align:right;">Rs. ${o.total}</td></tr>
                </table>
                <div class="footer">Thank you for your business!<br>info@taleemihub.com</div>
            </div>
        </body></html>
    `);
    printWin.document.close();
};

window.exportOrdersCSV = function() {
    const orders = window.AppData.orders || [];
    if (orders.length === 0) return showToast('No orders to export', 'error');
    let csv = 'Order ID,Date,Customer,Phone,Status,Subtotal,Tax,Shipping,Total\n';
    orders.forEach(o => {
        const tax = Number(o.taxAmount) || 0;
        const ship = Number(o.shipping) || 0;
        const total = Number(o.total) || 0;
        const subtotal = total - tax - ship;
        csv += `${o.id},${o.date ? new Date(o.date).toLocaleDateString() : ''},"${(o.customer || '').replace(/"/g, '""')}","${o.phone || ''}",${o.status},${subtotal},${tax},${ship},${total}\n`;
    });
    downloadCSV(csv, `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
};

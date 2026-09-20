/* ============================================================
   Study Pack - WooCommerce REST API Integration Bridge
   ============================================================ */

const WC_CONFIG = {
    storeUrl: 'https://api.studypack.taleemihub.com',
    consumerKey: 'ck_9d3ebbf59738bb9cb7a3021067c90893476d32d7',
    consumerSecret: 'cs_75d5b1183e7985468ab5e374fc9be4ed0a5e2b3f'
};

/**
 * Syncs an order placed on the frontend directly into WordPress WooCommerce backend
 * and triggers instant email notification to taleemihub2020@gmail.com
 * @param {Object} orderData 
 * @returns {Promise<Object>} Created WooCommerce Order Object
 */
window.syncOrderToWooCommerce = async function(orderData) {
    try {
        const authHeader = 'Basic ' + btoa(WC_CONFIG.consumerKey + ':' + WC_CONFIG.consumerSecret);
        
        // Parse name into first and last name
        const nameParts = (orderData.customer || 'Customer').trim().split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Format line items with fallback product reference
        const lineItems = (orderData.items || []).map(item => {
            const itemObj = {
                name: item.title || item.name || 'Product',
                quantity: Number(item.qty) || 1,
                total: String((Number(item.price) || 0) * (Number(item.qty) || 1))
            };
            if (item.wcId || item.productId || item.wc_id) {
                itemObj.product_id = Number(item.wcId || item.productId || item.wc_id);
            } else {
                itemObj.product_id = 22074; // Fallback to live general product reference
            }
            return itemObj;
        });

        const pMethod = (orderData.paymentMethod || 'cod').toLowerCase();
        const payTitles = {
            'cod': 'Cash on Delivery',
            'easypaisa': 'EasyPaisa',
            'jazzcash': 'JazzCash',
            'card': 'Credit / Debit Card'
        };
        const pTitle = orderData.paymentMethodTitle || payTitles[pMethod] || (pMethod === 'easypaisa' ? 'EasyPaisa' : pMethod === 'jazzcash' ? 'JazzCash' : 'Cash on Delivery');

        const orderPayload = {
            payment_method: pMethod,
            payment_method_title: pTitle,
            set_paid: pMethod !== 'cod',
            meta_data: [
                { key: 'payment_account', value: orderData.paymentDetails || '' },
                { key: '_payment_account_number', value: orderData.paymentDetails || '' },
                { key: 'payment_method_title', value: pTitle }
            ],
            status: 'processing',
            billing: {
                first_name: firstName,
                last_name: lastName,
                address_1: orderData.address || '',
                city: orderData.city || 'Karachi',
                state: orderData.province || 'Sindh',
                country: 'PK',
                email: orderData.email || 'info@taleemihub.com',
                phone: orderData.phone || ''
            },
            shipping: {
                first_name: firstName,
                last_name: lastName,
                address_1: orderData.address || '',
                city: orderData.city || 'Karachi',
                state: orderData.province || 'Sindh',
                country: 'PK'
            },
            line_items: lineItems,
            customer_note: `Weight note: ${orderData.shippingNote || 'Weight ke mutabiq'}. Order source: StudyPack Web`
        };

        // 1. Send Order Notification to dedicated StudyPack Notifier Endpoint
        fetch(`${WC_CONFIG.storeUrl}/wp-json/studypack/v1/order-notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...orderData, admin_emails: ['info@taleemihub.com', 'taleemihub2020@gmail.com'] })
        }).catch(e => console.warn('Email notify fetch error:', e));

        // 2. Create Order in WooCommerce REST API
        const res = await fetch(`${WC_CONFIG.storeUrl}/wp-json/wc/v3/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(orderPayload)
        });

        if (res.ok) {
            const wcOrder = await res.json();
            console.log("Successfully synced order to WooCommerce! WC ID:", wcOrder.id);
            return wcOrder;
        } else {
            const errText = await res.text();
            console.warn("WooCommerce sync response non-ok:", res.status, errText);
            return null;
        }

    } catch (err) {
        console.warn("WooCommerce API sync network error (handled gracefully):", err);
        return null;
    }
};

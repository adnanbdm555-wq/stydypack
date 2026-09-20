/* ============================================================
   Central data layer — real-time Firestore listeners that
   populate window.AppData, shared by every view module.
   Listeners only start once an authorized admin is confirmed
   (adminReady event from auth.js), since the security rules
   require an admin for reading orders/coupons-list/admins.
   ============================================================ */

window.AppData = {
    products: [],
    orders: [],
    coupons: [],
    categories: [],
    admins: [],
    loaded: { products: false, orders: false, coupons: false, categories: false, admins: false }
};

let __unsubscribers = [];

function startDataListeners() {
    __unsubscribers.push(
        db.collection('products').onSnapshot(snapshot => {
            window.AppData.products = snapshot.docs.map(d => d.data());
            window.AppData.loaded.products = true;
            document.dispatchEvent(new CustomEvent('appDataLoaded', { detail: 'products' }));
        }, err => console.error('products listener error:', err))
    );

    __unsubscribers.push(
        db.collection('orders').onSnapshot(snapshot => {
            const orders = snapshot.docs.map(d => d.data());
            orders.sort((a, b) => (b.date || 0) - (a.date || 0));
            window.AppData.orders = orders;
            window.AppData.loaded.orders = true;
            document.dispatchEvent(new CustomEvent('appDataLoaded', { detail: 'orders' }));
        }, err => console.error('orders listener error:', err))
    );

    __unsubscribers.push(
        db.collection('coupons').onSnapshot(snapshot => {
            window.AppData.coupons = snapshot.docs.map(d => ({ _docId: d.id, ...d.data() }));
            window.AppData.loaded.coupons = true;
            document.dispatchEvent(new CustomEvent('appDataLoaded', { detail: 'coupons' }));
        }, err => console.error('coupons listener error:', err))
    );

    __unsubscribers.push(
        db.collection('categories').onSnapshot(snapshot => {
            window.AppData.categories = snapshot.docs.map(d => ({ _docId: d.id, ...d.data() }));
            window.AppData.loaded.categories = true;
            document.dispatchEvent(new CustomEvent('appDataLoaded', { detail: 'categories' }));
        }, err => console.error('categories listener error:', err))
    );

    __unsubscribers.push(
        db.collection('admins').onSnapshot(snapshot => {
            window.AppData.admins = snapshot.docs.map(d => ({ _docId: d.id, ...d.data() }));
            window.AppData.loaded.admins = true;
            document.dispatchEvent(new CustomEvent('appDataLoaded', { detail: 'admins' }));
        }, err => console.error('admins listener error:', err))
    );
}

function stopDataListeners() {
    __unsubscribers.forEach(u => { try { u(); } catch (e) {} });
    __unsubscribers = [];
    window.AppData = {
        products: [], orders: [], coupons: [], categories: [], admins: [],
        loaded: { products: false, orders: false, coupons: false, categories: false, admins: false }
    };
}

document.addEventListener('adminReady', startDataListeners);
auth.onAuthStateChanged(user => { if (!user) stopDataListeners(); });

// Derive a customer list (aggregated from orders by phone number) — shared helper
window.getCustomers = function() {
    const orders = window.AppData.orders || [];
    const map = {};
    orders.forEach(o => {
        if (!o.phone) return;
        if (!map[o.phone]) {
            map[o.phone] = {
                phone: o.phone, name: o.customer, email: o.email,
                totalSpent: 0, orderCount: 0, lastOrderDate: 0, orders: []
            };
        }
        const c = map[o.phone];
        if (o.status !== 'Cancelled') c.totalSpent += Number(o.total || 0);
        c.orderCount++;
        c.orders.push(o);
        if ((o.date || 0) > c.lastOrderDate) {
            c.lastOrderDate = o.date || 0;
            c.name = o.customer || c.name;
            c.email = o.email || c.email;
        }
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
};

/* ============================================================
   Firebase init — same project as the storefront/checkout.
   Exposes window.auth and window.db for every other dashboard
   script to use (avoids the old bug where `db` was declared with
   `const` inside a block and never reachable elsewhere).
   ============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyD3cl7bxjuLoILxck4di-w6fLw4aRXHb9M",
    authDomain: "study-pack-store.firebaseapp.com",
    projectId: "study-pack-store",
    storageBucket: "study-pack-store.firebasestorage.app",
    messagingSenderId: "346606609514",
    appId: "1:346606609514:web:31ca9e21967e6b1d4f5613"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.auth = firebase.auth();
window.db = firebase.firestore();

// Global toast helper used across every module
window.showToast = function(message, type) {
    const el = document.getElementById('toast');
    if (!el) { console.log(message); return; }
    document.getElementById('toastMsg').textContent = message;
    el.classList.remove('error');
    if (type === 'error') el.classList.add('error');
    el.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

// Global money formatter
window.money = (n) => 'PKR ' + Number(n || 0).toLocaleString();

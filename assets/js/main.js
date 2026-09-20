
/* ============ FIREBASE & STORE INTEGRATION ============ */
var BASE_SCRAPED_BOOKS = typeof SCRAPED_BOOKS !== 'undefined' ? [...SCRAPED_BOOKS] : [];
var BOOKS = typeof window.BOOKS !== 'undefined' ? window.BOOKS : [...BASE_SCRAPED_BOOKS];

if (typeof SCRAPED_TOYS !== 'undefined') BOOKS = [...BOOKS, ...SCRAPED_TOYS];
if (typeof SCRAPED_STATIONERY !== 'undefined') BOOKS = [...BOOKS, ...SCRAPED_STATIONERY];
if (typeof SCRAPED_COURSES !== 'undefined') BOOKS = [...BOOKS, ...SCRAPED_COURSES];
if (typeof SCRAPED_AFAQ !== 'undefined') BOOKS = [...BOOKS, ...SCRAPED_AFAQ];

var TOYS = typeof SCRAPED_TOYS !== 'undefined' ? [...SCRAPED_TOYS] : [];
var STATIONERY = typeof SCRAPED_STATIONERY !== 'undefined' ? [...SCRAPED_STATIONERY] : [];
var NOVELS = [];
var EBOOKS = [];
var COUPONS = [];
var CATEGORIES = [];
var BRANDS = [];

window.BOOKS = BOOKS;
window.TOYS = TOYS;
window.STATIONERY = STATIONERY;

function filterOutDummyProducts(list) {
    return (list || []).filter(b => {
        if (!b || !b.title) return false;
        const t = String(b.title).toLowerCase();
        if (t.includes('gatsby') || t.includes('dummy') || t.includes('test product')) return false;
        if (Number(b.price) <= 50 && !t.includes('notebook') && !t.includes('eraser')) return false;
        return true;
    });
}

try {
    const firebaseConfig = {
        apiKey: "AIzaSyD3cl7bxjuLoILxck4di-w6fLw4aRXHb9M",
        authDomain: "study-pack-store.firebaseapp.com",
        projectId: "study-pack-store",
        storageBucket: "study-pack-store.firebasestorage.app",
        messagingSenderId: "346606609514",
        appId: "1:346606609514:web:31ca9e21967e6b1d4f5613"
    };
    if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();

        db.collection('products').onSnapshot(snapshot => {
            const firestoreProds = filterOutDummyProducts(snapshot.docs.map(doc => doc.data()));
            
            // Merge Firestore products with scraped products
            const map = new Map();
            BASE_SCRAPED_BOOKS.forEach(b => map.set(String(b.id), b));
            if (typeof SCRAPED_TOYS !== 'undefined') SCRAPED_TOYS.forEach(b => map.set(String(b.id), b));
            if (typeof SCRAPED_STATIONERY !== 'undefined') SCRAPED_STATIONERY.forEach(b => map.set(String(b.id), b));
            if (typeof SCRAPED_COURSES !== 'undefined') SCRAPED_COURSES.forEach(b => map.set(String(b.id), b));
            if (typeof SCRAPED_AFAQ !== 'undefined') SCRAPED_AFAQ.forEach(b => map.set(String(b.id), b));
            firestoreProds.forEach(b => map.set(String(b.id), b));
            
            BOOKS = Array.from(map.values());
            window.BOOKS = BOOKS;
            
            window.dispatchEvent(new Event('firebaseProductsLoaded'));
            if (typeof initDynamicFilters === 'function') initDynamicFilters();
            if (typeof applyFilters === 'function') applyFilters();
            if (typeof renderCategories === 'function') renderCategories();
            if (typeof renderFeatured === 'function') renderFeatured();
            if (typeof renderAll === 'function') renderAll();
            if (typeof renderProductDetails === 'function') renderProductDetails();
        });
    }
} catch(e) {
    console.warn("Firebase init:", e);
}

function findItem(id){ 
    if (typeof window.findItem === 'function') return window.findItem(id);
    return BOOKS.find(x=>String(x.id)===String(id)) || EBOOKS.find(x=>String(x.id)===String(id)) || STATIONERY.find(x=>String(x.id)===String(id)) || TOYS.find(x=>String(x.id)===String(id)); 
}

/* ================= ADVANCED 3D MAGNETIC HOVER ================= */
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".cat-card");
    
    cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation (max 12 degrees)
            const rotateX = ((y - centerY) / centerY) * -12;
            const rotateY = ((x - centerX) / centerX) * 12;
            
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
            card.style.setProperty("--rotateX", `${rotateX}deg`);
            card.style.setProperty("--rotateY", `${rotateY}deg`);
        });
        
        card.addEventListener("mouseenter", () => {
            card.classList.add("hover-active");
            setTimeout(() => { card.style.transition = "none"; }, 300);
        });
        
        card.addEventListener("mouseleave", () => {
            card.classList.remove("hover-active");
            card.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.5s ease";
            card.style.setProperty("--rotateX", "0deg");
            card.style.setProperty("--rotateY", "0deg");
        });
        
        // Ripple effect on click
        card.addEventListener("mousedown", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement("span");
            ripple.classList.add("ripple");
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            card.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});


/* ============ OVERRIDE WITH ADMIN LOCALSTORAGE ============ */
try {
    const adminProducts = JSON.parse(localStorage.getItem('edubooks_products'));
    if (adminProducts && adminProducts.books && adminProducts.books.length > 0) {
        BOOKS = adminProducts.books;
    }
} catch(e){}



/* ================= CENTER BOTTOM PROMO BANNER ================= */
document.addEventListener("DOMContentLoaded", () => {
    // Check if we are on index to prevent annoying overlaps, or just show everywhere
    // The user asked to show this popup.
    const promoData = [
        {
            type: "stationery",
            theme: "theme-stationery",
            defaultIcon: "<i class='fas fa-pencil-ruler'></i>",
            title: "Premium Stationery!",
            text: "Upgrade your study desk with our exclusive collection.",
            btnText: "Shop Stationery",
            link: "stationery.html"
        },
        {
            type: "toys",
            theme: "theme-toys",
            defaultIcon: "<i class='fas fa-puzzle-piece'></i>",
            title: "New Toys Arrival!",
            text: "Discover fun and educational toys for all ages.",
            btnText: "Shop Toys",
            link: "toys.html"
        }
    ];

    let currentPromoIndex = 0;

    // Create the HTML structure
    const promoContainer = document.createElement("div");
    promoContainer.className = "promo-banner-popup";
    promoContainer.innerHTML = `
        <div class="promo-icon"></div>
        <div class="promo-content-wrapper">
            <div class="promo-text">
                <strong class="promo-title"></strong> <span class="promo-desc"></span>
            </div>
            <a href="#" class="promo-btn"></a>
            <span class="promo-close">&times;</span>
        </div>
    `;
    document.body.appendChild(promoContainer);

    const pClose = promoContainer.querySelector(".promo-close");
    let promoInterval;

    pClose.addEventListener("click", () => {
        promoContainer.classList.remove("show");
    });

    function showPromoBanner() {
        const data = promoData[currentPromoIndex];
        
        // Remove old theme classes
        promoContainer.className = "promo-banner-popup";
        promoContainer.classList.add(data.theme);
        
        // Find a random product image based on type
        let imgHtml = data.defaultIcon;
        if (data.type === "stationery" && typeof STATIONERY !== 'undefined' && STATIONERY.length > 0) {
            const randomItem = STATIONERY[Math.floor(Math.random() * STATIONERY.length)];
            if (randomItem.img) imgHtml = `<img src="${randomItem.img}" alt="Stationery" class="promo-img">`;
        } else if (data.type === "toys" && typeof TOYS !== 'undefined' && TOYS.length > 0) {
            const randomItem = TOYS[Math.floor(Math.random() * TOYS.length)];
            if (randomItem.img) imgHtml = `<img src="${randomItem.img}" alt="Toy" class="promo-img">`;
        }
        
        // Update content
        promoContainer.querySelector(".promo-icon").innerHTML = imgHtml;
        promoContainer.querySelector(".promo-title").innerHTML = data.title;
        promoContainer.querySelector(".promo-desc").innerHTML = data.text;
        
        const btn = promoContainer.querySelector(".promo-btn");
        btn.innerHTML = data.btnText;
        btn.href = data.link;

        // Show banner
        promoContainer.classList.add("show");

        // Toggle index for next time
        currentPromoIndex = (currentPromoIndex + 1) % promoData.length;

        // Hide after 8 seconds
        setTimeout(() => {
            promoContainer.classList.remove("show");
        }, 8000);
    }

    // Start promo banner after 12 seconds, then every 35 seconds
    setTimeout(() => {
        showPromoBanner();
        promoInterval = setInterval(showPromoBanner, 35000);
    }, 12000);
});



// ============================================================
// LIVE WOOCOMMERCE PRODUCT SYNC (Books, Toys, Stationery)
// ============================================================
var WC_LIVE_CONFIG = {
    storeUrl: 'https://api.studypack.taleemihub.com',
    consumerKey: 'ck_9d3ebbf59738bb9cb7a3021067c90893476d32d7',
    consumerSecret: 'cs_75d5b1183e7985468ab5e374fc9be4ed0a5e2b3f'
};

async function syncLiveWooCommerceProducts() {
    try {
        const authHeader = 'Basic ' + btoa(WC_LIVE_CONFIG.consumerKey + ':' + WC_LIVE_CONFIG.consumerSecret);
        const res = await fetch(`${WC_LIVE_CONFIG.storeUrl}/wp-json/wc/v3/products?per_page=50&status=publish`, {
            headers: { 'Authorization': authHeader }
        });
        if (!res.ok) return;
        const wcProducts = await res.json();
        
        const mapped = wcProducts.map(p => {
            const cats = (p.categories || []).map(c => c.name).join(' ');
            const img = p.images && p.images.length > 0 ? p.images[0].src : 'assets/images/logo.png';
            
            // Extract publisher / class / subject from categories or name
            let pub = 'Oxford Books';
            if (cats.toLowerCase().includes('paramount')) pub = 'Paramount';
            else if (cats.toLowerCase().includes('spectrum')) pub = 'Spectrum';
            else if (cats.toLowerCase().includes('afaq')) pub = 'AFAQ';
            else if (cats.toLowerCase().includes('sindh')) pub = 'Sindh Text Book';
            else if (cats.toLowerCase().includes('oxford') || cats.toLowerCase().includes('oup')) pub = 'Oxford Books';

            let category = 'book';
            if (cats.toLowerCase().includes('toy') || p.name.toLowerCase().includes('toy')) category = 'toys';
            else if (cats.toLowerCase().includes('stationery') || p.name.toLowerCase().includes('stationery') || p.name.toLowerCase().includes('pencil') || p.name.toLowerCase().includes('eraser')) category = 'stationery';

            return {
                id: String(p.id),
                title: p.name,
                price: Number(p.price || p.regular_price || 0),
                mrp: Number(p.regular_price || p.price || 0),
                img: img,
                pub: pub,
                cls: 'General',
                subj: 'General',
                category: category,
                stock: p.stock_status === 'instock' ? 100 : 0,
                source: 'woocommerce'
            };
        });

        if (mapped.length > 0) {
            // Merge into BOOKS, TOYS, STATIONERY
            const existingMap = new Map();
            mapped.forEach(item => existingMap.set(item.id, item));
            BOOKS.forEach(item => { if (!existingMap.has(item.id)) existingMap.set(item.id, item); });
            
            BOOKS = Array.from(existingMap.values());
            
            // Re-render UI if on books, toys, or stationery page
            if (typeof renderBooksGrid === 'function') renderBooksGrid();
            if (typeof renderToysGrid === 'function') renderToysGrid();
            if (typeof renderStationeryGrid === 'function') renderStationeryGrid();
            if (typeof applyDynamicFilters === 'function') applyDynamicFilters();
        }
    } catch (err) {
        console.warn('WooCommerce products sync skipped:', err);
    }
}

// Auto-sync products in background
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(syncLiveWooCommerceProducts, 800);
    });
}

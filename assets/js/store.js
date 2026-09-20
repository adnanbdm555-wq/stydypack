
// Guarantee Scroll Reveal Elements are Always Visible
function initReveal() {
    document.querySelectorAll('.reveal').forEach(el => {
        el.classList.add('in');
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
    });
}
document.addEventListener('DOMContentLoaded', initReveal);
window.addEventListener('load', initReveal);
setTimeout(initReveal, 100);
setTimeout(initReveal, 500);


// Preloader Immediate Dismissal
function dismissPreloader() {
    const pl = document.getElementById('preloader');
    if (pl) {
        pl.classList.add('hide');
        pl.style.opacity = '0';
        pl.style.visibility = 'hidden';
        pl.style.pointerEvents = 'none';
        setTimeout(() => { if (pl) pl.style.display = 'none'; }, 400);
    }
}
document.addEventListener('DOMContentLoaded', dismissPreloader);
window.addEventListener('load', dismissPreloader);
setTimeout(dismissPreloader, 100);
setTimeout(dismissPreloader, 500);
setTimeout(dismissPreloader, 1200);

/* ========================================================
   STUDY PACK CENTRAL STORE & CART ENGINE (GLOBAL & PERSISTENT)
   ======================================================== */

// Global Helpers
window.money = function(n) {
    const num = Number(n) || 0;
    return 'PKR ' + num.toLocaleString();
};

window.starString = function(r) {
    const full = Math.round(Number(r) || 5);
    return '★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, 5 - full));
};

// Global Cart State
window.cart = [];
try {
    window.cart = JSON.parse(localStorage.getItem('edubooks_cart') || '[]');
} catch(e) {
    window.cart = [];
}

window.saveCart = function() {
    try {
        localStorage.setItem('edubooks_cart', JSON.stringify(window.cart));
    } catch(e) {}
};

// Global Robust findItem function
window.findItem = function(id) {
    const sId = String(id);
    
    // Check in BOOKS
    if (typeof BOOKS !== 'undefined' && Array.isArray(BOOKS)) {
        const found = BOOKS.find(x => String(x.id) === sId);
        if (found) return found;
    }
    // Check in SCRAPED_BOOKS
    if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) {
        const found = SCRAPED_BOOKS.find(x => String(x.id) === sId);
        if (found) return found;
    }
    // Check in TOYS
    if (typeof TOYS !== 'undefined' && Array.isArray(TOYS)) {
        const found = TOYS.find(x => String(x.id) === sId);
        if (found) return found;
    }
    if (typeof SCRAPED_TOYS !== 'undefined' && Array.isArray(SCRAPED_TOYS)) {
        const found = SCRAPED_TOYS.find(x => String(x.id) === sId);
        if (found) return found;
    }
    // Check in STATIONERY
    if (typeof STATIONERY !== 'undefined' && Array.isArray(STATIONERY)) {
        const found = STATIONERY.find(x => String(x.id) === sId);
        if (found) return found;
    }
    if (typeof SCRAPED_STATIONERY !== 'undefined' && Array.isArray(SCRAPED_STATIONERY)) {
        const found = SCRAPED_STATIONERY.find(x => String(x.id) === sId);
        if (found) return found;
    }
    // Check in SCRAPED_AFAQ
    if (typeof SCRAPED_AFAQ !== 'undefined' && Array.isArray(SCRAPED_AFAQ)) {
        const found = SCRAPED_AFAQ.find(x => String(x.id) === sId);
        if (found) return found;
    }
    // Check in window.currentBooks
    if (typeof window.currentBooks !== 'undefined' && Array.isArray(window.currentBooks)) {
        const found = window.currentBooks.find(x => String(x.id) === sId);
        if (found) return found;
    }
    return null;
};

// Global addToCart
window.addToCart = function(id) {
    const sId = String(id);
    const item = window.cart.find(c => String(c.id) === sId);
    
    if (item) {
        item.qty = (Number(item.qty) || 1) + 1;
    } else {
        const b = window.findItem(sId);
        if (!b) {
            console.warn("Product not found in catalog for id:", sId);
            return;
        }
        window.cart.push({
            id: String(b.id),
            title: b.title || b.name || 'Study Pack Item',
            price: Number(b.price || 0),
            img: b.img || 'assets/images/logo.png',
            cls: b.cls || 'General',
            subj: b.subj || 'General',
            pub: b.pub || '',
            qty: 1
        });
    }
    
    window.saveCart();
    window.renderCart();
    window.showToast('Cart mein shamil ho gaya! 🛒');
    
    const btn = document.getElementById('cartBtn');
    if (btn && btn.animate) {
        btn.animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}], {duration:350});
    }

    // Auto-open Right Cart Drawer for immediate feedback on Desktop & Mobile
    if (typeof window.openCart === 'function') {
        window.openCart();
    }
};

window.changeQty = function(id, delta) {
    const sId = String(id);
    const item = window.cart.find(c => String(c.id) === sId);
    if (!item) return;
    
    item.qty = (Number(item.qty) || 1) + delta;
    if (item.qty <= 0) {
        window.cart = window.cart.filter(c => String(c.id) !== sId);
    }
    window.saveCart();
    window.renderCart();
};

window.removeItem = function(id) {
    const sId = String(id);
    window.cart = window.cart.filter(c => String(c.id) !== sId);
    window.saveCart();
    window.renderCart();
    window.showToast('Item cart se hata diya gaya');
};

window.renderCart = function() {
    const wrap = document.getElementById('cartItems');
    const empty = document.getElementById('cartEmpty');
    const count = window.cart.reduce((s, c) => s + (Number(c.qty) || 1), 0);
    
    // Update badge count
    document.querySelectorAll('#cartCount, .cart-count-badge').forEach(el => {
        el.textContent = count;
    });

    if (!wrap) return;

    if (window.cart.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748B;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.6;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            <div style="font-size:15px; font-weight:700; color:#0F172A; margin-bottom:4px;">Aapka Cart Khali Hai</div>
            <div style="font-size:12.5px;">Kitabein talaash karein aur Add to Cart karein.</div>
        </div>`;
    } else {
        wrap.innerHTML = window.cart.map(c => `
          <div class="cart-item" style="display:flex; gap:10px; padding:12px 0; border-bottom:1px solid #F1F5F9; align-items:center;">
            <img src="${c.img || 'assets/images/logo.png'}" alt="${c.title}" style="width:48px; height:48px; object-fit:contain; border-radius:6px; background:#F8FAFC; padding:2px; border:1px solid #E2E8F0;" onerror="this.src='assets/images/logo.png'">
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.title}</div>
              <div style="font-size:11.5px; color:#64748B;">${c.cls} • ${c.subj}</div>
              <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                <button onclick="window.changeQty('${c.id}', -1)" style="width:24px; height:24px; border-radius:4px; border:1px solid #CBD5E1; background:#fff; cursor:pointer; font-weight:700;">-</button>
                <span style="font-size:12px; font-weight:700; min-width:14px; text-align:center;">${c.qty}</span>
                <button onclick="window.changeQty('${c.id}', 1)" style="width:24px; height:24px; border-radius:4px; border:1px solid #CBD5E1; background:#fff; cursor:pointer; font-weight:700;">+</button>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px; font-weight:800; color:#0F172A;">${window.money(c.price * c.qty)}</div>
              <button onclick="window.removeItem('${c.id}')" style="background:none; border:none; color:#EF4444; font-size:11px; font-weight:600; cursor:pointer; margin-top:4px;">Remove</button>
            </div>
          </div>
        `).join('');
    }

    const sub = window.cart.reduce((s, c) => s + (Number(c.price) || 0) * (Number(c.qty) || 1), 0);
    
    const elSub = document.getElementById('sumSub');
    const elShip = document.getElementById('sumShip');
    const elTotal = document.getElementById('sumTotal');

    if (elSub) elSub.textContent = window.money(sub);
    if (elShip) elShip.textContent = sub === 0 ? 'PKR 0' : 'As per Weight / Distance';
    if (elTotal) elTotal.textContent = sub === 0 ? 'PKR 0' : window.money(sub) + ' (+ Delivery)';
};

window.openCart = function() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('show');
    if (overlay) overlay.classList.add('show');
    document.body.classList.add('cart-open');
    window.renderCart();
};

window.closeCartFn = function() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('cart-open');
};

// Global Toast
let __toastTimer;
window.showToast = function(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        t.innerHTML = '<span id="toastMsg"></span>';
        document.body.appendChild(t);
    }
    const msgEl = document.getElementById('toastMsg') || t;
    msgEl.textContent = msg;
    t.classList.add('show');
    clearTimeout(__toastTimer);
    __toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
};

// Global Quick View
window.openQuickView = function(id) {
    const b = window.findItem(id);
    if (!b) return;
    
    let modal = document.getElementById('qvModal');
    let overlay = document.getElementById('qvOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'qvOverlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = '<div class="qv-modal" id="qvModal"></div>';
        document.body.appendChild(overlay);
        modal = document.getElementById('qvModal');
        overlay.addEventListener('click', (e) => { if(e.target === overlay) window.closeQV(); });
    }
    
    const title = b.title || b.name || 'Educational Book';
    const priceStr = window.money(b.price || 0);
    const oldPriceStr = b.old ? window.money(b.old) : (b.d_price ? window.money(b.d_price) : '');
    const clsName = b.cls || b.class_name || (Array.isArray(b.cls) ? b.cls[0] : '') || 'School Textbook';
    const subjName = (b.subj && b.subj !== 'undefined') ? b.subj : ((b.subject && b.subject !== 'undefined') ? b.subject : 'General Subject');
    const pubName = (b.pub && b.pub !== 'undefined') ? b.pub : ((b.publisher && b.publisher !== 'undefined') ? b.publisher : 'Study Pack');
    const authorName = b.author || b.brand || pubName || 'Study Pack';
    const imgSrc = b.img || 'assets/images/studypack_logo.png';
    const starRating = typeof window.starString === 'function' ? window.starString(b.rating || 5) : '★★★★★';
    const inStock = b.stock !== false && b.inStock !== false;
    
    const escapeHtml = (s) => String(s||'').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    modal.innerHTML = `
      <button class="modal-close" onclick="window.closeQV()" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <!-- Left Column: Visual Showcase & Trust Badges -->
      <div style="background: linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%); padding: 30px 24px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; border-right: 1px solid #E2E8F0;">
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="background:${inStock ? '#DCFCE7' : '#FEE2E2'}; color:${inStock ? '#15803D' : '#B91C1C'}; font-size:11px; font-weight:800; padding:4px 10px; border-radius:99px; display:inline-flex; align-items:center; gap:5px;">
            <span style="width:6px; height:6px; border-radius:50%; background:${inStock ? '#16A34A' : '#DC2626'};"></span> ${inStock ? 'In Stock' : 'Out of Stock'}
          </span>
          <span style="background:#E0F2FE; color:#0369A1; font-size:11px; font-weight:700; padding:4px 10px; border-radius:99px;">
            100% Genuine
          </span>
        </div>

        <div style="width:100%; height:250px; display:flex; align-items:center; justify-content:center; padding:10px;">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(title)}" style="max-height:230px; max-width:100%; object-fit:contain; filter:drop-shadow(0 12px 20px rgba(0,0,0,0.12));" onerror="this.src='assets/images/studypack_logo.png'">
        </div>

        <div style="width:100%; background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:12px 14px; margin-top:14px; display:flex; flex-direction:column; gap:7px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:#334155; font-weight:600;">
            <span>🚚</span> Fast Delivery across Pakistan
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:#334155; font-weight:600;">
            <span>💵</span> Cash on Delivery (COD) Available
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:#334155; font-weight:600;">
            <span>🛡️</span> 100% Original Publisher Stock
          </div>
        </div>
      </div>

      <!-- Right Column: Rich Specifications & Instant Order Actions -->
      <div style="padding: 28px 30px; overflow-y:auto; display:flex; flex-direction:column; justify-content:space-between; background:#ffffff;">
        <div>
          <!-- Pills / Meta tags -->
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; align-items:center;">
            <span style="background:#1565C015; color:#1565C0; font-size:11px; font-weight:800; padding:3px 9px; border-radius:6px; text-transform:uppercase; letter-spacing:0.4px;">${escapeHtml(clsName)}</span>
            <span style="background:#F1F5F9; color:#475569; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">${escapeHtml(subjName)}</span>
            <span style="background:#FEF3C7; color:#B45309; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">${escapeHtml(pubName)}</span>
          </div>

          <!-- Product Title -->
          <h2 style="font-size:20px; font-weight:800; color:#0F172A; line-height:1.35; margin:0 0 6px 0; font-family:var(--ff-head, 'Poppins', sans-serif);">${escapeHtml(title)}</h2>
          
          <!-- Author & Reviews line -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:12.5px; color:#64748B;">
              by <strong style="color:#1E293B;">${escapeHtml(authorName)}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:4px; font-size:12px; color:#EAB308;">
              <span>${starRating}</span>
              <span style="color:#64748B; font-weight:600;">(4.9★)</span>
            </div>
          </div>

          <!-- Price Row -->
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <span style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.4px; display:block;">Store Price</span>
              <div style="display:flex; align-items:baseline; gap:8px;">
                <span style="font-size:24px; font-weight:800; color:#0F172A; font-family:var(--ff-head, 'Poppins', sans-serif);">${priceStr}</span>
                ${oldPriceStr ? `<span style="font-size:14px; color:#94A3B8; text-decoration:line-through;">${oldPriceStr}</span>` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11.5px; color:#16A34A; font-weight:700; background:#DCFCE7; padding:4px 8px; border-radius:6px;">Verified Stock</span>
            </div>
          </div>

          <!-- Specifications Grid -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:18px;">
            <div style="background:#FAFAFA; border:1px solid #E5E7EB; border-radius:8px; padding:7px 12px;">
              <span style="font-size:10px; color:#6B7280; font-weight:700; text-transform:uppercase; display:block;">Class / Grade</span>
              <div style="font-size:12px; font-weight:700; color:#1F2937;">${escapeHtml(clsName)}</div>
            </div>
            <div style="background:#FAFAFA; border:1px solid #E5E7EB; border-radius:8px; padding:7px 12px;">
              <span style="font-size:10px; color:#6B7280; font-weight:700; text-transform:uppercase; display:block;">Subject</span>
              <div style="font-size:12px; font-weight:700; color:#1F2937;">${escapeHtml(subjName)}</div>
            </div>
            <div style="background:#FAFAFA; border:1px solid #E5E7EB; border-radius:8px; padding:7px 12px;">
              <span style="font-size:10px; color:#6B7280; font-weight:700; text-transform:uppercase; display:block;">Publisher</span>
              <div style="font-size:12px; font-weight:700; color:#1F2937;">${escapeHtml(pubName)}</div>
            </div>
            <div style="background:#FAFAFA; border:1px solid #E5E7EB; border-radius:8px; padding:7px 12px;">
              <span style="font-size:10px; color:#6B7280; font-weight:700; text-transform:uppercase; display:block;">Condition</span>
              <div style="font-size:12px; font-weight:700; color:#16A34A;">Brand New Original</div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div>
          <div style="display:flex; gap:10px; margin-bottom:8px;">
            <button onclick="window.addToCart('${b.id}'); window.closeQV(); showToast('Book added to cart!');" style="flex:1; padding:12px 14px; background:#0F172A; color:#ffffff; border:none; border-radius:10px; font-weight:700; font-size:13.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.2s;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
              Add to Cart
            </button>
            <button onclick="window.addToCart('${b.id}'); window.closeQV(); window.openCart();" style="flex:1; padding:12px 14px; background:#1565C0; color:#ffffff; border:none; border-radius:10px; font-weight:700; font-size:13.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.2s;">
              ⚡ Buy Now
            </button>
          </div>

          <a href="https://wa.me/923172605553?text=Assalam-o-Alaikum%20Study%20Pack,%20I%20want%20to%20order:%20${encodeURIComponent(title)}%20(${priceStr})" target="_blank" rel="noopener" style="width:100%; box-sizing:border-box; padding:9px 14px; background:#25D36615; color:#15803D; border:1px solid #25D36650; border-radius:10px; font-weight:700; font-size:12.5px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.542 1.87.829 2.796.83h.005c3.18 0 5.767-2.586 5.768-5.766 0-1.541-.6-2.99-1.69-4.08-1.089-1.09-2.538-1.69-4.083-1.69z"/></svg>
            Order Directly via WhatsApp
          </a>
        </div>
      </div>
    `;
    
    overlay.classList.add('show');
};

window.closeQV = function() {
    const overlay = document.getElementById('qvOverlay');
    if (overlay) overlay.classList.remove('show');
};

// Initialize listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.renderCart();
    
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    
    if (cartBtn) cartBtn.addEventListener('click', window.openCart);
    if (closeCart) closeCart.addEventListener('click', window.closeCartFn);
    if (cartOverlay) cartOverlay.addEventListener('click', window.closeCartFn);

    // Sync body.cart-open if class .show is added or removed dynamically
    if (drawer) {
        const observer = new MutationObserver(() => {
            if (drawer.classList.contains('show')) {
                document.body.classList.add('cart-open');
            } else {
                document.body.classList.remove('cart-open');
            }
        });
        observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeCartFn();
            if (typeof window.closeQV === 'function') window.closeQV();
        }
    });
});

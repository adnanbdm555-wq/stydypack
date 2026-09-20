/* ========================================================
   STUDY PACK LIVE RECENT PURCHASE TOAST & CENTER PROMO MODAL
   ======================================================== */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initLivePurchaseToast();
    // initCenterPromoModal(); // Disabled as per user request
  });

  // ========================================================
  // 1. LIVE RECENT PURCHASE TOAST (Bottom Left Corner)
  // ========================================================
  const buyerLocations = [
    { name: "Fatima S.", city: "Karachi (Gulshan)" },
    { name: "Ahmed Raza", city: "Lahore (DHA)" },
    { name: "Zainab K.", city: "Islamabad (F-10)" },
    { name: "Bilal M.", city: "Rawalpindi (Bahria Town)" },
    { name: "Ayesha Tariq", city: "Karachi (Clifton)" },
    { name: "Usman Ali", city: "Faisalabad" },
    { name: "Mariam Khan", city: "Hyderabad" },
    { name: "Hamza Sheikh", city: "Multan" },
    { name: "Sana Javed", city: "Karachi (PECHS)" }
  ];

  function initLivePurchaseToast() {
    let toast = document.getElementById('spPurchaseToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'spPurchaseToast';
      toast.className = 'sp-purchase-toast';
      document.body.appendChild(toast);
    }

    // Start cycle after 4 seconds
    setTimeout(showNextPurchaseNotification, 4000);
  }

  function showNextPurchaseNotification() {
    const toast = document.getElementById('spPurchaseToast');
    if (!toast) return;

    const catalog = typeof BOOKS !== 'undefined' && BOOKS.length > 0 ? BOOKS : (typeof SCRAPED_BOOKS !== 'undefined' ? SCRAPED_BOOKS : []);
    if (catalog.length === 0) return;

    // Pick random product and buyer
    const product = catalog[Math.floor(Math.random() * catalog.length)];
    const buyer = buyerLocations[Math.floor(Math.random() * buyerLocations.length)];
    const minutesAgo = Math.floor(Math.random() * 8) + 1;
    const img = product.img || 'assets/images/logo.png';
    const priceStr = typeof money === 'function' ? money(product.price) : 'PKR ' + (product.price || 0).toLocaleString();

    toast.innerHTML = `
      <img src="${img}" alt="${escapeHtml(product.title)}" class="sp-toast-img" onerror="this.src='assets/images/logo.png'">
      <div class="sp-toast-content">
        <div class="sp-toast-title">
          <span>🛒 Verified Purchase</span>
        </div>
        <div class="sp-toast-buyer">${buyer.name} from ${buyer.city}</div>
        <div class="sp-toast-item" title="${escapeHtml(product.title)}">Purchased <strong>${escapeHtml(product.title)}</strong> (${priceStr})</div>
        <div class="sp-toast-time">${minutesAgo} min ago • Verified by StudyPack</div>
      </div>
      <button class="sp-toast-close" onclick="dismissPurchaseToast(event)">&times;</button>
    `;

    toast.onclick = (e) => {
      if (e.target.classList.contains('sp-toast-close')) return;
      if (typeof addToCart === 'function') {
        addToCart(product.id);
        if (typeof openCart === 'function') openCart();
      }
    };

    toast.classList.add('show');

    // Hide after 5.5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      // Schedule next notification in 14-22 seconds
      const nextDelay = Math.floor(Math.random() * 8000) + 14000;
      setTimeout(showNextPurchaseNotification, nextDelay);
    }, 5500);
  }

  window.dismissPurchaseToast = function(e) {
    if (e) e.stopPropagation();
    const toast = document.getElementById('spPurchaseToast');
    if (toast) toast.classList.remove('show');
  };


  // ========================================================
  // 2. CENTER NEW ARRIVALS & FLASH PROMO MODAL POPUP
  // ========================================================
  function initCenterPromoModal() {
    return; // Permanently disabled popup
    // Show only once per session
    if (sessionStorage.getItem('sp_promo_modal_shown')) return;

    let overlay = document.getElementById('spPromoOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'spPromoOverlay';
      overlay.className = 'sp-promo-overlay';

      overlay.innerHTML = `
        <div class="sp-promo-card">
          <div class="sp-promo-header">
            <button class="sp-promo-close" onclick="closePromoModal()">&times;</button>
            <span class="sp-promo-tag">✨ New Arrivals &amp; Courses</span>
            <h3>Academic Year 2026-2027 Syllabus In Stock!</h3>
            <p>Oxford Books, Paramount, Spectrum &amp; Top School Course Packs ready for express delivery.</p>
          </div>
          <div class="sp-promo-body">
            <div class="sp-promo-deal-box">
              <div style="font-size:12px; color:#64748B; margin-bottom:4px; font-weight:600;">Use Discount Voucher on Checkout:</div>
              <div class="sp-promo-code">STUDYPACK</div>
              <div style="font-size:11.5px; color:#10B981; font-weight:700; margin-top:4px;">🚚 Actual Weight Based Courier Shipping + 4% COD</div>
            </div>
            <button class="btn-promo" onclick="closePromoModal(); window.location.href='courses.html';">
              🎒 Explore School Course Packs
            </button>
            <button onclick="closePromoModal()" style="margin-top:10px; background:none; border:none; color:#64748B; font-size:12.5px; cursor:pointer; font-weight:600;">
              Continue Browsing Books
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    // Trigger popup after 4 seconds of page load
    setTimeout(() => {
      if (overlay) {
        overlay.classList.add('show');
        sessionStorage.setItem('sp_promo_modal_shown', 'true');
      }
    }, 4000);
  }

  window.closePromoModal = function() {
    const overlay = document.getElementById('spPromoOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();

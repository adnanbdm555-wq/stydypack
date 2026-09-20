/* ============================================================
   App shell — navigation, theme, sidebar toggle, settings tabs.
   ============================================================ */

document.addEventListener('adminReady', () => {
    lucide.createIcons();
});

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (localStorage.getItem('sp_dash_theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.innerHTML = '<i data-lucide="sun"></i>';
    }
    themeBtn?.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('sp_dash_theme', 'dark');
            themeBtn.innerHTML = '<i data-lucide="moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('sp_dash_theme', 'light');
            themeBtn.innerHTML = '<i data-lucide="sun"></i>';
        }
        lucide.createIcons();
        if (window.renderDashboardCharts) window.renderDashboardCharts();
    });

    // Sidebar toggle (mobile)
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    menuBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));

    // Nav routing
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    function switchView(viewId) {
        navItems.forEach(n => n.classList.remove('active'));
        viewSections.forEach(v => v.classList.remove('active'));
        document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');
        document.getElementById(viewId)?.classList.add('active');
        if (window.innerWidth <= 1024 && sidebar) sidebar.classList.remove('open');

        // Trigger view-specific renders (safe no-ops if data not loaded yet)
        try {
            if (viewId === 'dashboard' && window.renderDashboard) window.renderDashboard();
            if (viewId === 'products' && window.renderProducts) window.renderProducts();
            if (viewId === 'courses' && window.renderCourses) window.renderCourses();
            if (viewId === 'priceAdjuster' && window.renderPriceAdjuster) window.renderPriceAdjuster();
            if (viewId === 'livechat' && window.initLiveChatDashboard) window.initLiveChatDashboard();
            if (viewId === 'orders' && window.renderOrders) window.renderOrders();
            if (viewId === 'customers' && window.renderCustomers) window.renderCustomers();
            if (viewId === 'inventory' && window.renderInventory) window.renderInventory();
            if (viewId === 'coupons' && window.renderCoupons) window.renderCoupons();
            if (viewId === 'categories' && window.renderCategories) window.renderCategories();
            if (viewId === 'reports' && window.renderReports) window.renderReports();
            if (viewId === 'settings' && window.renderAdmins) window.renderAdmins();
        } catch (e) { console.error('View render error:', e); }

        lucide.createIcons();
    }
    window.switchView = switchView;

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab)?.classList.add('active');
        });
    });

    // Global search — jumps to Products/Orders/Customers and filters
    document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const q = e.target.value.trim();
        if (!q) return;
        switchView('products');
        const prodSearch = document.getElementById('prodSearch');
        if (prodSearch) { prodSearch.value = q; prodSearch.dispatchEvent(new Event('input')); }
    });

    // Re-render whichever view is currently visible whenever fresh data arrives
    document.addEventListener('appDataLoaded', () => {
        const active = document.querySelector('.view-section.active');
        if (active) switchView(active.id);
    });
});

/* ============================================================
   Firebase Authentication & Master Admin Login for Dashboard
   ============================================================ */

window.currentAdmin = null; // { uid, email, role }

function showLoginScreen() {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('appShell')?.classList.remove('ready');
}

function showApp() {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('appShell')?.classList.add('ready');
}

function setLoginError(msg) {
    const el = document.getElementById('loginError');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
}

function setLoginInfo(msg) {
    const el = document.getElementById('loginInfo');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
}

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginInfo(null);
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    // Master Admin Auto-Login & Creation Fallback
    try {
        let userCred;
        try {
            userCred = await auth.signInWithEmailAndPassword(email, password);
        } catch (signInErr) {
            // If user doesn't exist or is master admin, auto create
            if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || email.includes('taleemihub.com') || email.includes('admin')) {
                try {
                    userCred = await auth.createUserWithEmailAndPassword(email, password);
                } catch (createErr) {
                    throw signInErr;
                }
            } else {
                throw signInErr;
            }
        }

        const user = userCred.user;
        // Ensure admin document exists in Firestore
        await db.collection('admins').doc(user.uid).set({
            email: user.email,
            name: email.split('@')[0].toUpperCase(),
            role: 'owner',
            updatedAt: Date.now()
        }, { merge: true });

    } catch (err) {
        console.error("Login error:", err);
        let msg = 'Login failed. Please check your email and password.';
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = 'Invalid password. If this is a new admin email, use a password with at least 6 characters.';
        } else if (err.code === 'auth/weak-password') {
            msg = 'Password should be at least 6 characters.';
        } else if (err.code === 'auth/invalid-email') {
            msg = 'Please enter a valid email address.';
        }
        setLoginError(msg);
        btn.disabled = false;
        btn.textContent = original;
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!confirm('Log out?')) return;
    await auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.currentAdmin = null;
        showLoginScreen();
        return;
    }

    setLoginInfo('Verifying admin access...');
    try {
        // Fetch or create admin doc
        let adminDoc = await db.collection('admins').doc(user.uid).get();
        if (!adminDoc.exists) {
            await db.collection('admins').doc(user.uid).set({
                email: user.email,
                name: (user.email || 'ADMIN').split('@')[0].toUpperCase(),
                role: 'owner',
                createdAt: Date.now()
            });
            adminDoc = await db.collection('admins').doc(user.uid).get();
        }

        const data = adminDoc.data() || {};
        window.currentAdmin = { 
            uid: user.uid, 
            email: user.email, 
            role: data.role || 'owner', 
            name: data.name || user.email.split('@')[0] 
        };

        const nameEl = document.getElementById('currentAdminName');
        const roleEl = document.getElementById('currentAdminRole');
        if (nameEl) nameEl.textContent = window.currentAdmin.name;
        if (roleEl) roleEl.textContent = window.currentAdmin.role;

        setLoginError(null);
        setLoginInfo(null);
        showApp();

        document.dispatchEvent(new CustomEvent('adminReady', { detail: window.currentAdmin }));
        
        // Trigger data load
        if (typeof window.fetchWooCommerceOrders === 'function') {
            window.fetchWooCommerceOrders(false);
        }
    } catch (err) {
        console.error('Admin verification error:', err);
        setLoginInfo(null);
        // Fallback open app for authenticated admin
        showApp();
    }
});

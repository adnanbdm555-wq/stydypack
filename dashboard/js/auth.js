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

function activateAdminSession(email, uid = 'master-admin', role = 'owner') {
    sessionStorage.setItem('sp_admin_logged', 'true');
    sessionStorage.setItem('sp_admin_email', email);
    
    window.currentAdmin = {
        uid: uid,
        email: email,
        role: role,
        name: email.split('@')[0].toUpperCase()
    };

    const nameEl = document.getElementById('currentAdminName');
    const roleEl = document.getElementById('currentAdminRole');
    if (nameEl) nameEl.textContent = window.currentAdmin.name;
    if (roleEl) roleEl.textContent = window.currentAdmin.role;

    setLoginError(null);
    setLoginInfo(null);
    showApp();

    document.dispatchEvent(new CustomEvent('adminReady', { detail: window.currentAdmin }));
    if (typeof window.loadAllOrders === 'function') {
        window.loadAllOrders(false);
    } else if (typeof window.fetchWooCommerceOrders === 'function') {
        window.fetchWooCommerceOrders(false);
    }
}

// Auto-restore session if previously logged in
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('sp_admin_logged') === 'true') {
        const savedEmail = sessionStorage.getItem('sp_admin_email') || 'admin@taleemihub.com';
        activateAdminSession(savedEmail);
    }
});

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

    // Master Admin local bypass check
    const isMasterAdmin = (
        (email === 'admin@taleemihub.com' || email.includes('taleemihub') || email.includes('admin')) &&
        (password === 'admin123' || password === 'admin@123' || password === 'taleemihub' || password.length >= 6)
    );

    // Try Firebase Authentication
    try {
        let userCred = null;
        if (typeof auth !== 'undefined') {
            try {
                userCred = await auth.signInWithEmailAndPassword(email, password);
            } catch (signInErr) {
                // If user doesn't exist, try auto create
                if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
                    try {
                        userCred = await auth.createUserWithEmailAndPassword(email, password);
                    } catch (createErr) {
                        if (!isMasterAdmin) throw signInErr;
                    }
                } else if (!isMasterAdmin) {
                    throw signInErr;
                }
            }
        }

        if (userCred && userCred.user) {
            const user = userCred.user;
            try {
                await db.collection('admins').doc(user.uid).set({
                    email: user.email,
                    name: email.split('@')[0].toUpperCase(),
                    role: 'owner',
                    updatedAt: Date.now()
                }, { merge: true });
            } catch(e) {}
            activateAdminSession(user.email, user.uid, 'owner');
        } else if (isMasterAdmin) {
            activateAdminSession(email, 'master-admin', 'owner');
        } else {
            throw new Error('Invalid credentials');
        }

    } catch (err) {
        if (isMasterAdmin) {
            activateAdminSession(email, 'master-admin', 'owner');
            return;
        }

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
    sessionStorage.removeItem('sp_admin_logged');
    sessionStorage.removeItem('sp_admin_email');
    if (typeof auth !== 'undefined') {
        try { await auth.signOut(); } catch(e) {}
    }
    window.currentAdmin = null;
    showLoginScreen();
});

if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            if (sessionStorage.getItem('sp_admin_logged') !== 'true') {
                window.currentAdmin = null;
                showLoginScreen();
            }
            return;
        }

        setLoginInfo('Verifying admin access...');
        try {
            let adminDoc = null;
            try {
                adminDoc = await db.collection('admins').doc(user.uid).get();
                if (!adminDoc.exists) {
                    await db.collection('admins').doc(user.uid).set({
                        email: user.email,
                        name: (user.email || 'ADMIN').split('@')[0].toUpperCase(),
                        role: 'owner',
                        createdAt: Date.now()
                    });
                    adminDoc = await db.collection('admins').doc(user.uid).get();
                }
            } catch(e) {}

            const data = (adminDoc && adminDoc.data()) || {};
            activateAdminSession(user.email, user.uid, data.role || 'owner');

        } catch (err) {
            console.error('Admin verification error:', err);
            setLoginInfo(null);
            activateAdminSession(user.email, user.uid, 'owner');
        }
    });
}

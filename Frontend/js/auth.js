/**
 * Authentication Module
 */

function switchToRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
}

function switchToLogin() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
}

// Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    App.showLoading();
    
    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(App.API_BASE + 'auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await App.safeJSON(response);
        console.log('Login response:', data);
        
        if (data.success) {
            App.currentUser = data.user;
            App.currentTheme = data.user.theme || 'starbucks';
            App.showApp();
            App.applyTheme(App.currentTheme);
            App.loadDashboard();
            App.loadNotifications();
            App.loadBillsBadge();
            if (App._ni) clearInterval(App._ni);
            App._ni = setInterval(() => { App.loadNotifications(); App.loadBillsBadge(); }, 60000);
            App.showToast('Welcome back, ' + (data.user.full_name || data.user.username) + '! 👋', 'success');
        } else {
            App.showToast(data.message, 'error');
            console.error('Login failed:', data);
        }
    } catch (error) {
        console.error('Login error:', error);
        App.showToast('Login failed. Please try again.', 'error');
    } finally {
        App.hideLoading();
    }
});

// Register Form Handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('register-fullname').value;
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const currency = document.getElementById('register-currency').value;
    
    App.showLoading();
    
    try {
        const formData = new FormData();
        formData.append('action', 'register');
        formData.append('full_name', fullName);
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('currency', currency);
        
        const response = await fetch(App.API_BASE + 'auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await App.safeJSON(response);
        console.log('Registration response:', data);
        
        if (data.success) {
            App.currentUser = data.user;
            App.currentTheme = data.user?.theme || 'starbucks';
            App.showApp();
            App.applyTheme(App.currentTheme);
            App.loadDashboard();
            App.loadNotifications();
            App.loadBillsBadge();
            if (App._ni) clearInterval(App._ni);
            App._ni = setInterval(() => { App.loadNotifications(); App.loadBillsBadge(); }, 60000);
            App.showToast('Welcome to CashFlow, ' + (data.user.full_name || data.user.username) + '! 🎉', 'success');
        } else {
            App.showToast(data.message, 'error');
            console.error('Registration failed:', data);
        }
    } catch (error) {
        console.error('Registration error:', error);
        App.showToast('Registration failed. Please try again.', 'error');
    } finally {
        App.hideLoading();
    }
});

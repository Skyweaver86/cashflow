const App = {
    currentUser: null, currentTheme: 'starbucks', currentPage: 'dashboard',
    qaType: 'expense', API_BASE: '../Backend/',

    init() { this.checkSession(); this.setupEventListeners(); },

    async checkSession() {
        try {
            const r = await fetch(this.API_BASE + 'auth.php?action=check_session');
            const d = await r.json();
            if (d.logged_in) {
                this.currentUser = d.user;
                App._conversionRate = 1;
                this.currentTheme = d.user.theme || 'starbucks';
                this.showApp();
                this.applyTheme(this.currentTheme);
                this.loadDashboard();
                this.loadNotifications();
                this.loadBillsBadge();
                if (this._ni) clearInterval(this._ni);
                this._ni = setInterval(() => { this.loadNotifications(); this.loadBillsBadge(); }, 60000);
            } else { this.showAuth(); }
        } catch(e) { console.error(e); this.showAuth(); }
    },

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => { e.preventDefault(); this.navigateTo(item.dataset.page); });
        });
        document.addEventListener('click', e => {
            const panel = document.getElementById('notifications-panel');
            const bell  = document.querySelector('.notification-bell');
            if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) panel.style.display = 'none';
        });
    },

    navigateTo(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        const titles = { dashboard:'Dashboard', transactions:'Transactions', budgets:'Budgets',
            goals:'Savings Goals', bills:'Monthly Bills', reports:'Reports & Analytics',
            currency:'Currency Converter', settings:'Settings' };
        const subs = { dashboard:'Here\'s your financial overview', transactions:'Track every peso in and out',
            budgets:'Stay within your spending limits', goals:'Progress toward your savings targets',
            bills:'Manage your monthly recurring bills', reports:'Deep dive into your financial trends',
            currency:'Convert between currencies instantly', settings:'Manage your account preferences' };
        const el = document.getElementById('page-title-el');
        const sub = document.getElementById('page-subtitle');
        if (el) el.textContent = titles[page] || page;
        if (sub) sub.textContent = subs[page] || '';
        this.loadPage(page);
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
        const gs = document.getElementById('global-search');
        if (gs) gs.value = '';
    },

    loadPage(page) {
        const map = { dashboard: Dashboard.init.bind(Dashboard), transactions: Transactions.init.bind(Transactions),
            budgets: Budgets.init.bind(Budgets), goals: Goals.init.bind(Goals), bills: Bills.init.bind(Bills),
            reports: Reports.init.bind(Reports), currency: Currency.init.bind(Currency), settings: Settings.init.bind(Settings) };
        if (map[page]) map[page]();
    },

    loadDashboard() { Dashboard.init(); },

    async loadBillsBadge() {
        try {
            const r = await fetch(this.API_BASE + 'bills.php?action=get_bills');
            const d = await r.json();
            if (d.success) {
                const overdue = d.bills.filter(b => b.is_overdue).length;
                const badge = document.getElementById('bills-badge');
                if (badge) { badge.style.display = overdue > 0 ? 'inline' : 'none'; badge.textContent = overdue; }
            }
        } catch(e) {}
    },

    async loadNotifications() {
        try {
            const r = await fetch(this.API_BASE + 'bills.php?action=get_notifications&unread_only=1');
            const d = await r.json();
            if (d.success) {
                const badge = document.getElementById('notification-count');
                const n = d.notifications.length;
                if (badge) { badge.textContent = n; badge.style.display = n > 0 ? 'block' : 'none'; }
                this.renderNotifications(d.notifications);
            }
        } catch(e) {}
    },

    renderNotifications(notifications) {
        const list = document.getElementById('notifications-list');
        if (!list) return;
        if (!notifications.length) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--tx-muted);font-size:0.85rem;"><i class="fas fa-check-circle" style="font-size:1.5rem;opacity:0.4;display:block;margin-bottom:8px;"></i>All caught up!</div>';
            return;
        }
        list.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="App.markNotificationRead(${n.notification_id})">
                <h4>${this.getNotificationTitle(n.notification_type)}</h4>
                <p>${n.message}</p>
                <small>${this.formatDate(n.created_at)}</small>
            </div>`).join('');
    },

    getNotificationTitle(t) {
        return { bill_reminder:'💵 Bill Reminder', budget_warning:'⚠️ Budget Alert', goal_achieved:'🎉 Goal Achieved', share_request:'👥 Share Request' }[t] || '📣 Notification';
    },

    async markNotificationRead(id) {
        const fd = new FormData(); fd.append('action','mark_notification_read'); fd.append('notification_id',id);
        await fetch(this.API_BASE + 'bills.php', { method:'POST', body:fd });
        this.loadNotifications();
    },

    showAuth() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('quick-add-fab').style.display = 'none';
    },

    showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        document.getElementById('quick-add-fab').style.display = 'flex';
        if (this.currentUser) {
            const name = this.currentUser.full_name || this.currentUser.username || 'User';
            document.getElementById('user-name').textContent = name;
            const sidebarName = document.getElementById('sidebar-username');
            if (sidebarName) sidebarName.textContent = name;
            this.updateAvatars(this.currentUser.profile_picture);
            const hr = new Date().getHours();
            const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
            const sub = document.getElementById('page-subtitle');
            if (sub && this.currentPage === 'dashboard') sub.textContent = `${greet}, ${name.split(' ')[0]} — here's your financial overview`;
        }
    },

    updateAvatars(picturePath) {
        const name = this.currentUser?.full_name || this.currentUser?.username || 'U';
        const col = this.currentTheme === 'ocean' ? '0EA5E9' : '00704A';
        let src;
        if (picturePath) {
            // picturePath stored as 'uploads/avatars/file.jpg' — index.html is in Frontend/, so path is relative directly
            src = picturePath.startsWith('http') ? picturePath : picturePath;
        } else {
            src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${col}&color=fff`;
        }
        ['user-avatar','sidebar-avatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.src = src; el.onerror = () => { el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${col}&color=fff`; }; }
        });
    },

    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        this.currentTheme = theme;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.theme-btn.theme-${theme}`)?.classList.add('active');
        if (this.currentUser) this.updateAvatars(this.currentUser.profile_picture);
    },

    showLoading() { document.getElementById('loading-overlay').style.display = 'flex'; },
    hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; },

    showToast(msg, type = 'info') {
        const t = document.getElementById('toast');
        t.textContent = msg;
        const c = { success:'var(--c-success)', error:'var(--c-danger)', warning:'var(--c-warning)', info:'var(--c-info)' };
        t.style.borderLeftColor = c[type] || c.info;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3500);
    },

    formatCurrency(amount, currency = null) {
        const curr = currency || this.currentUser?.currency || 'USD';
        const sym = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', PHP:'₱', INR:'₹', AUD:'A$', CAD:'C$', CHF:'Fr' };
        const s = sym[curr] || curr;
        const f = new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(Math.abs(amount));
        return amount < 0 ? `-${s}${f}` : `${s}${f}`;
    },


    // Safe JSON parser — never crashes on bad PHP output
    async safeJSON(response) {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch(e) {
            console.error('Bad JSON from server:', text.substring(0, 200));
            return { success: false, message: 'Server error — check PHP logs' };
        }
    },

    formatDate(ds) {
        const d = new Date(ds), now = new Date();
        const diff = Math.floor((now - d) / 86400000);
        if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff} days ago`;
        return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
    },

    // ANIMATED COUNTER
    animateCount(el, target, prefix = '', suffix = '') {
        if (!el) return; // null-safe guard
        const num = parseFloat(target) || 0;
        const start = 0, dur = 600, step = 16;
        const frames = dur / step;
        let frame = 0;
        el.classList.add('animating');
        const fmt = v => prefix + new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(v) + suffix;
        const iv = setInterval(() => {
            frame++;
            const ease = 1 - Math.pow(1 - (frame / frames), 3);
            el.textContent = fmt(start + (num - start) * ease);
            if (frame >= frames) { clearInterval(iv); el.textContent = fmt(num); el.classList.remove('animating'); }
        }, step);
    },

    // QUICK ADD
    _qaCats: { expense:[], income:[] },

    async openQuickAdd() {
        // Reset form fields
        const qaDate = document.getElementById('qa-date');
        if (qaDate) qaDate.value = new Date().toISOString().split('T')[0];
        const qaAmt = document.getElementById('qa-amount');
        if (qaAmt) qaAmt.value = '';
        const qaDesc = document.getElementById('qa-description');
        if (qaDesc) qaDesc.value = '';
        // Set button states before opening
        this.qaType = 'expense';
        const expBtn = document.getElementById('qa-type-expense');
        const incBtn = document.getElementById('qa-type-income');
        if (expBtn) expBtn.style.opacity = '1';
        if (incBtn) incBtn.style.opacity = '0.4';
        // Show modal
        document.getElementById('quick-add-modal').classList.add('active');
        // Load categories FIRST, then fill dropdown
        await this._loadQACats();
    },
    closeQuickAdd() {
        document.getElementById('quick-add-modal').classList.remove('active');
        document.getElementById('qa-amount').value = '';
        document.getElementById('qa-description').value = '';
    },
    setQAType(type) {
        this.qaType = type;
        document.getElementById('qa-type-expense').style.opacity = type==='expense'?'1':'0.4';
        document.getElementById('qa-type-income').style.opacity  = type==='income' ?'1':'0.4';
        this._fillQACats(type);
    },
    async _loadQACats() {
        try {
            const r = await fetch(this.API_BASE + 'transactions.php?action=get_categories');
            const text = await r.text();
            let d;
            try { d = JSON.parse(text); } catch(pe) {
                console.error('Categories JSON parse error:', text.substring(0,300));
                this._fillQACats(this.qaType);
                return;
            }
            if (d && d.success && d.categories) {
                const pred = Array.isArray(d.categories.predefined) ? d.categories.predefined : [];
                const user = Array.isArray(d.categories.user_defined) ? d.categories.user_defined : [];
                this._qaCats.expense = pred.filter(c => c.category_type === 'expense')
                    .concat(user.filter(c => c.category_type === 'expense'));
                this._qaCats.income = pred.filter(c => c.category_type === 'income')
                    .concat(user.filter(c => c.category_type === 'income'));
                console.log('Categories loaded - expense:', this._qaCats.expense.length, 'income:', this._qaCats.income.length);
            } else {
                console.error('Categories API failed:', d?.message || 'Unknown error');
            }
        } catch(e) {
            console.error('_loadQACats fetch error:', e);
        }
        // Always fill dropdown after loading (even if empty)
        this._fillQACats(this.qaType);
    },
    _fillQACats(type) {
        const sel = document.getElementById('qa-category'); if (!sel) return;
        const opts = '<option value="">Select category</option>' +
            (this._qaCats[type]||[]).map(c => '<option value="' + (c.category_id?'pred_'+c.category_id:'user_'+c.user_category_id) + '">' + c.category_name + '</option>').join('');
        sel.innerHTML = opts;
    },
    async submitQuickAdd() {
        const amount = document.getElementById('qa-amount').value;
        const catVal = document.getElementById('qa-category').value;
        const desc   = document.getElementById('qa-description').value;
        const date   = document.getElementById('qa-date').value || new Date().toISOString().split('T')[0];
        if (!amount || parseFloat(amount) <= 0) { this.showToast('Enter a valid amount','error'); return; }
        const action = this.qaType === 'expense' ? 'add_expense' : 'add_income';
        const df     = this.qaType === 'expense' ? 'expense_date' : 'income_date';
        const fd = new FormData();
        fd.append('action', action); fd.append('amount', amount); fd.append('description', desc); fd.append(df, date);
        if (catVal.startsWith('pred_')) fd.append('category_id', catVal.replace('pred_',''));
        else if (catVal.startsWith('user_')) fd.append('user_category_id', catVal.replace('user_',''));
        try {
            const r = await fetch(this.API_BASE + 'transactions.php', { method:'POST', body:fd });
            const d = await r.json();
            if (d.success) { this.showToast(`${this.qaType==='expense'?'Expense':'Income'} added!`,'success'); this.closeQuickAdd(); if (this.currentPage==='dashboard') Dashboard.init(); else if (this.currentPage==='transactions') Transactions.loadTransactions(); }
            else { this.showToast(d.message,'error'); }
        } catch(e) { this.showToast('Failed to add','error'); }
    },

    // SEARCH
    _st: null,
    handleSearch(q) {
        clearTimeout(this._st);
        if (!q.trim()) return;
        this._st = setTimeout(() => {
            this.navigateTo('transactions');
            setTimeout(() => Transactions.searchTransactions(q.trim()), 300);
        }, 400);
    }
};

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function toggleNotifications() {
    const p = document.getElementById('notifications-panel');
    p.style.display = p.style.display==='none' ? 'block' : 'none';
    if (p.style.display==='block') App.loadNotifications();
}
async function markAllNotificationsRead() {
    const fd = new FormData(); fd.append('action','mark_notification_read'); fd.append('notification_id',0);
    await fetch(App.API_BASE+'bills.php',{method:'POST',body:fd});
    App.loadNotifications(); App.showToast('All notifications cleared','success');
}
function changeTheme(t) {
    App.applyTheme(t);
    if (App.currentUser) {
        const fd = new FormData();
        fd.append('action','update_profile');
        fd.append('full_name', App.currentUser.full_name||'');
        fd.append('email', App.currentUser.email||'');
        fd.append('currency', App.currentUser.currency||'USD');
        fd.append('theme', t);
        fetch(App.API_BASE+'auth.php',{method:'POST',body:fd});
    }
}
async function logout() {
    const fd = new FormData(); fd.append('action','logout');
    await fetch(App.API_BASE+'auth.php',{method:'POST',body:fd});
    App.currentUser = null;
    if (App._ni) clearInterval(App._ni);
    App.showAuth(); App.showToast('Signed out successfully','success');
}
document.addEventListener('DOMContentLoaded', () => App.init());

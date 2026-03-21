const Settings = {
    async init() {
        const user = App.currentUser || {};
        const fullName = user.full_name || '';
        const email = user.email || '';
        const currency = user.currency || 'USD';
        const currentTheme = App.currentTheme || 'starbucks';
        const avatarSrc = user.profile_picture
            ? (user.profile_picture.startsWith('http') ? user.profile_picture : user.profile_picture)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName||'U')}&background=${currentTheme==='ocean'?'0EA5E9':'00704A'}&color=fff`;

        const container = document.getElementById('page-container');
        container.innerHTML = `
        <div class="section-card">
            <div class="settings-tabs">
                <button class="settings-tab active" onclick="Settings.switchTab('profile',this)"><i class="fas fa-user"></i> Profile</button>
                <button class="settings-tab" onclick="Settings.switchTab('appearance',this)"><i class="fas fa-palette"></i> Appearance</button>
                <button class="settings-tab" onclick="Settings.switchTab('security',this)"><i class="fas fa-shield-alt"></i> Security</button>
            </div>

            <!-- PROFILE TAB -->
            <div class="settings-pane active" id="pane-profile">
                <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--sp-8);align-items:start;max-width:560px;">
                    <!-- Avatar upload -->
                    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                        <div style="position:relative;width:96px;height:96px;">
                            <img id="settings-avatar-preview" src="${avatarSrc}"
                                style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid var(--c-brand);display:block;"
                                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName||'U')}&background=00704A&color=fff'">
                            <label for="avatar-upload" style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;background:var(--c-brand);color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.75rem;border:2px solid var(--bg-surface);">
                                <i class="fas fa-camera"></i>
                            </label>
                            <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;" onchange="Settings.uploadAvatar(this)">
                        </div>
                        <span style="font-size:0.72rem;color:var(--tx-muted);text-align:center;">Click camera<br>to change photo</span>
                    </div>

                    <!-- Profile form -->
                    <form id="settings-form" style="display:grid;gap:14px;">
                        <div>
                            <label>Full Name</label>
                            <input type="text" id="settings-fullname" value="${fullName}" required>
                        </div>
                        <div>
                            <label>Email Address</label>
                            <input type="email" id="settings-email" value="${email}" required>
                        </div>
                        <div>
                            <label>Default Currency
                                <span style="font-size:0.72rem;color:var(--tx-muted);font-weight:400;"> — affects all displayed amounts</span>
                            </label>
                            <select id="settings-currency">
                                <option value="USD" ${currency==='USD'?'selected':''}>🇺🇸 USD — US Dollar</option>
                                <option value="EUR" ${currency==='EUR'?'selected':''}>🇪🇺 EUR — Euro</option>
                                <option value="GBP" ${currency==='GBP'?'selected':''}>🇬🇧 GBP — British Pound</option>
                                <option value="PHP" ${currency==='PHP'?'selected':''}>🇵🇭 PHP — Philippine Peso</option>
                                <option value="JPY" ${currency==='JPY'?'selected':''}>🇯🇵 JPY — Japanese Yen</option>
                                <option value="AUD" ${currency==='AUD'?'selected':''}>🇦🇺 AUD — Australian Dollar</option>
                                <option value="CAD" ${currency==='CAD'?'selected':''}>🇨🇦 CAD — Canadian Dollar</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" style="justify-content:center;">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </form>
                </div>
            </div>

            <!-- APPEARANCE TAB -->
            <div class="settings-pane" id="pane-appearance">
                <div style="max-width:520px;display:grid;gap:24px;">
                    <div>
                        <label style="display:block;margin-bottom:14px;font-size:0.95rem;">Choose Theme</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div onclick="Settings.selectTheme('starbucks')" id="theme-card-starbucks"
                                style="border:2px solid ${currentTheme==='starbucks'?'var(--c-brand)':'var(--bd-default)'};border-radius:var(--r-lg);padding:18px;cursor:pointer;transition:all 0.2s;background:${currentTheme==='starbucks'?'var(--c-brand-light)':'var(--bg-raised)'};">
                                <div style="height:52px;border-radius:8px;background:linear-gradient(135deg,#1E3932,#00704A);margin-bottom:12px;"></div>
                                <div style="font-weight:600;font-size:0.92rem;color:var(--tx-primary);">🌿 Starbucks</div>
                                <div style="font-size:0.76rem;color:var(--tx-muted);margin-top:4px;">Forest green · Warm cream</div>
                                ${currentTheme==='starbucks' ? '<div style="font-size:0.72rem;color:var(--c-brand);margin-top:8px;font-weight:700;">✓ Currently active</div>' : ''}
                            </div>
                            <div onclick="Settings.selectTheme('ocean')" id="theme-card-ocean"
                                style="border:2px solid ${currentTheme==='ocean'?'var(--c-brand)':'var(--bd-default)'};border-radius:var(--r-lg);padding:18px;cursor:pointer;transition:all 0.2s;background:${currentTheme==='ocean'?'var(--c-brand-light)':'var(--bg-raised)'};">
                                <div style="height:52px;border-radius:8px;background:linear-gradient(135deg,#0B1120,#0EA5E9);margin-bottom:12px;"></div>
                                <div style="font-weight:600;font-size:0.92rem;color:var(--tx-primary);">🌊 Ocean Night</div>
                                <div style="font-size:0.76rem;color:var(--tx-muted);margin-top:4px;">Deep navy · Electric cyan</div>
                                ${currentTheme==='ocean' ? '<div style="font-size:0.72rem;color:var(--c-brand);margin-top:8px;font-weight:700;">✓ Currently active</div>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECURITY TAB -->
            <div class="settings-pane" id="pane-security">
                <form id="password-form" style="display:grid;gap:16px;max-width:480px;">
                    <div>
                        <label>Current Password</label>
                        <div class="pw-wrap">
                            <input type="password" id="current-password" placeholder="Enter current password" required>
                            <button type="button" class="pw-toggle" onclick="Settings.togglePw('current-password',this)"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    <div>
                        <label>New Password</label>
                        <div class="pw-wrap">
                            <input type="password" id="new-password" placeholder="Min 6 characters" required>
                            <button type="button" class="pw-toggle" onclick="Settings.togglePw('new-password',this)"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    <div>
                        <label>Confirm New Password</label>
                        <div class="pw-wrap">
                            <input type="password" id="confirm-password" placeholder="Repeat new password" required>
                            <button type="button" class="pw-toggle" onclick="Settings.togglePw('confirm-password',this)"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    <div id="pw-strength" style="display:none;padding:10px;border-radius:var(--r-md);font-size:0.82rem;"></div>
                    <button type="submit" class="btn btn-primary" style="justify-content:center;">
                        <i class="fas fa-key"></i> Update Password
                    </button>
                </form>
            </div>
        </div>`;

        this.setupFormHandlers();
    },

    switchTab(tab, btn) {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`pane-${tab}`)?.classList.add('active');
    },

    selectTheme(theme) {
        changeTheme(theme);
        setTimeout(() => Settings.init(), 50);
    },

    togglePw(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
        else { input.type = 'password'; icon.className = 'fas fa-eye'; }
    },

    async uploadAvatar(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
        if (!allowed.includes(file.type)) { App.showToast('Only JPG, PNG, GIF, WEBP allowed', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { App.showToast('File too large (max 5MB)', 'error'); return; }

        // Preview immediately
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('settings-avatar-preview');
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload
        const fd = new FormData();
        fd.append('action', 'upload_avatar');
        fd.append('avatar', file);
        try {
            App.showLoading();
            const r = await fetch(App.API_BASE + 'auth.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            App.hideLoading();
            if (d.success) {
                App.currentUser.profile_picture = d.path;
                App.updateAvatars(d.path);
                App.showToast('Profile photo updated! 📸', 'success');
            } else { App.showToast(d.message || 'Upload failed', 'error'); }
        } catch(e) { App.hideLoading(); App.showToast('Upload failed', 'error'); }
    },

    setupFormHandlers() {
        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newCurrency = document.getElementById('settings-currency').value;
            const oldCurrency = App.currentUser?.currency;
            const fd = new FormData();
            fd.append('action', 'update_profile');
            fd.append('full_name', document.getElementById('settings-fullname').value);
            fd.append('email', document.getElementById('settings-email').value);
            fd.append('currency', newCurrency);
            fd.append('theme', App.currentTheme);
            try {
                const r = await fetch(App.API_BASE + 'auth.php', { method:'POST', body:fd });
                const d = await App.safeJSON(r);
                if (d.success) {
                    App.currentUser.full_name = document.getElementById('settings-fullname').value;
                    App.currentUser.email = document.getElementById('settings-email').value;
                    App.currentUser.currency = newCurrency;
                    if (d.user) App.currentUser = { ...App.currentUser, ...d.user };
                    document.getElementById('user-name').textContent = App.currentUser.full_name;
                    document.getElementById('sidebar-username').textContent = App.currentUser.full_name;
                    App.showToast('Profile updated!' + (newCurrency !== oldCurrency ? ' Currency changed — amounts will refresh.' : ''), 'success');
                    // Refresh dashboard if currency changed
                    if (newCurrency !== oldCurrency && App.currentPage === 'dashboard') {
                        setTimeout(() => Dashboard.loadSummary(), 500);
                    }
                } else { App.showToast(d.message, 'error'); }
            } catch(e) { App.showToast('Failed to update profile', 'error'); }
        });

        document.getElementById('password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;
            if (newPw !== confirmPw) { App.showToast('Passwords do not match', 'error'); return; }
            if (newPw.length < 6) { App.showToast('Password must be at least 6 characters', 'error'); return; }
            const fd = new FormData();
            fd.append('action', 'change_password');
            fd.append('current_password', document.getElementById('current-password').value);
            fd.append('new_password', newPw);
            try {
                const r = await fetch(App.API_BASE + 'auth.php', { method:'POST', body:fd });
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Password updated! 🔒', 'success'); e.target.reset(); }
                else { App.showToast(d.message, 'error'); }
            } catch(e) { App.showToast('Failed to change password', 'error'); }
        });

        // Password strength indicator
        document.getElementById('new-password')?.addEventListener('input', function() {
            const val = this.value;
            const el = document.getElementById('pw-strength');
            if (!val) { el.style.display = 'none'; return; }
            el.style.display = 'block';
            let strength = 0, msg = '', color = '';
            if (val.length >= 6) strength++;
            if (val.length >= 10) strength++;
            if (/[A-Z]/.test(val)) strength++;
            if (/[0-9]/.test(val)) strength++;
            if (/[^A-Za-z0-9]/.test(val)) strength++;
            if (strength <= 1) { msg = '⚠️ Weak password'; color = 'var(--c-danger-bg)'; }
            else if (strength <= 3) { msg = '⚡ Fair password'; color = 'var(--c-warning-bg)'; }
            else { msg = '✅ Strong password'; color = 'var(--c-success-bg)'; }
            el.style.background = color;
            el.textContent = msg;
        });
    }
};

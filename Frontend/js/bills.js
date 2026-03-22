const Bills = {
    async init() {
        const container = document.getElementById('page-container');
        container.innerHTML = `
        <div class="section-card">
            <div class="section-header"><h2>Add Monthly Bill</h2></div>
            <form id="add-bill-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
                <div><label>Bill Name</label><input type="text" id="bill-name" placeholder="e.g. Netflix" required></div>
                <div><label>Amount</label><input type="number" id="bill-amount" step="0.01" min="0.01" required></div>
                <div><label>Due Date (Day of month)</label><input type="number" id="bill-due-date" min="1" max="31" placeholder="1–31" required></div>
                <div><label>Category</label><select id="bill-category"></select></div>
                <div><label>Notes</label><input type="text" id="bill-notes" placeholder="Optional note"></div>
                <div style="display:flex;align-items:flex-end;">
                    <button type="submit" class="btn btn-primary" style="width:100%;">
                        <i class="fas fa-plus"></i> Add Bill
                    </button>
                </div>
            </form>
        </div>

        <div class="section-card">
            <div class="section-header">
                <h2>Your Monthly Bills</h2>
                <div id="bills-summary" style="font-size:0.85rem;color:var(--tx-muted);"></div>
            </div>
            <div id="bills-list"><p style="color:var(--tx-muted);text-align:center;padding:20px;">Loading...</p></div>
        </div>`;

        this.loadCategories();
        this.loadBills();
        this.loadSharedBills();
        this.setupFormHandler();
    },

    async loadCategories() {
        try {
            const _cr = await fetch(App.API_BASE + 'transactions.php?action=get_categories&type=expense');
            const _ct = await _cr.text();
            let d;
            try { d = JSON.parse(_ct); } catch(pe) { console.error('Categories parse error:', _ct.substring(0,200)); return; }
            if (d.success) {
                const sel = document.getElementById('bill-category');
                sel.innerHTML = '<option value="">Select Category</option>' +
                    [...(d.categories?.predefined||[]), ...(d.categories?.user_defined||[])]
                    .map(c => {
                        const val = c.category_id ? 'pred_' + c.category_id : 'user_' + c.user_category_id;
                        return `<option value="${val}">${c.category_name}</option>`;
                    }).join('');
            }
        } catch(e) { console.error('Categories failed:', e); }
    },

    async loadBills() {
        try {
            await App.fetchConversionRate();
            const r = await fetch(App.API_BASE + 'bills.php?action=get_bills');
            const d = await App.safeJSON(r);
            const container = document.getElementById('bills-list');
            const summary = document.getElementById('bills-summary');

            if (!d.success) { container.innerHTML = '<p style="color:var(--c-danger);text-align:center;">Failed to load bills.</p>'; return; }

            if (!d.bills.length) {
                container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--tx-muted);">
                    <i class="fas fa-file-invoice-dollar" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
                    <p>No bills added yet. Add your first monthly bill above!</p>
                </div>`;
                if (summary) summary.textContent = '';
                return;
            }

            const totalDue = d.bills.reduce((s, b) => s + parseFloat(b.amount), 0);
            const paidCount = d.bills.filter(b => b.is_paid).length;
            const unpaidTotal = d.bills.filter(b => !b.is_paid).reduce((s, b) => s + parseFloat(b.amount), 0);
            if (summary) summary.textContent = `${paidCount}/${d.bills.length} paid · ${App.formatCurrency(unpaidTotal * (App._conversionRate || 1))} outstanding`;

            container.innerHTML = d.bills.map(b => {
                const statusBadge = b.is_paid
                    ? '<span class="badge success"><i class="fas fa-check"></i> Paid</span>'
                    : b.is_overdue
                    ? '<span class="badge danger"><i class="fas fa-exclamation-circle"></i> Overdue</span>'
                    : b.days_until_due <= 3
                    ? `<span class="badge warning"><i class="fas fa-clock"></i> Due in ${b.days_until_due}d</span>`
                    : `<span class="badge info">Due ${b.due_date}${this.getDaySuffix(b.due_date)}</span>`;

                const accentColor = b.is_paid ? 'var(--c-success)' : b.is_overdue ? 'var(--c-danger)' : b.days_until_due <= 3 ? 'var(--c-warning)' : 'var(--c-brand)';

                return `
                <div class="stat-card" style="margin-bottom:10px;border-left:3px solid ${accentColor};">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div style="display:flex;align-items:center;gap:13px;flex:1;min-width:0;">
                            <div style="width:40px;height:40px;border-radius:var(--r-md);background:${accentColor}18;display:flex;align-items:center;justify-content:center;color:${accentColor};flex-shrink:0;">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div style="min-width:0;">
                                <div style="font-weight:600;font-size:0.95rem;color:var(--tx-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.bill_name}</div>
                                <div style="font-size:0.78rem;color:var(--tx-muted);margin-top:2px;">${b.category_name}${b.notes ? ' · ' + b.notes : ''}</div>
                            </div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <div style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--tx-primary);">${App.formatCurrency(b.amount * (App._conversionRate || 1))}</div>
                            <div style="margin-top:4px;">${statusBadge}</div>
                        </div>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            ${!b.is_paid ? `<button class="btn btn-success" onclick="Bills.payBill(${b.bill_id})" style="padding:7px 11px;font-size:0.82rem;" title="Mark as paid"><i class="fas fa-check"></i></button>` : ''}
                            <button class="btn btn-secondary" onclick="Bills.shareBill(${b.bill_id})" style="padding:7px 11px;font-size:0.82rem;" title="Share bill"><i class="fas fa-share-alt"></i></button>
                            <button class="btn btn-danger" onclick="Bills.deleteBill(${b.bill_id})" style="padding:7px 11px;font-size:0.82rem;" title="Delete bill"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { console.error('Bills load failed:', e); }
    },

    getDaySuffix(d) {
        if (d >= 11 && d <= 13) return 'th';
        switch(d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
    },

    setupFormHandler() {
        document.getElementById('add-bill-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'add_bill');
            fd.append('bill_name', document.getElementById('bill-name').value);
            fd.append('amount', document.getElementById('bill-amount').value);
            fd.append('due_date', document.getElementById('bill-due-date').value);
            fd.append('category_id', document.getElementById('bill-category').value);
            fd.append('notes', document.getElementById('bill-notes').value);
            try {
                const r = await fetch(App.API_BASE + 'bills.php', { method:'POST', body:fd });
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Bill added!', 'success'); e.target.reset(); this.loadBills(); }
                else { App.showToast(d.message, 'error'); }
            } catch(e) { App.showToast('Failed to add bill', 'error'); }
        });
    },

    async payBill(id) {
        // Fetch the bill's actual amount first so we can pre-fill the prompt
        let billAmount = '';
        try {
            const rb = await fetch(App.API_BASE + 'bills.php?action=get_bills');
            const db = await App.safeJSON(rb);
            if (db.success && db.bills) {
                const bill = db.bills.find(b => b.bill_id == id);
                if (bill) billAmount = parseFloat(bill.amount).toFixed(2);
            }
        } catch(e) { /* fallback to empty */ }

        const amount = prompt('Enter payment amount:', billAmount);
        if (amount === null) return; // cancelled
        const parsed = parseFloat(amount);
        if (!parsed || parsed <= 0) { App.showToast('Enter a valid payment amount', 'error'); return; }

        const fd = new FormData();
        fd.append('action', 'pay_bill');
        fd.append('bill_id', id);
        fd.append('payment_date', new Date().toISOString().split('T')[0]);
        fd.append('amount_paid', parsed);
        try {
            const r = await fetch(App.API_BASE + 'bills.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Bill payment recorded! ✅', 'success'); this.loadBills(); App.loadBillsBadge(); }
            else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to record payment', 'error'); }
    },

    async loadSharedBills() {
        try {
            const r = await fetch(App.API_BASE + 'bills.php?action=get_shared_bills');
            const d = await App.safeJSON(r);
            if (!d.success) return;
            const received = d.received_shares || [];
            const section = document.getElementById('shared-bills-section');
            const listEl = document.getElementById('shared-bills-list');
            if (!section || !listEl) return;
            if (!received.length) { section.style.display = 'none'; return; }
            section.style.display = 'block';
            listEl.innerHTML = received.map(s => {
                const statusColor = s.status === 'accepted' ? 'var(--c-success)' : s.status === 'declined' ? 'var(--c-danger)' : 'var(--c-warning)';
                const myShare = (parseFloat(s.amount) * parseFloat(s.share_percentage) / 100).toFixed(2);
                return `<div class="stat-card" style="margin-bottom:10px;border-left:3px solid ${statusColor};">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div>
                            <div style="font-weight:600;font-size:0.95rem;">${s.bill_name}</div>
                            <div style="font-size:0.78rem;color:var(--tx-muted);">Shared by <strong>${s.owner_username}</strong> · Your share: ${s.share_percentage}%</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700;">${App.formatCurrency(myShare * (App._conversionRate || 1))}</div>
                            <div style="font-size:0.75rem;color:var(--tx-muted);">of ${App.formatCurrency(s.amount * (App._conversionRate || 1))}</div>
                        </div>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            ${s.status === 'pending' ? `
                            <button class="btn btn-success btn-sm" onclick="Bills.respondShare(${s.share_id},'accepted')"><i class="fas fa-check"></i> Accept</button>
                            <button class="btn btn-danger btn-sm" onclick="Bills.respondShare(${s.share_id},'declined')"><i class="fas fa-times"></i> Decline</button>
                            ` : `<span class="badge ${s.status === 'accepted' ? 'success' : 'danger'}" style="text-transform:capitalize;">${s.status}</span>`}
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { console.error('Shared bills failed:', e); }
    },

    async respondShare(shareId, response) {
        const fd = new FormData();
        fd.append('action', 'respond_to_share');
        fd.append('share_id', shareId);
        fd.append('response', response);
        try {
            const r = await fetch(App.API_BASE + 'bills.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) {
                App.showToast(response === 'accepted' ? 'Bill accepted! ✅' : 'Bill declined', response === 'accepted' ? 'success' : 'info');
                this.loadSharedBills();
                App.loadNotifications();
            } else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to respond', 'error'); }
    },

    async shareBill(id) {
        const target = prompt('Enter username or email to share this bill with:');
        if (!target) return;
        const pct = prompt('What percentage should they pay? (default: 50)', '50');
        if (pct === null) return;
        const fd = new FormData();
        fd.append('action', 'share_bill');
        fd.append('bill_id', id);
        fd.append('share_with_username', target);
        fd.append('share_percentage', parseFloat(pct) || 50);
        try {
            const r = await fetch(App.API_BASE + 'bills.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Share request sent! 👥', 'success'); }
            else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to share bill', 'error'); }
    },

    async deleteBill(id) {
        if (!confirm('Delete this bill? This will also remove all its payment history.')) return;
        const fd = new FormData();
        fd.append('action', 'delete_bill');
        fd.append('bill_id', id);
        try {
            const r = await fetch(App.API_BASE + 'bills.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Bill deleted', 'success'); this.loadBills(); }
            else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to delete bill', 'error'); }
    }
};

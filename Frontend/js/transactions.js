const Transactions = {
    _iconMap: {
        'briefcase':'briefcase','laptop':'laptop-code','trending-up':'chart-line',
        'shopping-bag':'shopping-bag','gift':'gift','dollar-sign':'dollar-sign',
        'utensils':'utensils','car':'car','shopping-cart':'shopping-cart',
        'film':'film','file-text':'file-invoice','heart':'heart',
        'book':'book','plane':'plane','shield':'shield-alt',
        'home':'home','user':'user','more-horizontal':'ellipsis-h',
        'circle':'circle','default':'tag'
    },
    getIcon(i) { return this._iconMap[i] || i || 'tag'; },
    _page: 1, _perPage: 15, _allTx: [],

    async init() {
        const c = document.getElementById('page-container');
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        c.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header"><h2>Add Income</h2></div>
                <form id="add-income-form" style="display:grid;gap:14px;">
                    <div><label>Amount</label><input type="number" id="income-amount" step="0.01" min="0.01" placeholder="0.00" required></div>
                    <div><label>Category</label><select id="income-category"></select></div>
                    <div><label>Description</label><input type="text" id="income-description" placeholder="e.g. Monthly salary"></div>
                    <div><label>Date</label><input type="date" id="income-date" value="${today}"></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="income-recurring" style="width:auto;">
                        <label style="margin:0;font-weight:400;">Recurring income</label>
                        <select id="income-freq" style="display:none;flex:1;padding:6px;font-size:0.82rem;">
                            <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-success" style="justify-content:center;"><i class="fas fa-arrow-up"></i> Add Income</button>
                </form>
            </div>
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header"><h2>Add Expense</h2></div>
                <form id="add-expense-form" style="display:grid;gap:14px;">
                    <div><label>Amount</label><input type="number" id="expense-amount" step="0.01" min="0.01" placeholder="0.00" required></div>
                    <div><label>Category</label><select id="expense-category"></select></div>
                    <div><label>Description</label><input type="text" id="expense-description" placeholder="e.g. Groceries"></div>
                    <div><label>Date</label><input type="date" id="expense-date" value="${today}"></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="expense-recurring" style="width:auto;">
                        <label style="margin:0;font-weight:400;">Recurring expense</label>
                        <select id="expense-freq" style="display:none;flex:1;padding:6px;font-size:0.82rem;">
                            <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-danger" style="justify-content:center;"><i class="fas fa-arrow-down"></i> Add Expense</button>
                </form>
            </div>
        </div>

        <div class="section-card">
            <div class="section-header"><h2>Manage Custom Categories</h2></div>
            <form id="add-category-form" style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
                <div><label>Category Name</label><input type="text" id="new-category-name" placeholder="e.g. Pet Care, Freelance"></div>
                <div><label>Type</label><select id="new-category-type"><option value="income">Income</option><option value="expense">Expense</option></select></div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> Add</button>
            </form>
            <div id="user-categories-list" style="margin-top:14px;"></div>
        </div>

        <div class="section-card">
            <div class="section-header">
                <h2>Transaction History</h2>
                <div class="section-header-right">
                    <button class="btn btn-ghost btn-sm" onclick="Transactions.exportCSV()" title="Export CSV"><i class="fas fa-download"></i> Export</button>
                </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:var(--sp-4);">
                <select id="filter-type" style="padding:8px 12px;border-radius:var(--r-md);font-size:0.85rem;border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">
                    <option value="all">All Types</option><option value="income">Income</option><option value="expense">Expenses</option>
                </select>
                <input type="date" id="filter-start-date" value="${monthStart}" style="padding:8px 12px;border-radius:var(--r-md);font-size:0.85rem;border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">
                <input type="date" id="filter-end-date" value="${today}" style="padding:8px 12px;border-radius:var(--r-md);font-size:0.85rem;border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">
                <button class="btn btn-secondary btn-sm" onclick="Transactions.loadTransactions()"><i class="fas fa-filter"></i> Filter</button>
                <div style="margin-left:auto;display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--tx-muted);" id="tx-count-info"></div>
            </div>
            <table class="data-table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th>Actions</th></tr></thead>
                <tbody id="transactions-list"></tbody>
            </table>
            <div id="tx-pagination" style="display:flex;justify-content:center;gap:8px;margin-top:var(--sp-5);flex-wrap:wrap;"></div>
        </div>`;

        this.loadCategories();
        this.loadTransactions();
        this.setupFormHandlers();
        document.getElementById('income-recurring')?.addEventListener('change', e => { document.getElementById('income-freq').style.display = e.target.checked ? 'block' : 'none'; });
        document.getElementById('expense-recurring')?.addEventListener('change', e => { document.getElementById('expense-freq').style.display = e.target.checked ? 'block' : 'none'; });
    },

    async loadCategories() {
        try {
            const r = await fetch(App.API_BASE + 'transactions.php?action=get_categories');
            const text = await r.text();
            let d;
            try { d = JSON.parse(text); } catch(pe) { console.error('Categories parse error:', text.substring(0,300)); return; }
            if (!d || !d.success || !d.categories) { console.error('Categories failed:', d); return; }
            const pred = Array.isArray(d.categories.predefined) ? d.categories.predefined : [];
            const user = Array.isArray(d.categories.user_defined) ? d.categories.user_defined : [];

            // Cache all categories so the edit modal and other dropdowns can use them
            const allCats = [...pred, ...user];
            App._qaCats = {
                income:  allCats.filter(c => c.category_type === 'income'),
                expense: allCats.filter(c => c.category_type === 'expense'),
                all:     allCats
            };

            const iSel = document.getElementById('income-category');
            const eSel = document.getElementById('expense-category');
            const iopts = ['<option value="">Select category</option>'];
            const eopts = ['<option value="">Select category</option>'];
            pred.forEach(c => {
                const o = '<option value="pred_' + c.category_id + '">' + c.category_name + '</option>';
                if (c.category_type==='income') iopts.push(o); else eopts.push(o);
            });
            user.forEach(c => {
                const o = '<option value="user_' + c.user_category_id + '">' + c.category_name + ' ★</option>';
                if (c.category_type==='income') iopts.push(o); else eopts.push(o);
            });
            if (iSel) iSel.innerHTML = iopts.join('');
            if (eSel) eSel.innerHTML = eopts.join('');
            const listEl = document.getElementById('user-categories-list');
            if (listEl) {
                if (!user.length) { listEl.innerHTML = '<p style="color:var(--tx-muted);font-size:0.84rem;">No custom categories yet.</p>'; return; }
                listEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:7px;">' +
                    user.map(c =>
                        `<span class="badge ${c.category_type==='income'?'success':'danger'}" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;">
                            ${c.category_name} <span style="opacity:0.65;font-size:0.65rem;text-transform:uppercase;">${c.category_type}</span>
                            <button onclick="Transactions.deleteCategory(${c.user_category_id})" style="background:none;border:none;cursor:pointer;color:inherit;padding:0 0 0 4px;font-size:10px;line-height:1;"><i class="fas fa-times"></i></button>
                        </span>`
                    ).join('') + '</div>';
            }
        } catch(e) { console.error(e); }
    },

    async loadTransactions() {
        const type = document.getElementById('filter-type')?.value || 'all';
        const start = document.getElementById('filter-start-date')?.value || '';
        const end   = document.getElementById('filter-end-date')?.value   || '';
        try {
            const r = await fetch(App.API_BASE + `transactions.php?action=get_transactions&type=${type}&start_date=${start}&end_date=${end}&limit=500`);
            const d = await App.safeJSON(r);
            if (!d.success) return;
            this._allTx = d.transactions;
            this._page = 1;
            this.renderPage();
        } catch(e) { console.error(e); }
    },

    renderPage() {
        const tb = document.getElementById('transactions-list');
        const info = document.getElementById('tx-count-info');
        const pg   = document.getElementById('tx-pagination');
        const total = this._allTx.length;
        const pages = Math.ceil(total / this._perPage);
        const start = (this._page - 1) * this._perPage;
        const slice = this._allTx.slice(start, start + this._perPage);
        if (info) info.textContent = `${total} transaction${total!==1?'s':''}`;
        if (!slice.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--tx-muted);">No transactions found.</td></tr>'; if (pg) pg.innerHTML = ''; return; }
        tb.innerHTML = slice.map(t => {
            const date = new Date(t.income_date||t.expense_date);
            const txId = t.income_id || t.expense_id;
            const recurBadge = t.recurring ? `<span class="badge neutral" style="font-size:0.62rem;margin-left:4px;"><i class="fas fa-sync-alt"></i></span>` : '';
            return `<tr>
                <td style="color:var(--tx-muted);font-size:0.82rem;">${date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                <td><span class="badge ${t.type==='income'?'success':'danger'}" style="font-size:0.7rem;">${t.category_name||'Other'}</span></td>
                <td style="color:var(--tx-secondary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.description||'—'} ${recurBadge}</td>
                <td><span class="badge ${t.type==='income'?'success':'danger'}">${t.type}</span></td>
                <td style="font-weight:700;color:${t.type==='income'?'var(--c-success)':'var(--c-danger)'};">${t.type==='income'?'+':'−'}${App.formatCurrency(t.amount)}</td>
                <td><div class="tx-actions">
                    <button class="btn btn-ghost btn-sm" onclick="Transactions.openEditModal(${txId},'${t.type}','${t.amount}','${(t.description||'').replace(/'/g,"\\'")}','${t.income_date||t.expense_date}','${t.category_id?'pred_'+t.category_id:t.user_category_id?'user_'+t.user_category_id:''}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="Transactions.deleteTransaction(${txId},'${t.type}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
        // Pagination
        if (pg) {
            if (pages <= 1) { pg.innerHTML = ''; return; }
            let btns = '';
            if (this._page > 1) btns += `<button class="btn btn-secondary btn-sm" onclick="Transactions.goPage(${this._page-1})"><i class="fas fa-chevron-left"></i></button>`;
            for (let i = 1; i <= pages; i++) {
                if (i===1 || i===pages || Math.abs(i-this._page)<=1) btns += `<button class="btn ${i===this._page?'btn-primary':'btn-secondary'} btn-sm" onclick="Transactions.goPage(${i})">${i}</button>`;
                else if (Math.abs(i-this._page)===2) btns += `<span style="padding:6px 4px;color:var(--tx-muted);">…</span>`;
            }
            if (this._page < pages) btns += `<button class="btn btn-secondary btn-sm" onclick="Transactions.goPage(${this._page+1})"><i class="fas fa-chevron-right"></i></button>`;
            pg.innerHTML = btns;
        }
    },

    goPage(p) { this._page = p; this.renderPage(); document.getElementById('transactions-list').closest('.section-card').scrollIntoView({behavior:'smooth',block:'start'}); },

    setupFormHandlers() {
        document.getElementById('add-income-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const catVal = document.getElementById('income-category').value;
            const recurring = document.getElementById('income-recurring').checked;
            const fd = new FormData();
            fd.append('action','add_income'); fd.append('amount',document.getElementById('income-amount').value);
            this._appendCat(fd, catVal); fd.append('description',document.getElementById('income-description').value);
            fd.append('income_date',document.getElementById('income-date').value);
            if (recurring) { fd.append('recurring',1); fd.append('recurring_frequency',document.getElementById('income-freq').value); }
            try {
                const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Income added!','success'); e.target.reset(); document.getElementById('income-date').value=new Date().toISOString().split('T')[0]; this.loadTransactions(); }
                else { App.showToast(d.message,'error'); }
            } catch(e) { App.showToast('Failed','error'); }
        });

        document.getElementById('add-expense-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const catVal = document.getElementById('expense-category').value;
            const recurring = document.getElementById('expense-recurring').checked;
            const fd = new FormData();
            fd.append('action','add_expense'); fd.append('amount',document.getElementById('expense-amount').value);
            this._appendCat(fd, catVal); fd.append('description',document.getElementById('expense-description').value);
            fd.append('expense_date',document.getElementById('expense-date').value);
            if (recurring) { fd.append('recurring',1); fd.append('recurring_frequency',document.getElementById('expense-freq').value); }
            try {
                const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Expense added!','success'); e.target.reset(); document.getElementById('expense-date').value=new Date().toISOString().split('T')[0]; this.loadTransactions(); }
                else { App.showToast(d.message,'error'); }
            } catch(e) { App.showToast('Failed','error'); }
        });

        document.getElementById('add-category-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const name = document.getElementById('new-category-name').value.trim();
            const type = document.getElementById('new-category-type').value;
            if (!name) return;
            const fd = new FormData(); fd.append('action','add_user_category'); fd.append('category_name',name); fd.append('category_type',type);
            try {
                const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Category added!','success'); e.target.reset(); this.loadCategories(); }
                else { App.showToast(d.message,'error'); }
            } catch(e) { App.showToast('Failed','error'); }
        });
    },

    _appendCat(fd, catVal) {
        if (catVal.startsWith('pred_'))      fd.append('category_id',      catVal.replace('pred_',''));
        else if (catVal.startsWith('user_')) fd.append('user_category_id', catVal.replace('user_',''));
    },

    async deleteCategory(id) {
        if (!confirm('Delete this category?')) return;
        const fd = new FormData(); fd.append('action','delete_user_category'); fd.append('user_category_id',id);
        const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
        const d = await App.safeJSON(r);
        if (d.success) { App.showToast('Category deleted','success'); this.loadCategories(); }
        else App.showToast(d.message||'Failed','error');
    },

    openEditModal(id, type, amount, description, date, catVal) {
        document.getElementById('edit-tx-id').value    = id;
        document.getElementById('edit-tx-type').value  = type;
        document.getElementById('edit-tx-amount').value = amount;
        document.getElementById('edit-tx-description').value = description;
        document.getElementById('edit-tx-date').value  = date;
        // populate category dropdown from cached categories
        const sel = document.getElementById('edit-tx-category');
        if (sel) {
            const cats = (type === 'income' ? App._qaCats?.income : App._qaCats?.expense) || [];
            const opts = ['<option value="">Select category</option>'];
            cats.forEach(c => {
                const v = c.category_id ? 'pred_' + c.category_id : 'user_' + c.user_category_id;
                const label = c.category_name + (c.user_category_id ? ' \u2605' : '');
                opts.push('<option value="' + v + '"' + (v === catVal ? ' selected' : '') + '>' + label + '</option>');
            });
            sel.innerHTML = opts.join('');
        }
        document.getElementById('edit-tx-modal').classList.add('active');
    },

    closeEditModal() { document.getElementById('edit-tx-modal').classList.remove('active'); },

    async submitEdit() {
        const id   = document.getElementById('edit-tx-id').value;
        const type = document.getElementById('edit-tx-type').value;
        const amt  = document.getElementById('edit-tx-amount').value;
        const desc = document.getElementById('edit-tx-description').value;
        const date = document.getElementById('edit-tx-date').value;
        const catV = document.getElementById('edit-tx-category').value;
        if (!amt || parseFloat(amt) <= 0) { App.showToast('Enter a valid amount','error'); return; }
        const fd = new FormData();
        fd.append('action','edit_transaction'); fd.append('transaction_id',id); fd.append('type',type);
        fd.append('amount',amt); fd.append('description',desc); fd.append('date',date);
        if (catV.startsWith('pred_'))      fd.append('category_id',      catV.replace('pred_',''));
        else if (catV.startsWith('user_')) fd.append('user_category_id', catV.replace('user_',''));
        try {
            const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Transaction updated!','success'); this.closeEditModal(); this.loadTransactions(); }
            else App.showToast(d.message,'error');
        } catch(e) { App.showToast('Failed to update','error'); }
    },

    async deleteTransaction(id, type) {
        if (!confirm('Delete this transaction?')) return;
        const fd = new FormData(); fd.append('action','delete_transaction'); fd.append('transaction_id',id); fd.append('type',type);
        try {
            const r = await fetch(App.API_BASE+'transactions.php',{method:'POST',body:fd});
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Deleted','success'); this.loadTransactions(); }
        } catch(e) {}
    },

    async exportCSV() {
        try {
            const start = document.getElementById('filter-start-date')?.value || '';
            const end   = document.getElementById('filter-end-date')?.value   || '';
            const r = await fetch(App.API_BASE + `transactions.php?action=export_csv&start_date=${start}&end_date=${end}`);
            const d = await App.safeJSON(r);
            if (!d.success || !d.rows.length) { App.showToast('No data to export','warning'); return; }
            const header = ['Date','Type','Category','Description','Amount'];
            const rows = d.rows.map(row => [row.date, row.type, row.category, `"${(row.description||'').replace(/"/g,'""')}"`, row.amount]);
            const csv = [header, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], {type:'text/csv'});
            const url  = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `cashflow_${d.start_date}_${d.end_date}.csv`; a.click(); URL.revokeObjectURL(url);
            App.showToast('CSV exported!','success');
        } catch(e) { App.showToast('Export failed','error'); }
    },

    searchTransactions(query) {
        const q = query.toLowerCase();
        this._allTx = this._allTx.filter(t =>
            (t.description||'').toLowerCase().includes(q) ||
            (t.category_name||'').toLowerCase().includes(q) ||
            String(t.amount).includes(q)
        );
        this._page = 1;
        this.renderPage();
    }
};

Transactions.searchTransactions = Transactions.searchTransactions.bind(Transactions);

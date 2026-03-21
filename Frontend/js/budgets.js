const Budgets = {
    async init() {
        const container = document.getElementById('page-container');
        container.innerHTML = `
        <div class="section-card">
            <div class="section-header"><h2>Create Budget</h2></div>
            <form id="add-budget-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
                <div><label>Category</label><select id="budget-category" required></select></div>
                <div><label>Budget Amount</label><input type="number" id="budget-amount" step="0.01" min="1" required></div>
                <div><label>Period</label>
                    <select id="budget-period">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div><label>Start Date</label><input type="date" id="budget-start-date" value="${new Date().toISOString().split('T')[0]}"></div>
                <div><label>End Date</label><input type="date" id="budget-end-date" value="${new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().split('T')[0]}"></div>
                <div style="display:flex;align-items:flex-end;">
                    <button type="submit" class="btn btn-primary" style="width:100%;">
                        <i class="fas fa-plus"></i> Create Budget
                    </button>
                </div>
            </form>
        </div>

        <div class="section-card">
            <div class="section-header">
                <h2>Your Budgets</h2>
                <span id="budgets-summary" style="font-size:0.85rem;color:var(--tx-muted);"></span>
            </div>
            <div id="budgets-list"></div>
        </div>`;

        this.loadCategories();
        this.loadBudgets();
        this.setupFormHandler();
    },

    async loadCategories() {
        try {
            const _cr = await fetch(App.API_BASE + 'transactions.php?action=get_categories&type=expense');
            const _ct = await _cr.text();
            let d;
            try { d = JSON.parse(_ct); } catch(pe) { console.error('Categories parse error:', _ct.substring(0,200)); return; }
            if (d.success) {
                document.getElementById('budget-category').innerHTML = '<option value="">Select Category</option>' +
                    d.categories.predefined.map(c => `<option value="pred_${c.category_id}">${c.category_name}</option>`).join('') +
                    d.categories.user_defined.map(c => `<option value="user_${c.user_category_id}">${c.category_name} ★</option>`).join('');
            }
        } catch(e) { console.error('Categories failed:', e); }
    },

    async loadBudgets() {
        try {
            const r = await fetch(App.API_BASE + 'budgets_goals.php?action=get_budgets');
            const d = await App.safeJSON(r);
            const container = document.getElementById('budgets-list');
            const summary = document.getElementById('budgets-summary');

            if (!d.success) return;

            if (!d.budgets.length) {
                container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--tx-muted);">
                    <i class="fas fa-wallet" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
                    <p>No budgets yet. Create one to start tracking your spending limits!</p>
                </div>`;
                if (summary) summary.textContent = '';
                return;
            }

            const totalBudgeted = d.budgets.reduce((s, b) => s + b.budget_amount, 0);
            const totalSpent = d.budgets.reduce((s, b) => s + b.spent, 0);
            const overCount = d.budgets.filter(b => b.percentage > 100).length;
            if (summary) summary.textContent = `${App.formatCurrency(totalSpent)} spent of ${App.formatCurrency(totalBudgeted)}${overCount ? ` · ⚠️ ${overCount} over budget` : ''}`;

            container.innerHTML = d.budgets.map(b => {
                const pct = Math.min(parseFloat(b.percentage), 100);
                const overBudget = parseFloat(b.percentage) > 100;
                const nearLimit = parseFloat(b.percentage) > 80;
                const color = overBudget ? 'var(--c-danger)' : nearLimit ? 'var(--c-warning)' : 'var(--c-brand)';
                const progressStyle = `width:${pct}%;background:${color};`;

                return `
                <div class="stat-card" style="margin-bottom:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <div>
                            <h3 style="font-size:1rem;font-weight:600;color:var(--tx-primary);">${b.category_name}</h3>
                            <span style="font-size:0.78rem;color:var(--tx-muted);text-transform:capitalize;">${b.period} budget</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:var(--tx-primary);">${App.formatCurrency(b.spent)} <span style="font-weight:400;font-size:0.85rem;color:var(--tx-muted);">/ ${App.formatCurrency(b.budget_amount)}</span></div>
                            <span style="font-size:0.8rem;font-weight:600;color:${color};">${parseFloat(b.percentage).toFixed(0)}% used</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="${progressStyle}"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                        <span style="font-size:0.82rem;color:${overBudget ? 'var(--c-danger)' : 'var(--tx-secondary)'};">
                            ${overBudget ? `⚠️ Over by ${App.formatCurrency(Math.abs(b.remaining))}` : `${App.formatCurrency(b.remaining)} remaining`}
                        </span>
                        <button class="btn btn-danger" onclick="Budgets.deleteBudget(${b.budget_id})" style="padding:5px 10px;font-size:0.78rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { console.error('Budgets load failed:', e); }
    },

    setupFormHandler() {
        document.getElementById('add-budget-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const catVal = document.getElementById('budget-category').value;
            const fd = new FormData();
            fd.append('action', 'add_budget');
            if (catVal.startsWith('pred_')) fd.append('category_id', catVal.replace('pred_', ''));
            else if (catVal.startsWith('user_')) fd.append('user_category_id', catVal.replace('user_', ''));
            fd.append('budget_amount', document.getElementById('budget-amount').value);
            fd.append('period', document.getElementById('budget-period').value);
            fd.append('start_date', document.getElementById('budget-start-date').value);
            fd.append('end_date', document.getElementById('budget-end-date').value);
            try {
                const r = await fetch(App.API_BASE + 'budgets_goals.php', { method:'POST', body:fd });
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Budget created!', 'success'); e.target.reset(); this.loadBudgets(); }
                else { App.showToast(d.message, 'error'); }
            } catch(e) { App.showToast('Failed to create budget', 'error'); }
        });
    },

    async deleteBudget(id) {
        if (!confirm('Delete this budget?')) return;
        const fd = new FormData();
        fd.append('action', 'delete_budget');
        fd.append('budget_id', id);
        try {
            const r = await fetch(App.API_BASE + 'budgets_goals.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Budget deleted', 'success'); this.loadBudgets(); }
        } catch(e) { App.showToast('Failed to delete budget', 'error'); }
    }
};

const Dashboard = {

    _iconMap: {
        'briefcase':'briefcase','laptop':'laptop-code','trending-up':'chart-line',
        'shopping-bag':'shopping-bag','gift':'gift','dollar-sign':'dollar-sign',
        'utensils':'utensils','car':'car','shopping-cart':'shopping-cart',
        'film':'film','file-text':'file-invoice','heart':'heart',
        'book':'book','plane':'plane','shield':'shield-alt',
        'home':'home','user':'user','more-horizontal':'ellipsis-h',
        'circle':'circle','default':'tag'
    },
    icon(k) { return this._iconMap[k] || k || 'tag'; },

    async init() {
        const c = document.getElementById('page-container');
        c.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-card-header">
                    <div><h3>Monthly Income</h3><div class="amount" id="dash-income">—</div></div>
                    <div class="stat-card-icon income"><i class="fas fa-arrow-up"></i></div>
                </div>
                <div class="trend up" id="dash-income-trend"></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div><h3>Monthly Expenses</h3><div class="amount" id="dash-expenses">—</div></div>
                    <div class="stat-card-icon expense"><i class="fas fa-arrow-down"></i></div>
                </div>
                <div class="trend down" id="dash-expense-trend"></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div><h3>Net Balance</h3><div class="amount" id="dash-balance">—</div></div>
                    <div class="stat-card-icon balance"><i class="fas fa-wallet"></i></div>
                </div>
                <div class="trend" id="dash-balance-trend"></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div><h3>Active Goals</h3><div class="amount" id="dash-goals">—</div></div>
                    <div class="stat-card-icon budget"><i class="fas fa-bullseye"></i></div>
                </div>
                <div class="trend up" id="dash-goals-trend"></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div><h3>Unpaid Bills</h3><div class="amount" id="dash-bills">—</div></div>
                    <div class="stat-card-icon bills"><i class="fas fa-file-invoice-dollar"></i></div>
                </div>
                <div class="trend" id="dash-bills-trend"></div>
            </div>
        </div>

        <div id="dash-indicator" class="finance-indicator" style="min-height:80px;">
            <div class="skeleton" style="width:68px;height:68px;border-radius:50%;flex-shrink:0;"></div>
            <div style="flex:1;">
                <div class="skeleton" style="height:16px;width:55%;margin-bottom:8px;border-radius:6px;"></div>
                <div class="skeleton" style="height:12px;width:80%;border-radius:6px;"></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5);">
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header"><h2>Expense Breakdown</h2><span style="font-size:0.78rem;color:var(--tx-muted);">This month</span></div>
                <div id="dash-donut"></div>
            </div>
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header"><h2>Smart Insights</h2></div>
                <div id="dash-insights">
                    <div class="skeleton" style="height:58px;margin-bottom:8px;border-radius:var(--r-md);"></div>
                    <div class="skeleton" style="height:58px;border-radius:var(--r-md);"></div>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5);">
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header">
                    <h2>Recent Transactions</h2>
                    <button class="btn btn-primary btn-sm" onclick="App.navigateTo('transactions')"><i class="fas fa-plus"></i> Add</button>
                </div>
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead>
                    <tbody id="dash-recent-tx"></tbody>
                </table>
            </div>
            <div class="section-card" style="margin-bottom:0;">
                <div class="section-header">
                    <h2>Upcoming Bills</h2>
                    <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('bills')">View all</button>
                </div>
                <div id="dash-bills-list">
                    <div class="skeleton" style="height:48px;margin-bottom:8px;border-radius:var(--r-md);"></div>
                    <div class="skeleton" style="height:48px;border-radius:var(--r-md);"></div>
                </div>
            </div>
        </div>

        <div class="section-card">
            <div class="section-header"><h2>6-Month Trend</h2><span style="font-size:0.78rem;color:var(--tx-muted);">Income vs Expenses</span></div>
            <div id="dash-trend"><div class="skeleton" style="height:150px;border-radius:var(--r-md);"></div></div>
        </div>`;

        // Load all in parallel
        Promise.all([
            this.loadSummary(),
            this.loadRecentTransactions(),
            this.loadGoalsCount(),
            this.loadUpcomingBills(),
            this.loadTrend()
        ]);
    },

    async loadSummary() {
        try {
            const resp = await fetch(App.API_BASE + 'transactions.php?action=get_summary&period=month');
            const data = await App.safeJSON(resp);

            const curr = App.currentUser?.currency || 'PHP';
            const syms = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', PHP:'₱', AUD:'A$', CAD:'C$' };
            const sym = syms[curr] || curr;

            // Always set the amounts - even if failed show 0
            const income   = data.success ? (parseFloat(data.summary?.total_income)   || 0) : 0;
            const expenses = data.success ? (parseFloat(data.summary?.total_expenses) || 0) : 0;
            const balance  = data.success ? (parseFloat(data.summary?.balance)        || 0) : 0;
            const cats     = data.success ? (data.summary?.expense_by_category || [])       : [];
            App._conversionRate = data.success ? (parseFloat(data.summary?.conversion_rate) || 1) : 1;

            // Animate the numbers
            const incEl  = document.getElementById('dash-income');
            const expEl  = document.getElementById('dash-expenses');
            const balEl  = document.getElementById('dash-balance');
            if (incEl)  App.animateCount(incEl,  income,   sym);
            if (expEl)  App.animateCount(expEl,  expenses, sym);
            if (balEl)  App.animateCount(balEl,  balance,  sym);

            // Trend labels
            const it = document.getElementById('dash-income-trend');
            const et = document.getElementById('dash-expense-trend');
            const bt = document.getElementById('dash-balance-trend');
            if (it) it.innerHTML = '<i class="fas fa-calendar-alt"></i> This month';
            if (et) et.innerHTML = '<i class="fas fa-calendar-alt"></i> This month';
            if (bt) {
                bt.className = 'trend ' + (balance >= 0 ? 'up' : 'down');
                bt.innerHTML = balance >= 0 ? '<i class="fas fa-check-circle"></i> Positive balance' : '<i class="fas fa-exclamation-circle"></i> Deficit';
            }

            // Finance indicator - always renders
            this.renderIndicator(income, expenses, balance, sym);

            // Donut chart
            this.renderDonut(cats, expenses, sym);

            // Insights
            this.renderInsights(income, expenses, balance, cats, sym);

        } catch(err) {
            console.error('Dashboard loadSummary error:', err);
            // Still render something even on error
            this.renderIndicator(0, 0, 0, '₱');
            this.renderInsights(0, 0, 0, [], '₱');
        }
    },

    renderIndicator(income, expenses, balance, sym) {
        const el = document.getElementById('dash-indicator');
        if (!el) return;

        const pct = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : 0;
        let status, title, score, sub;

        if (income === 0 && expenses === 0) {
            status = 'healthy'; score = '★';
            title = 'Ready to track!';
            sub = 'Add your first income transaction to see your financial health score.';
        } else if (balance > income * 0.3) {
            status = 'healthy'; score = 'A+';
            title = 'Excellent Financial Health';
            sub = 'Saving ' + (100 - pct) + '% of income. Outstanding!';
        } else if (balance >= 0) {
            status = 'warning'; score = 'B';
            title = 'Good — Watch Your Spending';
            sub = pct + '% of income used. Try to keep expenses below 70%.';
        } else {
            status = 'danger'; score = 'C';
            title = 'Needs Attention';
            sub = 'Expenses exceed income by ' + App.formatCurrency(Math.abs(balance)) + ' this month.';
        }

        const r = 32, circ = 2 * Math.PI * r;
        const filled = (pct / 100) * circ;
        const strokeColor = status === 'healthy' ? 'var(--c-success)' : status === 'warning' ? 'var(--c-warning)' : 'var(--c-danger)';

        el.innerHTML =
            '<div style="position:relative;width:72px;height:72px;flex-shrink:0;">' +
                '<svg width="72" height="72" viewBox="0 0 72 72">' +
                    '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="var(--bg-sunken)" stroke-width="7"/>' +
                    '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + strokeColor + '" stroke-width="7" stroke-linecap="round"' +
                        ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ - filled) + '"' +
                        ' transform="rotate(-90 36 36)" style="transition:stroke-dashoffset 0.9s ease;"/>' +
                '</svg>' +
                '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:0.82rem;font-weight:700;color:var(--tx-primary);">' + score + '</div>' +
            '</div>' +
            '<div style="flex:1;">' +
                '<h3 style="font-family:var(--font-display);font-size:1rem;color:var(--tx-primary);margin-bottom:5px;">' + title + '</h3>' +
                '<p style="color:var(--tx-secondary);font-size:0.81rem;margin-bottom:8px;">' + sub + '</p>' +
                '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
                    '<span style="font-size:0.75rem;color:var(--tx-muted);display:flex;align-items:center;gap:5px;"><i class="fas fa-circle" style="color:var(--c-success);font-size:0.45rem;"></i>' + App.formatCurrency(income) + ' income</span>' +
                    '<span style="font-size:0.75rem;color:var(--tx-muted);display:flex;align-items:center;gap:5px;"><i class="fas fa-circle" style="color:var(--c-danger);font-size:0.45rem;"></i>' + App.formatCurrency(expenses) + ' spent</span>' +
                    '<span style="font-size:0.75rem;color:' + (balance >= 0 ? 'var(--c-success)' : 'var(--c-danger)') + ';display:flex;align-items:center;gap:5px;"><i class="fas fa-balance-scale" style="font-size:0.55rem;"></i>' + App.formatCurrency(balance) + ' net</span>' +
                '</div>' +
            '</div>';
    },

    renderDonut(cats, total, sym) {
        const el = document.getElementById('dash-donut');
        if (!el) return;

        if (!cats || !cats.length || !total || total <= 0) {
            el.innerHTML =
                '<div style="text-align:center;padding:32px 0;color:var(--tx-muted);">' +
                    '<i class="fas fa-chart-pie" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:10px;"></i>' +
                    '<p style="font-size:0.85rem;">No expenses this month yet.<br>Add a transaction to see your breakdown.</p>' +
                '</div>';
            return;
        }

        const palette = ['#00704A','#0EA5E9','#F59E0B','#F43F5E','#8B5CF6','#EC4899','#14B8A6'];
        const size = 130, cx = size/2, cy = size/2, outerR = 48, innerR = 28;
        let startAngle = -Math.PI / 2;
        const slices = cats.slice(0, 7).map((cat, i) => {
            const pct = parseFloat(cat.total) / total;
            const angle = pct * 2 * Math.PI;
            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(startAngle + angle);
            const y2 = cy + outerR * Math.sin(startAngle + angle);
            const ix1 = cx + innerR * Math.cos(startAngle);
            const iy1 = cy + innerR * Math.sin(startAngle);
            const ix2 = cx + innerR * Math.cos(startAngle + angle);
            const iy2 = cy + innerR * Math.sin(startAngle + angle);
            const la = angle > Math.PI ? 1 : 0;
            const path = 'M ' + ix1 + ' ' + iy1 + ' L ' + x1 + ' ' + y1 +
                         ' A ' + outerR + ' ' + outerR + ' 0 ' + la + ' 1 ' + x2 + ' ' + y2 +
                         ' L ' + ix2 + ' ' + iy2 +
                         ' A ' + innerR + ' ' + innerR + ' 0 ' + la + ' 0 ' + ix1 + ' ' + iy1 + ' Z';
            const color = palette[i % palette.length];
            startAngle += angle;
            return { path, color, name: cat.category, pct: (pct * 100).toFixed(1), total: cat.total };
        });

        let paths = '';
        slices.forEach(s => {
            paths += '<path d="' + s.path + '" fill="' + s.color + '" opacity="0.88" style="cursor:pointer;transition:opacity 0.15s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.88"><title>' + s.name + ': ' + s.pct + '% (' + App.formatCurrency(s.total) + ')</title></path>';
        });

        let legend = '';
        slices.forEach(s => {
            legend += '<div class="legend-item"><span class="legend-dot" style="background:' + s.color + ';"></span><span class="legend-name">' + s.name + '</span><span class="legend-val">' + s.pct + '%</span></div>';
        });

        el.innerHTML =
            '<div class="donut-wrap">' +
                '<div class="donut-chart" style="width:' + size + 'px;height:' + size + 'px;">' +
                    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + paths + '</svg>' +
                    '<div class="donut-center">' +
                        '<span class="donut-total">' + App.formatCurrency(total) + '</span>' +
                        '<span class="donut-label">spent</span>' +
                    '</div>' +
                '</div>' +
                '<div class="donut-legend">' + legend + '</div>' +
            '</div>';
    },

    renderInsights(income, expenses, balance, cats, sym) {
        const el = document.getElementById('dash-insights');
        if (!el) return;

        const insights = [];
        const pct = income > 0 ? (expenses / income) * 100 : 0;

        if (income === 0 && expenses === 0) {
            insights.push({ icon: '📈', title: 'Start tracking!', text: 'Add your first income and expense to unlock personalized insights.' });
        } else {
            if (pct > 100) {
                insights.push({ icon: '🚨', title: 'Over budget this month', text: 'Expenses exceed income by ' + App.formatCurrency(expenses - income) + '. Review non-essentials.' });
            } else if (pct > 80) {
                insights.push({ icon: '⚠️', title: 'Approaching your limit', text: Math.round(pct) + '% of income spent. Only ' + App.formatCurrency(balance) + ' left.' });
            } else if (pct < 50 && income > 0) {
                insights.push({ icon: '🏆', title: 'Excellent savings rate!', text: 'Only ' + Math.round(pct) + '% of income spent. Consider investing the surplus.' });
            }

            if (cats && cats.length) {
                const top = cats[0];
                const topPct = income > 0 ? ((parseFloat(top.total) / income) * 100).toFixed(0) : '—';
                insights.push({ icon: '📊', title: 'Top category: ' + top.category, text: App.formatCurrency(top.total) + ' spent (' + topPct + '% of income).' });
            }

            if (balance > 0) {
                insights.push({ icon: '💰', title: 'You have runway', text: App.formatCurrency(balance) + ' remaining this month. Keep it up!' });
            }
        }

        if (!insights.length) {
            insights.push({ icon: '✅', title: 'Looking good!', text: 'Your finances are on track this month.' });
        }

        el.innerHTML = insights.map(ins =>
            '<div class="insight-card">' +
                '<span class="insight-icon">' + ins.icon + '</span>' +
                '<div class="insight-text"><h4>' + ins.title + '</h4><p>' + ins.text + '</p></div>' +
            '</div>'
        ).join('');
    },

    async loadRecentTransactions() {
        try {
            const resp = await fetch(App.API_BASE + 'transactions.php?action=get_transactions&limit=6');
            const data = await App.safeJSON(resp);
            const tbody = document.getElementById('dash-recent-tx');
            if (!tbody) return;

            if (!data.success || !data.transactions.length) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--tx-muted);">No transactions yet — add your first one!</td></tr>';
                return;
            }

            tbody.innerHTML = data.transactions.map(t => {
                const date = new Date(t.income_date || t.expense_date);
                const isIncome = t.type === 'income';
                return '<tr>' +
                    '<td style="color:var(--tx-muted);font-size:0.8rem;">' + date.toLocaleDateString('en-US', {month:'short',day:'numeric'}) + '</td>' +
                    '<td><span class="badge ' + (isIncome ? 'success' : 'danger') + '" style="font-size:0.68rem;">' + (t.category_name || 'Other') + '</span></td>' +
                    '<td style="font-weight:700;color:' + (isIncome ? 'var(--c-success)' : 'var(--c-danger)') + ';">' + (isIncome ? '+' : '−') + App.formatCurrency(t.amount * (App._conversionRate || 1)) + '</td>' +
                '</tr>';
            }).join('');
        } catch(e) { console.error('Recent tx error:', e); }
    },

    async loadGoalsCount() {
        try {
            const resp = await fetch(App.API_BASE + 'budgets_goals.php?action=get_goals&status=active');
            const data = await App.safeJSON(resp);
            const el = document.getElementById('dash-goals');
            const trend = document.getElementById('dash-goals-trend');
            if (!el) return;
            const count = data.success ? data.goals.length : 0;
            el.textContent = count;
            if (trend) {
                trend.className = 'trend up';
                trend.innerHTML = count > 0 ? '<i class="fas fa-fire"></i> ' + count + ' active' : '<i class="fas fa-plus-circle"></i> Start one';
            }
        } catch(e) {}
    },

    async loadUpcomingBills() {
        try {
            const resp = await fetch(App.API_BASE + 'bills.php?action=get_bills');
            const data = await App.safeJSON(resp);
            const listEl = document.getElementById('dash-bills-list');
            const countEl = document.getElementById('dash-bills');
            const trendEl = document.getElementById('dash-bills-trend');

            if (!data.success || !data.bills) {
                if (listEl) listEl.innerHTML = '<p style="color:var(--tx-muted);font-size:0.85rem;padding:8px 0;">No bills yet.</p>';
                if (countEl) countEl.textContent = '0';
                return;
            }

            const unpaid = data.bills.filter(b => !b.is_paid);
            if (countEl) countEl.textContent = unpaid.length;
            if (trendEl) {
                trendEl.className = 'trend ' + (unpaid.length > 0 ? 'down' : 'up');
                trendEl.innerHTML = unpaid.length > 0 ? '<i class="fas fa-exclamation-circle"></i> ' + unpaid.length + ' pending' : '<i class="fas fa-check-circle"></i> All paid';
            }

            if (!listEl) return;
            const upcoming = unpaid.slice(0, 4);
            if (!upcoming.length) {
                listEl.innerHTML = '<p style="color:var(--c-success);font-size:0.85rem;padding:8px 0;"><i class="fas fa-check-circle"></i> All bills paid this month!</p>';
                return;
            }

            listEl.innerHTML = upcoming.map(b => {
                const sc = b.is_overdue ? 'danger' : b.days_until_due <= 3 ? 'warning' : 'info';
                const colors = { danger: 'var(--c-danger)', warning: 'var(--c-warning)', info: 'var(--c-brand)' };
                const st = b.is_overdue ? 'Overdue' : b.days_until_due <= 3 ? 'Due in ' + b.days_until_due + 'd' : 'Due ' + b.due_date;
                return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bd-default);">' +
                    '<div style="display:flex;align-items:center;gap:10px;">' +
                        '<div style="width:34px;height:34px;border-radius:var(--r-md);background:' + colors[sc] + '18;display:flex;align-items:center;justify-content:center;color:' + colors[sc] + ';font-size:0.85rem;"><i class="fas fa-receipt"></i></div>' +
                        '<div><div style="font-weight:500;font-size:0.87rem;">' + b.bill_name + '</div><div style="font-size:0.72rem;color:var(--tx-muted);">' + b.category_name + '</div></div>' +
                    '</div>' +
                    '<div style="text-align:right;"><div style="font-weight:700;font-size:0.9rem;">' + App.formatCurrency(b.amount) + '</div><span class="badge ' + sc + '" style="font-size:0.66rem;">' + st + '</span></div>' +
                '</div>';
            }).join('');
        } catch(e) { console.error('Bills dash error:', e); }
    },

    async loadTrend() {
        const el = document.getElementById('dash-trend');
        if (!el) return;
        try {
            const resp = await fetch(App.API_BASE + 'transactions.php?action=get_monthly_trend&months=6');
            const data = await App.safeJSON(resp);

            if (!data.success || !data.trend) {
                el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tx-muted);"><i class="fas fa-chart-bar" style="font-size:2rem;opacity:0.2;display:block;margin-bottom:10px;"></i><p style="font-size:0.85rem;">No transaction data yet. Add income and expenses to see your trend.</p></div>';
                return;
            }

            const trend = data.trend;

            // Check if ALL values are zero (no transactions at all)
            const totalAll = trend.reduce((s, m) => s + (m.income || 0) + (m.expenses || 0), 0);
            if (totalAll === 0) {
                el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tx-muted);"><i class="fas fa-chart-bar" style="font-size:2rem;opacity:0.2;display:block;margin-bottom:10px;"></i><p style="font-size:0.85rem;">No transactions yet. Add income and expenses to see your 6-month trend here.</p></div>';
                return;
            }

            const maxVal = Math.max(...trend.map(m => Math.max(m.income || 0, m.expenses || 0)), 1);
            let bars = '';
            trend.forEach(m => {
                const ih = Math.max(Math.round(((m.income || 0) / maxVal) * 130), 2);
                const eh = Math.max(Math.round(((m.expenses || 0) / maxVal) * 130), 2);
                // Only show bar if there's actual data
                const iHeight = (m.income || 0) > 0 ? ih : 0;
                const eHeight = (m.expenses || 0) > 0 ? eh : 0;
                bars +=
                    '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">' +
                        '<div style="width:100%;display:flex;align-items:flex-end;gap:2px;height:130px;">' +
                            '<div style="flex:1;height:' + iHeight + 'px;background:var(--c-success);opacity:0.8;border-radius:4px 4px 0 0;transition:height 0.5s ease;" title="' + m.month + ' Income: ' + App.formatCurrency(m.income || 0) + '"></div>' +
                            '<div style="flex:1;height:' + eHeight + 'px;background:var(--c-danger);opacity:0.8;border-radius:4px 4px 0 0;transition:height 0.5s ease;" title="' + m.month + ' Expenses: ' + App.formatCurrency(m.expenses || 0) + '"></div>' +
                        '</div>' +
                        '<div style="font-size:0.68rem;color:var(--tx-muted);text-align:center;">' + m.month.split(' ')[0] + '</div>' +
                    '</div>';
            });

            el.innerHTML =
                '<div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding:0 4px;">' + bars + '</div>' +
                '<div style="display:flex;gap:16px;margin-top:10px;font-size:0.76rem;">' +
                    '<span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--c-success);display:inline-block;"></span>Income</span>' +
                    '<span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--c-danger);display:inline-block;"></span>Expenses</span>' +
                '</div>';
        } catch(e) {
            console.error('Trend error:', e);
            if (el) el.innerHTML = '<p style="color:var(--tx-muted);text-align:center;padding:20px;font-size:0.85rem;">Could not load trend data.</p>';
        }
    }
};

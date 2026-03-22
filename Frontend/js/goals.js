const Goals = {
    async init() {
        const container = document.getElementById('page-container');
        container.innerHTML = `
        <div class="section-card">
            <div class="section-header"><h2>Create Savings Goal</h2></div>
            <form id="add-goal-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
                <div><label>Goal Name</label><input type="text" id="goal-name" placeholder="e.g. Emergency Fund" required></div>
                <div><label>Target Amount</label><input type="number" id="goal-target" step="0.01" min="1" required></div>
                <div><label>Deadline (optional)</label><input type="date" id="goal-deadline"></div>
                <div><label>Priority</label>
                    <select id="goal-priority">
                        <option value="low">🟢 Low</option>
                        <option value="medium" selected>🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                </div>
                <div style="display:flex;align-items:flex-end;">
                    <button type="submit" class="btn btn-primary" style="width:100%;">
                        <i class="fas fa-plus"></i> Create Goal
                    </button>
                </div>
            </form>
        </div>

        <div class="section-card">
            <div class="section-header">
                <h2>Your Savings Goals</h2>
                <span id="goals-summary" style="font-size:0.85rem;color:var(--tx-muted);"></span>
            </div>
            <div id="goals-list"></div>
        </div>`;

        this.loadGoals();
        this.setupFormHandler();
    },

    async loadGoals() {
        try {
            await App.fetchConversionRate();
            const r = await fetch(App.API_BASE + 'budgets_goals.php?action=get_goals&status=active');
            const d = await App.safeJSON(r);
            if (!d.success) return;
            const el = document.getElementById('goals-list');
            const summary = document.getElementById('goals-summary');

            if (!d.goals.length) {
                el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--tx-muted);">
                    <i class="fas fa-bullseye" style="font-size:2.5rem;opacity:0.3;margin-bottom:12px;display:block;"></i>
                    <p>No active goals yet. Create your first savings goal above!</p>
                </div>`;
                if (summary) summary.textContent = '';
                return;
            }

            const totalTarget = d.goals.reduce((s, g) => s + parseFloat(g.target_amount), 0);
            const totalSaved = d.goals.reduce((s, g) => s + parseFloat(g.current_amount), 0);
            if (summary) summary.textContent = `${d.goals.length} goal${d.goals.length>1?'s':''} · ${App.formatCurrency(totalSaved * (App._conversionRate || 1))} saved of ${App.formatCurrency(totalTarget * (App._conversionRate || 1))}`;

            el.innerHTML = d.goals.map(g => {
                const pct = Math.min(parseFloat(g.percentage), 100);
                const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);
                const progressColor = pct >= 100 ? 'var(--c-success)' : pct >= 60 ? 'var(--c-warning)' : 'var(--c-brand)';
                const daysLeft = g.days_remaining ? `${g.days_remaining} days left` : 'No deadline';
                const circ = 2 * Math.PI * 22;
                const filled = (pct / 100) * circ;

                return `
                <div class="stat-card" style="margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <!-- Ring -->
                        <div style="position:relative;width:56px;height:56px;flex-shrink:0;">
                            <svg width="56" height="56" viewBox="0 0 56 56">
                                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-sunken)" stroke-width="6"/>
                                <circle cx="28" cy="28" r="22" fill="none" stroke="${progressColor}" stroke-width="6"
                                    stroke-linecap="round" stroke-dasharray="${circ}"
                                    stroke-dashoffset="${circ - filled}"
                                    transform="rotate(-90 28 28)"
                                    style="transition:stroke-dashoffset 0.8s ease;"/>
                            </svg>
                            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.72rem;font-weight:700;color:var(--tx-primary);">${Math.round(pct)}%</div>
                        </div>

                        <!-- Info -->
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                <h3 style="font-size:1rem;font-weight:600;color:var(--tx-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${g.goal_name}</h3>
                                <span class="badge ${g.priority}">${g.priority}</span>
                            </div>
                            <div style="font-size:0.82rem;color:var(--tx-secondary);">
                                <strong style="color:var(--tx-primary);">${App.formatCurrency(g.current_amount * (App._conversionRate || 1))}</strong>
                                of ${App.formatCurrency(g.target_amount * (App._conversionRate || 1))}
                                · <span style="color:var(--tx-muted);">${daysLeft}</span>
                            </div>
                            <div class="progress-bar" style="margin-top:8px;">
                                <div class="progress-fill" style="width:${pct}%;background:${progressColor};"></div>
                            </div>
                            <div style="font-size:0.78rem;color:var(--tx-muted);margin-top:4px;">${App.formatCurrency(remaining * (App._conversionRate || 1))} remaining</div>
                        </div>

                        <!-- Actions -->
                        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
                            <button class="btn btn-success" onclick="Goals.contributeToGoal(${g.goal_id})" style="padding:7px 12px;font-size:0.82rem;">
                                <i class="fas fa-plus"></i> Add
                            </button>
                            <button class="btn btn-secondary" onclick="Goals.deleteGoal(${g.goal_id})" style="padding:7px 12px;font-size:0.82rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { console.error('Goals load failed:', e); }
    },

    setupFormHandler() {
        document.getElementById('add-goal-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'add_goal');
            fd.append('goal_name', document.getElementById('goal-name').value);
            fd.append('target_amount', document.getElementById('goal-target').value);
            fd.append('deadline', document.getElementById('goal-deadline').value);
            fd.append('priority', document.getElementById('goal-priority').value);
            try {
                const r = await fetch(App.API_BASE + 'budgets_goals.php', { method:'POST', body:fd });
                const d = await App.safeJSON(r);
                if (d.success) { App.showToast('Goal created!', 'success'); e.target.reset(); this.loadGoals(); }
                else { App.showToast(d.message, 'error'); }
            } catch(e) { App.showToast('Failed to create goal', 'error'); }
        });
    },

    async contributeToGoal(id) {
        const amount = prompt('Enter amount to contribute:');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
        const fd = new FormData();
        fd.append('action', 'contribute_to_goal');
        fd.append('goal_id', id);
        fd.append('amount', amount);
        try {
            const r = await fetch(App.API_BASE + 'budgets_goals.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Contribution added! 🎉', 'success'); this.loadGoals(); }
            else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to add contribution', 'error'); }
    },

    async deleteGoal(id) {
        if (!confirm('Delete this goal?')) return;
        const fd = new FormData();
        fd.append('action', 'delete_goal');
        fd.append('goal_id', id);
        try {
            const r = await fetch(App.API_BASE + 'budgets_goals.php', { method:'POST', body:fd });
            const d = await App.safeJSON(r);
            if (d.success) { App.showToast('Goal deleted', 'success'); this.loadGoals(); }
            else { App.showToast(d.message, 'error'); }
        } catch(e) { App.showToast('Failed to delete goal', 'error'); }
    }
};

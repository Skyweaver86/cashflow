const Reports = {
    async init() {
        const today = new Date().toISOString().split('T')[0];
        const sixMoAgo = new Date(new Date().setMonth(new Date().getMonth()-6)).toISOString().split('T')[0];
        const c = document.getElementById('page-container');
        c.innerHTML =
            '<div class="export-bar">' +
                '<i class="fas fa-file-export" style="color:var(--c-success);font-size:1.1rem;"></i>' +
                '<span>Export your financial data for the selected period</span>' +
                '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
                    '<input type="date" id="report-start" value="' + sixMoAgo + '" style="padding:7px 10px;font-size:0.82rem;border-radius:var(--r-md);border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">' +
                    '<input type="date" id="report-end" value="' + today + '" style="padding:7px 10px;font-size:0.82rem;border-radius:var(--r-md);border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">' +
                    '<button class="btn btn-success btn-sm" onclick="Reports.exportData()"><i class="fas fa-download"></i> Export CSV</button>' +
                    '<button class="btn btn-primary btn-sm" onclick="Reports.loadComparison()"><i class="fas fa-sync"></i> Refresh</button>' +
                '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-4);margin-bottom:var(--sp-5);" id="report-kpis">' +
                ['Total Income','Total Expenses','Net Savings','Savings Rate'].map(function(l) {
                    return '<div class="stat-card" style="padding:var(--sp-4);"><h3 style="font-size:0.7rem;">' + l + '</h3>' +
                           '<div class="skeleton" style="height:28px;border-radius:6px;margin-top:6px;"></div></div>';
                }).join('') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:3fr 2fr;gap:var(--sp-5);margin-bottom:var(--sp-5);">' +
                '<div class="section-card" style="margin-bottom:0;">' +
                    '<div class="section-header"><h2>Monthly Income vs Expenses</h2></div>' +
                    '<div id="bar-chart"><div class="skeleton" style="height:180px;border-radius:var(--r-md);"></div></div>' +
                '</div>' +
                '<div class="section-card" style="margin-bottom:0;">' +
                    '<div class="section-header"><h2>Expense Categories</h2></div>' +
                    '<div id="category-donut"><div class="skeleton" style="height:180px;border-radius:var(--r-md);"></div></div>' +
                '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5);">' +
                '<div class="section-card" style="margin-bottom:0;">' +
                    '<div class="section-header"><h2>Net Savings Trend</h2></div>' +
                    '<div id="savings-sparkline"><div class="skeleton" style="height:120px;border-radius:var(--r-md);"></div></div>' +
                '</div>' +
                '<div class="section-card" style="margin-bottom:0;">' +
                    '<div class="section-header"><h2>Monthly Breakdown</h2></div>' +
                    '<div id="monthly-breakdown"><div class="skeleton" style="height:120px;border-radius:var(--r-md);"></div></div>' +
                '</div>' +
            '</div>' +
            '<div class="section-card">' +
                '<div class="section-header"><h2>Detailed History</h2></div>' +
                '<table class="data-table">' +
                    '<thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th><th>Savings Rate</th><th>vs Prev</th><th>Status</th></tr></thead>' +
                    '<tbody id="history-table"></tbody>' +
                '</table>' +
            '</div>';

        this.loadComparison();
    },

    async loadComparison() {
        try {
            const resp = await fetch(App.API_BASE + 'transactions.php?action=get_comparison&months=12');
            const d = await App.safeJSON(resp);
            if (!d.success || !d.comparison) {
                document.getElementById('report-kpis').innerHTML =
                    '<div class="section-card" style="grid-column:1/-1;text-align:center;padding:20px;color:var(--tx-muted);">No data available yet. Add some transactions first.</div>';
                ['bar-chart','category-donut','savings-sparkline','monthly-breakdown'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.innerHTML = '<p style="color:var(--tx-muted);font-size:0.85rem;padding:16px 0;text-align:center;">No data yet.</p>';
                });
                return;
            }
            var data = d.comparison;

            // KPIs
            var totInc = 0, totExp = 0;
            data.forEach(function(m) { totInc += parseFloat(m.income)||0; totExp += parseFloat(m.expenses)||0; });
            var netSav = totInc - totExp;
            var savRate = totInc > 0 ? ((netSav/totInc)*100).toFixed(1) : 0;
            var kpiData = [
                { label:'Total Income',   val: App.formatCurrency(totInc), color:'var(--c-success)' },
                { label:'Total Expenses', val: App.formatCurrency(totExp), color:'var(--c-danger)' },
                { label:'Net Savings',    val: App.formatCurrency(netSav), color: netSav>=0?'var(--c-success)':'var(--c-danger)' },
                { label:'Savings Rate',   val: savRate + '%',              color:'var(--c-brand)' }
            ];
            var kpisEl = document.getElementById('report-kpis');
            if (kpisEl) kpisEl.innerHTML = kpiData.map(function(k) {
                return '<div class="stat-card" style="padding:var(--sp-4);">' +
                    '<h3 style="font-size:0.7rem;">' + k.label + '</h3>' +
                    '<div style="font-family:var(--font-display);font-size:1.35rem;font-weight:700;color:' + k.color + ';margin-top:5px;">' + k.val + '</div>' +
                '</div>';
            }).join('');

            // Bar chart
            var maxVal = 1;
            data.forEach(function(m) { maxVal = Math.max(maxVal, parseFloat(m.income)||0, parseFloat(m.expenses)||0); });
            var bars = '';
            data.forEach(function(m) {
                var inc = parseFloat(m.income)||0, exp = parseFloat(m.expenses)||0;
                var ih = Math.max(Math.round((inc/maxVal)*150), 3);
                var eh = Math.max(Math.round((exp/maxVal)*150), 3);
                bars += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">' +
                    '<div style="width:100%;display:flex;align-items:flex-end;gap:2px;height:150px;">' +
                        '<div style="flex:1;height:' + ih + 'px;background:var(--c-success);opacity:0.8;border-radius:4px 4px 0 0;" title="' + m.month + ' Income: ' + App.formatCurrency(inc) + '"></div>' +
                        '<div style="flex:1;height:' + eh + 'px;background:var(--c-danger);opacity:0.8;border-radius:4px 4px 0 0;" title="' + m.month + ' Expenses: ' + App.formatCurrency(exp) + '"></div>' +
                    '</div>' +
                    '<div style="font-size:0.62rem;color:var(--tx-muted);text-align:center;">' + m.month.split(' ')[0] + '</div>' +
                '</div>';
            });
            var barEl = document.getElementById('bar-chart');
            if (barEl) barEl.innerHTML =
                '<div style="display:flex;align-items:flex-end;gap:6px;height:170px;padding:4px 0 0;">' + bars + '</div>' +
                '<div style="display:flex;gap:14px;margin-top:10px;font-size:0.76rem;">' +
                    '<span><span style="width:10px;height:10px;border-radius:2px;background:var(--c-success);display:inline-block;margin-right:4px;"></span>Income</span>' +
                    '<span><span style="width:10px;height:10px;border-radius:2px;background:var(--c-danger);display:inline-block;margin-right:4px;"></span>Expenses</span>' +
                '</div>';

            // Category donut
            this.loadCategoryDonut();

            // Sparkline
            var nets = data.map(function(m) { return parseFloat(m.net)||0; });
            var minN = Math.min.apply(null, nets);
            var maxN = Math.max.apply(null, nets.concat([1]));
            var range = (maxN - minN) || 1;
            var W = 300, H = 110;
            var pts = nets.map(function(n, i) {
                var x = nets.length > 1 ? (i/(nets.length-1))*W : W/2;
                var y = H - ((n-minN)/range)*(H-20) - 10;
                return x + ',' + y;
            }).join(' ');
            var zero = H - ((0-minN)/range)*(H-20) - 10;
            var dots = '';
            nets.forEach(function(n, i) {
                var x = nets.length > 1 ? (i/(nets.length-1))*W : W/2;
                var y = H - ((n-minN)/range)*(H-20) - 10;
                dots += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + (n>=0?'var(--c-success)':'var(--c-danger)') + '" stroke="var(--bg-surface)" stroke-width="2"/>';
            });
            var monthLabels = data.map(function(m) { return '<span>' + m.month.split(' ')[0] + '</span>'; }).join('');
            var sparkEl = document.getElementById('savings-sparkline');
            if (sparkEl) sparkEl.innerHTML =
                '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="overflow:visible;margin-top:8px;">' +
                    '<line x1="0" y1="' + zero + '" x2="' + W + '" y2="' + zero + '" stroke="var(--bd-default)" stroke-width="1" stroke-dasharray="4,4"/>' +
                    '<polyline points="' + pts + '" fill="none" stroke="var(--c-brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
                    dots +
                '</svg>' +
                '<div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--tx-muted);margin-top:4px;">' + monthLabels + '</div>';

            // Monthly breakdown
            var mbEl = document.getElementById('monthly-breakdown');
            if (mbEl) mbEl.innerHTML = data.slice(-6).map(function(m) {
                var inc = parseFloat(m.income)||0, exp = parseFloat(m.expenses)||0;
                var pct = inc > 0 ? Math.min(Math.round((exp/inc)*100), 100) : (exp>0?100:0);
                var savePct = inc > 0 ? Math.max(0, Math.round(((inc-exp)/inc)*100)) : 0;
                var col = pct > 100 ? 'var(--c-danger)' : pct > 80 ? 'var(--c-warning)' : 'var(--c-success)';
                return '<div style="margin-bottom:10px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px;">' +
                        '<span style="color:var(--tx-secondary);">' + m.month + '</span>' +
                        '<span style="font-weight:600;color:' + col + ';">' + savePct + '% saved</span>' +
                    '</div>' +
                    '<div class="progress-bar thin"><div class="progress-fill" style="width:' + pct + '%;background:' + col + ';"></div></div>' +
                '</div>';
            }).join('');

            // History table
            var htEl = document.getElementById('history-table');
            if (htEl) htEl.innerHTML = data.map(function(m, i) {
                var inc = parseFloat(m.income)||0, exp = parseFloat(m.expenses)||0, net = parseFloat(m.net)||0;
                var savRate2 = inc > 0 ? Math.max(0, Math.round(((inc-exp)/inc)*100)) : 0;
                var prev = i > 0 ? parseFloat(data[i-1].net)||0 : null;
                var vsP = prev !== null ? net - prev : null;
                var vsStr = vsP === null ? '—' : (vsP >= 0 ? '▲ ' : '▼ ') + App.formatCurrency(Math.abs(vsP));
                var vsColor = vsP === null ? 'var(--tx-muted)' : vsP >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
                return '<tr>' +
                    '<td style="font-weight:600;">' + m.month + '</td>' +
                    '<td style="color:var(--c-success);font-weight:600;">' + App.formatCurrency(inc) + '</td>' +
                    '<td style="color:var(--c-danger);font-weight:600;">' + App.formatCurrency(exp) + '</td>' +
                    '<td style="font-weight:700;color:' + (net>=0?'var(--c-success)':'var(--c-danger)') + ';">' + App.formatCurrency(net) + '</td>' +
                    '<td>' +
                        '<div style="display:flex;align-items:center;gap:7px;">' +
                            '<div class="progress-bar thin" style="flex:1;margin:0;"><div class="progress-fill" style="width:' + savRate2 + '%;background:' + (savRate2>50?'var(--c-success)':savRate2>20?'var(--c-warning)':'var(--c-danger)') + ';"></div></div>' +
                            '<span style="font-size:0.76rem;font-weight:600;min-width:30px;">' + savRate2 + '%</span>' +
                        '</div>' +
                    '</td>' +
                    '<td style="font-size:0.8rem;color:' + vsColor + ';">' + vsStr + '</td>' +
                    '<td><span class="badge ' + (net>=0?'success':'danger') + '">' + (net>=0?'Surplus':'Deficit') + '</span></td>' +
                '</tr>';
            }).join('');

        } catch(err) {
            console.error('Reports error:', err);
        }
    },

    async loadCategoryDonut() {
        try {
            var resp = await fetch(App.API_BASE + 'transactions.php?action=get_summary&period=month');
            var d = await App.safeJSON(resp);
            var el = document.getElementById('category-donut');
            if (!el) return;
            if (!d.success || !d.summary) { el.innerHTML = '<p style="color:var(--tx-muted);font-size:0.84rem;padding:16px 0;text-align:center;">No data this month.</p>'; return; }
            var cats = d.summary.expense_by_category || [];
            var total = parseFloat(d.summary.total_expenses) || 0;
            if (!cats.length || !total) { el.innerHTML = '<p style="color:var(--tx-muted);font-size:0.84rem;padding:16px 0;text-align:center;">No expenses this month.</p>'; return; }
            var palette = ['#00704A','#0EA5E9','#F59E0B','#F43F5E','#8B5CF6','#EC4899','#14B8A6'];
            var size=140, cx=size/2, cy=size/2, outerR=48, innerR=28;
            var sa = -Math.PI/2;
            var paths = '', legend = '';
            cats.slice(0,6).forEach(function(cat, i) {
                var pct = parseFloat(cat.total)/total;
                var ang = pct * 2 * Math.PI;
                var x1=cx+outerR*Math.cos(sa), y1=cy+outerR*Math.sin(sa);
                var x2=cx+outerR*Math.cos(sa+ang), y2=cy+outerR*Math.sin(sa+ang);
                var ix1=cx+innerR*Math.cos(sa), iy1=cy+innerR*Math.sin(sa);
                var ix2=cx+innerR*Math.cos(sa+ang), iy2=cy+innerR*Math.sin(sa+ang);
                var la = ang > Math.PI ? 1 : 0;
                var path = 'M '+ix1+' '+iy1+' L '+x1+' '+y1+' A '+outerR+' '+outerR+' 0 '+la+' 1 '+x2+' '+y2+' L '+ix2+' '+iy2+' A '+innerR+' '+innerR+' 0 '+la+' 0 '+ix1+' '+iy1+' Z';
                var color = palette[i % palette.length];
                var pctStr = (pct*100).toFixed(1);
                paths += '<path d="'+path+'" fill="'+color+'" opacity="0.88"><title>'+cat.category+': '+pctStr+'%</title></path>';
                legend += '<div class="legend-item"><span class="legend-dot" style="background:'+color+';"></span><span class="legend-name">'+cat.category+'</span><span class="legend-val">'+pctStr+'%</span></div>';
                sa += ang;
            });
            el.innerHTML =
                '<div class="donut-wrap">' +
                    '<div class="donut-chart" style="width:'+size+'px;height:'+size+'px;">' +
                        '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+paths+'</svg>' +
                        '<div class="donut-center">' +
                            '<span class="donut-total">'+App.formatCurrency(total)+'</span>' +
                            '<span class="donut-label">spent</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="donut-legend">'+legend+'</div>' +
                '</div>';
        } catch(err) { console.error('Category donut error:', err); }
    },

    async exportData() {
        var start = document.getElementById('report-start')?.value || '';
        var end   = document.getElementById('report-end')?.value   || '';
        try {
            var resp = await fetch(App.API_BASE + 'transactions.php?action=export_csv&start_date=' + start + '&end_date=' + end);
            var d = await App.safeJSON(resp);
            if (!d.success || !d.rows || !d.rows.length) { App.showToast('No data for selected range', 'warning'); return; }
            var header = ['Date','Type','Category','Description','Amount'];
            var rows = d.rows.map(function(row) {
                return [row.date, row.type, row.category, '"' + (row.description||'').replace(/"/g,'""') + '"', row.amount];
            });
            var csv = [header].concat(rows).map(function(r) { return r.join(','); }).join('\n');
            var blob = new Blob([csv], {type:'text/csv'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'cashflow_' + start + '_to_' + end + '.csv'; a.click();
            URL.revokeObjectURL(url);
            App.showToast('Report exported!', 'success');
        } catch(err) { App.showToast('Export failed', 'error'); }
    }
};

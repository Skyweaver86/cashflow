const Currency = {
    _rates: [],

    async init() {
        const container = document.getElementById('page-container');
        const userCurr = App.currentUser?.currency || 'PHP';

        container.innerHTML =
            '<div class="section-card">' +
                '<div class="section-header"><h2>Currency Converter</h2><span style="font-size:0.8rem;color:var(--tx-muted);">Convert between any currencies</span></div>' +
                '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:end;max-width:640px;">' +
                    '<div>' +
                        '<label>From</label>' +
                        '<select id="from-currency" onchange="Currency.convert()">' +
                            Currency._currencyOptions(userCurr) +
                        '</select>' +
                        '<div style="margin-top:12px;">' +
                            '<label>Amount</label>' +
                            '<input type="number" id="convert-amount" value="100" step="0.01" min="0" oninput="Currency.convert()">' +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:center;padding-bottom:14px;">' +
                        '<button class="btn btn-outline" onclick="Currency.swapCurrencies()" title="Swap currencies" style="border-radius:50%;width:44px;height:44px;padding:0;justify-content:center;font-size:1rem;">' +
                            '<i class="fas fa-exchange-alt"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div>' +
                        '<label>To</label>' +
                        '<select id="to-currency" onchange="Currency.convert()">' +
                            Currency._currencyOptions('USD') +
                        '</select>' +
                        '<div style="margin-top:12px;">' +
                            '<label>Result</label>' +
                            '<div id="convert-result" style="padding:11px 14px;background:var(--bg-sunken);border-radius:var(--r-md);font-family:var(--font-display);font-size:1.4rem;font-weight:700;color:var(--c-brand);border:1.5px solid var(--bd-default);min-height:46px;">—</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="rate-info" style="margin-top:14px;font-size:0.84rem;color:var(--tx-muted);padding:10px 14px;background:var(--bg-raised);border-radius:var(--r-md);display:none;"></div>' +
            '</div>' +

            '<div class="section-card">' +
                '<div class="section-header">' +
                    '<h2>All Exchange Rates</h2>' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<label style="margin:0;font-size:0.82rem;font-weight:400;">Base currency:</label>' +
                        '<select id="rates-base" onchange="Currency.filterRates()" style="padding:6px 10px;font-size:0.82rem;border-radius:var(--r-md);border:1.5px solid var(--bd-default);background:var(--bg-raised);color:var(--tx-primary);">' +
                            '<option value="">All</option>' +
                            '<option value="USD">USD</option><option value="EUR">EUR</option>' +
                            '<option value="GBP">GBP</option><option value="JPY">JPY</option>' +
                            '<option value="PHP" selected>PHP</option><option value="AUD">AUD</option>' +
                            '<option value="CAD">CAD</option>' +
                        '</select>' +
                    '</div>' +
                '</div>' +
                '<table class="data-table">' +
                    '<thead><tr><th>From</th><th>To</th><th>Rate</th><th>Example</th><th>Updated</th></tr></thead>' +
                    '<tbody id="rates-table"><tr><td colspan="5" style="text-align:center;padding:20px;color:var(--tx-muted);">Loading rates...</td></tr></tbody>' +
                '</table>' +
            '</div>';

        await this.loadRates();
        this.convert();
    },

    _currencyOptions(selected) {
        const currencies = [
            ['USD', '🇺🇸', 'US Dollar'],
            ['EUR', '🇪🇺', 'Euro'],
            ['GBP', '🇬🇧', 'British Pound'],
            ['JPY', '🇯🇵', 'Japanese Yen'],
            ['PHP', '🇵🇭', 'Philippine Peso'],
            ['AUD', '🇦🇺', 'Australian Dollar'],
            ['CAD', '🇨🇦', 'Canadian Dollar'],
        ];
        return currencies.map(c =>
            '<option value="' + c[0] + '"' + (c[0] === selected ? ' selected' : '') + '>' +
            c[1] + ' ' + c[0] + ' — ' + c[2] + '</option>'
        ).join('');
    },

    async convert() {
        const amount = parseFloat(document.getElementById('convert-amount')?.value) || 0;
        const from   = document.getElementById('from-currency')?.value;
        const to     = document.getElementById('to-currency')?.value;
        const resultEl = document.getElementById('convert-result');
        const rateEl   = document.getElementById('rate-info');
        if (!resultEl) return;

        if (!from || !to) return;

        if (from === to) {
            resultEl.textContent = amount.toFixed(2) + ' ' + from;
            if (rateEl) { rateEl.style.display = 'none'; }
            return;
        }

        if (amount <= 0) {
            resultEl.textContent = '—';
            return;
        }

        resultEl.innerHTML = '<span style="opacity:0.4;font-size:1rem;">Converting...</span>';

        try {
            const resp = await fetch(App.API_BASE + 'currency.php?action=convert&amount=' + amount + '&from=' + from + '&to=' + to);
            const d = await App.safeJSON(resp);

            if (d.success) {
                const syms = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', PHP:'₱', AUD:'A$', CAD:'C$' };
                const toSym = syms[to] || to;
                const converted = parseFloat(d.converted_amount);
                resultEl.textContent = toSym + converted.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:4});

                if (rateEl) {
                    const rate = parseFloat(d.rate);
                    const note = d.note ? ' <span style="color:var(--tx-muted);font-size:0.75rem;">(' + d.note + ')</span>' : '';
                    rateEl.style.display = 'block';
                    rateEl.innerHTML =
                        '<i class="fas fa-info-circle" style="color:var(--c-brand);margin-right:6px;"></i>' +
                        '<strong>1 ' + from + ' = ' + rate.toFixed(6) + ' ' + to + '</strong>' + note +
                        '<span style="margin:0 12px;color:var(--bd-default);">|</span>' +
                        '1 ' + to + ' = ' + (1/rate).toFixed(6) + ' ' + from;
                }
            } else {
                resultEl.innerHTML = '<span style="color:var(--c-danger);font-size:0.9rem;">' + (d.message || 'Rate not available') + '</span>';
                if (rateEl) rateEl.style.display = 'none';
            }
        } catch(e) {
            resultEl.innerHTML = '<span style="color:var(--c-danger);font-size:0.9rem;">Conversion failed</span>';
            console.error('Convert error:', e);
        }
    },

    swapCurrencies() {
        const from = document.getElementById('from-currency');
        const to   = document.getElementById('to-currency');
        if (!from || !to) return;
        const tmp = from.value;
        from.value = to.value;
        to.value = tmp;
        this.convert();
    },

    async loadRates() {
        try {
            const resp = await fetch(App.API_BASE + 'currency.php?action=get_rates');
            const d = await App.safeJSON(resp);
            if (d.success && d.rates) {
                this._rates = d.rates;
                this.filterRates();
            }
        } catch(e) { console.error('Load rates error:', e); }
    },

    filterRates() {
        const base = document.getElementById('rates-base')?.value || '';
        const tbody = document.getElementById('rates-table');
        if (!tbody) return;

        const filtered = base
            ? this._rates.filter(r => r.from_currency === base)
            : this._rates;

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--tx-muted);">No rates found. Run setup.php to seed rates.</td></tr>';
            return;
        }

        const syms = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', PHP:'₱', AUD:'A$', CAD:'C$' };
        tbody.innerHTML = filtered.map(function(r) {
            const rate = parseFloat(r.rate);
            const fromSym = syms[r.from_currency] || r.from_currency;
            const toSym   = syms[r.to_currency]   || r.to_currency;
            const example = fromSym + '100 = ' + toSym + (rate * 100).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
            return '<tr>' +
                '<td style="font-weight:700;">' + r.from_currency + '</td>' +
                '<td style="font-weight:700;">' + r.to_currency + '</td>' +
                '<td style="font-family:var(--font-display);color:var(--c-brand);font-size:1rem;">' + rate.toFixed(6) + '</td>' +
                '<td style="color:var(--tx-secondary);font-size:0.84rem;">' + example + '</td>' +
                '<td style="color:var(--tx-muted);font-size:0.8rem;">' + new Date(r.last_updated).toLocaleDateString() + '</td>' +
            '</tr>';
        }).join('');
    }
};

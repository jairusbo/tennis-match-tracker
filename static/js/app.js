const API_URL = '/api';

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('date').valueAsDate = new Date();

    loadMatches();
    loadStats();
    loadGoals();

    document.getElementById('matchForm').addEventListener('submit', handleFormSubmit);

    document.getElementById('setScores').addEventListener('input', function (e) {
        const val = e.target.value;
        const group = document.getElementById('tiebreakGroup');
        if (val.includes('7-6') || val.includes('6-7')) {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            document.getElementById('tiebreakScores').value = '';
        }
    });

    document.getElementById('toggleAdvancedStats').addEventListener('click', function () {
        const form = document.getElementById('advancedStatsForm');
        const open = form.style.display === 'none';
        form.style.display = open ? 'block' : 'none';
        this.textContent = open
            ? '− Additional Stats'
            : '+ Additional Stats  break points & unforced errors';
    });

    document.getElementById('toggleGoalForm').addEventListener('click', toggleGoalForm);
    document.getElementById('cancelGoalForm').addEventListener('click', function () {
        document.getElementById('goalForm').style.display = 'none';
        document.getElementById('goalFormElement').reset();
    });
    document.getElementById('goalFormElement').addEventListener('submit', handleGoalFormSubmit);
    document.getElementById('closeAdviceModal').addEventListener('click', closeAdviceModal);
    document.getElementById('adviceModalOverlay').addEventListener('click', closeAdviceModal);
});

// ── Form submit ───────────────────────────────────────────
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        date: document.getElementById('date').value,
        opponent: document.getElementById('opponent').value,
        opponent_utr: document.getElementById('opponentUtr').value,
        set_scores: document.getElementById('setScores').value,
        tiebreak_scores: document.getElementById('tiebreakScores').value,
        surface: document.getElementById('surface').value,
        match_type: document.getElementById('matchType').value,
        notes: document.getElementById('notes').value,
        break_points_opportunities: document.getElementById('bpOpportunities').value,
        break_points_converted: document.getElementById('bpConverted').value,
        break_points_faced: document.getElementById('bpFaced').value,
        break_points_saved: document.getElementById('bpSaved').value,
        unforced_errors_by_set: document.getElementById('unforcedErrorsBySet').value,
    };

    try {
        const res = await fetch(`${API_URL}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const result = await res.json();

        if (res.ok) {
            document.getElementById('matchForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('tiebreakGroup').style.display = 'none';
            document.getElementById('advancedStatsForm').style.display = 'none';
            document.getElementById('toggleAdvancedStats').textContent = '+ Additional Stats  break points & unforced errors';
            loadMatches();
            loadStats();
            loadGoals();
        } else {
            alert('Error: ' + (result.error || 'Failed to add match'));
        }
    } catch (err) {
        alert('Failed to add match. Please try again.');
    }
}

// ── Match list ────────────────────────────────────────────
async function loadMatches() {
    try {
        const res = await fetch(`${API_URL}/matches`);
        const matches = await res.json();
        const el = document.getElementById('matchesList');

        if (matches.length === 0) {
            el.innerHTML = '<div class="no-items">No matches logged yet.</div>';
            return;
        }

        el.innerHTML = matches.map(createMatchCard).join('');

        document.querySelectorAll('.match-delete').forEach(btn => {
            btn.addEventListener('click', function () { deleteMatch(this.dataset.id); });
        });
    } catch (err) {
        console.error(err);
    }
}

function createMatchCard(match) {
    const win = match.your_sets_won > match.opponent_sets_won;
    const cls = win ? 'win' : 'loss';
    const label = win ? 'WIN' : 'LOSS';
    const utrTag = match.opponent_utr ? `<span class="match-utr">UTR ${match.opponent_utr}</span>` : '';

    const chips = [];
    if (match.break_points_opportunities > 0)
        chips.push(`BP Conv: ${match.break_points_converted}/${match.break_points_opportunities}`);
    if (match.break_points_faced > 0)
        chips.push(`BP Saved: ${match.break_points_saved}/${match.break_points_faced}`);
    if (match.unforced_errors_by_set)
        chips.push(`UE by set: ${match.unforced_errors_by_set}`);

    const advHTML = chips.length
        ? `<div class="match-adv-stats">${chips.map(c => `<span class="adv-chip">${c}</span>`).join('')}</div>`
        : '';

    return `
        <div class="match-card ${cls}">
            <button class="match-delete" data-id="${match.id}">Delete</button>
            <div class="match-top">
                <div>
                    <span class="match-opponent">${match.opponent}</span>${utrTag}
                </div>
                <span class="match-result-badge ${cls}">${label}</span>
            </div>
            <div class="match-meta">
                <div>${formatDate(match.date)}</div>
                <div><strong>${match.set_scores}</strong>${match.tiebreak_scores ? ` (${match.tiebreak_scores})` : ''}</div>
                <div>${match.surface}</div>
                <div>${match.match_type}</div>
            </div>
            ${match.notes ? `<div class="match-notes-text">${match.notes}</div>` : ''}
            ${advHTML}
        </div>`;
}

async function deleteMatch(id) {
    if (!confirm('Delete this match?')) return;
    try {
        const res = await fetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
        if (res.ok) { loadMatches(); loadStats(); }
    } catch (err) { alert('Failed to delete match.'); }
}

// ── Stats ─────────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const stats = await res.json();

        document.getElementById('totalMatches').textContent = stats.total_matches;
        document.getElementById('wins').textContent = stats.wins;
        document.getElementById('losses').textContent = stats.losses;
        document.getElementById('winPercentage').textContent =
            stats.total_matches > 0 ? stats.win_percentage + '%' : '—';

        displayRecentForm(stats.recent_form);
        displaySurfaceStats(stats.surface_stats);
        displayAdvancedStats(stats.advanced_stats);
    } catch (err) { console.error(err); }
}

function displayRecentForm(form) {
    const el = document.getElementById('recentForm');
    if (!form || form.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = `
        <span class="form-label">Recent form</span>
        <div class="form-badges">
            ${form.map(r => `<span class="form-badge ${r === 'W' ? 'win' : 'loss'}">${r}</span>`).join('')}
        </div>`;
}

function displaySurfaceStats(surfaceStats) {
    const el = document.getElementById('surfaceStats');
    if (!surfaceStats || surfaceStats.length === 0) {
        el.innerHTML = '<div class="no-items">No data yet.</div>';
        return;
    }
    el.innerHTML = surfaceStats.map(s => {
        const pct = s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : 0;
        return `
            <div class="surface-item">
                <span class="surface-name">${s.surface}</span>
                <span class="surface-record">${s.wins}W – ${s.losses}L &nbsp;·&nbsp; ${pct}%</span>
            </div>`;
    }).join('');
}

function displayAdvancedStats(adv) {
    const container = document.getElementById('advancedStatsContainer');
    const hasData = adv.bp_conversion_pct !== null || adv.avg_ue_per_set !== null;
    if (!hasData) { container.style.display = 'none'; return; }

    container.style.display = 'block';
    const fmt = v => v !== null ? v + '%' : '—';
    document.getElementById('bpConversionPct').textContent = fmt(adv.bp_conversion_pct);
    document.getElementById('bpSavePct').textContent = fmt(adv.bp_save_pct);
    document.getElementById('avgUEPerSet').textContent = adv.avg_ue_per_set !== null ? adv.avg_ue_per_set : '—';

    const ueBySet = adv.avg_ue_by_set || {};
    const ueWrap = document.getElementById('ueBySetContainer');
    const ueEl = document.getElementById('ueBySet');

    if (Object.keys(ueBySet).length > 0) {
        ueWrap.style.display = 'block';
        const max = Math.max(...Object.values(ueBySet));
        ueEl.innerHTML = Object.entries(ueBySet).map(([k, v]) => {
            const label = k.replace('_', ' ').replace('set', 'Set');
            const w = max > 0 ? Math.round((v / max) * 100) : 0;
            return `
                <div class="ue-bar-row">
                    <div class="ue-bar-label">${label}</div>
                    <div class="ue-bar-track"><div class="ue-bar-fill" style="width:${w}%"></div></div>
                    <div class="ue-bar-value">${v} avg</div>
                </div>`;
        }).join('');
    } else {
        ueWrap.style.display = 'none';
    }
}

// ── Goals ─────────────────────────────────────────────────
async function loadGoals() {
    try {
        const res = await fetch(`${API_URL}/goals`);
        const goals = await res.json();
        const el = document.getElementById('goalsList');

        if (goals.length === 0) {
            el.innerHTML = '<div class="no-items">No goals yet.</div>';
            return;
        }
        el.innerHTML = goals.map(createGoalCard).join('');
    } catch (err) { console.error(err); }
}

function createGoalCard(goal) {
    const target = new Date(goal.target_date);
    const days = Math.ceil((target - new Date()) / 86400000);
    const daysText = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`;

    return `
        <div class="goal-card ${goal.status}">
            <div class="goal-title">${goal.title}
                <span class="goal-status-badge ${goal.status}">${goal.status}</span>
            </div>
            ${goal.description ? `<div class="goal-desc">${goal.description}</div>` : ''}
            <div class="goal-meta">
                <div>Target: <span>${formatDate(goal.target_date)}</span></div>
                <div>Time: <span>${daysText}</span></div>
                <div>Matches: <span>${goal.match_count}</span></div>
            </div>
            <div class="goal-actions">
                <button class="btn-goal" onclick="showAdvice(${goal.id})">Analysis</button>
                ${goal.status === 'active' ? `<button class="btn-goal success" onclick="markGoalComplete(${goal.id})">Mark Complete</button>` : ''}
                <button class="btn-goal danger" onclick="deleteGoal(${goal.id})">Delete</button>
            </div>
        </div>`;
}

function toggleGoalForm() {
    const el = document.getElementById('goalForm');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function handleGoalFormSubmit(e) {
    e.preventDefault();
    const formData = {
        title: document.getElementById('goalTitle').value,
        description: document.getElementById('goalDescription').value,
        target_date: document.getElementById('goalTargetDate').value,
    };
    try {
        const res = await fetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (res.ok) {
            document.getElementById('goalFormElement').reset();
            document.getElementById('goalForm').style.display = 'none';
            loadGoals();
        } else {
            const r = await res.json();
            alert('Error: ' + r.error);
        }
    } catch (err) { alert('Failed to create goal.'); }
}

async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try {
        const res = await fetch(`${API_URL}/goals/${id}`, { method: 'DELETE' });
        if (res.ok) loadGoals();
    } catch (err) { alert('Failed to delete goal.'); }
}

async function markGoalComplete(id) {
    try {
        const res = await fetch(`${API_URL}/goals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
        });
        if (res.ok) loadGoals();
    } catch (err) { alert('Failed to update goal.'); }
}

async function showAdvice(goalId) {
    try {
        const res = await fetch(`${API_URL}/goals/${goalId}/advice`);
        const data = await res.json();
        if (!res.ok) { alert('Error: ' + data.error); return; }

        const { goal, analysis } = data;
        document.getElementById('adviceGoalTitle').textContent = goal.title;

        let html = '<div class="advice-section">';
        html += `<h4>Overview</h4>`;
        html += `<div class="advice-stat">Matches tracked: ${analysis.match_count}</div>`;
        if (analysis.days_until_deadline !== null) {
            const t = analysis.days_until_deadline < 0
                ? `${Math.abs(analysis.days_until_deadline)} days overdue`
                : `${analysis.days_until_deadline} days left`;
            html += `<div class="advice-stat">Timeline: ${t}</div>`;
        }
        html += '</div>';

        if (analysis.patterns.techniques_mentioned.length > 0) {
            html += '<div class="advice-section"><h4>Techniques Mentioned</h4><ul>';
            analysis.patterns.techniques_mentioned.forEach(t => { html += `<li>${t}</li>`; });
            html += '</ul></div>';
        }

        html += `<div class="advice-section"><h4>Progress Indicators</h4>`;
        html += `<div class="advice-stat">Positive notes: ${analysis.patterns.positive_indicators}</div>`;
        html += `<div class="advice-stat">Challenges: ${analysis.patterns.struggle_indicators}</div>`;
        html += '</div>';

        if (analysis.suggestions.length > 0) {
            html += '<div class="advice-section"><h4>Suggestions</h4>';
            analysis.suggestions.forEach(s => { html += `<div class="advice-suggestion">${s}</div>`; });
            html += '</div>';
        }

        document.getElementById('adviceBody').innerHTML = html;
        document.getElementById('adviceModal').style.display = 'flex';
    } catch (err) { alert('Failed to load analysis.'); }
}

function closeAdviceModal() {
    document.getElementById('adviceModal').style.display = 'none';
}

function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

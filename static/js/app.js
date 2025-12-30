// API base URL
const API_URL = '/api';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();

    // Load initial data
    loadMatches();
    loadStats();
    loadGoals();

    // Set up form submission
    document.getElementById('matchForm').addEventListener('submit', handleFormSubmit);

    // Show tiebreak field based on set scores
    document.getElementById('setScores').addEventListener('input', function(e) {
        const setScores = e.target.value;
        const tiebreakGroup = document.getElementById('tiebreakGroup');

        // Check if any set is 7-6 or 6-7
        if (setScores.includes('7-6') || setScores.includes('6-7')) {
            tiebreakGroup.style.display = 'block';
        } else {
            tiebreakGroup.style.display = 'none';
            document.getElementById('tiebreakScores').value = '';
        }
    });

    // Goal form toggle
    document.getElementById('toggleGoalForm').addEventListener('click', toggleGoalForm);
    document.getElementById('cancelGoalForm').addEventListener('click', function() {
        document.getElementById('goalForm').style.display = 'none';
        document.getElementById('goalFormElement').reset();
    });

    // Goal form submission
    document.getElementById('goalFormElement').addEventListener('submit', handleGoalFormSubmit);

    // Close advice modal
    document.getElementById('closeAdviceModal').addEventListener('click', closeAdviceModal);
    document.getElementById('adviceModalOverlay').addEventListener('click', closeAdviceModal);
});

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        date: document.getElementById('date').value,
        opponent: document.getElementById('opponent').value,
        set_scores: document.getElementById('setScores').value,
        tiebreak_scores: document.getElementById('tiebreakScores').value,
        surface: document.getElementById('surface').value,
        match_type: document.getElementById('matchType').value,
        notes: document.getElementById('notes').value
    };

    try {
        const response = await fetch(`${API_URL}/matches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            // Reset form
            document.getElementById('matchForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('tiebreakGroup').style.display = 'none';

            // Reload data
            loadMatches();
            loadStats();
            loadGoals();

            // Show success message
            alert('Match added successfully!');
        } else {
            alert('Error: ' + (result.error || 'Failed to add match'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add match. Please try again.');
    }
}

// Load all matches
async function loadMatches() {
    try {
        const response = await fetch(`${API_URL}/matches`);
        const matches = await response.json();

        const matchesList = document.getElementById('matchesList');

        if (matches.length === 0) {
            matchesList.innerHTML = '<div class="no-matches">No matches logged yet. Add your first match above!</div>';
            return;
        }

        matchesList.innerHTML = matches.map(match => createMatchCard(match)).join('');

        // Add delete button listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteMatch(this.dataset.matchId);
            });
        });
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

// Create match card HTML
function createMatchCard(match) {
    const isWin = match.your_sets_won > match.opponent_sets_won;
    const resultClass = isWin ? 'win' : 'loss';
    const resultText = isWin ? 'WIN' : 'LOSS';
    const setScores = match.set_scores;
    const tiebreakScores = match.tiebreak_scores;

    return `
        <div class="match-card ${resultClass}">
            <button class="delete-btn" data-match-id="${match.id}">Delete</button>
            <div class="match-header">
                <div class="match-result ${resultClass}">${resultText}</div>
                <div class="match-date">${formatDate(match.date)}</div>
            </div>
            <div class="match-details">
                <div class="match-detail"><strong>Opponent:</strong> ${match.opponent}</div>
                <div class="match-detail"><strong>Score:</strong> ${setScores}${tiebreakScores ? ` (${tiebreakScores})` : ''}</div>
                <div class="match-detail"><strong>Sets:</strong> ${match.your_sets_won}-${match.opponent_sets_won}</div>
                <div class="match-detail"><strong>Surface:</strong> ${match.surface}</div>
                <div class="match-detail"><strong>Type:</strong> ${match.match_type}</div>
            </div>
            ${match.notes ? `<div class="match-notes">${match.notes}</div>` : ''}
        </div>
    `;
}

// Delete a match
async function deleteMatch(matchId) {
    if (!confirm('Are you sure you want to delete this match?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/matches/${matchId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadMatches();
            loadStats();
        } else {
            alert('Failed to delete match');
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        alert('Failed to delete match. Please try again.');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();

        // Update stat cards
        document.getElementById('totalMatches').textContent = stats.total_matches;
        document.getElementById('wins').textContent = stats.wins;
        document.getElementById('losses').textContent = stats.losses;
        document.getElementById('winPercentage').textContent = stats.win_percentage + '%';

        // Display recent form
        displayRecentForm(stats.recent_form);

        // Display surface stats
        displaySurfaceStats(stats.surface_stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Display recent form
function displayRecentForm(recentForm) {
    const recentFormContainer = document.getElementById('recentForm');

    if (recentForm.length === 0) {
        recentFormContainer.style.display = 'none';
        return;
    }

    recentFormContainer.style.display = 'block';
    recentFormContainer.innerHTML = `
        <strong>Recent Form (Last ${recentForm.length} matches):</strong>
        <div style="margin-top: 10px;">
            ${recentForm.map(result => `
                <span class="form-badge ${result === 'W' ? 'win' : 'loss'}">${result}</span>
            `).join('')}
        </div>
    `;
}

// Display surface statistics
function displaySurfaceStats(surfaceStats) {
    const surfaceStatsContainer = document.getElementById('surfaceStats');

    if (surfaceStats.length === 0) {
        surfaceStatsContainer.innerHTML = '<div class="no-matches">No surface data available yet.</div>';
        return;
    }

    surfaceStatsContainer.innerHTML = surfaceStats.map(stat => {
        const winRate = stat.total > 0 ? ((stat.wins / stat.total) * 100).toFixed(1) : 0;
        return `
            <div class="surface-stat-item">
                <div class="surface-name">${stat.surface}</div>
                <div class="surface-record">
                    ${stat.wins}W - ${stat.losses}L (${winRate}% win rate)
                </div>
            </div>
        `;
    }).join('');
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// ===== GOALS & MILESTONES FUNCTIONS =====

// Load and display goals
async function loadGoals() {
    try {
        const response = await fetch(`${API_URL}/goals`);
        const goals = await response.json();

        const goalsList = document.getElementById('goalsList');

        if (goals.length === 0) {
            goalsList.innerHTML = '<div class="no-goals">No goals set yet. Create your first goal above!</div>';
            return;
        }

        goalsList.innerHTML = goals.map(goal => createGoalCard(goal)).join('');
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

// Create a goal card HTML
function createGoalCard(goal) {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    let deadlineText = '';
    let deadlineClass = '';

    if (daysUntil < 0) {
        deadlineText = `${Math.abs(daysUntil)} days overdue`;
        deadlineClass = 'deadline-urgent';
    } else if (daysUntil === 0) {
        deadlineText = 'Due today!';
        deadlineClass = 'deadline-urgent';
    } else if (daysUntil < 7) {
        deadlineText = `${daysUntil} days left`;
        deadlineClass = 'deadline-urgent';
    } else if (daysUntil < 30) {
        deadlineText = `${daysUntil} days left`;
        deadlineClass = 'deadline-warning';
    } else {
        deadlineText = `${daysUntil} days left`;
        deadlineClass = '';
    }

    const statusBadge = `<span class="goal-status-badge ${goal.status}">${goal.status.toUpperCase()}</span>`;

    return `
        <div class="goal-card ${goal.status}">
            <div class="goal-header-section">
                <div>
                    <div class="goal-title">${goal.title}</div>
                    ${statusBadge}
                </div>
            </div>
            ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
            <div class="goal-meta">
                <div class="goal-meta-item">
                    <span class="goal-meta-label">Target Date:</span>
                    <span>${formatDate(goal.target_date)}</span>
                </div>
                <div class="goal-meta-item ${deadlineClass}">
                    <span class="goal-meta-label">Time Remaining:</span>
                    <span>${deadlineText}</span>
                </div>
                <div class="goal-meta-item">
                    <span class="goal-meta-label">Related Matches:</span>
                    <span>${goal.match_count} matches</span>
                </div>
            </div>
            <div class="goal-actions">
                <button class="btn-goal-action btn-advice" onclick="showAdvice(${goal.id})">Get Advice</button>
                ${goal.status === 'active' ? `<button class="btn-goal-action btn-complete" onclick="markGoalComplete(${goal.id})">Mark Complete</button>` : ''}
                <button class="btn-goal-action btn-delete" onclick="deleteGoal(${goal.id})">Delete</button>
            </div>
        </div>
    `;
}

// Toggle goal form visibility
function toggleGoalForm() {
    const goalForm = document.getElementById('goalForm');
    goalForm.style.display = goalForm.style.display === 'none' ? 'block' : 'none';
}

// Handle goal form submission
async function handleGoalFormSubmit(e) {
    e.preventDefault();

    const formData = {
        title: document.getElementById('goalTitle').value,
        description: document.getElementById('goalDescription').value,
        target_date: document.getElementById('goalTargetDate').value
    };

    try {
        const response = await fetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            // Reset form and hide it
            document.getElementById('goalFormElement').reset();
            document.getElementById('goalForm').style.display = 'none';

            // Reload goals
            loadGoals();

            alert('Goal created successfully!');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create goal. Please try again.');
    }
}

// Delete a goal
async function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal? This will also remove all match associations.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/goals/${goalId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            loadGoals();
            alert('Goal deleted successfully!');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete goal. Please try again.');
    }
}

// Mark goal as complete
async function markGoalComplete(goalId) {
    try {
        const response = await fetch(`${API_URL}/goals/${goalId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });

        const result = await response.json();

        if (response.ok) {
            loadGoals();
            alert('Goal marked as complete!');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update goal. Please try again.');
    }
}

// Show advice modal for a goal
async function showAdvice(goalId) {
    try {
        const response = await fetch(`${API_URL}/goals/${goalId}/advice`);
        const data = await response.json();

        if (!response.ok) {
            alert('Error: ' + data.error);
            return;
        }

        const goal = data.goal;
        const analysis = data.analysis;

        // Update modal title
        document.getElementById('adviceGoalTitle').textContent = `Analysis: ${goal.title}`;

        // Build advice body HTML
        let adviceHTML = '';

        // Overview stats
        adviceHTML += '<div class="advice-section">';
        adviceHTML += '<h4>Overview</h4>';
        adviceHTML += `<div class="advice-stat">Matches Tracked: ${analysis.match_count}</div>`;
        adviceHTML += `<div class="advice-stat">Matches with Notes: ${analysis.notes_with_content}</div>`;
        if (analysis.days_until_deadline !== null) {
            const daysText = analysis.days_until_deadline < 0
                ? `${Math.abs(analysis.days_until_deadline)} days overdue`
                : `${analysis.days_until_deadline} days remaining`;
            adviceHTML += `<div class="advice-stat">Timeline: ${daysText}</div>`;
        }
        adviceHTML += '</div>';

        // Patterns detected
        if (analysis.patterns.techniques_mentioned.length > 0) {
            adviceHTML += '<div class="advice-section">';
            adviceHTML += '<h4>Techniques Mentioned</h4>';
            adviceHTML += '<ul>';
            analysis.patterns.techniques_mentioned.forEach(technique => {
                adviceHTML += `<li>${technique}</li>`;
            });
            adviceHTML += '</ul>';
            adviceHTML += '</div>';
        }

        // Sentiment analysis
        adviceHTML += '<div class="advice-section">';
        adviceHTML += '<h4>Progress Indicators</h4>';
        adviceHTML += `<div class="advice-stat">Positive notes: ${analysis.patterns.positive_indicators}</div>`;
        adviceHTML += `<div class="advice-stat">Challenges noted: ${analysis.patterns.struggle_indicators}</div>`;
        adviceHTML += '</div>';

        // Suggestions
        if (analysis.suggestions.length > 0) {
            adviceHTML += '<div class="advice-section">';
            adviceHTML += '<h4>Personalized Suggestions</h4>';
            analysis.suggestions.forEach(suggestion => {
                adviceHTML += `<div class="advice-suggestion">${suggestion}</div>`;
            });
            adviceHTML += '</div>';
        }

        // Set modal content
        document.getElementById('adviceBody').innerHTML = adviceHTML;

        // Show modal
        document.getElementById('adviceModal').style.display = 'flex';
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load advice. Please try again.');
    }
}

// Close advice modal
function closeAdviceModal() {
    document.getElementById('adviceModal').style.display = 'none';
}

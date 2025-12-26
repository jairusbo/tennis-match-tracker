// API base URL
const API_URL = '/api';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();

    // Load initial data
    loadMatches();
    loadStats();

    // Set up form submission
    document.getElementById('matchForm').addEventListener('submit', handleFormSubmit);
});

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        date: document.getElementById('date').value,
        opponent: document.getElementById('opponent').value,
        your_score: parseInt(document.getElementById('yourScore').value),
        opponent_score: parseInt(document.getElementById('opponentScore').value),
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

        if (response.ok) {
            // Reset form
            document.getElementById('matchForm').reset();
            document.getElementById('date').valueAsDate = new Date();

            // Reload data
            loadMatches();
            loadStats();

            // Show success message
            alert('Match added successfully!');
        } else {
            const error = await response.json();
            alert('Error adding match: ' + error.error);
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
    const isWin = match.your_score > match.opponent_score;
    const resultClass = isWin ? 'win' : 'loss';
    const resultText = isWin ? 'WIN' : 'LOSS';
    const score = `${match.your_score} - ${match.opponent_score}`;

    return `
        <div class="match-card ${resultClass}">
            <button class="delete-btn" data-match-id="${match.id}">Delete</button>
            <div class="match-header">
                <div class="match-result ${resultClass}">${resultText}</div>
                <div class="match-date">${formatDate(match.date)}</div>
            </div>
            <div class="match-details">
                <div class="match-detail"><strong>Opponent:</strong> ${match.opponent}</div>
                <div class="match-detail"><strong>Score:</strong> ${score}</div>
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

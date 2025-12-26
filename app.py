from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import re

app = Flask(__name__)
CORS(app)

DATABASE = 'tennis_matches.db'

def get_db():
    """Connect to the SQLite database"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def parse_tennis_score(set_scores_str):
    """
    Parse tennis set scores and validate them.
    Format: "6-4, 6-3" or "6-4 6-3" or "6-4,6-3"
    Returns: (your_sets_won, opponent_sets_won, is_valid, error_message)
    """
    # Clean up the input
    set_scores_str = set_scores_str.strip().replace(',', ' ')
    sets = [s.strip() for s in set_scores_str.split() if s.strip()]

    if not sets:
        return (0, 0, False, "No sets provided")

    your_sets = 0
    opp_sets = 0

    for set_score in sets:
        # Validate format (e.g., "6-4")
        match = re.match(r'^(\d+)-(\d+)$', set_score)
        if not match:
            return (0, 0, False, f"Invalid set format: {set_score}")

        your_games = int(match.group(1))
        opp_games = int(match.group(2))

        # Validate tennis scoring rules
        if not is_valid_set_score(your_games, opp_games):
            return (0, 0, False, f"Invalid tennis score: {set_score}")

        # Determine set winner
        if your_games > opp_games:
            your_sets += 1
        else:
            opp_sets += 1

    return (your_sets, opp_sets, True, "")

def is_valid_set_score(score1, score2):
    """
    Validate if a set score is valid according to tennis rules.
    Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
    (and their reverses for opponent wins)
    """
    valid_scores = [
        (6, 0), (6, 1), (6, 2), (6, 3), (6, 4),
        (7, 5), (7, 6),
        (0, 6), (1, 6), (2, 6), (3, 6), (4, 6),
        (5, 7), (6, 7)
    ]
    return (score1, score2) in valid_scores

def init_db():
    """Initialize the database with the matches table"""
    with app.app_context():
        db = get_db()

        # Check if we need to migrate old schema
        cursor = db.execute("PRAGMA table_info(matches)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'set_scores' not in columns:
            # Drop old table and create new one
            db.execute('DROP TABLE IF EXISTS matches')

        db.execute('''
            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                opponent TEXT NOT NULL,
                set_scores TEXT NOT NULL,
                tiebreak_scores TEXT,
                your_sets_won INTEGER NOT NULL,
                opponent_sets_won INTEGER NOT NULL,
                surface TEXT NOT NULL,
                match_type TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
        db.close()

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get all matches"""
    try:
        db = get_db()
        matches = db.execute('SELECT * FROM matches ORDER BY date DESC').fetchall()
        db.close()

        return jsonify([dict(match) for match in matches])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches', methods=['POST'])
def add_match():
    """Add a new match"""
    try:
        data = request.json

        # Validate required fields
        required_fields = ['date', 'opponent', 'set_scores', 'surface', 'match_type']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Parse and validate tennis score
        your_sets, opp_sets, is_valid, error_msg = parse_tennis_score(data['set_scores'])

        if not is_valid:
            return jsonify({'error': error_msg}), 400

        db = get_db()
        db.execute('''
            INSERT INTO matches (date, opponent, set_scores, tiebreak_scores, your_sets_won, opponent_sets_won, surface, match_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['date'],
            data['opponent'],
            data['set_scores'],
            data.get('tiebreak_scores', ''),
            your_sets,
            opp_sets,
            data['surface'],
            data['match_type'],
            data.get('notes', '')
        ))
        db.commit()
        match_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        db.close()

        return jsonify({'id': match_id, 'message': 'Match added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches/<int:match_id>', methods=['DELETE'])
def delete_match(match_id):
    """Delete a match"""
    try:
        db = get_db()
        db.execute('DELETE FROM matches WHERE id = ?', (match_id,))
        db.commit()
        db.close()

        return jsonify({'message': 'Match deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get match statistics"""
    try:
        db = get_db()

        # Total matches
        total_matches = db.execute('SELECT COUNT(*) as count FROM matches').fetchone()['count']

        # Wins and losses
        wins = db.execute('SELECT COUNT(*) as count FROM matches WHERE your_sets_won > opponent_sets_won').fetchone()['count']
        losses = db.execute('SELECT COUNT(*) as count FROM matches WHERE your_sets_won < opponent_sets_won').fetchone()['count']

        # Win percentage
        win_percentage = (wins / total_matches * 100) if total_matches > 0 else 0

        # Stats by surface
        surface_stats = db.execute('''
            SELECT
                surface,
                COUNT(*) as total,
                SUM(CASE WHEN your_sets_won > opponent_sets_won THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN your_sets_won < opponent_sets_won THEN 1 ELSE 0 END) as losses
            FROM matches
            GROUP BY surface
        ''').fetchall()

        # Recent form (last 10 matches)
        recent_matches = db.execute('''
            SELECT
                CASE WHEN your_sets_won > opponent_sets_won THEN 'W' ELSE 'L' END as result
            FROM matches
            ORDER BY date DESC
            LIMIT 10
        ''').fetchall()

        db.close()

        return jsonify({
            'total_matches': total_matches,
            'wins': wins,
            'losses': losses,
            'win_percentage': round(win_percentage, 1),
            'surface_stats': [dict(row) for row in surface_stats],
            'recent_form': [row['result'] for row in recent_matches]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("🎾 Tennis Match Tracker is running!")
    print("📊 Open http://localhost:8080 in your browser")
    app.run(debug=True, port=8080)

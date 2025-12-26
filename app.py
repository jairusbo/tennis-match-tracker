from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'tennis_matches.db'

def get_db():
    """Connect to the SQLite database"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with the matches table"""
    with app.app_context():
        db = get_db()
        db.execute('''
            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                opponent TEXT NOT NULL,
                your_score INTEGER NOT NULL,
                opponent_score INTEGER NOT NULL,
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
        required_fields = ['date', 'opponent', 'your_score', 'opponent_score', 'surface', 'match_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        db = get_db()
        db.execute('''
            INSERT INTO matches (date, opponent, your_score, opponent_score, surface, match_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['date'],
            data['opponent'],
            data['your_score'],
            data['opponent_score'],
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
        wins = db.execute('SELECT COUNT(*) as count FROM matches WHERE your_score > opponent_score').fetchone()['count']
        losses = db.execute('SELECT COUNT(*) as count FROM matches WHERE your_score < opponent_score').fetchone()['count']

        # Win percentage
        win_percentage = (wins / total_matches * 100) if total_matches > 0 else 0

        # Stats by surface
        surface_stats = db.execute('''
            SELECT
                surface,
                COUNT(*) as total,
                SUM(CASE WHEN your_score > opponent_score THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN your_score < opponent_score THEN 1 ELSE 0 END) as losses
            FROM matches
            GROUP BY surface
        ''').fetchall()

        # Recent form (last 10 matches)
        recent_matches = db.execute('''
            SELECT
                CASE WHEN your_score > opponent_score THEN 'W' ELSE 'L' END as result
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
    print("📊 Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)

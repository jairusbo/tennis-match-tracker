# Tennis Match Tracker

A full-stack web application to track tennis matches, monitor performance statistics, set training goals, and receive AI-powered advice to improve your game.

## Features

### Match Tracking
- Log match results with detailed information (opponent, set scores, tiebreaks, surface, match type, notes)
- Support for all court surfaces (Hard Court, Clay, Grass, Carpet)
- Multiple match types (Practice, Tournament, League, Friendly)
- Tennis score validation following official rules
- Match history with delete functionality

### Statistics Dashboard
- Overall win/loss record and win percentage
- Recent form visualization (last 10 matches)
- Surface-specific performance breakdown
- Identify strengths and weaknesses by court type

### Goals & Milestones
- Create training goals with target completion dates
- Track progress with status updates (active/completed)
- Automatic goal-match linking based on keywords in notes
- Deadline tracking with visual indicators

### AI-Powered Advice
- Analyzes match notes related to your goals
- Extracts tennis techniques and sentiment from your notes
- Generates personalized training suggestions
- Provides feedback based on your progress patterns

## Tech Stack

- **Backend:** Python 3, Flask, SQLite
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Database:** SQLite with 3 tables (matches, goals, goal_matches)

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jairusbo/tennis-match-tracker.git
   cd tennis-match-tracker
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python3 app.py
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

## Project Structure

```
tennis-match-tracker/
├── app.py                 # Flask backend with API endpoints
├── pattern_matcher.py     # Goal pattern matching and advice generation
├── requirements.txt       # Python dependencies
├── tennis_matches.db      # SQLite database (auto-generated)
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── style.css      # Application styling
    └── js/
        └── app.js         # Frontend JavaScript logic
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | Get all matches |
| POST | `/api/matches` | Add a new match |
| DELETE | `/api/matches/<id>` | Delete a match |
| GET | `/api/stats` | Get performance statistics |
| GET | `/api/goals` | Get all goals |
| POST | `/api/goals` | Create a new goal |
| GET | `/api/goals/<id>` | Get goal with related matches |
| PUT | `/api/goals/<id>` | Update goal status |
| DELETE | `/api/goals/<id>` | Delete a goal |
| GET | `/api/goals/<id>/advice` | Get AI-powered advice for a goal |

## Usage

1. **Log a Match** - Fill out the match form with opponent, scores, surface, and notes
2. **View Stats** - Check your dashboard for win percentage and surface performance
3. **Set Goals** - Create training goals with deadlines to track your improvement
4. **Get Advice** - Click on a goal to receive personalized training suggestions based on your match history

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue.

## License

This project is open source and available under the [MIT License](LICENSE).

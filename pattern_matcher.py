"""
Pattern matching and advice generation for tennis goals
"""
import re
from datetime import datetime

# Common words to exclude from keyword matching
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'be', 'been', 'are',
    'am', 'will', 'would', 'should', 'could', 'have', 'has', 'had', 'do',
    'does', 'did', 'can', 'may', 'might', 'must', 'shall', 'i', 'my', 'me'
}

# Tennis technique keywords
TECHNIQUE_KEYWORDS = {
    'serve', 'volley', 'forehand', 'backhand', 'net', 'baseline', 'drop shot',
    'lob', 'overhead', 'smash', 'slice', 'topspin', 'approach', 'return',
    'rally', 'groundstroke', 'footwork', 'movement', 'positioning'
}

# Positive sentiment keywords
POSITIVE_KEYWORDS = {
    'improved', 'better', 'good', 'great', 'excellent', 'strong', 'solid',
    'confident', 'focused', 'consistent', 'winning', 'dominated', 'controlled'
}

# Struggle/negative sentiment keywords
STRUGGLE_KEYWORDS = {
    'struggled', 'difficult', 'hard', 'missed', 'lost', 'weak', 'poor',
    'inconsistent', 'frustrated', 'tired', 'off', 'rusty', 'shaky'
}


def normalize_text(text):
    """Normalize text for matching (lowercase, strip whitespace)"""
    if not text:
        return ""
    return text.lower().strip()


def extract_keywords(text):
    """
    Extract meaningful keywords from goal text
    Returns set of normalized keywords
    """
    if not text:
        return set()

    # Normalize and remove punctuation
    normalized = normalize_text(text)
    normalized = re.sub(r'[^\w\s]', ' ', normalized)

    # Split into words
    words = normalized.split()

    # Filter out stop words and short words
    keywords = {
        word for word in words
        if len(word) > 2 and word not in STOP_WORDS
    }

    return keywords


def matches_goal(note_text, goal_keywords):
    """
    Check if note text matches any goal keywords
    Returns True if at least one keyword is found
    """
    if not note_text or not goal_keywords:
        return False

    note_normalized = normalize_text(note_text)

    # Check if any keyword appears in the note
    for keyword in goal_keywords:
        if keyword in note_normalized:
            return True

    return False


def extract_patterns(notes_list):
    """
    Extract patterns from a list of match notes
    Returns dict with technique, sentiment, and numerical patterns
    """
    patterns = {
        'techniques': [],
        'positive_sentiments': [],
        'struggle_sentiments': [],
        'numbers': [],
        'frequency': len(notes_list)
    }

    for note in notes_list:
        if not note:
            continue

        note_normalized = normalize_text(note)

        # Extract technique mentions
        for technique in TECHNIQUE_KEYWORDS:
            if technique in note_normalized:
                patterns['techniques'].append(technique)

        # Extract positive sentiments
        for sentiment in POSITIVE_KEYWORDS:
            if sentiment in note_normalized:
                patterns['positive_sentiments'].append(sentiment)

        # Extract struggle sentiments
        for struggle in STRUGGLE_KEYWORDS:
            if struggle in note_normalized:
                patterns['struggle_sentiments'].append(struggle)

        # Extract numbers (could be stats, scores, etc.)
        numbers = re.findall(r'\b\d+\b', note)
        patterns['numbers'].extend(numbers)

    return patterns


def generate_suggestions(goal, patterns, days_until_deadline):
    """
    Generate advice suggestions based on patterns
    Returns list of suggestion strings
    """
    suggestions = []

    # Check frequency of documentation
    if patterns['frequency'] < 2:
        suggestions.append("Consider documenting your progress more regularly to better track improvement.")

    # Analyze techniques mentioned
    if patterns['techniques']:
        # Count most common techniques
        technique_counts = {}
        for tech in patterns['techniques']:
            technique_counts[tech] = technique_counts.get(tech, 0) + 1

        most_common = max(technique_counts.items(), key=lambda x: x[1]) if technique_counts else None
        if most_common:
            suggestions.append(f"You're frequently working on {most_common[0]} - continue focusing on this area.")

    # Analyze sentiment balance
    positive_count = len(patterns['positive_sentiments'])
    struggle_count = len(patterns['struggle_sentiments'])

    if struggle_count > positive_count and struggle_count > 2:
        suggestions.append("You've noted several challenges. Consider working with a coach or breaking down the goal into smaller steps.")
    elif positive_count > struggle_count and positive_count > 2:
        suggestions.append("Great progress! Your notes show consistent improvement. Keep up the momentum.")

    # Check if any specific techniques need work
    if 'net' in patterns['techniques'] and 'volley' in patterns['techniques']:
        if any('missed' in normalize_text(s) for s in patterns['struggle_sentiments']):
            suggestions.append("Focus on volley technique at the net - consider drills specifically for net play.")

    if 'serve' in patterns['techniques']:
        suggestions.append("Serving appears to be a focus area. Track first serve percentage to measure improvement.")

    # Deadline awareness
    if days_until_deadline is not None:
        if days_until_deadline < 0:
            suggestions.append(f"Your deadline has passed. Review your progress and set a new target date if needed.")
        elif days_until_deadline < 7:
            suggestions.append(f"Only {days_until_deadline} days left! Make final push towards your goal.")
        elif days_until_deadline < 30:
            suggestions.append(f"{days_until_deadline} days remaining. Stay consistent with your training.")
        else:
            avg_per_month = patterns['frequency'] / max(1, (365 - days_until_deadline) / 30)
            if avg_per_month < 2:
                suggestions.append("Current pace is low. Increase match frequency to reach your goal.")

    # Default suggestion if no specific patterns found
    if not suggestions:
        suggestions.append("Keep tracking your matches and noting specific observations related to this goal.")

    return suggestions


def calculate_days_until(target_date_str):
    """
    Calculate days until target date
    Returns integer days (negative if past)
    """
    try:
        target = datetime.strptime(target_date_str, '%Y-%m-%d')
        today = datetime.now()
        delta = target - today
        return delta.days
    except:
        return None


def analyze_goal_progress(goal, related_matches):
    """
    Main function to analyze goal progress and generate advice

    Args:
        goal: dict with goal data (title, description, target_date)
        related_matches: list of match dicts with notes

    Returns:
        dict with analysis and suggestions
    """
    # Extract notes from matches
    notes = [match.get('notes', '') for match in related_matches if match.get('notes')]

    # Extract patterns
    patterns = extract_patterns(notes)

    # Calculate time until deadline
    days_until = calculate_days_until(goal.get('target_date'))

    # Generate suggestions
    suggestions = generate_suggestions(goal, patterns, days_until)

    return {
        'match_count': len(related_matches),
        'notes_with_content': len(notes),
        'days_until_deadline': days_until,
        'patterns': {
            'techniques_mentioned': list(set(patterns['techniques'])),
            'positive_indicators': len(patterns['positive_sentiments']),
            'struggle_indicators': len(patterns['struggle_sentiments']),
            'documentation_frequency': patterns['frequency']
        },
        'suggestions': suggestions
    }

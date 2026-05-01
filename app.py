from flask import Flask, jsonify, request
import csv
import json
from collections import defaultdict, Counter

app = Flask(__name__)

# Enable CORS manually
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Load data once at startup
CSV_PATH = r"C:\Users\Simon\Downloads\anime-dataset-2023 (1).csv"
data = []

def load_csv():
    global data
    data = []
    try:
        with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert numeric fields
                try:
                    row['score'] = float(row['Score']) if row.get('Score') else None
                    row['episodes'] = int(row['Episodes']) if row.get('Episodes') and row['Episodes'].isdigit() else None
                    row['members'] = int(row['Members']) if row.get('Members') and row['Members'].isdigit() else None
                    row['year'] = int(row['Aired'].split()[-1]) if row.get('Aired') and len(row['Aired'].split()) > 0 else None
                except:
                    pass
                
                row['name'] = row.get('Name', '')
                row['type'] = row.get('Type', '')
                row['genres'] = row.get('Genres', '')
                data.append(row)
    except Exception as e:
        print(f"Error loading CSV: {e}")

load_csv()
print(f"Loaded {len(data)} anime records")

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return dataset statistics."""
    years = [d['year'] for d in data if d.get('year')]
    scores = [d['score'] for d in data if d.get('score')]
    types = [d['type'] for d in data if d.get('type')]
    
    type_counts = Counter(types)
    
    return jsonify({
        'total_rows': len(data),
        'year_min': min(years) if years else 1960,
        'year_max': max(years) if years else 2024,
        'score_min': min(scores) if scores else 0,
        'score_max': max(scores) if scores else 10,
        'types': sorted(set(types)),
        'type_counts': dict(type_counts),
    })

@app.route('/api/data', methods=['GET'])
def get_data():
    """Return filtered anime data."""
    min_year = request.args.get('min_year', type=int)
    max_year = request.args.get('max_year', type=int)
    anime_type = request.args.get('type', default='')
    min_score = request.args.get('min_score', type=float)
    
    filtered = data.copy()
    
    if min_year and max_year:
        filtered = [d for d in filtered if d.get('year') and min_year <= d['year'] <= max_year]
    if anime_type and anime_type != 'All':
        filtered = [d for d in filtered if d.get('type') == anime_type]
    if min_score:
        filtered = [d for d in filtered if d.get('score') and d['score'] >= min_score]
    
    result = [
        {
            'name': d.get('name', ''),
            'score': d.get('score'),
            'members': d.get('members'),
            'type': d.get('type', ''),
            'episodes': d.get('episodes'),
            'year': d.get('year'),
            'genres': d.get('genres', '')
        }
        for d in filtered
    ]
    return jsonify(result)

@app.route('/api/genre-data', methods=['GET'])
def get_genre_data():
    """Return top genres."""
    anime_type = request.args.get('type', default='')
    filtered = data.copy()
    if anime_type and anime_type != 'All':
        filtered = [d for d in filtered if d.get('type') == anime_type]
    
    genre_counts = Counter()
    for d in filtered:
        if d.get('genres'):
            genres = [g.strip() for g in d['genres'].split(',')]
            genre_counts.update(genres)
    
    top_genres = dict(genre_counts.most_common(15))
    return jsonify(top_genres)

@app.route('/api/year-trend', methods=['GET'])
def get_year_trend():
    """Return anime count by year."""
    anime_type = request.args.get('type', default='')
    filtered = data.copy()
    if anime_type and anime_type != 'All':
        filtered = [d for d in filtered if d.get('type') == anime_type]
    
    year_counts = Counter()
    for d in filtered:
        if d.get('year'):
            year_counts[d['year']] += 1
    
    result = {str(k): v for k, v in sorted(year_counts.items())}
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)


#!/usr/bin/env python3
"""
Generate static JSON files from the anime CSV for D3 frontend.
Run this once to create the data files, then serve with: python -m http.server 8000
"""
import csv
import json
import os
from collections import Counter, defaultdict

# Create data directory
os.makedirs('data', exist_ok=True)

CSV_PATH = r"C:\Users\Simon\Downloads\anime-dataset-2023 (1).csv"

data = []
with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            score = float(row['Score']) if row.get('Score') else None
            episodes = int(row['Episodes']) if row.get('Episodes') and row['Episodes'].isdigit() else None
            members = int(row['Members']) if row.get('Members') and row['Members'].isdigit() else None
            year = int(row['Aired'].split()[-1]) if row.get('Aired') and row['Aired'].split()[-1].isdigit() else None
        except:
            score = episodes = members = year = None
        
        data.append({
            'name': row.get('Name', ''),
            'type': row.get('Type', ''),
            'score': score,
            'episodes': episodes,
            'members': members,
            'year': year,
            'genres': row.get('Genres', '')
        })

print(f"Loaded {len(data)} anime records")

# Generate stats
years = [d['year'] for d in data if d['year']]
scores = [d['score'] for d in data if d['score']]
types = [d['type'] for d in data if d['type']]
type_counts = Counter(types)

stats = {
    'total_rows': len(data),
    'year_min': min(years) if years else 1960,
    'year_max': max(years) if years else 2024,
    'score_min': min(scores) if scores else 0,
    'score_max': max(scores) if scores else 10,
    'types': sorted(set(types)),
    'type_counts': dict(type_counts),
}

with open('data/stats.json', 'w') as f:
    json.dump(stats, f)
print("✓ Created data/stats.json")

# Generate full dataset
with open('data/all.json', 'w') as f:
    json.dump(data, f)
print("✓ Created data/all.json")

# Generate genre data
genres_by_type = defaultdict(Counter)
for d in data:
    if d['genres']:
        gs = [g.strip() for g in d['genres'].split(',')]
        for t in set([d['type']] + ['all']):
            genres_by_type[t].update(gs)

for type_name, counts in genres_by_type.items():
    top_genres = dict(counts.most_common(15))
    with open(f'data/genres_{type_name}.json', 'w') as f:
        json.dump(top_genres, f)
print(f"✓ Created data/genres_*.json files")

# Generate year trends
trends_by_type = defaultdict(Counter)
for d in data:
    if d['year']:
        trends_by_type['all'][d['year']] += 1
        trends_by_type[d['type']][d['year']] += 1

for type_name, counts in trends_by_type.items():
    trend = {str(k): v for k, v in sorted(counts.items())}
    with open(f'data/trend_{type_name}.json', 'w') as f:
        json.dump(trend, f)
print(f"✓ Created data/trend_*.json files")

print("\n✓ All data files generated successfully!")
print("Now run: python -m http.server 8000")
print("Then open: http://localhost:8000")

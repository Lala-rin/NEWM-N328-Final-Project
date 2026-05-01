# Anime Dataset D3 Interactive Dashboard

A standalone D3.js interactive visualization dashboard for exploring 24,905+ anime titles. This version uses pre-generated static JSON files and does not require Flask or Streamlit.

## Project Structure

```
anime-d3-viz/
├── generate_data.py    # One-time JSON generator from the CSV
├── data/               # Generated JSON files used by the dashboard
├── index.html          # D3 frontend
├── script.js           # D3 chart logic
├── style.css           # Styling
├── requirements.txt    # Not required for the static D3 dashboard
└── README.md           # This file
```

## Features

- **Scatter Plot**: Score vs Popularity (Members count, log scale)
- **Type Bar Chart**: Anime count by type (TV, Movie, OVA, etc.)
- **Year Trend Line**: Anime releases over time
- **Top Genres**: Horizontal bar chart of most common genres
- **Interactive Filters**: Year range, anime type, minimum score
- **Data Table**: First 100 filtered results
- **Live Updates**: Charts update instantly on filter change

## Prerequisites

- Python 3.8+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- CSV file: `C:\Users\Simon\Downloads\anime-dataset-2023 (1).csv`

You do not need Flask, pandas, or Streamlit for the D3 dashboard.

## Setup

### 1. Generate the JSON data files

```bash
cd C:\Users\Simon\Downloads\anime-d3-viz
python generate_data.py
```

This creates the `data/` folder with `stats.json`, `all.json`, `genres_*.json`, and `trend_*.json`.

### 2. Open Frontend in Browser

```bash
python -m http.server 8000 --directory C:\Users\Simon\Downloads\anime-d3-viz
```

Then navigate to: `http://localhost:8000`

## Data Files

- **data/stats.json** - Dataset statistics for the sidebar controls
- **data/all.json** - Full anime dataset used for client-side filtering
- **data/genres_*.json** - Top genres by anime type
- **data/trend_*.json** - Year counts by anime type

## Usage

1. **Adjust Filters** in the left sidebar:
   - Year range slider
   - Type dropdown
   - Minimum score slider

2. **Click "Update Visualization"** to apply filters

3. **Hover over chart elements** for detailed tooltips

4. **View filtered results** in the data table at the bottom

## Backup

The Streamlit version is kept separately at:

- `C:\Users\Simon\Downloads\Inter.Visual.py`
- `C:\Users\Simon\Downloads\Inter.Visual.py.backup`

That file is a backup reference, not part of this D3 project.

## Troubleshooting

### Blank Charts
If the charts look empty, make sure `python generate_data.py` has been run and that `data/` exists inside this folder.

### File Loading Issues
If the browser cannot load the JSON files, start the folder with `python -m http.server 8000 --directory C:\Users\Simon\Downloads\anime-d3-viz` and open `http://localhost:8000`.

### Legacy Files
`app.py` is an old Flask prototype and is not needed for the standalone D3 dashboard.

## Dataset Info

- **Total Rows**: 24,905 anime titles
- **Columns**: anime_id, name, score, episodes, members, type, year, genres, etc.
- **File**: `C:\Users\Simon\Downloads\anime-dataset-2023 (1).csv`

## Future Enhancements

- Search bar to filter by anime name
- Year range histogram
- Genre co-occurrence matrix
- Export filtered data to CSV
- Responsive mobile layout
- Animation transitions between filter changes

---

Created for interactive data visualization assignment.

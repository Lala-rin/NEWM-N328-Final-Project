// Global state
let allData = [];
let filteredData = [];


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    updateVisualizations();
    
    document.getElementById('updateBtn').addEventListener('click', updateVisualizations);
});


// Load dataset statistics
async function loadStats() {
    try {
        const response = await fetch('stats.json');
        const stats = await response.json();
        
        document.getElementById('totalRows').textContent = stats.total_rows.toLocaleString();
        document.getElementById('yearMin').min = stats.year_min;
        document.getElementById('yearMin').value = stats.year_min;
        document.getElementById('yearMax').min = stats.year_min;
        document.getElementById('yearMax').max = stats.year_max;
        document.getElementById('yearMax').value = stats.year_max;
        
        document.getElementById('scoreMin').max = stats.score_max;
        document.getElementById('scoreMin').value = 0;
        
        // Populate type dropdown
        const typeSelect = document.getElementById('typeFilter');
        stats.types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type + ` (${stats.type_counts[type] || 0})`;
            typeSelect.appendChild(option);
        });

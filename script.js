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
        const response = await fetch('data/stats.json');
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
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update all visualizations
async function updateVisualizations() {
    const minYear = parseInt(document.getElementById('yearMin').value);
    const maxYear = parseInt(document.getElementById('yearMax').value);
    const type = document.getElementById('typeFilter').value;
    const minScore = parseFloat(document.getElementById('scoreMin').value);
    
    // Update displays
    try {
        // Load all data
        const response = await fetch('data/all.json');
        allData = await response.json();
        
        // Filter locally
        filteredData = allData.filter(d => {
            if (minYear && d.year && d.year < minYear) return false;
            if (maxYear && d.year && d.year > maxYear) return false;
            if (type && type !== 'All' && d.type !== type) return false;
            if (minScore && d.score && d.score < minScore) return false;
            return true;
        });
        
        document.getElementById('filteredRows').textContent = filteredData.length.toLocaleString();
        
        // Update visualizations
        drawScatterPlot(filteredData);
        drawTypeChart(filteredData);
        await drawTrendChart(type);
        await drawGenreChart(type);
        populateTable(filteredData);
    } catch (error) {
        console.error('Error updating visualizations:', error);
    }
}

// Scatter Plot: Score vs Members
function drawScatterPlot(data) {
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select('#scatterPlot');
    svg.selectAll('*').remove();
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xExtent = d3.extent(data.filter(d => d.members > 0), d => Math.log10(d.members + 1));
    const yExtent = d3.extent(data, d => d.score);
    
    const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 10]).range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d => `10^${d}`);
    const yAxis = d3.axisLeft(yScale);
    
    g.append('g').attr('transform', `translate(0,${height})`).call(xAxis).append('text')
        .attr('x', width / 2).attr('y', 25).attr('fill', 'black').attr('text-anchor', 'middle')
        .text('Members (log10 scale)');
    
    g.append('g').call(yAxis).append('text')
        .attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -45)
        .attr('fill', 'black').attr('text-anchor', 'middle')
        .text('Score');
    
    // Scatter points
    g.selectAll('circle').data(data.filter(d => d.members > 0 && d.score))
        .enter().append('circle')
        .attr('cx', d => xScale(Math.log10(d.members + 1)))
        .attr('cy', d => yScale(d.score))
        .attr('r', 5)
        .attr('fill', d => colorScale(d.type))
        .attr('opacity', 0.6)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 8).attr('opacity', 1);
            showTooltip(event, `${d.name}<br/>Score: ${d.score}<br/>Members: ${d.members}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('r', 5).attr('opacity', 0.6);
            hideTooltip();
        });
}

// Bar Chart: Anime Count by Type
function drawTypeChart(data) {
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const typeCounts = d3.rollup(data, v => v.length, d => d.type);
    const chartData = Array.from(typeCounts, ([type, count]) => ({ type, count }));
    
    const svg = d3.select('#typeChart');
    svg.selectAll('*').remove();
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleBand().domain(chartData.map(d => d.type)).range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).range([height, 0]);
    
    // Bars
    g.selectAll('rect').data(chartData).enter().append('rect')
        .attr('x', d => xScale(d.type))
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.count))
        .attr('fill', '#3498db')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `${d.type}<br/>${d.count}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.7);
            hideTooltip();
        });
    
    // Axes
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale))
        .selectAll('text').attr('transform', 'rotate(-45)').attr('text-anchor', 'end');
    g.append('g').call(d3.axisLeft(yScale));
}

// Line Chart: Anime by Year
async function drawTrendChart(type) {
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    try {
        const response = await fetch(`data/trend_${type || 'all'}.json`);
        const yearData = await response.json();
        
        const chartData = Object.entries(yearData)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);
        
        const svg = d3.select('#trendChart');
        svg.selectAll('*').remove();
        
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        
        const xScale = d3.scaleLinear().domain(d3.extent(chartData, d => d.year)).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).range([height, 0]);
        
        const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.count));
        
        g.append('path').datum(chartData).attr('fill', 'none').attr('stroke', '#3498db')
            .attr('stroke-width', 2).attr('d', line);
        
        g.selectAll('circle').data(chartData).enter().append('circle')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.count))
            .attr('r', 3)
            .attr('fill', '#3498db')
            .on('mouseover', function(event, d) {
                showTooltip(event, `Year: ${d.year}<br/>Count: ${d.count}`);
            })
            .on('mouseout', hideTooltip);
        
        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
        g.append('g').call(d3.axisLeft(yScale));
    } catch (error) {
        console.error('Error loading trend data:', error);
    }
}

// Horizontal Bar Chart: Top Genres
async function drawGenreChart(type) {
    const margin = { top: 20, right: 20, bottom: 20, left: 150 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    try {
        const response = await fetch(`data/genres_${type || 'all'}.json`);
        const genreData = await response.json();
        
        const chartData = Object.entries(genreData)
            .map(([genre, count]) => ({ genre, count }))
            .slice(0, 15)
            .reverse();
        
        const svg = d3.select('#genreChart');
        svg.selectAll('*').remove();
        
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        
        const xScale = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).range([0, width]);
        const yScale = d3.scaleBand().domain(chartData.map(d => d.genre)).range([0, height]).padding(0.2);
        
        g.selectAll('rect').data(chartData).enter().append('rect')
            .attr('y', d => yScale(d.genre))
            .attr('width', d => xScale(d.count))
            .attr('height', yScale.bandwidth())
            .attr('fill', '#e74c3c')
            .attr('opacity', 0.7)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                showTooltip(event, `${d.genre}<br/>${d.count}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.7);
                hideTooltip();
            });
        
        g.append('g').call(d3.axisLeft(yScale));
        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    } catch (error) {
        console.error('Error loading genre data:', error);
    }
}

// Populate table
function populateTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.slice(0, 100).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.name}</td>
            <td>${row.type || '-'}</td>
            <td>${row.score || '-'}</td>
            <td>${row.episodes || '-'}</td>
            <td>${(row.members || 0).toLocaleString()}</td>
            <td>${row.year || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Tooltip helpers
function showTooltip(event, content) {
    let tooltip = document.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = content;
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

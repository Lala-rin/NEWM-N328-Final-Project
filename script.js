// Global state
let allData = [];
let filteredData = [];

const chartConfig = {
  scatter: { width: 520, height: 300, margin: { top: 20, right: 20, bottom: 50, left: 60 } },
  type: { width: 520, height: 300, margin: { top: 20, right: 20, bottom: 50, left: 60 } },
  trend: { width: 520, height: 300, margin: { top: 20, right: 20, bottom: 50, left: 60 } },
  genre: { width: 520, height: 300, margin: { top: 20, right: 20, bottom: 50, left: 120 } }
};

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  ['yearMin', 'yearMax', 'typeFilter', 'scoreMin'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateVisualizations);
  });
  document.getElementById('updateBtn').addEventListener('click', updateVisualizations);
});

async function initializeDashboard() {
  try {
    const [statsResponse, dataResponse] = await Promise.all([
      fetch('stats.json'),
      fetch('all.json')
    ]);

    if (!statsResponse.ok) {
      throw new Error('Failed to load stats.json');
    }
    if (!dataResponse.ok) {
      throw new Error('Failed to load all.json');
    }

    const stats = await statsResponse.json();
    allData = await dataResponse.json();
    configureFilters(stats);
    updateVisualizations();
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    document.getElementById('totalRows').textContent = '-';
    document.getElementById('filteredRows').textContent = '-';
  }
}

function configureFilters(stats) {
  document.getElementById('totalRows').textContent = stats.total_rows.toLocaleString();

  const yearMin = document.getElementById('yearMin');
  const yearMax = document.getElementById('yearMax');
  const scoreMin = document.getElementById('scoreMin');
  const typeSelect = document.getElementById('typeFilter');

  yearMin.min = stats.year_min;
  yearMin.max = stats.year_max;
  yearMin.value = stats.year_min;

  yearMax.min = stats.year_min;
  yearMax.max = stats.year_max;
  yearMax.value = stats.year_max;

  scoreMin.min = 0;
  scoreMin.max = stats.score_max;
  scoreMin.value = 0;

  typeSelect.innerHTML = '<option value="All">All</option>';
  stats.types.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type + ' (' + (stats.type_counts[type] || 0) + ')';
    typeSelect.appendChild(option);
  });
}

function updateVisualizations() {
  if (!allData.length) {
    return;
  }

  const yearMin = Number(document.getElementById('yearMin').value);
  const yearMax = Number(document.getElementById('yearMax').value);
  const selectedType = document.getElementById('typeFilter').value;
  const scoreMin = Number(document.getElementById('scoreMin').value);

  filteredData = allData.filter((item) => {
    const year = Number(item.year);
    const score = Number(item.score);
    const matchesYear = year >= yearMin && year <= yearMax;
    const matchesType = selectedType === 'All' || item.type === selectedType;
    const matchesScore = !Number.isNaN(score) && score >= scoreMin;
    return matchesYear && matchesType && matchesScore;
  });

  document.getElementById('filteredRows').textContent = filteredData.length.toLocaleString();

  drawScatterPlot(filteredData);
  drawTypeChart(filteredData);
  drawTrendChart(filteredData);
  drawGenreChart(filteredData);
  populateTable(filteredData);
}

function getSvg(svgId, configKey, containerId) {
  const svg = d3.select('#' + svgId);
  const config = chartConfig[configKey];
  const container = document.getElementById(containerId);
  const width = Math.max(container.clientWidth || config.width, 320);
  const height = config.height;
  const margin = config.margin;
  svg.attr('viewBox', '0 0 ' + width + ' ' + height).attr('preserveAspectRatio', 'xMidYMid meet');
  svg.selectAll('*').remove();
  return { svg, width, height, margin, innerWidth: width - margin.left - margin.right, innerHeight: height - margin.top - margin.bottom };
}

function drawScatterPlot(data) {
  const filtered = data.filter((item) => Number(item.members) > 0 && Number(item.score) > 0);
  const sample = filtered.slice(0, 1500);
  const chart = getSvg('scatterPlot', 'scatter', 'scatterContainer');
  const g = chart.svg.append('g').attr('transform', 'translate(' + chart.margin.left + ',' + chart.margin.top + ')');

  if (!sample.length) {
    g.append('text').attr('x', chart.innerWidth / 2).attr('y', chart.innerHeight / 2).attr('text-anchor', 'middle').text('No data available');
    return;
  }

  const x = d3.scaleLog()
    .domain([Math.max(1, d3.min(sample, (d) => Number(d.members)) || 1), d3.max(sample, (d) => Number(d.members)) || 1])
    .range([0, chart.innerWidth])
    .nice();

  const y = d3.scaleLinear()
    .domain([0, 10])
    .range([chart.innerHeight, 0]);

  g.append('g').attr('transform', 'translate(0,' + chart.innerHeight + ')').call(d3.axisBottom(x).ticks(6, '~s'));
  g.append('g').call(d3.axisLeft(y));

  g.append('text')
    .attr('x', chart.innerWidth / 2)
    .attr('y', chart.innerHeight + 40)
    .attr('text-anchor', 'middle')
    .text('Members (log scale)');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -chart.innerHeight / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Score');

  g.selectAll('circle')
    .data(sample)
    .enter()
    .append('circle')
    .attr('cx', (d) => x(Math.max(1, Number(d.members))))
    .attr('cy', (d) => y(Number(d.score)))
    .attr('r', 3)
    .attr('fill', '#ff8c42')
    .attr('opacity', 0.55);
}

function drawTypeChart(data) {
  const chart = getSvg('typeChart', 'type', 'typeContainer');
  const g = chart.svg.append('g').attr('transform', 'translate(' + chart.margin.left + ',' + chart.margin.top + ')');

  const counts = Array.from(d3.rollup(data, (values) => values.length, (d) => d.type), ([type, count]) => ({ type, count })).sort((a, b) => d3.descending(a.count, b.count));

  if (!counts.length) {
    g.append('text').attr('x', chart.innerWidth / 2).attr('y', chart.innerHeight / 2).attr('text-anchor', 'middle').text('No data available');
    return;
  }

  const x = d3.scaleBand().domain(counts.map((d) => d.type)).range([0, chart.innerWidth]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(counts, (d) => d.count) || 1]).nice().range([chart.innerHeight, 0]);

  g.append('g').attr('transform', 'translate(0,' + chart.innerHeight + ')').call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));

  g.selectAll('rect')
    .data(counts)
    .enter()
    .append('rect')
    .attr('x', (d) => x(d.type))
    .attr('y', (d) => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', (d) => chart.innerHeight - y(d.count))
    .attr('fill', '#3b82f6');
}

function drawTrendChart(data) {
  const chart = getSvg('trendChart', 'trend', 'trendContainer');
  const g = chart.svg.append('g').attr('transform', 'translate(' + chart.margin.left + ',' + chart.margin.top + ')');

  const yearlyCounts = Array.from(d3.rollup(data, (values) => values.length, (d) => Number(d.year)))
    .filter((d) => !Number.isNaN(d[0]))
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => d3.ascending(a.year, b.year));

  if (!yearlyCounts.length) {
    g.append('text').attr('x', chart.innerWidth / 2).attr('y', chart.innerHeight / 2).attr('text-anchor', 'middle').text('No data available');
    return;
  }

  const x = d3.scaleBand().domain(yearlyCounts.map((d) => d.year)).range([0, chart.innerWidth]).padding(0.1);
  const y = d3.scaleLinear().domain([0, d3.max(yearlyCounts, (d) => d.count) || 1]).nice().range([chart.innerHeight, 0]);

  g.append('g').attr('transform', 'translate(0,' + chart.innerHeight + ')').call(d3.axisBottom(x).tickValues(x.domain().filter((year, index) => index % Math.ceil(x.domain().length / 8 || 1) === 0)));
  g.append('g').call(d3.axisLeft(y));

  g.selectAll('rect')
    .data(yearlyCounts)
    .enter()
    .append('rect')
    .attr('x', (d) => x(d.year))
    .attr('y', (d) => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', (d) => chart.innerHeight - y(d.count))
    .attr('fill', '#16a34a');
}

function drawGenreChart(data) {
  const chart = getSvg('genreChart', 'genre', 'genreContainer');
  const g = chart.svg.append('g').attr('transform', 'translate(' + chart.margin.left + ',' + chart.margin.top + ')');

  const genreCounts = new Map();
  data.forEach((item) => {
    if (!item.genres) {
      return;
    }
    item.genres.split(',').map((genre) => genre.trim()).filter(Boolean).forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });
  });

  const topGenres = Array.from(genreCounts.entries()).map(([genre, count]) => ({ genre, count })).sort((a, b) => d3.descending(a.count, b.count)).slice(0, 15).reverse();

  if (!topGenres.length) {
    g.append('text').attr('x', chart.innerWidth / 2).attr('y', chart.innerHeight / 2).attr('text-anchor', 'middle').text('No data available');
    return;
  }

  const x = d3.scaleLinear().domain([0, d3.max(topGenres, (d) => d.count) || 1]).nice().range([0, chart.innerWidth]);
  const y = d3.scaleBand().domain(topGenres.map((d) => d.genre)).range([0, chart.innerHeight]).padding(0.15);

  g.append('g').call(d3.axisLeft(y));
  g.append('g').attr('transform', 'translate(0,' + chart.innerHeight + ')').call(d3.axisBottom(x).ticks(5));

  g.selectAll('rect')
    .data(topGenres)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d) => y(d.genre))
    .attr('width', (d) => x(d.count))
    .attr('height', y.bandwidth())
    .attr('fill', '#f59e0b');
}

function populateTable(data) {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';

  data.slice(0, 50).forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td>' + (item.name || '') + '</td>' +
      '<td>' + (item.type || '') + '</td>' +
      '<td>' + (item.score != null ? Number(item.score).toFixed(2) : '') + '</td>' +
      '<td>' + (item.episodes != null ? Number(item.episodes).toLocaleString() : '') + '</td>' +
      '<td>' + (item.members != null ? Number(item.members).toLocaleString() : '') + '</td>' +
      '<td>' + (item.year || '') + '</td>';
    tableBody.appendChild(row);
  });
}

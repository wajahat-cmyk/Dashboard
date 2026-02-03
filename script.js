// Configuration
const SHEET_ID = '1IGOr4USS1TXW8b2YU33uFfPRZAVC1SlPjhuuuWsYo1g';
const API_KEY = 'AIzaSyDvwVrPJ0lJ-KWyKYlAJZZw3bAzaJHYe8M'; // Using a basic API key - you should generate your own from Google Cloud Console
const RANGE = 'Bamboo Sheets!A1:AG100';

let allData = [];
let filteredData = [];
let columnOrder = [];
let visibleColumns = {};
let charts = {};
let draggedColumn = null;

const products = [
    'Bamboo Sheets',
    'Bamboo Sheets - 6PCS',
    'Satin Sheets',
    'SLEEPHORIA Cooling Sheets',
    'SLEEP SANCTUARY - Bamboo 6PCS',
    'SLEEP SANCTUARY - Satin 4PCS',
    'Satin Sheets 6 Pcs',
    'SLEEPHORIA - Cooling Comforter',
    'Silk Pillow Case',
    'SLEEPHORIA - Cooling Pillowcases',
    'Satin Fitted Sheet',
    'Hanging Closet',
    'Cooling Sheets'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    loadData();
    setupEventListeners();
});

// Load data from Google Sheets
async function loadData() {
    try {
        document.body.classList.add('loading');
        
        // Using Google Sheets API
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.values && result.values.length > 0) {
            processSheetData(result.values);
            initializeTable();
            updateMetrics();
            initializeCharts();
        }
        
        document.body.classList.remove('loading');
    } catch (error) {
        console.error('Error loading data:', error);
        document.body.classList.remove('loading');
        // Fallback: Load sample data
        loadSampleData();
    }
}

// Load sample data as fallback
function loadSampleData() {
    // Sample data structure matching your sheet
    const sampleData = [
        {
            'Week': 'Week 1',
            'Date': '28-09-2025',
            'Bamboo Sheets': 'B08KQKPKWC',
            'Price USD': 46.74,
            'Reviews': 4937,
            'Ratings': 4.5,
            'Review rate %': 0.00,
            'BSR MAIN SUB': 7077,
            'SQP Total Search Volume': 0,
            'Total Sessions': 12828,
            'Cost per Session': 0.43,
            'Units Ordered': 729,
            '$ Total Sales': 53573,
            'Total Orders': 689
        }
    ];
    
    allData = sampleData;
    filteredData = [...allData];
    updateMetrics();
}

// Process data from Google Sheets
function processSheetData(values) {
    // Headers are in row 1, skip row 2 (formulation row)
    const headers = values[0];
    
    // Initialize column order and visibility
    columnOrder = headers.map((h, i) => ({ name: h, index: i }));
    headers.forEach(header => {
        visibleColumns[header] = true;
    });
    
    // Process data rows (skip row 2 which is index 1)
    allData = [];
    for (let i = 2; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;
        
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
        });
        allData.push(rowData);
    }
    
    filteredData = [...allData];
    initializeColumnToggles();
}

// Initialize dashboard
function initializeDashboard() {
    // This will be called before data loads
}

// Initialize column toggles in sidebar
function initializeColumnToggles() {
    const toggleContainer = document.getElementById('columnToggles');
    toggleContainer.innerHTML = '';
    
    columnOrder.forEach(col => {
        if (col.name && col.name.trim()) {
            const label = document.createElement('label');
            label.className = 'column-toggle-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = visibleColumns[col.name] !== false;
            checkbox.addEventListener('change', (e) => {
                visibleColumns[col.name] = e.target.checked;
                updateTable();
            });
            
            const span = document.createElement('span');
            span.textContent = col.name;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            toggleContainer.appendChild(label);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    
    document.getElementById('productFilter').addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        filteredData = allData.filter(row => {
            return Object.values(row).some(val => 
                String(val).toLowerCase().includes(filter)
            );
        });
        updateTable();
        updateMetrics();
        updateCharts();
    });
    
    // Chart toggles
    document.getElementById('chartToggleSales').addEventListener('change', toggleChart);
    document.getElementById('chartToggleOrders').addEventListener('change', toggleChart);
    document.getElementById('chartToggleRating').addEventListener('change', toggleChart);
    document.getElementById('chartToggleCost').addEventListener('change', toggleChart);
    document.getElementById('chartToggleVelocity').addEventListener('change', toggleChart);
}

// Toggle chart visibility
function toggleChart(e) {
    const chartMap = {
        'chartToggleSales': 'chartSalesCard',
        'chartToggleOrders': 'chartOrdersCard',
        'chartToggleRating': 'chartRatingCard',
        'chartToggleCost': 'chartCostCard',
        'chartToggleVelocity': 'chartVelocityCard'
    };
    
    const cardId = chartMap[e.target.id];
    const card = document.getElementById(cardId);
    if (card) {
        card.style.display = e.target.checked ? 'block' : 'none';
    }
}

// Initialize table
function initializeTable() {
    const headerRow = document.getElementById('headerRow');
    headerRow.innerHTML = '';
    
    columnOrder.forEach((col, index) => {
        if (visibleColumns[col.name] !== false) {
            const th = document.createElement('th');
            th.textContent = col.name;
            th.draggable = true;
            th.dataset.index = index;
            
            th.addEventListener('dragstart', dragStart);
            th.addEventListener('dragover', dragOver);
            th.addEventListener('drop', drop);
            th.addEventListener('dragend', dragEnd);
            
            headerRow.appendChild(th);
        }
    });
    
    updateTable();
}

// Drag and drop handlers
function dragStart(e) {
    draggedColumn = e.target;
    e.target.classList.add('dragging');
}

function dragOver(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function drop(e) {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== e.target && e.target.tagName === 'TH') {
        const draggedIndex = parseInt(draggedColumn.dataset.index);
        const targetIndex = parseInt(e.target.dataset.index);
        
        [columnOrder[draggedIndex], columnOrder[targetIndex]] = 
        [columnOrder[targetIndex], columnOrder[draggedIndex]];
        
        initializeTable();
    }
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('th').forEach(th => th.classList.remove('drag-over'));
}

// Update table with filtered data
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const visibleCols = columnOrder.filter(col => visibleColumns[col.name] !== false);
    
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        
        visibleCols.forEach(col => {
            const td = document.createElement('td');
            let value = row[col.name] || '';
            
            // Format numbers
            if (typeof value === 'number') {
                if (col.name.includes('$') || col.name.includes('Sales') || col.name.includes('Revenue')) {
                    value = '$' + value.toFixed(2);
                } else if (col.name.includes('%')) {
                    value = value.toFixed(2) + '%';
                } else {
                    value = value.toLocaleString();
                }
            }
            
            td.textContent = value;
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

// Update metrics
function updateMetrics() {
    const totalSales = filteredData.reduce((sum, row) => {
        const val = parseFloat(row['$ Total Sales']) || 0;
        return sum + val;
    }, 0);
    
    const totalOrders = filteredData.reduce((sum, row) => {
        const val = parseFloat(row['Total Orders']) || 0;
        return sum + val;
    }, 0);
    
    const avgRating = filteredData.length > 0
        ? filteredData.reduce((sum, row) => sum + (parseFloat(row['Ratings']) || 0), 0) / filteredData.length
        : 0;
    
    const avgVelocity = filteredData.length > 0
        ? filteredData.reduce((sum, row) => sum + (parseFloat(row['Target Daily Sales Velocity']) || 0), 0) / filteredData.length
        : 0;
    
    document.getElementById('totalRevenue').textContent = '$' + totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 });
    document.getElementById('totalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('avgRating').textContent = avgRating.toFixed(2);
    document.getElementById('avgVelocity').textContent = avgVelocity.toFixed(2);
}

// Initialize charts
function initializeCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('chartSales').getContext('2d');
    charts.sales = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: filteredData.map(row => row['Week'] || ''),
            datasets: [{
                label: 'Total Sales ($)',
                data: filteredData.map(row => parseFloat(row['$ Total Sales']) || 0),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                datalabels: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Orders Chart
    const ordersCtx = document.getElementById('chartOrders').getContext('2d');
    charts.orders = new Chart(ordersCtx, {
        type: 'bar',
        data: {
            labels: filteredData.map(row => row['Week'] || ''),
            datasets: [{
                label: 'Total Orders',
                data: filteredData.map(row => parseFloat(row['Total Orders']) || 0),
                backgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Rating Chart
    const ratingCtx = document.getElementById('chartRating').getContext('2d');
    charts.rating = new Chart(ratingCtx, {
        type: 'doughnut',
        data: {
            labels: ['5 Star', '4 Star', '3 Star', '2 Star', '1 Star'],
            datasets: [{
                data: [40, 30, 20, 7, 3],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
    
    // Cost Chart
    const costCtx = document.getElementById('chartCost').getContext('2d');
    charts.cost = new Chart(costCtx, {
        type: 'line',
        data: {
            labels: filteredData.map(row => row['Week'] || ''),
            datasets: [{
                label: 'Cost per Session ($)',
                data: filteredData.map(row => parseFloat(row['Cost per Session']) || 0),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Velocity Chart
    const velocityCtx = document.getElementById('chartVelocity').getContext('2d');
    charts.velocity = new Chart(velocityCtx, {
        type: 'radar',
        data: {
            labels: filteredData.slice(0, 8).map(row => row['Week'] || ''),
            datasets: [{
                label: 'Sales Velocity',
                data: filteredData.slice(0, 8).map(row => parseFloat(row['Daily Sales Velocity']) || 0),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                pointBackgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
}

// Update charts
function updateCharts() {
    if (charts.sales) {
        charts.sales.data.labels = filteredData.map(row => row['Week'] || '');
        charts.sales.data.datasets[0].data = filteredData.map(row => parseFloat(row['$ Total Sales']) || 0);
        charts.sales.update();
    }
    
    if (charts.orders) {
        charts.orders.data.labels = filteredData.map(row => row['Week'] || '');
        charts.orders.data.datasets[0].data = filteredData.map(row => parseFloat(row['Total Orders']) || 0);
        charts.orders.update();
    }
    
    if (charts.cost) {
        charts.cost.data.labels = filteredData.map(row => row['Week'] || '');
        charts.cost.data.datasets[0].data = filteredData.map(row => parseFloat(row['Cost per Session']) || 0);
        charts.cost.update();
    }
    
    if (charts.velocity) {
        charts.velocity.data.labels = filteredData.slice(0, 8).map(row => row['Week'] || '');
        charts.velocity.data.datasets[0].data = filteredData.slice(0, 8).map(row => parseFloat(row['Daily Sales Velocity']) || 0);
        charts.velocity.update();
    }
}
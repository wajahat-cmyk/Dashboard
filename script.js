// Configuration
const SHEET_ID = '1UjPqIr7sY2Vb1Qm7tIrz6xUcBKUm8uUuT9iImOYcMzA'; // NEW SHEET ID
const SHEET_NAME = 'Bamboo Sheets'; // Which sheet tab to read from
const API_KEY = 'AIzaSyDvwVrPJ0lJ-KWyKYlAJZZw3bAzaJHYe8M'; 

let allData = [];
let filteredData = [];
let columnOrder = [];
let visibleColumns = {};
let charts = {};
let draggedColumn = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Load data from Google Sheets with CSV export method (more reliable)
async function loadData() {
    try {
        document.body.classList.add('loading');
        
        // Use CSV export which doesn't require API key
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/query?tqx=out:csv&sheet=${SHEET_NAME}`;
        const response = await fetch(url);
        const csv = await response.text();
        
        if (csv && csv.length > 0) {
            parseCSV(csv);
            initializeTable();
            updateMetrics();
            initializeCharts();
        }
        
        document.body.classList.remove('loading');
    } catch (error) {
        console.error('Error loading data:', error);
        document.body.classList.remove('loading');
        loadSampleData();
    }
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\\n').filter(line => line.trim());
    if (lines.length < 3) return; // Need header and at least 1 data row
    
    // Headers in row 1
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Initialize column order and visibility
    columnOrder = headers.map((h, i) => ({ name: h, index: i }));
    headers.forEach(header => {
        visibleColumns[header] = true;
    });
    
    // Parse data (skip row 2 which is formulation, start from row 3 or index 2)
    allData = [];
    for (let i = 2; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        if (!cells || cells.length === 0) continue;
        
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = cells[index] || '';
        });
        
        // Only add rows that have Week data
        if (rowData['Week'] && rowData['Week'].trim()) {
            allData.push(rowData);
        }
    }
    
    filteredData = [...allData];
    initializeColumnToggles();
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Load sample data as fallback
function loadSampleData() {
    console.log('Loading sample data as fallback');
    allData = [];
    filteredData = [];
    updateMetrics();
}

// Initialize column toggles in sidebar
function initializeColumnToggles() {
    const toggleContainer = document.getElementById('columnToggles');
    if (!toggleContainer) return;
    
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
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
    
    const productFilter = document.getElementById('productFilter');
    if (productFilter) {
        productFilter.addEventListener('input', (e) => {
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
    }
    
    // Chart toggles
    const chartToggles = [
        { id: 'chartToggleSales', cardId: 'chartSalesCard' },
        { id: 'chartToggleOrders', cardId: 'chartOrdersCard' },
        { id: 'chartToggleRating', cardId: 'chartRatingCard' },
        { id: 'chartToggleCost', cardId: 'chartCostCard' },
        { id: 'chartToggleVelocity', cardId: 'chartVelocityCard' }
    ];
    
    chartToggles.forEach(toggle => {
        const el = document.getElementById(toggle.id);
        if (el) {
            el.addEventListener('change', (e) => {
                const cardEl = document.getElementById(toggle.cardId);
                if (cardEl) {
                    cardEl.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
    });
}

// Initialize table
function initializeTable() {
    const headerRow = document.getElementById('headerRow');
    if (!headerRow) return;
    
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
    if (e.target.tagName === 'TH') {
        e.target.classList.add('drag-over');
    }
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
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const visibleCols = columnOrder.filter(col => visibleColumns[col.name] !== false);
    
    filteredData.slice(0, 100).forEach(row => {
        const tr = document.createElement('tr');
        
        visibleCols.forEach(col => {
            const td = document.createElement('td');
            let value = row[col.name] || '';
            
            // Format numbers
            if (!isNaN(value) && value !== '') {
                const num = parseFloat(value);
                if (col.name.includes('$') || col.name.includes('Sales') || col.name.includes('Revenue') || col.name.includes('Cost')) {
                    value = '$' + num.toFixed(2);
                } else if (col.name.includes('%')) {
                    value = num.toFixed(2) + '%';
                } else if (col.name.includes('Rating') || col.name.includes('Velocity')) {
                    value = num.toFixed(2);
                } else {
                    value = Math.round(num).toLocaleString();
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
    const totalSalesEl = document.getElementById('totalRevenue');
    const totalOrdersEl = document.getElementById('totalOrders');
    const avgRatingEl = document.getElementById('avgRating');
    const avgVelocityEl = document.getElementById('avgVelocity');
    
    if (!totalSalesEl) return;
    
    const totalSales = filteredData.reduce((sum, row) => {
        const val = parseFloat(row['$ Total Sales'] || row['Total Sales'] || 0) || 0;
        return sum + val;
    }, 0);
    
    const totalOrders = filteredData.reduce((sum, row) => {
        const val = parseFloat(row['Total Orders'] || 0) || 0;
        return sum + val;
    }, 0);
    
    const avgRating = filteredData.length > 0
        ? filteredData.reduce((sum, row) => sum + (parseFloat(row['Ratings'] || 0) || 0), 0) / filteredData.length
        : 0;
    
    const avgVelocity = filteredData.length > 0
        ? filteredData.reduce((sum, row) => sum + (parseFloat(row['Daily Sales Velocity'] || row['Target Daily Sales Velocity'] || 0) || 0), 0) / filteredData.length
        : 0;
    
    totalSalesEl.textContent = '$' + totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 });
    totalOrdersEl.textContent = totalOrders.toLocaleString('en-US', { maximumFractionDigits: 0 });
    avgRatingEl.textContent = avgRating.toFixed(2);
    avgVelocityEl.textContent = avgVelocity.toFixed(2);
}

// Initialize charts
function initializeCharts() {
    // Prepare data for charts
    const weeks = filteredData.map(row => row['Week'] || '');
    const sales = filteredData.map(row => parseFloat(row['$ Total Sales'] || row['Total Sales'] || 0) || 0);
    const orders = filteredData.map(row => parseFloat(row['Total Orders'] || 0) || 0);
    const costs = filteredData.map(row => parseFloat(row['Cost per Session'] || 0) || 0);
    const velocities = filteredData.map(row => parseFloat(row['Daily Sales Velocity'] || row['Target Daily Sales Velocity'] || 0) || 0);
    const ratings = filteredData.map(row => parseFloat(row['Ratings'] || 0) || 0);
    
    // Sales Chart
    const salesCtx = document.getElementById('chartSales');
    if (salesCtx && !charts.sales) {
        charts.sales = new Chart(salesCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Total Sales ($)',
                    data: sales,
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
    } else if (charts.sales) {
        charts.sales.data.labels = weeks;
        charts.sales.data.datasets[0].data = sales;
        charts.sales.update();
    }
    
    // Orders Chart
    const ordersCtx = document.getElementById('chartOrders');
    if (ordersCtx && !charts.orders) {
        charts.orders = new Chart(ordersCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Total Orders',
                    data: orders,
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
    } else if (charts.orders) {
        charts.orders.data.labels = weeks;
        charts.orders.data.datasets[0].data = orders;
        charts.orders.update();
    }
    
    // Rating Chart
    const ratingCtx = document.getElementById('chartRating');
    if (ratingCtx && !charts.rating) {
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0;
        charts.rating = new Chart(ratingCtx.getContext('2d'), {
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
    }
    
    // Cost Chart
    const costCtx = document.getElementById('chartCost');
    if (costCtx && !charts.cost) {
        charts.cost = new Chart(costCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Cost per Session ($)',
                    data: costs,
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
    } else if (charts.cost) {
        charts.cost.data.labels = weeks;
        charts.cost.data.datasets[0].data = costs;
        charts.cost.update();
    }
    
    // Velocity Chart
    const velocityCtx = document.getElementById('chartVelocity');
    if (velocityCtx && !charts.velocity) {
        charts.velocity = new Chart(velocityCtx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: weeks.slice(0, 8),
                datasets: [{
                    label: 'Sales Velocity',
                    data: velocities.slice(0, 8),
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
    } else if (charts.velocity) {
        charts.velocity.data.labels = weeks.slice(0, 8);
        charts.velocity.data.datasets[0].data = velocities.slice(0, 8);
        charts.velocity.update();
    }
}

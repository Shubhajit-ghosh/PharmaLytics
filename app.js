const apiBase = window.location.port === '8080' ? '' : 'http://127.0.0.1:8080';

// Dynamic Chart Theme Resolvers
function resolveChartDefaults() {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.05)';
    const bgSecondary = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#ffffff';
    const textPrimary = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#0f172a';
    
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = bgSecondary;
    Chart.defaults.plugins.tooltip.titleColor = textPrimary;
    Chart.defaults.plugins.tooltip.bodyColor = textPrimary;
    Chart.defaults.plugins.tooltip.borderColor = gridColor;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

Object.defineProperty(window, 'gridOptions', {
    get: function() {
        return {
            color: getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.05)',
            tickColor: 'transparent'
        };
    }
});

// Helper function to format big numbers to readable text
function formatCurrency(value) {
    if (value >= 1.0e9) {
        return '$' + (value / 1.0e9).toFixed(2) + 'B';
    } else if (value >= 1.0e6) {
        return '$' + (value / 1.0e6).toFixed(2) + 'M';
    } else if (value >= 1.0e3) {
        return '$' + (value / 1.0e3).toFixed(2) + 'K';
    }
    return '$' + value.toFixed(2);
}

// Global chart references to prevent duplication errors on tab switching
window.charts = {};

// Safe fetch helper with HTTP status code validation and error handling
async function safeFetch(url) {
    const apiBase = window.location.port === '8080' ? '' : 'http://127.0.0.1:8080';
    const targetUrl = url.startsWith('/api') ? (apiBase + url) : url;
    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Call failed for ${targetUrl}:`, error);
        throw error;
    }
}

// Get filter query string based on country, year, rep, and drug dropdowns
function getFilterParams() {
    const country = document.getElementById('filter-country').value;
    const year = document.getElementById('filter-year').value;
    const rep = document.getElementById('filter-rep').value;
    const drug = document.getElementById('filter-drug').value;
    let params = `?country=${encodeURIComponent(country)}&year=${encodeURIComponent(year)}&rep=${encodeURIComponent(rep)}&drug=${encodeURIComponent(drug)}`;
    
    const userRole = sessionStorage.getItem('userRole');
    if (userRole === 'manager') {
        const managerName = sessionStorage.getItem('managerName') || 'Alisha Cordwell';
        params += `&manager=${encodeURIComponent(managerName)}`;
    }
    return params;
}

// ==========================================
// 1. Settings Controller (Theme & Font Size)
// ==========================================
function updateToggleBtnUI(theme) {
    const pill = document.getElementById('theme-capsule-pill');
    const lightLabel = document.getElementById('theme-label-light');
    const darkLabel = document.getElementById('theme-label-dark');
    
    if (pill && lightLabel && darkLabel) {
        if (theme === 'dark') {
            pill.style.transform = 'translateX(calc(100% + 4px))';
            darkLabel.style.color = '#ffffff';
            lightLabel.style.color = 'var(--text-secondary)';
        } else {
            pill.style.transform = 'translateX(0)';
            lightLabel.style.color = '#ffffff';
            darkLabel.style.color = 'var(--text-secondary)';
        }
    }
}

function initSettings() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const currentFontSize = localStorage.getItem('font-size') || 'md';

    // Apply settings to body & HTML
    document.body.setAttribute('data-theme', currentTheme);
    document.documentElement.className = `font-${currentFontSize}`;
    updateToggleBtnUI(currentTheme);

    // Sidebar Capsule Theme Toggle
    const toggleBtn = document.getElementById('theme-capsule-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const theme = document.body.getAttribute('data-theme') || 'light';
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            updateToggleBtnUI(newTheme);
            resolveChartDefaults();
            refreshChartTheme();
        });
    }

    const fontBtns = {
        sm: document.getElementById('font-sm-btn'),
        md: document.getElementById('font-md-btn'),
        lg: document.getElementById('font-lg-btn')
    };

    Object.keys(fontBtns).forEach(size => {
        const btn = fontBtns[size];
        if (btn) {
            if (size === currentFontSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', () => {
                document.documentElement.className = `font-${size}`;
                localStorage.setItem('font-size', size);
                Object.values(fontBtns).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        }
    });
}

function getChartColor(varName) {
    return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

function applyThemeToChart(chart) {
    const textColor = getChartColor('--text-secondary') || '#94a3b8';
    const gridColor = getChartColor('--border-color') || 'rgba(0,0,0,0.05)';
    
    if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(scaleKey => {
            const scale = chart.options.scales[scaleKey];
            if (scale) {
                if (!scale.ticks) scale.ticks = {};
                scale.ticks.color = textColor;
                if (!scale.grid) scale.grid = {};
                scale.grid.color = gridColor;
            }
        });
    }
    if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = textColor;
    }
}

function refreshChartTheme() {
    const textColor = getChartColor('--text-secondary') || '#94a3b8';
    Chart.defaults.color = textColor;
    
    Object.keys(window.charts).forEach(key => {
        const chart = window.charts[key];
        if (chart) {
            applyThemeToChart(chart);
            chart.update();
        }
    });
}

// ==========================================
// 2. SPA Navigation, Filters & Mobile Sidebar
// ==========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pageViews = document.querySelectorAll('.page-view');
    const mainTitle = document.getElementById('main-page-title');
    const mainSubtitle = document.getElementById('main-page-subtitle');
    const sidebar = document.getElementById('app-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');

    // Sidebar Mobile Toggle
    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            const title = item.getAttribute('data-title');
            const subtitle = item.getAttribute('data-subtitle');

            // Set active state on nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch page view
            pageViews.forEach(view => {
                if (view.id === target) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });

            // Update main title & subtitle
            const subtitleText = document.getElementById('page-subtitle-text');
            if (mainTitle && mainSubtitle) {
                mainTitle.textContent = title;
                mainSubtitle.textContent = subtitle;
                if (subtitleText) subtitleText.textContent = subtitle;
            }

            // Collapse sidebar on mobile switch
            if (sidebar && overlay) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }

            // Refresh view data dynamically on page navigation
            if (target === 'view-submissions') {
                initApprovalsManagement();
            } else if (target === 'view-catalog') {
                initDrugManagement();
            } else if (target === 'view-targets') {
                initTargetsTracker();
            } else if (target === 'view-settings') {
                initCredentialsManagement();
            }

            // Load data for selected view
            reloadActivePage();
        });
    });

    // Add filter change event listeners for interactive dashboard updates
    const countryFilter = document.getElementById('filter-country');
    const yearFilter = document.getElementById('filter-year');
    const repFilter = document.getElementById('filter-rep');
    const drugFilter = document.getElementById('filter-drug');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    if (countryFilter) countryFilter.addEventListener('change', reloadActivePage);
    if (yearFilter) yearFilter.addEventListener('change', reloadActivePage);
    if (repFilter) repFilter.addEventListener('change', reloadActivePage);
    if (drugFilter) drugFilter.addEventListener('change', reloadActivePage);

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (countryFilter) countryFilter.value = 'All';
            if (yearFilter) yearFilter.value = 'All';
            if (repFilter) repFilter.value = 'All';
            if (drugFilter) drugFilter.value = 'All';
            reloadActivePage();
        });
    }
}

function reloadActivePage() {
    const activeTab = document.querySelector('.nav-item.active').getAttribute('data-target');
    if (activeTab === 'view-dashboard') {
        loadDashboardData();
    } else if (activeTab === 'view-analytics') {
        loadAnalyticsData();
    } else if (activeTab === 'view-reps') {
        loadRepsData();
    } else if (activeTab === 'view-drugs') {
        loadDrugsData();
    } else if (activeTab === 'view-submissions') {
        initApprovalsManagement();
    } else if (activeTab === 'view-catalog') {
        initDrugManagement();
    }
}

// Fetch actual and forecast trend together and stitch them
async function fetchStitchedRevenue(params) {
    const [trend, forecast] = await Promise.all([
        safeFetch('/api/revenue-trend' + params),
        safeFetch('/api/forecast' + params)
    ]);

    const labels = [...trend.labels];
    const actual = [...trend.data];
    const forecastData = Array(trend.data.length).fill(null);
    
    if (forecast.data && forecast.data.length > 0) {
        // The first element of forecast is the bridge point linking actuals with forecasted trend line
        forecastData[forecastData.length - 1] = trend.data[trend.data.length - 1];
        
        // Append the remaining forecast data points
        for (let i = 1; i < forecast.labels.length; i++) {
            labels.push(forecast.labels[i]);
            actual.push(null);
            forecastData.push(forecast.data[i]);
        }
    }
    
    return { labels, actual, forecast: forecastData };
}

// Render error messages into elements
function renderInlineError(elementId, fallbackText = "Error") {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = fallbackText;
        el.style.color = 'var(--accent-red)';
    }
}

// ==========================================
// 3. View Data Loading Functions
// ==========================================

// --- Dashboard View ---
async function loadDashboardData() {
    const params = getFilterParams();
    const role = sessionStorage.getItem('userRole') || 'admin';
    const repName = sessionStorage.getItem('repName') || 'Jimmy Grey';

    const lastUpdatedVal = document.getElementById('header-last-updated-val');
    if (lastUpdatedVal) {
        const now = new Date();
        lastUpdatedVal.textContent = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    // 1. Fetch KPIs
    try {
        const data = await safeFetch('/api/kpis' + params);
        
        if (role === 'rep') {
            // Representative Layout
            document.getElementById('kpi-card-1-title').textContent = "My Revenue";
            document.getElementById('kpi-card-1-icon-wrap').className = "icon-wrapper green";
            document.getElementById('kpi-card-1-icon').className = "ph ph-currency-dollar";
            document.getElementById('total-revenue-val').textContent = formatCurrency(data.total_revenue);
            document.getElementById('total-revenue-val').style.color = '';

            document.getElementById('kpi-card-2-title').textContent = "My Units Sold";
            document.getElementById('kpi-card-2-icon-wrap').className = "icon-wrapper blue";
            document.getElementById('kpi-card-2-icon').className = "ph ph-shopping-cart";
            document.getElementById('total-units-val').textContent = data.total_units.toLocaleString(undefined, { maximumFractionDigits: 0 });
            document.getElementById('total-units-val').style.color = '';

            // Fetch rank and target achieved dynamically for the Representative
            document.getElementById('kpi-card-3-title').textContent = "My Rank";
            document.getElementById('kpi-card-3-icon-wrap').className = "icon-wrapper purple";
            document.getElementById('kpi-card-3-icon').className = "ph ph-crown";
            
            try {
                const repPerf = await safeFetch('/api/rep-performance');
                const sorted = repPerf.sort((a, b) => b.sales - a.sales);
                const rankIdx = sorted.findIndex(r => r.name.toLowerCase() === repName.toLowerCase());
                const rank = rankIdx !== -1 ? rankIdx + 1 : 1;
                document.getElementById('kpi-card-3-val').textContent = `#${rank} of ${sorted.length}`;
            } catch (e) {
                document.getElementById('kpi-card-3-val').textContent = "#-";
            }
            document.getElementById('kpi-card-3-val').style.color = '';
            document.getElementById('kpi-card-3-trend').innerHTML = '<span>Rank based on sales</span>';

            document.getElementById('kpi-card-4-title').textContent = "Target Achieved";
            document.getElementById('kpi-card-4-icon-wrap').className = "icon-wrapper orange";
            document.getElementById('kpi-card-4-icon').className = "ph ph-target";
            
            try {
                const targetsData = await safeFetch(`/api/targets?repName=${encodeURIComponent(repName)}`);
                document.getElementById('kpi-card-4-val').textContent = `${targetsData.rep.achievement}%`;
            } catch (e) {
                document.getElementById('kpi-card-4-val').textContent = "0%";
            }
            document.getElementById('kpi-card-4-val').style.color = '';
            document.getElementById('kpi-card-4-trend').innerHTML = '<span id="top-location-sub">Sales vs Target</span>';

        } else if (role === 'manager') {
            // Manager Layout
            document.getElementById('kpi-card-1-title').textContent = "Team Revenue";
            document.getElementById('kpi-card-1-icon-wrap').className = "icon-wrapper green";
            document.getElementById('kpi-card-1-icon').className = "ph ph-currency-dollar";
            document.getElementById('total-revenue-val').textContent = formatCurrency(data.total_revenue);
            document.getElementById('total-revenue-val').style.color = '';

            document.getElementById('kpi-card-2-title').textContent = "Team Units Sold";
            document.getElementById('kpi-card-2-icon-wrap').className = "icon-wrapper blue";
            document.getElementById('kpi-card-2-icon').className = "ph ph-shopping-cart";
            document.getElementById('total-units-val').textContent = data.total_units.toLocaleString(undefined, { maximumFractionDigits: 0 });
            document.getElementById('total-units-val').style.color = '';

            document.getElementById('kpi-card-3-title').textContent = "Active Team Reps";
            document.getElementById('kpi-card-3-icon-wrap').className = "icon-wrapper purple";
            document.getElementById('kpi-card-3-icon').className = "ph ph-users-three";
            document.getElementById('kpi-card-3-val').textContent = data.active_reps;
            document.getElementById('kpi-card-3-val').style.color = '';
            document.getElementById('kpi-card-3-trend').innerHTML = '<span>Active reps under you</span>';

            document.getElementById('kpi-card-4-title').textContent = "Team Goal Progress";
            document.getElementById('kpi-card-4-icon-wrap').className = "icon-wrapper orange";
            document.getElementById('kpi-card-4-icon').className = "ph ph-target";
            
            const managerName = sessionStorage.getItem('managerName') || 'Alisha Cordwell';
            try {
                const targetsData = await safeFetch(`/api/targets?managerName=${encodeURIComponent(managerName)}`);
                document.getElementById('kpi-card-4-val').textContent = `${targetsData.manager.achievement}%`;
            } catch (e) {
                document.getElementById('kpi-card-4-val').textContent = "0%";
            }
            document.getElementById('kpi-card-4-val').style.color = '';
            document.getElementById('kpi-card-4-trend').innerHTML = '<span>Manager vs Target</span>';

        } else {
            // Admin Layout
            document.getElementById('kpi-card-1-title').textContent = "Total Revenue";
            document.getElementById('kpi-card-1-icon-wrap').className = "icon-wrapper green";
            document.getElementById('kpi-card-1-icon').className = "ph ph-currency-dollar";
            document.getElementById('total-revenue-val').textContent = formatCurrency(data.total_revenue);
            document.getElementById('total-revenue-val').style.color = '';

            document.getElementById('kpi-card-2-title').textContent = "Total Units Sold";
            document.getElementById('kpi-card-2-icon-wrap').className = "icon-wrapper blue";
            document.getElementById('kpi-card-2-icon').className = "ph ph-shopping-cart";
            document.getElementById('total-units-val').textContent = data.total_units.toLocaleString(undefined, { maximumFractionDigits: 0 });
            document.getElementById('total-units-val').style.color = '';

            document.getElementById('kpi-card-3-title').textContent = "Active Representatives";
            document.getElementById('kpi-card-3-icon-wrap').className = "icon-wrapper purple";
            document.getElementById('kpi-card-3-icon').className = "ph ph-users-three";
            document.getElementById('kpi-card-3-val').textContent = data.active_reps;
            document.getElementById('kpi-card-3-val').style.color = '';
            document.getElementById('kpi-card-3-trend').innerHTML = '<span>Sales Reps</span>';

            document.getElementById('kpi-card-4-title').textContent = "Pending Approvals";
            document.getElementById('kpi-card-4-icon-wrap').className = "icon-wrapper orange";
            document.getElementById('kpi-card-4-icon').className = "ph ph-hourglass";
            
            try {
                const pendings = await safeFetch('/api/admin/pending-approvals');
                document.getElementById('kpi-card-4-val').textContent = pendings.length;
            } catch (e) {
                document.getElementById('kpi-card-4-val').textContent = "0";
            }
            document.getElementById('kpi-card-4-val').style.color = '';
            document.getElementById('kpi-card-4-trend').innerHTML = '<span id="top-location-sub">Entries requiring review</span>';
        }
    } catch (err) {
        renderInlineError('total-revenue-val', 'Load Error');
        renderInlineError('total-units-val', 'Error');
        renderInlineError('kpi-card-3-val', 'Error');
        renderInlineError('kpi-card-4-val', 'Error');
    }

    // 2. Revenue Forecasting Chart
    try {
        const data = await fetchStitchedRevenue(params);
        const ctx = document.getElementById('revenueChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const actualColor = isDark ? '#38BDF8' : '#164E63';
        const forecastColor = isDark ? '#FB923C' : '#2F7D6D';
        const gridColor = isDark ? '#1E293B' : '#E4E7E5';
        const textColor = isDark ? '#94A3B8' : '#52606D';
        const fillBg = isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(22, 78, 99, 0.05)';

        if (window.charts.revenue) window.charts.revenue.destroy();
        window.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Actual Revenue',
                    data: data.actual,
                    borderColor: actualColor,
                    backgroundColor: fillBg,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: isDark ? '#192327' : '#FFFFFF',
                    pointBorderColor: actualColor,
                    pointBorderWidth: 1.5,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Forecast',
                    data: data.forecast,
                    borderColor: forecastColor,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: { 
                        grid: { color: gridColor },
                        border: { display: false },
                        ticks: {
                            color: textColor,
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error loading forecasting chart:", err);
    }

    // 3. Sales by Region Chart
    try {
        const data = await safeFetch('/api/region-performance' + params);
        let labels = data.labels;
        let chartData = data.data;
        if (labels.length > 4) {
            const topLabels = labels.slice(0, 4);
            const topData = chartData.slice(0, 4);
            const otherSum = chartData.slice(4).reduce((a, b) => a + b, 0);
            topLabels.push('Other');
            topData.push(otherSum);
            labels = topLabels;
            chartData = topData;
        }

        const ctx = document.getElementById('regionChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const actualColor = isDark ? '#38BDF8' : '#164E63';
        const gridColor = isDark ? '#1E293B' : '#E4E7E5';
        const textColor = isDark ? '#94A3B8' : '#52606D';

        if (window.charts.region) window.charts.region.destroy();
        window.charts.region = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Regional Sales ($)',
                    data: chartData,
                    backgroundColor: actualColor,
                    borderRadius: 4,
                    borderWidth: 0,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: function(value) { return formatCurrency(value); }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error loading regions chart:", err);
    }

    // 4. Top Performing Drugs Chart
    try {
        const data = await safeFetch('/api/top-drugs' + params);
        const ctx = document.getElementById('drugChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const actualColor = isDark ? '#2DD4BF' : '#2F7D6D';
        const gridColor = isDark ? '#1E293B' : '#E4E7E5';
        const textColor = isDark ? '#94A3B8' : '#52606D';

        if (window.charts.drug) window.charts.drug.destroy();
        window.charts.drug = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Sales ($)',
                    data: data.data,
                    backgroundColor: actualColor,
                    borderRadius: 4,
                    borderWidth: 0,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: { 
                        grid: { color: gridColor },
                        border: { display: false },
                        ticks: {
                            color: textColor,
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error loading drugs chart:", err);
    }

    // 5. Doctor-wise Prescriptions Chart
    try {
        const data = await safeFetch('/api/charts/doctors' + params);
        const ctx = document.getElementById('doctorChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const actualColor = isDark ? '#34D399' : '#2F7D5A';
        const fillBg = isDark ? 'rgba(52, 211, 153, 0.05)' : 'rgba(47, 125, 90, 0.05)';
        const gridColor = isDark ? '#1E293B' : '#E4E7E5';
        const textColor = isDark ? '#94A3B8' : '#52606D';

        if (window.charts.doctor) window.charts.doctor.destroy();
        window.charts.doctor = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Units Ordered',
                    data: data.data,
                    borderColor: actualColor,
                    backgroundColor: fillBg,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: isDark ? '#192327' : '#FFFFFF',
                    pointBorderColor: actualColor,
                    pointBorderWidth: 1.5,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: { 
                        grid: { color: gridColor },
                        border: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error loading doctors chart:", err);
    }
}

// --- Analytics View ---
async function loadAnalyticsData() {
    const params = getFilterParams();

    try {
        const data = await safeFetch('/api/kpis' + params);
        document.getElementById('analytics-revenue-val').textContent = formatCurrency(data.total_revenue);
        document.getElementById('analytics-revenue-val').style.color = '';
        
        document.getElementById('analytics-drug-val').textContent = data.top_drug;
        document.getElementById('analytics-drug-val').style.color = '';
        
        document.getElementById('analytics-region-val').textContent = data.top_region.split(',')[0]; // City only
        document.getElementById('analytics-region-val').style.color = '';
    } catch (err) {
        renderInlineError('analytics-revenue-val', 'Error');
        renderInlineError('analytics-drug-val', 'Error');
        renderInlineError('analytics-region-val', 'Error');
    }

    try {
        const data = await fetchStitchedRevenue(params);
        const ctx = document.getElementById('analyticsRevenueChart').getContext('2d');
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const actualColor = isDark ? '#38BDF8' : '#164E63';
        const forecastColor = isDark ? '#FB923C' : '#2F7D6D';
        const gridColor = isDark ? '#1E293B' : '#E4E7E5';
        const textColor = isDark ? '#94A3B8' : '#52606D';
        const fillBg = isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(22, 78, 99, 0.05)';

        if (window.charts.analyticsRevenue) window.charts.analyticsRevenue.destroy();
        window.charts.analyticsRevenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Actual Revenue',
                    data: data.actual,
                    borderColor: actualColor,
                    backgroundColor: fillBg,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: isDark ? '#192327' : '#FFFFFF',
                    pointBorderColor: actualColor,
                    pointBorderWidth: 1.5,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }, {
                    label: '3-Month Forecast',
                    data: data.forecast,
                    borderColor: forecastColor,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: { 
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error loading analytics forecasting chart:", err);
    }
}

// --- Representative Performance View ---
async function loadRepsData() {
    const params = getFilterParams();

    try {
        const data = await safeFetch('/api/rep-performance' + params);
        const tbody = document.querySelector('#reps-table tbody');
        tbody.innerHTML = '';
        data.forEach(rep => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${rep.name}</strong></td>
                    <td>${rep.manager}</td>
                    <td><span style="background: rgba(37, 99, 235, 0.08); color: #2563eb; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${rep.team}</span></td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(rep.sales)}</td>
                </tr>
            `;
        });
    } catch (err) {
        const tbody = document.querySelector('#reps-table tbody');
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-red); padding: 2rem;">Failed to load representatives. Check database connection.</td></tr>`;
    }
}

// --- Drug Insights View ---
async function loadDrugsData() {
    const params = getFilterParams();

    try {
        const data = await safeFetch('/api/drugs' + params);
        const tbody = document.querySelector('#drugs-table tbody');
        tbody.innerHTML = '';
        data.forEach(drug => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${drug.name}</strong></td>
                    <td><span style="background: rgba(13, 148, 136, 0.08); color: #0d9488; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${drug.class}</span></td>
                    <td style="text-align: right;">${drug.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(drug.sales)}</td>
                </tr>
            `;
        });
    } catch (err) {
        const tbody = document.querySelector('#drugs-table tbody');
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-red); padding: 2rem;">Failed to load drug insights. Check database connection.</td></tr>`;
    }
}

// Dynamic population of filters
async function populateFilters() {
    try {
        const userRole = sessionStorage.getItem('userRole');
        const managerName = sessionStorage.getItem('managerName');
        const repSelect = document.getElementById('filter-rep');
        
        if (repSelect) {
            if (userRole === 'manager' && managerName) {
                const reps = await safeFetch(`/api/manager/reps?managerName=${encodeURIComponent(managerName)}`);
                repSelect.innerHTML = '<option value="All">All Representatives</option>';
                reps.forEach(rep => {
                    repSelect.innerHTML += `<option value="${rep.name}">${rep.name}</option>`;
                });
            } else {
                const reps = await safeFetch('/api/rep-performance');
                repSelect.innerHTML = '<option value="All">Rep: All</option>';
                reps.forEach(rep => {
                    repSelect.innerHTML += `<option value="${rep.name}">${rep.name}</option>`;
                });
            }
        }

        const drugs = await safeFetch('/api/drugs');
        const drugSelect = document.getElementById('filter-drug');
        if (drugSelect) {
            drugSelect.innerHTML = '<option value="All">Drug: All</option>';
            drugs.forEach(drug => {
                drugSelect.innerHTML += `<option value="${drug.name}">${drug.name}</option>`;
            });
        }
    } catch (err) {
        console.error("Failed to populate filters dynamically:", err);
    }
}

function initDatabaseManagement() {
    const submitRepBtn = document.getElementById('submit-add-rep');
    const submitDrugBtn = document.getElementById('submit-add-drug');
    const apiBase = window.location.port === '8080' ? '' : 'http://127.0.0.1:8080';

    if (submitRepBtn) {
        submitRepBtn.addEventListener('click', async () => {
            const name = document.getElementById('add-rep-name').value.trim();
            const manager = document.getElementById('add-rep-manager').value.trim();
            const team = document.getElementById('add-rep-team').value.trim();
            const statusEl = document.getElementById('add-rep-status');

            if (!name || !manager || !team) {
                statusEl.textContent = "Please fill in all fields.";
                statusEl.style.color = 'var(--accent-red)';
                return;
            }

            statusEl.textContent = "Saving...";
            statusEl.style.color = 'var(--text-secondary)';

            try {
                const res = await fetch(apiBase + '/api/reps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, manager, team })
                });
                const data = await res.json();
                if (data.success) {
                    statusEl.textContent = "Representative saved successfully!";
                    statusEl.style.color = 'var(--accent-green)';
                    document.getElementById('add-rep-name').value = '';
                    document.getElementById('add-rep-manager').value = '';
                    document.getElementById('add-rep-team').value = '';
                    addSystemNotification("Representative Added", `New representative "${name}" successfully registered in SQLite.`);
                    await populateFilters(); // Refresh dropdown
                } else {
                    statusEl.textContent = data.error || "Failed to save.";
                    statusEl.style.color = 'var(--accent-red)';
                }
            } catch (err) {
                statusEl.textContent = "Network error. Failed to save.";
                statusEl.style.color = 'var(--accent-red)';
            }
        });
    }

    if (submitDrugBtn) {
        submitDrugBtn.addEventListener('click', async () => {
            const name = document.getElementById('add-drug-name').value.trim();
            const drugClass = document.getElementById('add-drug-class').value.trim();
            const statusEl = document.getElementById('add-drug-status');

            if (!name || !drugClass) {
                statusEl.textContent = "Please fill in all fields.";
                statusEl.style.color = 'var(--accent-red)';
                return;
            }

            statusEl.textContent = "Saving...";
            statusEl.style.color = 'var(--text-secondary)';

            try {
                const res = await fetch(apiBase + '/api/drugs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, class: drugClass })
                });
                const data = await res.json();
                if (data.success) {
                    statusEl.textContent = "Drug segment saved successfully!";
                    statusEl.style.color = 'var(--accent-green)';
                    document.getElementById('add-drug-name').value = '';
                    document.getElementById('add-drug-class').value = '';
                    addSystemNotification("Drug Segment Added", `New drug "${name}" (${drugClass}) successfully saved in SQLite.`);
                    await populateFilters(); // Refresh dropdown
                } else {
                    statusEl.textContent = data.error || "Failed to save.";
                    statusEl.style.color = 'var(--accent-red)';
                }
            } catch (err) {
                statusEl.textContent = "Network error. Failed to save.";
                statusEl.style.color = 'var(--accent-red)';
            }
        });
    }
}



function initChartReflowObserver() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Use high-performance ResizeObserver to trigger Chart.js redraws on width transitions
    const observer = new ResizeObserver(() => {
        if (window.charts) {
            Object.values(window.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }
    });

    observer.observe(mainContent);
}

function validatePasswordConstraints(pwd) {
    return {
        minLength: pwd.length >= 4,
        hasUpper: /[A-Z]/.test(pwd),
        hasLower: /[a-z]/.test(pwd),
        hasDigit: /[0-9]/.test(pwd),
        hasSpecial: /[^A-Za-z0-9]/.test(pwd)
    };
}

function updateRequirementUI(elementId, isMet, labelText) {
    const el = document.getElementById(elementId);
    if (el) {
        if (isMet) {
            el.style.color = '#4ade80';
            el.innerHTML = `<i class="ph ph-check-circle"></i> ${labelText}`;
        } else {
            el.style.color = '#f87171';
            el.innerHTML = `<i class="ph ph-x-circle"></i> ${labelText}`;
        }
    }
}

let selectedRepresentativeName = '';
let isFirstLoginRep = false;

async function checkSelectedRepPasswordStatus(name) {
    try {
        const res = await fetch(apiBase + `/api/reps/check-password?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.exists) {
            selectedRepresentativeName = data.mappedName;
            isFirstLoginRep = data.firstLogin;
        } else {
            selectedRepresentativeName = name;
            isFirstLoginRep = true;
        }
    } catch (e) {
        console.error("Failed to check rep password status:", e);
    }
}

function handleStandardPasswordInput() {
    const val = document.getElementById('login-password')?.value || '';
    const checks = validatePasswordConstraints(val);
    updateRequirementUI('req-length', checks.minLength, 'Minimum 4 characters');
    updateRequirementUI('req-upper', checks.hasUpper, 'Minimum 1 uppercase letter');
    updateRequirementUI('req-lower', checks.hasLower, 'Minimum 1 lowercase letter');
    updateRequirementUI('req-digit', checks.hasDigit, 'Minimum 1 digit');
    updateRequirementUI('req-special', checks.hasSpecial, 'Minimum 1 special character');
}

function initLogin() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const pwdToggle = document.getElementById('login-pwd-toggle');
    const pwdToggleIcon = document.getElementById('login-pwd-toggle-icon');
    const errorBanner = document.getElementById('login-error-banner');
    const errorText = document.getElementById('login-error-text');
    const roleSelect = document.getElementById('login-role');

    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            if (errorBanner) errorBanner.style.display = 'none';
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            isFirstLoginRep = false;
            selectedRepresentativeName = '';
            handleStandardPasswordInput();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', handleStandardPasswordInput);
    }

    if (pwdToggle && passwordInput && pwdToggleIcon) {
        pwdToggle.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                pwdToggleIcon.className = 'ph ph-eye-closed';
            } else {
                passwordInput.type = 'password';
                pwdToggleIcon.className = 'ph ph-eye';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = roleSelect ? roleSelect.value : 'admin';
            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (role === 'admin') {
                // 1. Validate Password Constraints
                const checks = validatePasswordConstraints(password);
                const isValidPwd = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasDigit && checks.hasSpecial;
                if (!isValidPwd) {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Password does not meet required security strength constraints.";
                    return;
                }

                // 2. Match Admin Credentials
                if (username === 'Shubhajit' && password === 'Shubhajit@14') {
                    errorBanner.style.display = 'none';
                    sessionStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('userRole', 'admin');
                    
                    // Show dashboard, hide login
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('main-app-container').style.display = 'flex';
                    
                    applyUserRoleViews('admin', 'Shubhajit');

                    // Reset dropdown
                    const repFilter = document.getElementById('filter-rep');
                    if (repFilter) {
                        repFilter.disabled = false;
                        repFilter.value = 'All';
                    }

                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'));
                        loadDashboardData();
                    }, 200);
                } else {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Invalid Username or Password.";
                }
            } else if (role === 'manager') {
                if (!username) {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Please enter your username.";
                    return;
                }

                try {
                    const loginRes = await fetch(apiBase + '/api/managers/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: username, password: password })
                    });
                    
                    const loginData = await loginRes.json();
                    
                    if (loginRes.status === 200 && loginData.success) {
                        completeManagerLogin(loginData.mappedName);
                    } else {
                        errorBanner.style.display = 'flex';
                        errorText.textContent = loginData.error || "Incorrect username or password.";
                    }
                } catch (err) {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Network error. Failed to verify password.";
                }
            } else {
                // Representative login
                if (!username) {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Please enter your username.";
                    return;
                }

                try {
                    const loginRes = await fetch(apiBase + '/api/reps/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: username, password: password })
                    });
                    
                    const loginData = await loginRes.json();
                    
                    if (loginRes.status === 200 && loginData.success) {
                        completeRepresentativeLogin(loginData.mappedName);
                    } else {
                        errorBanner.style.display = 'flex';
                        errorText.textContent = loginData.error || "Incorrect username or password.";
                    }
                } catch (err) {
                    errorBanner.style.display = 'flex';
                    errorText.textContent = "Network error. Failed to verify password.";
                }
            }
        });
    }
}

function completeRepresentativeLogin(repName) {
    const errorBanner = document.getElementById('login-error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
    
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userRole', 'rep');
    sessionStorage.setItem('repName', repName);

    // Hide login, show dashboard
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'flex';

    applyUserRoleViews('rep', repName);

    // Lock representative dropdown to this representative
    const repFilter = document.getElementById('filter-rep');
    if (repFilter) {
        repFilter.value = repName;
        repFilter.disabled = true; // Disable selection to prevent editing other accounts
    }

    // Force charts and statistics update for this representative
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        loadDashboardData();
    }, 200);
}

function completeManagerLogin(managerName) {
    const errorBanner = document.getElementById('login-error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
    
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userRole', 'manager');
    sessionStorage.setItem('managerName', managerName);

    // Hide login, show dashboard
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-app-container').style.display = 'flex';

    applyUserRoleViews('manager', managerName);

    // Force charts and statistics update for this manager
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        loadDashboardData();
    }, 200);
}

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const modal = document.getElementById('logout-modal');
    const cancelBtn = document.getElementById('logout-cancel-btn');
    const confirmBtn = document.getElementById('logout-confirm-btn');

    if (logoutBtn && modal) {
        logoutBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (confirmBtn && modal) {
        confirmBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('repName');
            sessionStorage.removeItem('managerName');
            modal.style.display = 'none';
            
            applyUserRoleViews('admin', 'Shubhajit');

            // Show login, hide dashboard
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('main-app-container').style.display = 'none';
            
            // Enable and reset rep dropdown
            const repFilter = document.getElementById('filter-rep');
            if (repFilter) {
                repFilter.disabled = false;
                repFilter.value = 'All';
            }

            // Reset input values
            const form = document.getElementById('login-form');
            if (form) form.reset();
            
            // Reset role input state
            const roleSelect = document.getElementById('login-role');
            if (roleSelect) {
                roleSelect.value = 'admin';
                roleSelect.dispatchEvent(new Event('change'));
            }

            // Reset checklist state
            updateRequirementUI('req-length', false, 'Minimum 4 characters');
            updateRequirementUI('req-upper', false, 'Minimum 1 uppercase letter');
            updateRequirementUI('req-lower', false, 'Minimum 1 lowercase letter');
            updateRequirementUI('req-digit', false, 'Minimum 1 digit');
            updateRequirementUI('req-special', false, 'Minimum 1 special character');
            
            const errorBanner = document.getElementById('login-error-banner');
            if (errorBanner) errorBanner.style.display = 'none';
        });
    }
}

// ==========================================
// 4. Notifications Center & PDF Export
// ==========================================
let systemNotifications = [
    { id: 1, title: "Database Connected", message: "Successfully loaded SQLite database segment tables.", time: "Just now", read: false },
    { id: 2, title: "Forecast Model Computed", message: "Linear growth timeline trends populated successfully.", time: "5 mins ago", read: false },
    { id: 3, title: "System Ready", message: "PharmaLytics interface fully initialized.", time: "1 hour ago", read: true }
];

function addSystemNotification(title, message) {
    const newNotif = {
        id: Date.now(),
        title,
        message,
        time: "Just now",
        read: false
    };
    systemNotifications.unshift(newNotif);
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notifications-list');
    const badge = document.getElementById('notification-badge');
    if (!list) return;

    list.innerHTML = '';
    
    if (systemNotifications.length === 0) {
        list.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No notifications.</div>';
        if (badge) badge.style.display = 'none';
        return;
    }

    let unreadCount = 0;
    systemNotifications.forEach(n => {
        if (!n.read) unreadCount++;
        
        let dotSymbol = '🔵';
        const titleL = n.title.toLowerCase();
        if (titleL.includes('approve') || titleL.includes('connect')) {
            dotSymbol = '🟢';
        } else if (titleL.includes('target') || titleL.includes('reject')) {
            dotSymbol = '🟡';
        }

        const card = document.createElement('div');
        card.style.padding = '0.75rem';
        card.style.borderBottom = '1px solid var(--border-color)';
        card.style.background = n.read ? 'transparent' : 'rgba(22, 78, 99, 0.03)';
        card.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem;">
                <span>${dotSymbol}</span>
                <span>${n.title}</span>
            </div>
            <div style="margin: 0.25rem 0 0.15rem 1.15rem; font-size: 0.8rem; color: var(--text-secondary);">${n.message}</div>
            <div style="font-size: 0.725rem; color: var(--text-muted); margin-left: 1.15rem;">${n.time}</div>
        `;
        list.appendChild(card);
    });

    if (badge) {
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

function initNotifications() {
    const bellBtn = document.getElementById('bell-notification-btn');
    const dropdown = document.getElementById('notifications-dropdown');
    const clearBtn = document.getElementById('clear-notifications');

    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
            // Mark all as read when opening
            if (!isOpen) {
                systemNotifications.forEach(n => n.read = true);
                renderNotifications();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== bellBtn) {
                dropdown.style.display = 'none';
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            systemNotifications = [];
            renderNotifications();
            try {
                await fetch(apiBase + '/api/admin/notifications/clear', { method: 'POST' });
            } catch (e) {
                console.error("Failed to clear backend notifications:", e);
            }
        });
    }

    renderNotifications();
}

function initExportReport() {
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const country = document.getElementById('filter-country').value;
            const year = document.getElementById('filter-year').value;
            const rep = document.getElementById('filter-rep').value;
            const drug = document.getElementById('filter-drug').value;

            const revenue = document.getElementById('total-revenue-val')?.textContent || '$0.00';
            const units = document.getElementById('total-units-val')?.textContent || '0';
            const repsCount = document.getElementById('active-reps-val')?.textContent || '0';
            const location = document.getElementById('top-location-val')?.textContent || '-';

            // Build print report structure
            const reportEl = document.createElement('div');
            reportEl.innerHTML = `
                <div style="padding: 2.5rem; font-family: 'Inter', sans-serif; color: #0f172a; background: #ffffff; min-height: 100%;">
                    <div style="border-bottom: 2px solid #2563eb; padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.03em;">PharmaLytics</h1>
                            <p style="font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0; font-weight: 500;">Executive Performance & Analytical Sales Report</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="font-size: 0.875rem; color: #64748b; margin: 0; font-weight: 500;">Date: ${new Date().toLocaleDateString()}</p>
                            <p style="font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0; font-weight: 500;">Role: ${sessionStorage.getItem('userRole') === 'admin' ? 'System Administrator' : 'Sales Representative'}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2.25rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 0.75rem;">
                        <h2 style="font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem; color: #1e293b;">Active Filter Parameters:</h2>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; font-size: 0.875rem; color: #475569;">
                            <div><strong>Country Territory:</strong> ${country}</div>
                            <div><strong>Year Indicator:</strong> ${year}</div>
                            <div><strong>Sales Representative:</strong> ${rep}</div>
                            <div><strong>Target Drug Class:</strong> ${drug}</div>
                        </div>
                    </div>
                    
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1.25rem; border-left: 4px solid #2563eb; padding-left: 0.5rem; letter-spacing: -0.02em;">Key Performance Metrics Summary</h2>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 2.5rem;">
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Total Sales Revenue</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: #1e3a8a; margin-top: 0.25rem;">${revenue}</div>
                        </div>
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Prescriptions / Quantity Sold</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: #1e3a8a; margin-top: 0.25rem;">${units}</div>
                        </div>
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Active Sales Representatives</div>
                            <div style="font-size: 1.75rem; font-weight: 800; color: #1e3a8a; margin-top: 0.25rem;">${repsCount}</div>
                        </div>
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Top Performing Location</div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #1e3a8a; margin-top: 0.25rem;">${location}</div>
                        </div>
                    </div>
                    
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; border-left: 4px solid #2563eb; padding-left: 0.5rem; letter-spacing: -0.02em;">Report Attestation</h2>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 0.75rem; font-size: 0.875rem; color: #475569; line-height: 1.6;">
                        <p style="margin: 0 0 0.75rem;">This document certifies that the above statistical summaries match the data retrieved dynamically from the active PharmaLytics SQLite transaction tables.</p>
                        <p style="margin: 0; font-weight: 500; color: #64748b;">Security Clearance: Level 3 (Admin) | PharmaLytics Internal Confidential</p>
                    </div>
                </div>
            `;
 
            const opt = {
                margin:       0.5,
                filename:     `PharmaLytics_Report_${country}_${year}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // Download PDF
            html2pdf().from(reportEl).set(opt).save();
            addSystemNotification("PDF Report Generated", `Successfully exported sales statistics PDF report for ${country} (${year}).`);
        });
    }
}

// ==========================================
// 5. Representative Operations & Role View Controllers
// ==========================================
function applyUserRoleViews(role, repName) {
    const userAvatar = document.getElementById('user-avatar-icon');
    const userProfileName = document.getElementById('user-profile-name');
    const userProfileRole = document.getElementById('user-profile-role');
    const dbCard = document.getElementById('settings-db-management-card');
    const credCard = document.getElementById('settings-credentials-card');
    const repSalesEntryCard = document.getElementById('rep-sales-entry-card');
    const repMonthlySummaryCards = document.getElementById('rep-monthly-summary-cards');
    const managerTeamCard = document.getElementById('manager-team-card');

    const mgmtTitle = document.getElementById('sidebar-mgmt-title');
    const navSubmissions = document.getElementById('nav-submissions');
    const navCatalog = document.getElementById('nav-catalog');
    const navDocument = document.getElementById('nav-document');
    const navChallenges = document.getElementById('nav-challenges');
    const navAbout = document.getElementById('nav-about');

    if (role === 'rep') {
        if (userAvatar) {
            const initials = repName ? repName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JG';
            userAvatar.textContent = initials;
        }
        if (userProfileName) userProfileName.textContent = repName || 'Jimmy Grey';
        if (userProfileRole) userProfileRole.textContent = 'Sales Representative';

        if (dbCard) dbCard.style.display = 'none';
        if (credCard) credCard.style.display = 'none';
        if (repSalesEntryCard) repSalesEntryCard.style.display = 'block';
        if (repMonthlySummaryCards) repMonthlySummaryCards.style.display = 'grid';
        if (managerTeamCard) managerTeamCard.style.display = 'none';

        if (mgmtTitle) mgmtTitle.style.display = 'none';
        if (navSubmissions) navSubmissions.style.display = 'none';
        if (navCatalog) navCatalog.style.display = 'none';
        if (navDocument) navDocument.style.display = 'none';
        if (navChallenges) navChallenges.style.display = 'none';
        if (navAbout) navAbout.style.display = 'block';

        initRepSalesEntry(repName);
        initTargetsTracker();
    } else if (role === 'manager') {
        if (userAvatar) {
            const initials = repName ? repName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AC';
            userAvatar.textContent = initials;
        }
        if (userProfileName) userProfileName.textContent = repName || 'Alisha Cordwell';
        if (userProfileRole) userProfileRole.textContent = 'District Sales Manager';

        if (dbCard) dbCard.style.display = 'none';
        if (credCard) credCard.style.display = 'none';
        if (repSalesEntryCard) repSalesEntryCard.style.display = 'none';
        if (repMonthlySummaryCards) repMonthlySummaryCards.style.display = 'none';
        if (managerTeamCard) managerTeamCard.style.display = 'block';

        if (mgmtTitle) mgmtTitle.style.display = 'none';
        if (navSubmissions) navSubmissions.style.display = 'none';
        if (navCatalog) navCatalog.style.display = 'none';
        if (navDocument) navDocument.style.display = 'none';
        if (navChallenges) navChallenges.style.display = 'none';
        if (navAbout) navAbout.style.display = 'block';

        initManagerTeamView(repName);
        initTargetsTracker();
    } else {
        if (userAvatar) userAvatar.textContent = 'SG';
        if (userProfileName) userProfileName.textContent = 'Shubhajit Ghosh';
        if (userProfileRole) userProfileRole.textContent = 'System Administrator';

        if (dbCard) dbCard.style.display = 'block';
        if (credCard) credCard.style.display = 'block';
        if (repSalesEntryCard) repSalesEntryCard.style.display = 'none';
        if (repMonthlySummaryCards) repMonthlySummaryCards.style.display = 'none';
        if (managerTeamCard) managerTeamCard.style.display = 'none';

        if (mgmtTitle) mgmtTitle.style.display = 'block';
        if (navSubmissions) navSubmissions.style.display = 'block';
        if (navCatalog) navCatalog.style.display = 'block';
        if (navDocument) navDocument.style.display = 'block';
        if (navChallenges) navChallenges.style.display = 'block';
        if (navAbout) navAbout.style.display = 'block';

        initCredentialsManagement();
        initTargetsTracker();
        initApprovalsManagement();
        initDrugManagement();
    }
}

async function initManagerTeamView(managerName) {
    const listContainer = document.getElementById('manager-team-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-secondary);">Loading team members...</span>`;
    
    try {
        const reps = await safeFetch(`/api/manager/reps?managerName=${encodeURIComponent(managerName)}`);
        listContainer.innerHTML = '';
        
        if (reps.length === 0) {
            listContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-secondary);">No representatives under your management.</span>`;
            return;
        }
        
        // Add "All Team Members" button
        const allBtn = document.createElement('button');
        allBtn.className = 'settings-btn active';
        allBtn.style.padding = '0.5rem 1rem';
        allBtn.style.fontSize = '0.85rem';
        allBtn.style.borderRadius = 'var(--border-radius-btn)';
        allBtn.textContent = 'All Team Members';
        allBtn.onclick = () => {
            listContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            
            const repFilter = document.getElementById('filter-rep');
            if (repFilter) repFilter.value = 'All';
            
            loadDashboardData();
        };
        listContainer.appendChild(allBtn);
        
        reps.forEach(rep => {
            const btn = document.createElement('button');
            btn.className = 'settings-btn';
            btn.style.padding = '0.5rem 1rem';
            btn.style.fontSize = '0.85rem';
            btn.style.borderRadius = 'var(--border-radius-btn)';
            btn.textContent = rep.name;
            btn.onclick = () => {
                listContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const repFilter = document.getElementById('filter-rep');
                if (repFilter) repFilter.value = rep.name;
                
                loadDashboardData();
            };
            listContainer.appendChild(btn);
        });
        
        // Populate the filter-rep dropdown to only show team reps
        const repFilter = document.getElementById('filter-rep');
        if (repFilter) {
            repFilter.innerHTML = '<option value="All">All Representatives</option>';
            reps.forEach(rep => {
                const opt = document.createElement('option');
                opt.value = rep.name;
                opt.textContent = rep.name;
                repFilter.appendChild(opt);
            });
            repFilter.disabled = false;
        }
        
    } catch (e) {
        console.error("Failed to load manager team members:", e);
        listContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--accent-red);">Failed to load team.</span>`;
    }
}

let drugsCache = [];
async function initRepSalesEntry(repName) {
    const dateInput = document.getElementById('sales-entry-date');
    const countrySelect = document.getElementById('sales-entry-country');
    const drugSelect = document.getElementById('sales-entry-drug');
    const unitsInput = document.getElementById('sales-entry-units');
    const estRevEl = document.getElementById('sales-entry-est-revenue');
    const unitPriceEl = document.getElementById('sales-entry-unit-price');
    const submitBtn = document.getElementById('submit-sales-entry-btn');
    const statusEl = document.getElementById('sales-entry-status');

    if (!dateInput || !drugSelect || !unitsInput) return;

    if (!dateInput.value) {
        const today = new Date().toISOString().substring(0, 10);
        dateInput.value = today;
    }

    try {
        const data = await safeFetch('/api/drugs/active');
        drugsCache = data;
        drugSelect.innerHTML = '';
        data.forEach(drug => {
            const opt = document.createElement('option');
            opt.value = drug.id || drug.name;
            opt.textContent = `${drug.name} (${drug.class})`;
            drugSelect.appendChild(opt);
        });
        updateCalculatedRevenue();
    } catch (e) {
        console.error("Failed to load drugs for sales entry:", e);
    }

    function updateCalculatedRevenue() {
        const selectedDrugId = drugSelect.value;
        const drugObj = drugsCache.find(d => d.id == selectedDrugId || d.name == selectedDrugId);
        const units = parseInt(unitsInput.value) || 0;
        
        if (drugObj) {
            const price = drugObj.avgPrice || 100.0;
            unitPriceEl.textContent = `$${price.toFixed(2)}`;
            const estRev = units * price;
            estRevEl.textContent = `$${estRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            unitPriceEl.textContent = '$0.00';
            estRevEl.textContent = '$0.00';
        }
    }

    async function updateMonthlySummary() {
        const dateVal = dateInput.value;
        if (!dateVal) return;
        
        const dateObj = new Date(dateVal);
        const year = dateObj.getFullYear();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = monthNames[dateObj.getMonth()];

        try {
            const res = await safeFetch(`/api/reps/monthly-summary?repName=${encodeURIComponent(repName)}&month=${encodeURIComponent(month)}&year=${year}`);
            
            const monthlyRevEl = document.getElementById('rep-monthly-revenue-val');
            const monthlySalesEl = document.getElementById('rep-monthly-sales-val');
            
            if (monthlyRevEl) {
                monthlyRevEl.textContent = `$${res.monthlySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            if (monthlySalesEl) {
                monthlySalesEl.textContent = res.monthlyQty.toLocaleString('en-US');
            }
        } catch (e) {
            console.error("Failed to fetch monthly summary:", e);
        }
    }

    drugSelect.removeEventListener('change', updateCalculatedRevenue);
    drugSelect.addEventListener('change', updateCalculatedRevenue);

    unitsInput.removeEventListener('input', updateCalculatedRevenue);
    unitsInput.addEventListener('input', updateCalculatedRevenue);

    dateInput.removeEventListener('change', updateMonthlySummary);
    dateInput.addEventListener('change', updateMonthlySummary);

    await updateMonthlySummary();

    if (submitBtn) {
        submitBtn.onclick = async () => {
            const dateVal = dateInput.value;
            const countryVal = countrySelect.value;
            const drugIdVal = drugSelect.value;
            const unitsVal = parseInt(unitsInput.value);

            if (!dateVal) {
                showStatus("Please select a date.", "error");
                return;
            }
            if (!unitsVal || unitsVal <= 0) {
                showStatus("Please enter a valid quantity of units sold.", "error");
                return;
            }

            submitBtn.disabled = true;
            showStatus("Saving sales entry...", "info");

            try {
                const response = await fetch(apiBase + '/api/sales/entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        repName: repName,
                        drugId: drugIdVal,
                        units: unitsVal,
                        date: dateVal,
                        country: countryVal
                    })
                });

                const resData = await response.json();
                if (response.status === 200 && resData.success) {
                    showStatus("Sales entry successfully recorded!", "success");
                    unitsInput.value = '';
                    updateCalculatedRevenue();
                    await updateMonthlySummary();
                    loadDashboardData();
                    setTimeout(() => { showStatus("", "info"); }, 3000);
                } else {
                    showStatus(resData.error || "Failed to save entry.", "error");
                }
            } catch (e) {
                showStatus("Network error. Please try again.", "error");
                console.error(e);
            } finally {
                submitBtn.disabled = false;
            }
        };
    }

    function showStatus(msg, type) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        if (type === 'success') {
            statusEl.style.color = '#10b981';
        } else if (type === 'error') {
            statusEl.style.color = '#ef4444';
        } else {
            statusEl.style.color = '#64748b';
        }
    }
}

// ==========================================
// 5.5 Administrative Account Credentials Management
// ==========================================
let repsCredsCache = [];
let managersCredsCache = [];

function generateRandomSecurePassword() {
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const specials = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = uppers + lowers + digits + specials;
    
    let pwd = '';
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];
    
    for (let i = 0; i < 4; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
    }
    
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

async function initCredentialsManagement() {
    const repSelect = document.getElementById('gen-rep-select');
    const repUserIn = document.getElementById('gen-rep-username');
    const repPwdIn = document.getElementById('gen-rep-password');
    const repAutoBtn = document.getElementById('gen-rep-pwd-btn');
    const repSubmit = document.getElementById('submit-gen-rep');
    const repStatus = document.getElementById('gen-rep-status');

    const mgrSelect = document.getElementById('gen-manager-select');
    const mgrUserIn = document.getElementById('gen-manager-username');
    const mgrPwdIn = document.getElementById('gen-manager-password');
    const mgrAutoBtn = document.getElementById('gen-manager-pwd-btn');
    const mgrSubmit = document.getElementById('submit-gen-manager');
    const mgrStatus = document.getElementById('gen-manager-status');

    if (!repSelect || !mgrSelect) return;

    async function loadCredentialsCache() {
        try {
            const data = await safeFetch('/api/admin/reps-managers');
            repsCredsCache = data.reps;
            managersCredsCache = data.managers;

            const repSelVal = repSelect.value;
            const mgrSelVal = mgrSelect.value;

            repSelect.innerHTML = '';
            repsCredsCache.forEach(rep => {
                const opt = document.createElement('option');
                opt.value = rep.id;
                opt.textContent = rep.name;
                repSelect.appendChild(opt);
            });

            mgrSelect.innerHTML = '';
            managersCredsCache.forEach(mgr => {
                const opt = document.createElement('option');
                opt.value = mgr.id;
                opt.textContent = mgr.name;
                mgrSelect.appendChild(opt);
            });

            if (repSelVal && repsCredsCache.some(r => r.id == repSelVal)) {
                repSelect.value = repSelVal;
            }
            if (mgrSelVal && managersCredsCache.some(m => m.id == mgrSelVal)) {
                mgrSelect.value = mgrSelVal;
            }

            updateRepInputs();
            updateManagerInputs();
        } catch (e) {
            console.error("Failed to load reps/managers credentials:", e);
        }
    }

    function updateRepInputs() {
        const id = repSelect.value;
        const rep = repsCredsCache.find(r => r.id == id);
        if (rep) {
            repUserIn.value = rep.username;
            repPwdIn.value = rep.password;
        } else {
            repUserIn.value = '';
            repPwdIn.value = '';
        }
        repStatus.textContent = '';
    }

    function updateManagerInputs() {
        const id = mgrSelect.value;
        const mgr = managersCredsCache.find(m => m.id == id);
        if (mgr) {
            mgrUserIn.value = mgr.username;
            mgrPwdIn.value = mgr.password;
        } else {
            mgrUserIn.value = '';
            mgrPwdIn.value = '';
        }
        mgrStatus.textContent = '';
    }

    if (repAutoBtn) {
        repAutoBtn.onclick = (e) => {
            e.preventDefault();
            repPwdIn.value = generateRandomSecurePassword();
        };
    }

    if (mgrAutoBtn) {
        mgrAutoBtn.onclick = (e) => {
            e.preventDefault();
            mgrPwdIn.value = generateRandomSecurePassword();
        };
    }

    repSelect.removeEventListener('change', updateRepInputs);
    repSelect.addEventListener('change', updateRepInputs);
    
    mgrSelect.removeEventListener('change', updateManagerInputs);
    mgrSelect.addEventListener('change', updateManagerInputs);

    repSubmit.onclick = async (e) => {
        e.preventDefault();
        const id = repSelect.value;
        const username = repUserIn.value.trim();
        const password = repPwdIn.value;

        if (!username || !password) {
            showStatus(repStatus, "Username and Password cannot be blank.", "error");
            return;
        }

        repSubmit.disabled = true;
        showStatus(repStatus, "Saving credentials...", "info");

        try {
            const res = await fetch(apiBase + '/api/admin/save-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'rep', id, username, password })
            });
            const data = await res.json();
            if (res.status === 200 && data.success) {
                showStatus(repStatus, "Credentials successfully saved!", "success");
                await loadCredentialsCache();
            } else {
                showStatus(repStatus, data.error || "Failed to save.", "error");
            }
        } catch (e) {
            showStatus(repStatus, "Network error.", "error");
        } finally {
            repSubmit.disabled = false;
        }
    };

    mgrSubmit.onclick = async (e) => {
        e.preventDefault();
        const id = mgrSelect.value;
        const username = mgrUserIn.value.trim();
        const password = mgrPwdIn.value;

        if (!username || !password) {
            showStatus(mgrStatus, "Username and Password cannot be blank.", "error");
            return;
        }

        mgrSubmit.disabled = true;
        showStatus(mgrStatus, "Saving credentials...", "info");

        try {
            const res = await fetch(apiBase + '/api/admin/save-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'manager', id, username, password })
            });
            const data = await res.json();
            if (res.status === 200 && data.success) {
                showStatus(mgrStatus, "Credentials successfully saved!", "success");
                await loadCredentialsCache();
            } else {
                showStatus(mgrStatus, data.error || "Failed to save.", "error");
            }
        } catch (e) {
            showStatus(mgrStatus, "Network error.", "error");
        } finally {
            mgrSubmit.disabled = false;
        }
    };

    function showStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        if (type === 'success') {
            el.style.color = '#10b981';
        } else if (type === 'error') {
            el.style.color = '#ef4444';
        } else {
            el.style.color = '#64748b';
        }
    }

    await loadCredentialsCache();
}

// ==========================================
// 5.6 Pending Reviews & Approval Workflows
// ==========================================
async function initApprovalsManagement() {
    const tableBody = document.querySelector('#approvals-table tbody');
    if (!tableBody) return;

    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') {
        const approvalsCard = document.getElementById('settings-approvals-card');
        if (approvalsCard) approvalsCard.style.display = 'none';
        return;
    } else {
        const approvalsCard = document.getElementById('settings-approvals-card');
        if (approvalsCard) approvalsCard.style.display = 'block';
    }

    async function loadPendingApprovals() {
        try {
            const data = await safeFetch('/api/admin/pending-approvals');
            tableBody.innerHTML = '';
            
            if (data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No submissions pending review.</td></tr>`;
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.rep}</strong></td>
                    <td>${item.drug}</td>
                    <td>${item.units}</td>
                    <td>${item.country}</td>
                    <td>${item.date}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--accent-blue);">${formatCurrency(item.revenue)}</td>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 0.5rem; justify-content: center;">
                            <button class="btn-primary approve-btn" data-id="${item.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 0.35rem; background: var(--accent-green); border: none; cursor: pointer;">
                                <i class="ph ph-check"></i> Approve
                            </button>
                            <button class="btn-primary reject-btn" data-id="${item.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 0.35rem; background: var(--accent-red); border: none; cursor: pointer;">
                                <i class="ph ph-x"></i> Reject
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            tableBody.querySelectorAll('.approve-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = btn.getAttribute('data-id');
                    await handleApproveReject(id, 'Approved');
                };
            });

            tableBody.querySelectorAll('.reject-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = btn.getAttribute('data-id');
                    await handleApproveReject(id, 'Rejected');
                };
            });
        } catch (e) {
            console.error("Failed to load approvals:", e);
        }
    }

    async function handleApproveReject(id, action) {
        try {
            const res = await fetch(apiBase + '/api/admin/approve-reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const resData = await res.json();
            if (res.status === 200 && resData.success) {
                showStatusMessage(resData.message || `Submission successfully ${action}!`, "success");
                await loadPendingApprovals();
                loadDashboardData();
            } else {
                showStatusMessage(resData.error || "Failed to process approval.", "error");
            }
        } catch (e) {
            showStatusMessage("Network error.", "error");
        }
    }

    function showStatusMessage(msg, type) {
        const banner = document.getElementById('add-rep-status') || document.getElementById('sales-entry-status');
        if (banner) {
            banner.textContent = msg;
            banner.style.color = type === 'success' ? '#10b981' : '#ef4444';
            setTimeout(() => { banner.textContent = ''; }, 3500);
        }
    }

    await loadPendingApprovals();
}

// ==========================================
// 5.7 Drug Management & Status Controls
// ==========================================
let drugsMgmtCache = [];
async function initDrugManagement() {
    const tableBody = document.querySelector('#drug-mgmt-table tbody');
    const searchIn = document.getElementById('drug-mgmt-search');
    const toggleFormBtn = document.getElementById('toggle-add-forms-btn');
    const formsContainer = document.getElementById('settings-add-forms-container');

    if (!tableBody) return;

    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') {
        const dbCard = document.getElementById('settings-db-management-card');
        if (dbCard) dbCard.style.display = 'none';
        return;
    } else {
        const dbCard = document.getElementById('settings-db-management-card');
        if (dbCard) dbCard.style.display = 'block';
    }

    if (toggleFormBtn && formsContainer) {
        toggleFormBtn.onclick = (e) => {
            e.preventDefault();
            if (formsContainer.style.display === 'none') {
                formsContainer.style.display = 'grid';
                toggleFormBtn.innerHTML = `<i class="ph ph-minus-circle"></i> Hide Forms`;
            } else {
                formsContainer.style.display = 'none';
                toggleFormBtn.innerHTML = `<i class="ph ph-plus-circle"></i> Add Drug / Rep`;
            }
        };
    }

    async function loadDrugsMgmt() {
        try {
            const data = await safeFetch('/api/admin/drugs');
            drugsMgmtCache = data;
            renderDrugsTable(drugsMgmtCache);
        } catch (e) {
            console.error("Failed to load drug directory:", e);
        }
    }

    function renderDrugsTable(drugs) {
        tableBody.innerHTML = '';
        if (drugs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No drugs match search criteria.</td></tr>`;
            return;
        }

        drugs.forEach(drug => {
            const tr = document.createElement('tr');
            const isActive = drug.status === 'Active';
            const statusClass = isActive ? 'approved' : 'inactive';
            const actionText = isActive ? 'Deactivate' : 'Activate';
            const actionColor = isActive ? 'var(--accent-red)' : 'var(--accent-green)';

            tr.innerHTML = `
                <td><strong>${drug.name}</strong></td>
                <td><span style="font-size: 0.8rem; background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: var(--border-radius-badge); color: var(--text-primary); border: 1px solid var(--border-color);">${drug.category}</span></td>
                <td style="text-align: right; font-weight: 600; color: var(--accent-blue);">${formatCurrency(drug.price)}</td>
                <td style="text-align: center;">
                    <span class="status-badge ${statusClass}">
                        ${drug.status}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="btn-primary toggle-status-btn" data-id="${drug.id}" data-status="${drug.status}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 0.35rem; background: ${actionColor}; border: none; cursor: pointer; color: white;">
                        ${actionText}
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll('.toggle-status-btn').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                const currStatus = btn.getAttribute('data-status');
                const newStatus = currStatus === 'Active' ? 'Inactive' : 'Active';
                
                try {
                    const res = await fetch(apiBase + '/api/admin/toggle-drug-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status: newStatus })
                    });
                    const resData = await res.json();
                    if (res.status === 200 && resData.success) {
                        await loadDrugsMgmt();
                        const repName = sessionStorage.getItem('repName');
                        if (repName) initRepSalesEntry(repName);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
        });
    }

    if (searchIn) {
        searchIn.oninput = () => {
            const query = searchIn.value.toLowerCase().trim();
            const filtered = drugsMgmtCache.filter(d => 
                d.name.toLowerCase().includes(query) || d.category.toLowerCase().includes(query)
            );
            renderDrugsTable(filtered);
        };
    }

    await loadDrugsMgmt();
}

// ==========================================
// 5.8 Performance Targets Tracking Module
// ==========================================
async function initTargetsTracker() {
    const globalActualEl = document.getElementById('target-global-actual');
    const globalValEl = document.getElementById('target-global-val');
    const globalProgressEl = document.getElementById('target-global-progress');
    const globalPctEl = document.getElementById('target-global-pct');
    const globalStatusEl = document.getElementById('target-global-status');

    const managerNameEl = document.getElementById('target-manager-name');
    const managerActualEl = document.getElementById('target-manager-actual');
    const managerValEl = document.getElementById('target-manager-val');
    const managerProgressEl = document.getElementById('target-manager-progress');
    const managerPctEl = document.getElementById('target-manager-pct');
    const managerStatusEl = document.getElementById('target-manager-status');

    const repNameEl = document.getElementById('target-rep-name');
    const repActualEl = document.getElementById('target-rep-actual');
    const repValEl = document.getElementById('target-rep-val');
    const repProgressEl = document.getElementById('target-rep-progress');
    const repPctEl = document.getElementById('target-rep-pct');
    const repStatusEl = document.getElementById('target-rep-status');

    const tableBody = document.querySelector('#targets-table tbody');
    const yearSelect = document.getElementById('targets-filter-year');
    const monthSelect = document.getElementById('targets-filter-month');

    const setTypeSelect = document.getElementById('target-set-type');
    const setNameSelect = document.getElementById('target-set-name-select');
    const setNameInput = document.getElementById('target-set-name-input');
    const setYearInput = document.getElementById('target-set-year');
    const setMonthSelect = document.getElementById('target-set-month');
    const setAmountInput = document.getElementById('target-set-amount');
    const setSubmitBtn = document.getElementById('submit-set-target');
    const setStatusEl = document.getElementById('target-set-status');

    if (!globalActualEl || !tableBody) return;

    const userRole = sessionStorage.getItem('userRole') || 'admin';
    const repName = sessionStorage.getItem('repName') || 'Jimmy Grey';
    const managerName = sessionStorage.getItem('managerName') || 'Alisha Cordwell';

    const adminConfigCard = document.getElementById('targets-admin-settings-card');
    if (userRole === 'admin' || userRole === 'manager') {
        if (adminConfigCard) adminConfigCard.style.display = 'block';
        initAdminTargetForm();
    } else {
        if (adminConfigCard) adminConfigCard.style.display = 'none';
    }

    async function loadTargetsData() {
        const year = yearSelect.value;
        const month = monthSelect.value;
        
        let reqRepName = '';
        let reqManagerName = '';
        
        if (userRole === 'rep') {
            reqRepName = sessionStorage.getItem('repName') || 'Jimmy Grey';
        } else if (userRole === 'manager') {
            reqManagerName = sessionStorage.getItem('managerName') || 'Alisha Cordwell';
            const selectedRep = document.getElementById('filter-rep').value;
            reqRepName = selectedRep === 'All' ? '' : selectedRep;
        } else if (userRole === 'admin') {
            const selectedRep = document.getElementById('filter-rep').value;
            if (selectedRep && selectedRep !== 'All') {
                reqRepName = selectedRep;
            } else {
                reqManagerName = 'Alisha Cordwell';
            }
        }

        try {
            const data = await safeFetch(`/api/targets?year=${year}&month=${month}&repName=${encodeURIComponent(reqRepName)}&managerName=${encodeURIComponent(reqManagerName)}`);
            
            // 1. Draw Company Target Card
            globalActualEl.textContent = formatCurrency(data.global.actual);
            globalValEl.textContent = formatCurrency(data.global.target);
            globalPctEl.textContent = `${data.global.achievement}%`;
            globalProgressEl.style.width = `${Math.min(data.global.achievement, 100)}%`;
            updateGoalStatusBadge(globalStatusEl, data.global.achievement);

            // 2. Draw Manager Target Card
            managerNameEl.textContent = data.manager.name;
            managerActualEl.textContent = formatCurrency(data.manager.actual);
            managerValEl.textContent = formatCurrency(data.manager.target);
            managerPctEl.textContent = `${data.manager.achievement}%`;
            managerProgressEl.style.width = `${Math.min(data.manager.achievement, 100)}%`;
            updateGoalStatusBadge(managerStatusEl, data.manager.achievement);

            // Hide/Show KPI cards based on role
            const globalCard = globalActualEl.closest('.card');
            const managerCard = managerActualEl.closest('.card');
            const repCard = repActualEl.closest('.card');
            
            if (globalCard) globalCard.style.display = 'block';
            if (managerCard) managerCard.style.display = 'block';
            
            if (userRole === 'admin') {
                if (repCard) repCard.style.display = 'none';
            } else if (userRole === 'manager') {
                if (repCard) repCard.style.display = 'block';
                repNameEl.textContent = `Representative Goal (${data.rep.name})`;
                repActualEl.textContent = formatCurrency(data.rep.actual);
                repValEl.textContent = formatCurrency(data.rep.target);
                repPctEl.textContent = `${data.rep.achievement}%`;
                repProgressEl.style.width = `${Math.min(data.rep.achievement, 100)}%`;
                updateGoalStatusBadge(repStatusEl, data.rep.achievement);
            } else if (userRole === 'rep') {
                if (repCard) repCard.style.display = 'block';
                repNameEl.textContent = `My Sales Goal (${data.rep.name})`;
                repActualEl.textContent = formatCurrency(data.rep.actual);
                repValEl.textContent = formatCurrency(data.rep.target);
                repPctEl.textContent = `${data.rep.achievement}%`;
                repProgressEl.style.width = `${Math.min(data.rep.achievement, 100)}%`;
                updateGoalStatusBadge(repStatusEl, data.rep.achievement);
            }

            // 4. Render Table Directory
            tableBody.innerHTML = '';
            
            let filteredList = data.list;
            if (userRole === 'admin') {
                filteredList = data.list.filter(item => item.type === 'Global' || item.type === 'Manager');
            } else if (userRole === 'rep') {
                filteredList = data.list.filter(item => item.type === 'Global' || (item.type === 'Manager' && item.name === data.manager.name) || (item.type === 'Rep' && item.name === repName));
            } else if (userRole === 'manager') {
                filteredList = data.list.filter(item => item.type === 'Global' || (item.type === 'Manager' && item.name === data.manager.name) || item.type === 'Rep');
            }

            if (filteredList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No configured goals.</td></tr>`;
                return;
            }

            filteredList.forEach(item => {
                const tr = document.createElement('tr');
                
                let actionsHtml = '<td></td>';
                const canEdit = (userRole === 'manager' && item.type === 'Rep') || 
                                (userRole === 'admin' && (item.type === 'Global' || item.type === 'Manager'));
                                
                if (canEdit) {
                    actionsHtml = `
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="settings-btn edit-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 4px; margin-right: 0.5rem;">
                                <i class="ph ph-pencil" style="vertical-align: middle;"></i> Edit
                            </button>
                            <button class="settings-btn delete-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 4px; color: var(--accent-red); border-color: var(--accent-red);">
                                <i class="ph ph-trash" style="vertical-align: middle;"></i> Delete
                            </button>
                        </td>
                    `;
                }

                tr.innerHTML = `
                    <td><span style="font-weight: 700; font-size: 0.8rem; background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--accent-blue);">${item.type}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.year}</td>
                    <td>${item.month}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--accent-green);">${formatCurrency(item.target)}</td>
                    ${actionsHtml}
                `;

                if (canEdit) {
                    const editBtn = tr.querySelector('.edit-btn');
                    const deleteBtn = tr.querySelector('.delete-btn');
                    
                    editBtn.onclick = () => {
                        const formCard = document.getElementById('targets-admin-settings-card');
                        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
                        
                        if (setTypeSelect) {
                            setTypeSelect.value = item.type;
                            setTypeSelect.onchange();
                        }
                        
                        setTimeout(() => {
                            if (item.type === 'Global') {
                                if (setNameInput) setNameInput.value = item.name;
                            } else {
                                if (setNameSelect) setNameSelect.value = item.name;
                            }
                            if (setYearInput) setYearInput.value = item.year;
                            if (setMonthSelect) setMonthSelect.value = item.month;
                            if (setAmountInput) setAmountInput.value = item.target;
                        }, 50);
                    };
                    
                    deleteBtn.onclick = () => {
                        showCustomConfirm({
                            title: 'Delete Target Goal',
                            body: `Are you sure you want to delete the ${item.type} target for ${item.name} (${item.month} ${item.year})?`,
                            icon: 'ph-trash',
                            iconColor: 'var(--accent-red)',
                            confirmBg: 'var(--accent-red)',
                            confirmText: 'Yes, Delete',
                            onConfirm: async () => {
                                deleteBtn.disabled = true;
                                try {
                                    const res = await fetch(apiBase + `/api/admin/delete-target/${item.id}`, {
                                        method: 'POST'
                                    });
                                    const resData = await res.json();
                                    if (res.status === 200 && resData.success) {
                                        showCustomConfirm({
                                            title: 'Goal Deleted',
                                            body: 'Goal configuration has been successfully removed.',
                                            icon: 'ph-check-circle',
                                            iconColor: 'var(--accent-green)',
                                            confirmBg: 'var(--accent-green)',
                                            confirmText: 'Okay',
                                            cancelText: null
                                        });
                                        await loadTargetsData();
                                    } else {
                                        showCustomConfirm({
                                            title: 'Action Failed',
                                            body: resData.error || 'Failed to delete target.',
                                            icon: 'ph-x-circle',
                                            iconColor: 'var(--accent-red)',
                                            confirmBg: 'var(--accent-red)',
                                            confirmText: 'Okay',
                                            cancelText: null
                                        });
                                        deleteBtn.disabled = false;
                                    }
                                } catch (err) {
                                    showCustomConfirm({
                                        title: 'Network Error',
                                        body: 'Failed to communicate with target tracker services.',
                                        icon: 'ph-wifi-slash',
                                        iconColor: 'var(--accent-red)',
                                        confirmBg: 'var(--accent-red)',
                                        confirmText: 'Okay',
                                        cancelText: null
                                    });
                                    deleteBtn.disabled = false;
                                }
                            }
                        });
                    };
                }

                tableBody.appendChild(tr);
            });
        } catch (e) {
            console.error("Failed to load targets metrics:", e);
        }
    }

    function updateGoalStatusBadge(badge, pct) {
        if (!badge) return;
        badge.className = 'status-badge';
        if (pct >= 85) {
            badge.classList.add('approved');
            badge.textContent = 'On Track';
        } else if (pct >= 50) {
            badge.classList.add('pending');
            badge.textContent = 'Needs Attention';
        } else {
            badge.classList.add('rejected');
            badge.textContent = 'Off Track';
        }
    }

    async function initAdminTargetForm() {
        if (!setTypeSelect || !setNameSelect) return;

        setTypeSelect.innerHTML = '';
        if (userRole === 'admin') {
            setTypeSelect.innerHTML = `
                <option value="Global">Global Goal</option>
                <option value="Manager">Manager Goal</option>
            `;
        } else if (userRole === 'manager') {
            setTypeSelect.innerHTML = `
                <option value="Rep">Representative Goal</option>
            `;
        }

        try {
            const listData = await safeFetch('/api/admin/reps-managers');
            
            setTypeSelect.onchange = () => {
                const type = setTypeSelect.value;
                if (type === 'Global') {
                    setNameSelect.style.display = 'none';
                    setNameInput.style.display = 'block';
                    setNameInput.value = 'Company';
                    setNameInput.readOnly = true;
                } else if (type === 'Manager') {
                    setNameInput.style.display = 'none';
                    setNameSelect.style.display = 'block';
                    setNameSelect.innerHTML = '';
                    listData.managers.forEach(mgr => {
                        const opt = document.createElement('option');
                        opt.value = mgr.name;
                        opt.textContent = mgr.name;
                        setNameSelect.appendChild(opt);
                    });
                } else if (type === 'Rep') {
                    setNameInput.style.display = 'none';
                    setNameSelect.style.display = 'block';
                    setNameSelect.innerHTML = '';
                    
                    const myReps = listData.reps.filter(rep => rep.manager === managerName);
                    myReps.forEach(rep => {
                        const opt = document.createElement('option');
                        opt.value = rep.name;
                        opt.textContent = rep.name;
                        setNameSelect.appendChild(opt);
                    });
                }
            };

            setTypeSelect.onchange();
        } catch (e) {
            console.error(e);
        }

        setSubmitBtn.onclick = async (e) => {
            e.preventDefault();
            const type = setTypeSelect.value;
            const name = type === 'Global' ? setNameInput.value : setNameSelect.value;
            const year = setYearInput.value;
            const month = setMonthSelect.value;
            const target = setAmountInput.value;

            if (!name || !target) {
                showStatus("Entity Name and Target Amount cannot be empty.", "error");
                return;
            }

            setSubmitBtn.disabled = true;
            showStatus("Saving goal configuration...", "info");

            try {
                const res = await fetch(apiBase + '/api/admin/set-target', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        type, 
                        name, 
                        year, 
                        month, 
                        target,
                        updater: userRole === 'admin' ? 'Admin' : `Manager ${managerName}`
                    })
                });
                const resData = await res.json();
                if (res.status === 200 && resData.success) {
                    showStatus("Goal configurations updated successfully!", "success");
                    setAmountInput.value = '';
                    await loadTargetsData();
                } else {
                    showStatus(resData.error || "Failed to set target.", "error");
                }
            } catch (err) {
                showStatus("Network error.", "error");
            } finally {
                setSubmitBtn.disabled = false;
            }
        };

        function showStatus(msg, type) {
            if (!setStatusEl) return;
            setStatusEl.textContent = msg;
            setStatusEl.style.color = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#64748b');
            setTimeout(() => { setStatusEl.textContent = ''; }, 4000);
        }
    }

    yearSelect.removeEventListener('change', loadTargetsData);
    yearSelect.addEventListener('change', loadTargetsData);
    
    monthSelect.removeEventListener('change', loadTargetsData);
    monthSelect.addEventListener('change', loadTargetsData);

    await loadTargetsData();
}

function showCustomConfirm({ title, body, icon, iconColor, confirmBg, confirmText, cancelText, onConfirm }) {
    const modal = document.getElementById('generic-confirm-modal');
    if (!modal) return;
    
    document.getElementById('confirm-modal-title').textContent = title || 'Confirmation';
    document.getElementById('confirm-modal-body').textContent = body || 'Are you sure?';
    
    const iconEl = document.getElementById('confirm-modal-icon');
    if (iconEl) {
        iconEl.className = `ph ${icon || 'ph-question'}`;
        iconEl.style.color = iconColor || 'var(--accent-blue)';
    }
    
    const wrapEl = document.getElementById('confirm-modal-icon-wrap');
    if (wrapEl) {
        wrapEl.style.background = (iconColor || 'var(--accent-blue)').startsWith('var') ? 'rgba(22, 78, 99, 0.1)' : (iconColor || 'rgba(22, 78, 99, 0.1)') + '1A';
    }
    
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.textContent = cancelText || 'Cancel';
        cancelBtn.style.display = cancelText === null ? 'none' : 'block';
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    if (confirmBtn) {
        confirmBtn.textContent = confirmText || 'Confirm';
        confirmBtn.style.background = confirmBg || 'var(--accent-blue)';
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        };
    }
    
    modal.style.display = 'flex';
}

async function pollAdminNotifications() {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') return;
    try {
        const data = await safeFetch('/api/admin/notifications');
        data.forEach(notif => {
            if (!systemNotifications.some(n => n.id === notif.id)) {
                systemNotifications.unshift(notif);
            }
        });
        renderNotifications();
    } catch (e) {
        console.error("Error polling admin notifications:", e);
    }
}

function initDocumentView() {
    const downloadBtn = document.getElementById('download-report-pdf-btn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const element = document.querySelector('#view-document .card');
        if (!element) return;

        const innerContent = element.querySelector('div[style*="font-size: 0.95rem"]');
        if (!innerContent) return;

        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Generating PDF...';

        // Build an isolated clean white printing page container with constrained width to prevent horizontal page splits
        const printContainer = document.createElement('div');
        printContainer.style.width = '750px';
        printContainer.style.boxSizing = 'border-box';
        printContainer.style.padding = '1.5rem';
        printContainer.style.background = '#ffffff';
        printContainer.style.color = '#0f172a';
        printContainer.style.fontFamily = "'Inter', sans-serif";
        printContainer.style.lineHeight = '1.5';

        let contentHtml = innerContent.innerHTML;
        // Map any active theme CSS variables to static print-safe values
        contentHtml = contentHtml.replaceAll('var(--text-primary)', '#0f172a');
        contentHtml = contentHtml.replaceAll('var(--text-secondary)', '#475569');
        contentHtml = contentHtml.replaceAll('var(--primary)', '#164E63');
        contentHtml = contentHtml.replaceAll('var(--primary-dark)', '#0F3D4C');
        contentHtml = contentHtml.replaceAll('var(--bg-primary)', '#f8fafc');
        contentHtml = contentHtml.replaceAll('var(--border-color)', '#e2e8f0');
        contentHtml = contentHtml.replaceAll('var(--accent-blue)', '#0ea5e9');
        contentHtml = contentHtml.replaceAll('var(--accent-teal)', '#0d9488');
        contentHtml = contentHtml.replaceAll('var(--accent-green)', '#10b981');

        printContainer.innerHTML = `
            <style>
                #pdf-print-root h1, #pdf-print-root h2, #pdf-print-root h3, #pdf-print-root p, #pdf-print-root li {
                    font-family: 'Inter', sans-serif !important;
                }
                #pdf-print-root table.data-table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                    margin: 1.5rem 0 !important;
                }
                #pdf-print-root table.data-table th, 
                #pdf-print-root table.data-table td {
                    border: 1px solid #e2e8f0 !important;
                    padding: 8px 10px !important;
                    font-size: 10.5px !important;
                    line-height: 1.4 !important;
                    word-wrap: break-word !important;
                    word-break: break-word !important;
                    white-space: normal !important;
                    vertical-align: top !important;
                }
                #pdf-print-root table.data-table th {
                    background: #f8fafc !important;
                    font-weight: 700 !important;
                }
            </style>
            <div id="pdf-print-root">
                <div style="border-bottom: 2px solid #164E63; padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans', sans-serif;">
                    <div>
                        <h1 style="font-size: 2.25rem; font-weight: 800; color: #164E63; margin: 0; letter-spacing: -0.03em;">System Report & Documentation</h1>
                        <p style="color: #64748b; margin: 0.25rem 0 0; font-size: 0.875rem; font-weight: 500;">Comprehensive PharmaLytics Mission, Architecture, Workflow, and File Catalog</p>
                    </div>
                </div>
                <div style="color: #0f172a !important;">
                    ${contentHtml}
                </div>
            </div>
        `;

        const opt = {
            margin:       [0.4, 0.4, 0.4, 0.4],
            filename:     'PharmaLytics_System_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, width: 750 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: 'css' }
        };

        html2pdf().from(printContainer).set(opt).save().then(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<i class="ph ph-printer"></i> Print / Save PDF';
        }).catch(err => {
            console.error("PDF generation failed:", err);
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<i class="ph ph-printer"></i> Print / Save PDF';
        });
    });

    // 1. Initialize Document Tab Filters
    const docTabs = document.querySelectorAll('.doc-tab');
    const docSections = document.querySelectorAll('.doc-section');
    docTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            docTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.target;
            docSections.forEach(section => {
                if (target === 'all' || section.dataset.section === target) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    });

    // 2. Initialize Document Search Filter
    const docSearch = document.getElementById('doc-search');
    if (docSearch) {
        docSearch.addEventListener('input', () => {
            const query = docSearch.value.toLowerCase().trim();
            
            // Loop all sections & their children elements
            docSections.forEach(section => {
                let sectionHasMatch = false;
                
                // Search rows in tables
                const rows = section.querySelectorAll('table.data-table tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(query)) {
                        row.style.display = '';
                        sectionHasMatch = true;
                    } else {
                        row.style.display = 'none';
                    }
                });

                // Search standard paragraphs/headings within section
                const otherElements = section.querySelectorAll('h3, h4, p');
                otherElements.forEach(el => {
                    const text = el.textContent.toLowerCase();
                    if (text.includes(query)) {
                        el.style.display = '';
                        sectionHasMatch = true;
                    } else if (query !== '') {
                        el.style.display = 'none';
                    } else {
                        el.style.display = '';
                    }
                });

                // Toggle overall section visibility
                if (sectionHasMatch || query === '') {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    }

    // 3. Initialize Challenges Accordions
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach((item, idx) => {
        const header = item.querySelector('.accordion-header');
        
        // Open the first item by default
        if (idx === 0) {
            item.classList.add('open');
        }

        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            // Collapses other accordion items (accordion behavior)
            accordionItems.forEach(i => i.classList.remove('open'));
            
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });

    // 4. Initialize Challenges Tab Filters
    const challengeTabs = document.querySelectorAll('.challenge-tab');
    challengeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            challengeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const category = tab.dataset.category;
            accordionItems.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // 5. Initialize Challenges Search Filter
    const challengeSearch = document.getElementById('challenge-search');
    if (challengeSearch) {
        challengeSearch.addEventListener('input', () => {
            const query = challengeSearch.value.toLowerCase().trim();
            accordionItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // 6. Copy Buttons Visual Success Alerts
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-check" style="color: var(--accent-green);"></i>';
            btn.style.background = 'rgba(16, 185, 129, 0.1)';
            setTimeout(() => {
                btn.innerHTML = originalIcon;
                btn.style.background = '';
            }, 2000);
        });
    });
}

function initChartExplanations() {
    const cards = document.querySelectorAll('.chart-card');
    cards.forEach(card => {
        const infoBtn = card.querySelector('.chart-info-btn');
        const container = card.querySelector('.chart-container');
        const explanation = card.querySelector('.chart-explanation');

        if (!infoBtn || !container || !explanation) return;

        let showingExplanation = false;

        const showExplain = () => {
            if (showingExplanation) return;
            showingExplanation = true;
            
            // Phase 1: Animate out graph container
            container.classList.add('hidden-anim');
            
            // Phase 2: Wait 250ms then Animate in explanation
            setTimeout(() => {
                if (showingExplanation) { // Check if user hasn't left early
                    explanation.classList.add('show-anim');
                }
            }, 250);
        };

        const hideExplain = () => {
            if (!showingExplanation) return;
            showingExplanation = false;
            
            // Phase 1: Animate out explanation
            explanation.classList.remove('show-anim');
            
            // Phase 2: Wait 250ms then Animate in graph container
            setTimeout(() => {
                if (!showingExplanation) {
                    container.classList.remove('hidden-anim');
                }
            }, 250);
        };

        // Click to toggle
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (showingExplanation) {
                hideExplain();
            } else {
                showExplain();
            }
        });

        // Mouse leave to hide
        card.addEventListener('mouseleave', () => {
            hideExplain();
        });
    });

    // Initialize Canvas Particle/Data-Wave Animations
    initCanvasAnimation('dashboard-animation-canvas');
    initCanvasAnimation('analytics-animation-canvas');
}

function initCanvasAnimation(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 200;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.7;
            this.vy = (Math.random() - 0.5) * 0.7;
            this.radius = Math.random() * 2 + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#0ea5e9'; // Theme-accent color
            ctx.fill();
        }
    }

    const particleCount = Math.min(50, Math.floor(canvas.width / 15));
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    let waveOffset = 0;

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const theme = document.body.getAttribute('data-theme') || 'light';
        const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.025)';
        const lineColor = theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.08)';
        const waveColor = theme === 'dark' ? 'rgba(13, 148, 136, 0.3)' : 'rgba(13, 148, 136, 0.12)';

        // 1. Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const gridSize = 35;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // 2. Wave
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * 0.006 + waveOffset) * 35 + Math.cos(x * 0.012 + waveOffset * 0.5) * 10;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        waveOffset += 0.012;

        // 3. Particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // 4. Connect
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 0.7;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 90) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    };

    animate();
}

// ==========================================
// 6. Initialize Application
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Session Auth check
    const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userRole = sessionStorage.getItem('userRole');
    const repName = userRole === 'manager' ? sessionStorage.getItem('managerName') : sessionStorage.getItem('repName');
    
    const loginCont = document.getElementById('login-container');
    const mainCont = document.getElementById('main-app-container');
    
    if (loggedIn) {
        if (loginCont) loginCont.style.display = 'none';
        if (mainCont) mainCont.style.display = 'flex';
        applyUserRoleViews(userRole, repName);
    } else {
        if (loginCont) loginCont.style.display = 'flex';
        if (mainCont) mainCont.style.display = 'none';
    }

    initLogin();
    initLogout();
    initSettings();
    initDocumentView();
    initChartExplanations();
    resolveChartDefaults();
    initNavigation();
    initDatabaseManagement();
    initChartReflowObserver();
    initNotifications();
    initExportReport();
    initApprovalsManagement();
    initDrugManagement();
    initTargetsTracker();
    await populateFilters();
    
    // Lock filter if rep role is active on reload
    if (loggedIn && userRole === 'rep') {
        const repFilter = document.getElementById('filter-rep');
        if (repFilter) {
            repFilter.value = repName;
            repFilter.disabled = true;
        }
    }
    
    // Start notifications poll
    setInterval(pollAdminNotifications, 5000);
    
    loadDashboardData();
});

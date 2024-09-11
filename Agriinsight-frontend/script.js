const API_BASE_URL = 'http://localhost:3000'; 

// Helper functions for showing/hiding spinner and error messages
function showSpinner(containerId) {
    const container = document.getElementById(containerId);
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.id = `${containerId}-spinner`;
    container.appendChild(spinner);
}

function hideSpinner(containerId) {
    const spinner = document.getElementById(`${containerId}-spinner`);
    if (spinner) spinner.remove();
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    const errorElement = document.createElement('p');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    container.appendChild(errorElement);
}

// Generic function to handle form submission for login/register
async function handleFormSubmit(e, formId, endpoint, bodyData, successCallback, errorCallback) {
    e.preventDefault();
    showSpinner(formId);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
            credentials: 'include',
        });

        if (!response.ok) throw new Error('Request failed');

        successCallback();
    } catch (error) {
        showError(formId, errorCallback);
    } finally {
        hideSpinner(formId);
    }
}

// Login functionality
document.getElementById('loginForm').addEventListener('submit', (e) => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    handleFormSubmit(e, 'loginForm', '/auth/login', { username, password }, 
        () => {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('dashboardContainer').style.display = 'block';
            loadDashboardData();
        },
        'Login failed. Please check your credentials and try again.'
    );
});

// Logout functionality
document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) throw new Error('Logout failed');

        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('dashboardContainer').style.display = 'none';
    } catch (error) {
        showError('dashboardContainer', 'Logout failed. Please try again.');
    }
});

// Registration functionality
document.getElementById('registerForm').addEventListener('submit', (e) => {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    handleFormSubmit(e, 'registerForm', '/auth/register', { username, email, password }, 
        () => {
            alert('Registration successful! Please log in.');
            document.querySelector('[data-tab="login"]').click();
        },
        'Registration failed. Please try again.'
    );
});

// Tab switching functionality
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
        document.getElementById(`${button.dataset.tab}Form`).style.display = 'flex';
    });
});

// Function to load dashboard data
async function loadDashboardData() {
    const dateRange = document.getElementById('dateRange').value;
    const cropType = document.getElementById('cropType').value;

    try {
        showSpinner('dashboardContainer');
        const [weatherData, yieldData, soilData, marketPrices] = await Promise.all([
            fetchData(`/weather?days=${dateRange}`),
            fetchData(`/yield?crop=${cropType}&days=${dateRange}`),
            fetchData(`/soil?crop=${cropType}`),
            fetchData('/market-prices'),
        ]);

        updateWeatherChart(weatherData);
        updateYieldChart(yieldData);
        updateSoilChart(soilData);
        updateMarketPrices(marketPrices);
    } catch (error) {
        showError('dashboardContainer', 'Failed to load dashboard data. Please try again later.');
    } finally {
        hideSpinner('dashboardContainer');
    }
}

// Function to make authenticated API requests
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Event listeners for interactive elements
document.getElementById('dateRange').addEventListener('change', loadDashboardData);
document.getElementById('cropType').addEventListener('change', loadDashboardData);

// Functions for updating charts (Update Weather Chart, Update Yield Chart, Update Soil Chart, Update Market Prices remain the same)

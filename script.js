
import CONFIG from './config.js';

// Application UI States - controls which elements are visible
const STATES = {
    LOADING: 'loading',   // Show loading spinner while fetching data
    DISPLAY: 'display',   // Show weather information after successful fetch
    ERROR: 'error'        // Show error message when request fails
};

// DOM Elements Cache
const elements = {
    cityInput: document.querySelector('#city-input'),
    searchBtn: document.querySelector('#search-btn'),
    geoBtn: document.querySelector('#geo-btn'),
    weatherDisplay: document.querySelector('#weather-display'),
    loading: document.querySelector('#loading'),
    errorMsg: document.querySelector('#error-msg'),
    errorText: document.querySelector('#error-text'),
    cityName: document.querySelector('#city-name'),
    temp: document.querySelector('#temp'),
    description: document.querySelector('#description'),
    humidity: document.querySelector('#humidity'),
    wind: document.querySelector('#wind'),
    weatherIcon: document.querySelector('#weather-icon'),
    forecastContainer: document.querySelector('#forecast-container')
};

// --- API Functions ---
/**
 * Fetches current weather data from OpenWeatherMap API
 * @param {string|Object} query - City name or coordinates object
 * @param {boolean} isCoords - Whether query is coordinates
 * @returns {Promise<Object>} Weather data
 */
async function fetchWeather(query, isCoords = false) {
    const url = isCoords
        ? `${CONFIG.BASE_URL}/weather?lat=${query.lat}&lon=${query.lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`
        : `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(query)}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(isCoords ? 'Unable to fetch weather for your location' : 'City not found');
    }
    return response.json();
}

/**
 * Fetches 5-day forecast data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Filtered daily forecast data
 */
async function fetchForecast(lat, lon) {
    const url = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Unable to fetch forecast data');
    }
    const data = await response.json();

    // Filter to get one forecast per day (around noon)
    return data.list.filter(item => item.dt_txt.includes("12:00:00"));
}

// --- UI Functions ---
/**
 * Updates the UI with current weather data
 * @param {Object} data - Weather data from API
 */
function displayCurrentWeather(data) {
    elements.cityName.textContent = data.name;
    elements.temp.textContent = `${Math.round(data.main.temp)}°C`;
    elements.description.textContent = data.weather[0].description;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.wind.textContent = `${data.wind.speed} km/h`;
    elements.weatherIcon.src = `${CONFIG.ICON_URL}/${data.weather[0].icon}@2x.png`;
    elements.weatherIcon.alt = data.weather[0].description;
}

/**
 * Updates the UI with forecast data
 * @param {Array} days - Array of daily forecast data
 */
function displayForecast(days) {
    elements.forecastContainer.innerHTML = '';

    days.forEach(day => {
        const date = new Date(day.dt * 1000).toLocaleDateString('en', { weekday: 'short' });
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div>${date}</div>
            <img src="${CONFIG.ICON_URL}/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <div>${Math.round(day.main.temp)}°</div>
        `;
        elements.forecastContainer.appendChild(card);
    });
}

/**
 * Toggles the application state (loading, display, error)
 * @param {string} state - State to show
 */
function toggleState(state) {
    // Hide all state containers
    elements.loading.classList.add('hidden');
    elements.errorMsg.classList.add('hidden');
    elements.weatherDisplay.classList.add('hidden');

    // Show the requested state
    switch (state) {
        case STATES.LOADING:
            elements.loading.classList.remove('hidden');
            break;
        case STATES.DISPLAY:
            elements.weatherDisplay.classList.remove('hidden');
            break;
        case STATES.ERROR:
            elements.errorMsg.classList.remove('hidden');
            break;
    }
}

/**
 * Shows an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    elements.errorText.textContent = message;
    toggleState(STATES.ERROR);
}

/**
 * Validates city input
 * @param {string} city - City name to validate
 * @returns {boolean} Whether input is valid
 */
function isValidCityInput(city) {
    return city && city.trim().length > 0 && city.trim().length <= 100;
}

// --- Event Handlers ---
/**
 * Handles search button click
 */
function handleSearch() {
    const city = elements.cityInput.value.trim();
    
    // Check for empty string
    if (city === '' || city.length === 0) {
        showError('Please enter a city name');
        return;
    }
    
    if (!isValidCityInput(city)) {
        showError('Please enter a valid city name');
        return;
    }
    performWeatherSearch(city);
}

/**
 * Handles geolocation button click
 */
function handleGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser');
        return;
    }

    toggleState(STATES.LOADING);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const coords = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            performWeatherSearch(coords, true);
        },
        (error) => {
            let message = 'Location access denied';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Location access denied. Please enable location services.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    message = 'Location request timed out.';
                    break;
            }
            showError(message);
        },
        { timeout: 10000 }
    );
}

/**
 * Performs the weather search operation
 * @param {string|Object} query - Search query
 * @param {boolean} isCoords - Whether query is coordinates
 */
async function performWeatherSearch(query, isCoords = false) {
    try {
        toggleState(STATES.LOADING);

        const weatherData = await fetchWeather(query, isCoords);
        displayCurrentWeather(weatherData);

        const forecastData = await fetchForecast(weatherData.coord.lat, weatherData.coord.lon);
        displayForecast(forecastData);

        toggleState(STATES.DISPLAY);
    } catch (error) {
        showError(error.message);
    }
}

/**
 * Handles Enter key press in search input
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        handleSearch();
    }
}

// --- Initialization ---
function init() {
    // Event listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.geoBtn.addEventListener('click', handleGeolocation);
    elements.cityInput.addEventListener('keypress', handleKeyPress);
    
    // Initial state
    toggleState(STATES.DISPLAY); // Show empty weather display initially
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
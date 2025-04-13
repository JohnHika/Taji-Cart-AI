/**
 * Weather API Service
 * Handles interactions with WeatherAPI.com
 */

const WEATHER_API_URL = 'https://api.weatherapi.com/v1';

/**
 * Get current weather data for a location
 * @param {string} apiKey - WeatherAPI.com API key
 * @param {Object} coords - Coordinates object with lat and lng properties
 * @param {boolean} aqi - Whether to include air quality data (optional)
 * @returns {Promise} Promise resolving to weather data
 */
export const getCurrentWeather = async (apiKey, coords, aqi = false) => {
  try {
    if (!apiKey) {
      throw new Error('Weather API key is missing');
    }

    if (!coords || !coords.lat || !coords.lng) {
      throw new Error('Valid coordinates are required');
    }

    const response = await fetch(
      `${WEATHER_API_URL}/current.json?key=${apiKey}&q=${coords.lat},${coords.lng}&aqi=${aqi ? 'yes' : 'no'}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weather API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Weather API error:', error);
    throw error;
  }
};

/**
 * Get weather forecast for a location
 * @param {string} apiKey - WeatherAPI.com API key
 * @param {Object} coords - Coordinates object with lat and lng properties
 * @param {number} days - Number of forecast days (1-14)
 * @param {boolean} aqi - Whether to include air quality data (optional)
 * @param {boolean} alerts - Whether to include weather alerts (optional)
 * @returns {Promise} Promise resolving to forecast data
 */
export const getForecast = async (apiKey, coords, days = 3, aqi = false, alerts = false) => {
  try {
    if (!apiKey) {
      throw new Error('Weather API key is missing');
    }

    if (!coords || !coords.lat || !coords.lng) {
      throw new Error('Valid coordinates are required');
    }

    const response = await fetch(
      `${WEATHER_API_URL}/forecast.json?key=${apiKey}&q=${coords.lat},${coords.lng}&days=${days}&aqi=${aqi ? 'yes' : 'no'}&alerts=${alerts ? 'yes' : 'no'}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weather API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Weather API error:', error);
    throw error;
  }
};

/**
 * Get historical weather data for a location
 * @param {string} apiKey - WeatherAPI.com API key
 * @param {Object} coords - Coordinates object with lat and lng properties
 * @param {string} date - Date in yyyy-MM-dd format
 * @returns {Promise} Promise resolving to historical weather data
 */
export const getHistoricalWeather = async (apiKey, coords, date) => {
  try {
    if (!apiKey) {
      throw new Error('Weather API key is missing');
    }

    if (!coords || !coords.lat || !coords.lng) {
      throw new Error('Valid coordinates are required');
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in yyyy-MM-dd format');
    }

    const response = await fetch(
      `${WEATHER_API_URL}/history.json?key=${apiKey}&q=${coords.lat},${coords.lng}&dt=${date}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weather API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Weather API error:', error);
    throw error;
  }
};

export default {
  getCurrentWeather,
  getForecast,
  getHistoricalWeather
};
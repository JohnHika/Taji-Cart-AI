import axios from 'axios';
import { google } from 'googleapis';

// Configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Helper function to make API requests
const makeGoogleMapsRequest = async (url, params) => {
    try {
        const response = await axios.get(url, {
            params: {
                key: GOOGLE_MAPS_API_KEY,
                ...params
            }
        });

        if (response.data.status !== 'OK') {
            throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
        }

        return response.data;
    } catch (error) {
        console.error('Google Maps API request failed:', error.response?.data || error.message);
        throw new Error(`Google Maps API request failed: ${error.message}`);
    }
};

// Optimize route for multiple delivery stops
export const optimizeDeliveryRoute = async (origin, destinations, vehicleType = 'motorcycle') => {
    try {
        // Use Directions API to get optimal route
        const waypoints = destinations.map(dest => ({ location: dest }));

        const params = {
            origin,
            destination: origin, // Return to origin
            waypoints: waypoints,
            optimize: true, // Let Google optimize the waypoint order
            mode: 'driving',
            avoid: 'tolls|highways',
            units: 'metric'
        };

        if (vehicleType === 'motorcycle') {
            params.mode = 'driving';
            params.avoid = 'tolls|highways|ferries';
        }

        const data = await makeGoogleMapsRequest(DIRECTIONS_API_URL, params);

        // Extract optimized route information
        const route = data.routes[0];

        return {
            success: true,
            optimizedOrder: route.waypoint_order,
            totalDistance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000, // in km
            totalDuration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60, // in minutes
            polyline: route.overview_polyline.points,
            steps: route.legs.map(leg => ({
                startAddress: leg.start_address,
                endAddress: leg.end_address,
                distance: leg.distance.text,
                duration: leg.duration.text,
                instructions: leg.steps.map(step => step.html_instructions)
            })),
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}&waypoints=${waypoints.map(w => encodeURIComponent(w.location)).join('|')}&travelmode=driving`
        };
    } catch (error) {
        console.error('Route optimization failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Calculate distance matrix for multiple locations
export const calculateDistanceMatrix = async (origins, destinations) => {
    try {
        const params = {
            origins: origins.join('|'),
            destinations: destinations.join('|'),
            mode: 'driving',
            units: 'metric'
        };

        const data = await makeGoogleMapsRequest(DISTANCE_MATRIX_API_URL, params);

        return {
            success: true,
            matrix: data.rows.map((row, rowIndex) => ({
                origin: origins[rowIndex],
                distances: row.elements.map((element, colIndex) => ({
                    destination: destinations[colIndex],
                    distance: element.distance?.text || 'N/A',
                    duration: element.duration?.text || 'N/A',
                    status: element.status
                }))
            }))
        };
    } catch (error) {
        console.error('Distance matrix calculation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Geocode address to coordinates
export const geocodeAddress = async (address) => {
    try {
        const params = {
            address,
            components: 'country:KE' // Focus on Kenya
        };

        const data = await makeGoogleMapsRequest(GEOCODING_API_URL, params);

        if (data.results.length === 0) {
            return {
                success: false,
                error: 'No results found for this address'
            };
        }

        const location = data.results[0];

        return {
            success: true,
            formattedAddress: location.formatted_address,
            coordinates: {
                lat: location.geometry.location.lat,
                lng: location.geometry.location.lng
            },
            placeId: location.place_id,
            addressComponents: location.address_components
        };
    } catch (error) {
        console.error('Geocoding failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Reverse geocode coordinates to address
export const reverseGeocode = async (lat, lng) => {
    try {
        const params = {
            latlng: `${lat},${lng}`,
            result_type: 'street_address'
        };

        const data = await makeGoogleMapsRequest(GEOCODING_API_URL, params);

        if (data.results.length === 0) {
            return {
                success: false,
                error: 'No results found for these coordinates'
            };
        }

        return {
            success: true,
            formattedAddress: data.results[0].formatted_address,
            addressComponents: data.results[0].address_components
        };
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Get current traffic conditions for a route
export const getTrafficConditions = async (origin, destination) => {
    try {
        const params = {
            origin,
            destination,
            mode: 'driving',
            departure_time: 'now',
            traffic_model: 'best_guess',
            units: 'metric'
        };

        const data = await makeGoogleMapsRequest(DIRECTIONS_API_URL, params);

        const route = data.routes[0];
        const leg = route.legs[0];

        return {
            success: true,
            distance: leg.distance.text,
            duration: leg.duration.text,
            durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
            trafficDelay: leg.duration_in_traffic ?
                (leg.duration_in_traffic.value - leg.duration.value) / 60 : 0, // in minutes
            steps: leg.steps.map(step => ({
                instruction: step.html_instructions,
                distance: step.distance.text,
                duration: step.duration.text,
                traffic: step.duration_in_traffic ?
                    (step.duration_in_traffic.value - step.duration.value) / 60 : 0
            }))
        };
    } catch (error) {
        console.error('Traffic conditions fetch failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Calculate ETA for a delivery
export const calculateETA = async (origin, destination, vehicleType = 'motorcycle') => {
    try {
        const trafficData = await getTrafficConditions(origin, destination);

        if (!trafficData.success) {
            return trafficData;
        }

        // Adjust ETA based on vehicle type
        let adjustedETA = trafficData.durationInTraffic;

        if (vehicleType === 'motorcycle') {
            // Motorcycles can often navigate traffic faster
            adjustedETA = Math.max(5, parseInt(trafficData.durationInTraffic) * 0.8); // 20% faster
        }

        return {
            success: true,
            eta: adjustedETA,
            distance: trafficData.distance,
            trafficDelay: trafficData.trafficDelay
        };
    } catch (error) {
        console.error('ETA calculation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Validate Google Maps API key
export const validateApiKey = async () => {
    try {
        const params = {
            address: 'Nairobi, Kenya',
            components: 'country:KE'
        };

        const response = await makeGoogleMapsRequest(GEOCODING_API_URL, params);
        return { success: true, valid: response.results.length > 0 };
    } catch (error) {
        return { success: false, valid: false, error: error.message };
    }
};

// Get usage statistics (requires additional setup in Google Cloud Console)
export const getUsageStatistics = async () => {
    try {
        // This would require setting up Google Cloud Monitoring API
        // For now, return a placeholder
        return {
            success: true,
            message: 'Usage statistics would be available with Google Cloud Monitoring setup'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

export default {
    optimizeDeliveryRoute,
    calculateDistanceMatrix,
    geocodeAddress,
    reverseGeocode,
    getTrafficConditions,
    calculateETA,
    validateApiKey,
    getUsageStatistics
};
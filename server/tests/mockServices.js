// Mock services for testing without external API dependencies

// Mock geocoding service
function mockGeocodeAddress(address) {
    console.log('Geocode function called with:', address);
    const kenyanAddresses = {
        'Nairobi, Kenya': { lat: -1.2864, lng: 36.8172 },
        'Nairobi CBD, Kenya': { lat: -1.2864, lng: 36.8172 },
        'Westlands, Nairobi, Kenya': { lat: -1.2655, lng: 36.8036 },
        'Kilimani, Nairobi, Kenya': { lat: -1.2755, lng: 36.8026 },
        'Karen, Nairobi, Kenya': { lat: -1.3214, lng: 36.7188 },
        'Mombasa, Kenya': { lat: -4.0435, lng: 39.6682 },
        'Kisumu, Kenya': { lat: -0.0917, lng: 34.7680 }
    };

    const normalized = address.replace(/\s+/g, ' ').trim();
    console.log(`Normalized: "${normalized}"`);

    // First try exact match
    const exactMatch = Object.entries(kenyanAddresses).find(([key]) => {
        const exact = normalized === key.replace(/\s+/g, ' ');
        console.log(`Exact match "${key}": ${exact}`);
        return exact;
    });

    if (exactMatch) {
        console.log(`Found exact match: YES`);
        return {
            success: true,
            formattedAddress: exactMatch[0],
            coordinates: exactMatch[1]
        };
    }

    // Then try partial match
    const found = Object.entries(kenyanAddresses).find(([key]) => {
        const match = normalized.includes(key.replace(/\s+/g, ' '));
        console.log(`Partial match "${key}": ${match}`);
        return match;
    });
    console.log(`Found partial: ${found ? 'YES' : 'NO'}`);

    if (found) {
        return {
            success: true,
            formattedAddress: found[0],
            coordinates: found[1]
        };
    }

    // Default to Nairobi CBD, but add small variation for testing
    const variations = {
        'Westlands': { lat: -1.2655, lng: 36.8036 },
        'Kilimani': { lat: -1.2755, lng: 36.8026 },
        'Karen': { lat: -1.3214, lng: 36.7188 }
    };

    const variation = Object.entries(variations).find(([key]) => {
        const match = address.toLowerCase().includes(key.toLowerCase());
        return match;
    });

    // If no variation found, check if address contains any suburb name
    if (!variation) {
        if (address.toLowerCase().includes('westlands')) {
            return { success: true, formattedAddress: address, coordinates: variations['Westlands'] };
        }
        if (address.toLowerCase().includes('kilimani')) {
            return { success: true, formattedAddress: address, coordinates: variations['Kilimani'] };
        }
        if (address.toLowerCase().includes('karen')) {
            return { success: true, formattedAddress: address, coordinates: variations['Karen'] };
        }
    }

    if (variation) {
        return {
            success: true,
            formattedAddress: address,
            coordinates: variation[1]
        };
    }

    // Debug: log when defaulting
    console.log(`Mock geocoding defaulting for: "${address}"`);

    // Debug output
    console.log(`DEBUG: Address "${address}" not matched, defaulting to Nairobi CBD`);

    // Default to Nairobi CBD
    return {
        success: true,
        formattedAddress: address,
        coordinates: { lat: -1.2864, lng: 36.8172 }
    };
}

// Mock route optimization
function mockOptimizeDeliveryRoute(origin, destinations, vehicleType = 'motorcycle') {
    // Mock geocode all addresses
    const originGeo = mockGeocodeAddress(origin);
    const destinationGeos = destinations.map(dest => mockGeocodeAddress(dest));

    // Calculate mock distances (straight-line for simplicity)
    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }

    // Calculate total distance (simple sum for mock)
    let totalDistance = 0;
    const waypoints = [];

    // Start from origin
    let currentLat = originGeo.coordinates.lat;
    let currentLng = originGeo.coordinates.lng;

    // Calculate distances to each destination
    for (let i = 0; i < destinationGeos.length; i++) {
        const dest = destinationGeos[i];
        const distance = calculateDistance(currentLat, currentLng, dest.coordinates.lat, dest.coordinates.lng);
        totalDistance += distance;
        waypoints.push({
            originalIndex: i,
            locationIndex: i,
            location: destinations[i],
            distanceFromPrevious: distance
        });
        currentLat = dest.coordinates.lat;
        currentLng = dest.coordinates.lng;
    }

    // Add return to origin (only if we have destinations)
    let returnDistance = 0;
    if (destinationGeos.length > 0) {
        returnDistance = calculateDistance(
            currentLat, currentLng,
            originGeo.coordinates.lat, originGeo.coordinates.lng
        );
        totalDistance += returnDistance;
    }

    // Mock duration based on vehicle type
    const vehicleSpeeds = {
        motorcycle: 35, // km/h urban
        car: 30,
        van: 25
    };
    const speed = vehicleSpeeds[vehicleType] || 35;
    const totalDuration = (totalDistance / speed) * 60; // in minutes

    // Apply Nairobi traffic multiplier (mock)
    const now = new Date();
    const hours = now.getHours();
    let trafficMultiplier = 1.0;
    if (hours >= 7 && hours < 10) trafficMultiplier = 1.3; // morning rush
    if (hours >= 16 && hours < 19) trafficMultiplier = 1.5; // evening rush

    return {
        success: true,
        optimizedOrder: destinations.map((_, i) => i), // Simple order for mock
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        totalDuration: parseFloat((totalDuration * trafficMultiplier).toFixed(1)),
        totalDurationWithoutTraffic: parseFloat(totalDuration.toFixed(1)),
        trafficMultiplier: parseFloat(trafficMultiplier.toFixed(2)),
        estimatedFuelConsumption: parseFloat(((totalDistance * 2.5) / 100).toFixed(2)), // 2.5L/100km for motorcycle
        estimatedCO2Emissions: parseFloat((totalDistance * 0.07).toFixed(2)), // 0.07kg/km for motorcycle
        costEstimate: parseFloat((totalDistance * 2.5 * 180 / 100).toFixed(0)), // KSH
        expectedSpeed: speed,
        efficiencyScore: Math.min(95, 100 - totalDistance * 0.5),
        warnings: getMockWarnings(totalDistance, vehicleType, hours)
    };
}

function getMockWarnings(distance, vehicleType, hours) {
    const warnings = [];

    if (distance > 50) {
        warnings.push('Long-distance route: confirm fuel and rider rest');
    }

    if (vehicleType === 'motorcycle') {
        warnings.push('Motorcycle delivery: helmet and reflective gear required');
    }

    if (hours >= 18 || hours < 6) {
        warnings.push('Night delivery: use well-lit pickup/drop-off confirmation');
    }

    return warnings;
}

// Mock financial calculations
function mockCalculateFuelConsumption(distanceKm, vehicleType) {
    const consumptionRates = {
        motorcycle: 2.5, // liters per 100km
        car: 8.0,
        van: 10.0
    };
    const rate = consumptionRates[vehicleType] || 8.0;
    return parseFloat(((distanceKm * rate) / 100).toFixed(2));
}

function mockCalculateCO2Emissions(distanceKm, vehicleType) {
    const emissionFactors = {
        motorcycle: 0.07, // kg CO2 per km
        car: 0.18,
        van: 0.22
    };
    const factor = emissionFactors[vehicleType] || 0.18;
    return parseFloat((distanceKm * factor).toFixed(2));
}

function mockCalculateCostEstimate(distanceKm, vehicleType) {
    const fuelCostPerLiter = 180; // KSH
    const baseHandling = vehicleType === 'motorcycle' ? 20 : 50;
    return parseFloat(baseHandling + mockCalculateFuelConsumption(distanceKm, vehicleType) * fuelCostPerLiter);
}

export {
    mockGeocodeAddress,
    mockOptimizeDeliveryRoute,
    mockCalculateFuelConsumption,
    mockCalculateCO2Emissions,
    mockCalculateCostEstimate
};
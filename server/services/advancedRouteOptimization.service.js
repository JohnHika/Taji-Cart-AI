import {
    calculateDistanceBetweenCoords,
    calculateETA,
    geocodeAddress,
    optimizeDeliveryRoute
} from './openStreetMap.service.js';

const KENYAN_CITIES = {
    Nairobi: { lat: -1.2864, lng: 36.8172 },
    Mombasa: { lat: -4.0435, lng: 39.6682 },
    Kisumu: { lat: -0.0917, lng: 34.7680 },
    Nakuru: { lat: -0.3031, lng: 36.0800 },
    Eldoret: { lat: 0.5143, lng: 35.2698 }
};

const NAIROBI_TRAFFIC_PATTERNS = {
    morning: { multiplier: 1.3, hours: [7, 10] },
    evening: { multiplier: 1.5, hours: [16, 19] },
    night: { multiplier: 0.85, hours: [22, 6] },
    daytime: { multiplier: 1.0, hours: [10, 16] }
};

const VEHICLE_SPEEDS = {
    bicycle: { urban: 18, rural: 24 },
    motorcycle: { urban: 35, rural: 55 },
    car: { urban: 30, rural: 65 },
    van: { urban: 25, rural: 55 }
};

function getCurrentTimeCategory() {
    const hours = new Date().getHours();
    if (hours >= 7 && hours < 10) return 'morning';
    if (hours >= 16 && hours < 19) return 'evening';
    if (hours >= 22 || hours < 6) return 'night';
    return 'daytime';
}

function getTrafficMultiplier(timeCategory) {
    return NAIROBI_TRAFFIC_PATTERNS[timeCategory]?.multiplier || 1.0;
}

function calculateFuelConsumption(distanceKm, vehicleType) {
    const consumptionRates = {
        bicycle: 0,
        motorcycle: 2.5,
        car: 8.0,
        van: 10.0
    };
    return (distanceKm * (consumptionRates[vehicleType] ?? 8.0)) / 100;
}

function calculateCO2Emissions(distanceKm, vehicleType) {
    const emissionFactors = {
        bicycle: 0,
        motorcycle: 0.07,
        car: 0.18,
        van: 0.22
    };
    return distanceKm * (emissionFactors[vehicleType] ?? 0.18);
}

function calculateCostEstimate(distanceKm, vehicleType) {
    const fuelCostPerLiter = 180;
    const baseHandling = vehicleType === 'bicycle' ? 20 : 50;
    return baseHandling + calculateFuelConsumption(distanceKm, vehicleType) * fuelCostPerLiter;
}

function getExpectedSpeed(vehicleType, distanceKm) {
    const speeds = VEHICLE_SPEEDS[vehicleType] || VEHICLE_SPEEDS.motorcycle;
    return distanceKm < 12 ? speeds.urban : speeds.rural;
}

function getKenyanRoadWarnings(route, vehicleType) {
    const warnings = [...(route.warnings || [])];
    const distance = Number(route.totalDistance || route.distance || 0);
    const hours = new Date().getHours();

    if (distance > 50) {
        warnings.push('Long-distance route: confirm fuel, rider rest, and rural-road readiness.');
    }

    if (vehicleType === 'motorcycle') {
        warnings.push('Motorcycle delivery: helmet and reflective gear required.');
    }

    if (hours >= 18 || hours < 6) {
        warnings.push('Night delivery: use well-lit pickup/drop-off confirmation and live check-ins.');
    }

    return [...new Set(warnings)];
}

export const advancedOptimizeDeliveryRoute = async (
    origin,
    destinations,
    vehicleType = 'motorcycle',
    options = {}
) => {
    const timeCategory = options.timeOfDay || getCurrentTimeCategory();
    const trafficMultiplier = getTrafficMultiplier(timeCategory);
    const route = await optimizeDeliveryRoute(origin, destinations, vehicleType, options);

    if (!route.success) {
        return {
            ...route,
            fallback: 'Route optimization failed before local fallback could complete.'
        };
    }

    const totalDurationWithoutTraffic = route.totalDuration;
    const totalDuration = Number((totalDurationWithoutTraffic * trafficMultiplier).toFixed(1));

    return {
        ...route,
        success: true,
        trafficCategory: timeCategory,
        trafficMultiplier,
        totalDuration,
        totalDurationWithoutTraffic,
        estimatedFuelConsumption: Number(
            calculateFuelConsumption(route.totalDistance, vehicleType).toFixed(2)
        ),
        estimatedCO2Emissions: Number(
            calculateCO2Emissions(route.totalDistance, vehicleType).toFixed(2)
        ),
        costEstimate: Number(calculateCostEstimate(route.totalDistance, vehicleType).toFixed(0)),
        expectedSpeed: getExpectedSpeed(vehicleType, route.totalDistance),
        estimatedArrivalTime: new Date(Date.now() + totalDuration * 60 * 1000).toISOString(),
        warnings: getKenyanRoadWarnings(route, vehicleType)
    };
};

function getDriverCoordinates(driver) {
    if (driver.currentLocation?.lat && driver.currentLocation?.lng) {
        return {
            lat: Number(driver.currentLocation.lat),
            lng: Number(driver.currentLocation.lng)
        };
    }
    return KENYAN_CITIES[driver.assignedZone] || KENYAN_CITIES.Nairobi;
}

function deliveryAddress(delivery) {
    if (delivery.address) return delivery.address;
    if (delivery.delivery_address?.fullAddress) return delivery.delivery_address.fullAddress;
    if (delivery.delivery_address?.street) {
        return `${delivery.delivery_address.street}, ${delivery.delivery_address.city || 'Nairobi'}, Kenya`;
    }
    return 'Nairobi, Kenya';
}

function calculateEfficiencyScore(route, deliveryCount) {
    if (!route.success || deliveryCount === 0) return 0;
    const distancePerDelivery = route.totalDistance / deliveryCount;
    const durationPerDelivery = route.totalDuration / deliveryCount;
    const score = 100 - (distancePerDelivery * 1.8 + durationPerDelivery * 0.4);
    return Math.min(100, Math.max(0, Number(score.toFixed(1))));
}

export const advancedOptimizeMultiDriverRoutes = async (
    drivers,
    deliveries,
    options = {}
) => {
    try {
        const maxDeliveriesPerDriver = Number(options.maxDeliveriesPerDriver || 5);
        if (!drivers?.length || !deliveries?.length) {
            return { success: false, message: 'No drivers or deliveries provided' };
        }

        const assignments = drivers.map(driver => ({
            driverId: driver._id,
            driverName: driver.name,
            vehicleType: driver.vehicleDetails?.type || 'motorcycle',
            currentLocation: getDriverCoordinates(driver),
            assignedDeliveries: []
        }));

        for (const delivery of deliveries) {
            const geocoded = await geocodeAddress(deliveryAddress(delivery));
            if (!geocoded.success) continue;

            const available = assignments
                .filter(driver => driver.assignedDeliveries.length < maxDeliveriesPerDriver)
                .sort((left, right) => {
                    const leftDistance = calculateDistanceBetweenCoords(
                        left.currentLocation,
                        geocoded.coordinates
                    );
                    const rightDistance = calculateDistanceBetweenCoords(
                        right.currentLocation,
                        geocoded.coordinates
                    );
                    const leftLoadPenalty = left.assignedDeliveries.length * 4;
                    const rightLoadPenalty = right.assignedDeliveries.length * 4;
                    return (leftDistance + leftLoadPenalty) - (rightDistance + rightLoadPenalty);
                });

            if (available[0]) {
                available[0].assignedDeliveries.push({
                    orderId: delivery._id || delivery.orderId,
                    address: deliveryAddress(delivery),
                    coordinates: geocoded.coordinates,
                    amount: delivery.totalAmt || delivery.amount || 0
                });
            }
        }

        const optimizedRoutes = [];
        for (const assignment of assignments) {
            if (assignment.assignedDeliveries.length === 0) continue;

            const origin = `${assignment.currentLocation.lat},${assignment.currentLocation.lng}`;
            const route = await advancedOptimizeDeliveryRoute(
                origin,
                assignment.assignedDeliveries.map(delivery => delivery.address),
                assignment.vehicleType,
                options
            );

            optimizedRoutes.push({
                ...assignment,
                route,
                efficiencyScore: calculateEfficiencyScore(
                    route,
                    assignment.assignedDeliveries.length
                )
            });
        }

        optimizedRoutes.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

        return {
            success: true,
            totalDrivers: assignments.length,
            totalDeliveries: deliveries.length,
            assignedDeliveries: optimizedRoutes.reduce(
                (sum, route) => sum + route.assignedDeliveries.length,
                0
            ),
            unassignedDeliveries:
                deliveries.length -
                optimizedRoutes.reduce((sum, route) => sum + route.assignedDeliveries.length, 0),
            optimizedRoutes
        };
    } catch (error) {
        console.error('Advanced multi-driver optimization failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const advancedCalculateETA = async (
    origin,
    destination,
    vehicleType = 'motorcycle',
    options = {}
) => {
    const timeCategory = options.timeOfDay || getCurrentTimeCategory();
    const trafficMultiplier = getTrafficMultiplier(timeCategory);
    const eta = await calculateETA(origin, destination, vehicleType);

    if (!eta.success) return eta;

    const etaWithoutTraffic = eta.eta;
    const etaWithTraffic = Number((etaWithoutTraffic * trafficMultiplier).toFixed(1));
    const trafficDelay = Number((etaWithTraffic - etaWithoutTraffic).toFixed(1));

    return {
        ...eta,
        eta: etaWithTraffic,
        etaWithoutTraffic,
        etaWithTraffic,
        trafficCategory: timeCategory,
        trafficMultiplier,
        trafficDelay,
        vehicleSpeed: getExpectedSpeed(vehicleType, eta.distance),
        estimatedArrivalTime: new Date(Date.now() + etaWithTraffic * 60 * 1000).toISOString(),
        fuelConsumption: Number(calculateFuelConsumption(eta.distance, vehicleType).toFixed(2)),
        co2Emissions: Number(calculateCO2Emissions(eta.distance, vehicleType).toFixed(2)),
        costEstimate: Number(calculateCostEstimate(eta.distance, vehicleType).toFixed(0)),
        warnings: options.includeWarnings === false
            ? eta.warnings || []
            : getKenyanRoadWarnings({ ...eta, totalDistance: eta.distance }, vehicleType)
    };
};

export default {
    advancedOptimizeDeliveryRoute,
    advancedOptimizeMultiDriverRoutes,
    advancedCalculateETA,
    calculateDistanceBetweenCoords,
    getTrafficMultiplier,
    calculateFuelConsumption,
    calculateCO2Emissions
};

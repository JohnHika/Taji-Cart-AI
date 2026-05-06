import axios from 'axios';

const NOMINATIM_SEARCH_URL =
    process.env.NOMINATIM_SEARCH_URL || 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL =
    process.env.NOMINATIM_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse';
const OPENROUTE_BASE_URL =
    process.env.OPENROUTE_BASE_URL || 'https://api.openrouteservice.org';
const OPENROUTE_API_KEY =
    process.env.OPENROUTE_API_KEY || process.env.ORS_API_KEY || '';
const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT ||
    'TajiCartAI/1.0 (delivery-routing; contact: admin@nawirihairke.com)';

const NOMINATIM_MIN_INTERVAL_MS = 1100;
const DEFAULT_START = { lat: -1.2864, lng: 36.8172 };
const DEFAULT_AVERAGE_SPEED_KMH = {
    bicycle: 18,
    motorcycle: 32,
    car: 28,
    van: 24
};

const geocodeCache = new Map();
let lastNominatimRequestAt = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeAddress(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
        if (value.fullAddress) return String(value.fullAddress).trim();
        const parts = [
            value.address,
            value.street,
            value.city,
            value.county,
            value.country
        ].filter(Boolean);
        return parts.join(', ').trim();
    }
    return String(value).trim();
}

function parseCoordinateInput(value) {
    if (!value) return null;

    if (typeof value === 'object') {
        const lat = Number(value.lat ?? value.latitude);
        const lng = Number(value.lng ?? value.lon ?? value.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }

    if (typeof value !== 'string') return null;

    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function withKenyaBias(address) {
    const normalized = normalizeAddress(address);
    if (!normalized) return 'Nairobi, Kenya';
    return /kenya|ke$/i.test(normalized) ? normalized : `${normalized}, Kenya`;
}

function toLngLat(coordinates) {
    return [coordinates.lng, coordinates.lat];
}

function toLatLngObject(location) {
    return {
        lat: Number(location.lat),
        lng: Number(location.lon)
    };
}

function hasOpenRouteKey() {
    return Boolean(
        OPENROUTE_API_KEY &&
        OPENROUTE_API_KEY !== 'your-secret-key' &&
        !OPENROUTE_API_KEY.includes('undefined')
    );
}

async function throttleNominatim() {
    const elapsed = Date.now() - lastNominatimRequestAt;
    if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
        await sleep(NOMINATIM_MIN_INTERVAL_MS - elapsed);
    }
    lastNominatimRequestAt = Date.now();
}

async function makeNominatimRequest(url, params) {
    await throttleNominatim();
    const response = await axios.get(url, {
        params: {
            format: 'jsonv2',
            addressdetails: 1,
            countrycodes: 'ke',
            ...params
        },
        headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            'Accept-Language': 'en'
        },
        timeout: 15000
    });
    return response.data;
}

async function makeOpenRouteRequest(path, data) {
    if (!hasOpenRouteKey()) {
        throw new Error('OPENROUTE_API_KEY is not configured');
    }

    const response = await axios.post(`${OPENROUTE_BASE_URL}${path}`, data, {
        headers: {
            Authorization: OPENROUTE_API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 25000
    });

    if (response.data?.error) {
        throw new Error(response.data.error.message || 'OpenRouteService error');
    }

    return response.data;
}

export function calculateDistanceBetweenCoords(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const hav =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function buildLocalMatrix(locations, vehicleType = 'motorcycle') {
    const speedKmh =
        DEFAULT_AVERAGE_SPEED_KMH[vehicleType] || DEFAULT_AVERAGE_SPEED_KMH.motorcycle;

    const distances = locations.map(from =>
        locations.map(to => calculateDistanceBetweenCoords(from, to) * 1.25)
    );

    const durations = distances.map(row =>
        row.map(distanceKm => (distanceKm / speedKmh) * 3600)
    );

    return {
        provider: 'local-haversine',
        distances,
        durations
    };
}

async function buildRouteMatrix(locations, vehicleType = 'motorcycle') {
    if (!hasOpenRouteKey()) {
        return buildLocalMatrix(locations, vehicleType);
    }

    try {
        const data = await makeOpenRouteRequest('/v2/matrix/driving-car', {
            locations: locations.map(toLngLat),
            metrics: ['distance', 'duration'],
            units: 'm'
        });

        return {
            provider: 'openrouteservice',
            distances: data.distances.map(row => row.map(value => value / 1000)),
            durations: data.durations
        };
    } catch (error) {
        console.warn('OpenRouteService matrix failed, using local fallback:', error.message);
        return buildLocalMatrix(locations, vehicleType);
    }
}

function sequenceCost(order, matrix) {
    if (order.length === 0) return 0;

    let cost = matrix[0][order[0] + 1];
    for (let i = 0; i < order.length - 1; i += 1) {
        cost += matrix[order[i] + 1][order[i + 1] + 1];
    }
    cost += matrix[order[order.length - 1] + 1][0];
    return cost;
}

function nearestNeighborOrder(matrix, destinationCount) {
    const remaining = new Set(
        Array.from({ length: destinationCount }, (_value, index) => index)
    );
    const order = [];
    let currentMatrixIndex = 0;

    while (remaining.size > 0) {
        let best = null;
        let bestDistance = Infinity;

        for (const destinationIndex of remaining) {
            const matrixIndex = destinationIndex + 1;
            const distance = matrix[currentMatrixIndex][matrixIndex];
            if (distance < bestDistance) {
                best = destinationIndex;
                bestDistance = distance;
            }
        }

        order.push(best);
        remaining.delete(best);
        currentMatrixIndex = best + 1;
    }

    return order;
}

function twoOpt(order, matrix) {
    if (order.length < 4) return order;

    let improved = true;
    let best = [...order];
    let bestCost = sequenceCost(best, matrix);

    while (improved) {
        improved = false;

        for (let i = 0; i < best.length - 2; i += 1) {
            for (let j = i + 2; j < best.length; j += 1) {
                const candidate = [
                    ...best.slice(0, i + 1),
                    ...best.slice(i + 1, j + 1).reverse(),
                    ...best.slice(j + 1)
                ];
                const candidateCost = sequenceCost(candidate, matrix);

                if (candidateCost + 0.001 < bestCost) {
                    best = candidate;
                    bestCost = candidateCost;
                    improved = true;
                }
            }
        }
    }

    return best;
}

function buildGoogleMapsUrl(origin, orderedDestinations) {
    const waypointText = orderedDestinations.map(dest =>
        `${dest.coordinates.lat},${dest.coordinates.lng}`
    );

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.coordinates.lat + ',' + origin.coordinates.lng)}&destination=${encodeURIComponent(origin.coordinates.lat + ',' + origin.coordinates.lng)}&waypoints=${encodeURIComponent(waypointText.join('|'))}&travelmode=driving`;
}

function buildOpenRouteServiceUrl(origin, orderedDestinations) {
    const points = [
        `${origin.coordinates.lng},${origin.coordinates.lat}`,
        ...orderedDestinations.map(dest => `${dest.coordinates.lng},${dest.coordinates.lat}`),
        `${origin.coordinates.lng},${origin.coordinates.lat}`
    ];
    return `https://maps.openrouteservice.org/directions?n1=${origin.coordinates.lat}&n2=${origin.coordinates.lng}&a=${points.join(',')}`;
}

function buildFallbackGeometry(origin, orderedDestinations) {
    return {
        type: 'LineString',
        coordinates: [
            toLngLat(origin.coordinates),
            ...orderedDestinations.map(dest => toLngLat(dest.coordinates)),
            toLngLat(origin.coordinates)
        ]
    };
}

function summarizeOrderedRoute(order, distances, durations) {
    if (order.length === 0) {
        return { distanceKm: 0, durationSeconds: 0, legs: [] };
    }

    const matrixPath = [0, ...order.map(index => index + 1), 0];
    let distanceKm = 0;
    let durationSeconds = 0;
    const legs = [];

    for (let i = 0; i < matrixPath.length - 1; i += 1) {
        const from = matrixPath[i];
        const to = matrixPath[i + 1];
        const legDistance = distances[from][to];
        const legDuration = durations[from][to];
        distanceKm += legDistance;
        durationSeconds += legDuration;
        legs.push({
            distance: legDistance,
            duration: legDuration / 60,
            instructions: ['Proceed to next delivery stop']
        });
    }

    return { distanceKm, durationSeconds, legs };
}

async function fetchDetailedRoute(originGeo, orderedDestinationGeos, vehicleType, fallbackSummary) {
    if (!hasOpenRouteKey()) {
        return {
            provider: 'local-haversine',
            distanceKm: fallbackSummary.distanceKm,
            durationSeconds: fallbackSummary.durationSeconds,
            geometry: buildFallbackGeometry(originGeo, orderedDestinationGeos),
            encodedPolyline: null,
            legs: fallbackSummary.legs,
            warnings: ['OpenRouteService key is not configured; using local distance estimates.']
        };
    }

    try {
        const data = await makeOpenRouteRequest('/v2/directions/driving-car', {
            coordinates: [
                toLngLat(originGeo.coordinates),
                ...orderedDestinationGeos.map(dest => toLngLat(dest.coordinates)),
                toLngLat(originGeo.coordinates)
            ],
            instructions: true,
            preference: vehicleType === 'bicycle' ? 'recommended' : 'fastest',
            units: 'm',
            geometry_simplify: true
        });

        const route = data.routes?.[0];
        if (!route) throw new Error('No route returned');

        return {
            provider: 'openrouteservice',
            distanceKm: route.summary.distance / 1000,
            durationSeconds: route.summary.duration,
            geometry: null,
            encodedPolyline: route.geometry,
            legs: (route.segments || []).map(segment => ({
                distance: segment.distance / 1000,
                duration: segment.duration / 60,
                instructions: (segment.steps || []).map(step => step.instruction)
            })),
            warnings: []
        };
    } catch (error) {
        console.warn('OpenRouteService directions failed, using local fallback:', error.message);
        return {
            provider: 'local-haversine',
            distanceKm: fallbackSummary.distanceKm,
            durationSeconds: fallbackSummary.durationSeconds,
            geometry: buildFallbackGeometry(originGeo, orderedDestinationGeos),
            encodedPolyline: null,
            legs: fallbackSummary.legs,
            warnings: [`OpenRouteService route failed: ${error.message}`]
        };
    }
}

export const geocodeAddress = async (address) => {
    try {
        const coordinateInput = parseCoordinateInput(address);
        if (coordinateInput) {
            return {
                success: true,
                formattedAddress: `${coordinateInput.lat},${coordinateInput.lng}`,
                coordinates: coordinateInput,
                source: 'coordinates',
                addressDetails: {}
            };
        }

        const query = withKenyaBias(address);
        const cacheKey = query.toLowerCase();
        if (geocodeCache.has(cacheKey)) {
            return geocodeCache.get(cacheKey);
        }

        const data = await makeNominatimRequest(NOMINATIM_SEARCH_URL, {
            q: query,
            limit: 5
        });

        if (!Array.isArray(data) || data.length === 0) {
            return {
                success: false,
                error: `No location found for "${normalizeAddress(address)}"`
            };
        }

        const location = data[0];
        const result = {
            success: true,
            formattedAddress: location.display_name,
            coordinates: toLatLngObject(location),
            placeId: location.place_id,
            source: 'nominatim',
            addressDetails: {
                city: location.address?.city || location.address?.town || location.address?.village,
                county: location.address?.county,
                country: location.address?.country,
                road: location.address?.road,
                neighbourhood: location.address?.neighbourhood || location.address?.suburb
            }
        };

        geocodeCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Geocoding failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const reverseGeocode = async (lat, lng) => {
    try {
        const data = await makeNominatimRequest(NOMINATIM_REVERSE_URL, {
            lat,
            lon: lng,
            zoom: 18
        });

        if (!data || data.error) {
            return {
                success: false,
                error: data?.error || 'No address found for these coordinates'
            };
        }

        return {
            success: true,
            formattedAddress: data.display_name,
            coordinates: { lat: Number(lat), lng: Number(lng) },
            addressDetails: data.address || {}
        };
    } catch (error) {
        console.error('Reverse geocoding failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const optimizeDeliveryRoute = async (
    origin,
    destinations,
    vehicleType = 'motorcycle',
    options = {}
) => {
    try {
        const normalizedDestinations = (destinations || []).filter(Boolean);
        if (normalizedDestinations.length === 0) {
            return { success: false, error: 'At least one destination is required' };
        }

        const maxStops = Number(options.maxStops || 25);
        if (normalizedDestinations.length > maxStops) {
            return {
                success: false,
                error: `Maximum ${maxStops} stops allowed for one optimized route`
            };
        }

        const originGeo = await geocodeAddress(origin || DEFAULT_START);
        if (!originGeo.success) {
            throw new Error(`Origin geocoding failed: ${originGeo.error}`);
        }

        const destinationGeos = [];
        for (const destination of normalizedDestinations) {
            const geocoded = await geocodeAddress(destination);
            if (!geocoded.success) {
                throw new Error(`Destination geocoding failed: ${geocoded.error}`);
            }
            destinationGeos.push(geocoded);
        }

        const allLocations = [
            originGeo.coordinates,
            ...destinationGeos.map(dest => dest.coordinates)
        ];
        const matrix = await buildRouteMatrix(allLocations, vehicleType);
        const initialOrder = nearestNeighborOrder(
            matrix.distances,
            destinationGeos.length
        );
        const optimizedOrder = twoOpt(initialOrder, matrix.distances);
        const orderedDestinationGeos = optimizedOrder.map(index => destinationGeos[index]);
        const fallbackSummary = summarizeOrderedRoute(
            optimizedOrder,
            matrix.distances,
            matrix.durations
        );
        const detailedRoute = await fetchDetailedRoute(
            originGeo,
            orderedDestinationGeos,
            vehicleType,
            fallbackSummary
        );

        const googleMapsUrl = buildGoogleMapsUrl(originGeo, orderedDestinationGeos);
        const openRouteServiceUrl = buildOpenRouteServiceUrl(originGeo, orderedDestinationGeos);

        return {
            success: true,
            provider: detailedRoute.provider,
            matrixProvider: matrix.provider,
            optimizedOrder,
            totalStops: normalizedDestinations.length,
            totalDistance: Number(detailedRoute.distanceKm.toFixed(2)),
            totalDuration: Number((detailedRoute.durationSeconds / 60).toFixed(1)),
            polyline: detailedRoute.encodedPolyline,
            geometry: detailedRoute.geometry,
            steps: detailedRoute.legs,
            waypoints: [
                {
                    type: 'origin',
                    address: originGeo.formattedAddress,
                    coordinates: originGeo.coordinates
                },
                ...orderedDestinationGeos.map((destination, sequenceIndex) => ({
                    type: 'stop',
                    originalIndex: optimizedOrder[sequenceIndex],
                    sequenceIndex,
                    address: destination.formattedAddress,
                    coordinates: destination.coordinates
                })),
                {
                    type: 'return',
                    address: originGeo.formattedAddress,
                    coordinates: originGeo.coordinates
                }
            ],
            googleMapsUrl,
            mapsUrl: googleMapsUrl,
            openRouteServiceUrl,
            warnings: detailedRoute.warnings
        };
    } catch (error) {
        console.error('Route optimization failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const calculateDistanceMatrix = async (origins, destinations) => {
    try {
        const originGeos = [];
        const destinationGeos = [];

        for (const origin of origins || []) {
            const geocoded = await geocodeAddress(origin);
            if (!geocoded.success) throw new Error(`Origin geocoding failed: ${geocoded.error}`);
            originGeos.push(geocoded);
        }

        for (const destination of destinations || []) {
            const geocoded = await geocodeAddress(destination);
            if (!geocoded.success) throw new Error(`Destination geocoding failed: ${geocoded.error}`);
            destinationGeos.push(geocoded);
        }

        const locations = [
            ...originGeos.map(origin => origin.coordinates),
            ...destinationGeos.map(destination => destination.coordinates)
        ];
        const matrixData = await buildRouteMatrix(locations);
        const originCount = originGeos.length;

        const matrix = originGeos.map((origin, originIndex) =>
            destinationGeos.map((destination, destinationIndex) => {
                const destinationMatrixIndex = originCount + destinationIndex;
                return {
                    origin: origins[originIndex],
                    destination: destinations[destinationIndex],
                    originCoordinates: origin.coordinates,
                    destinationCoordinates: destination.coordinates,
                    distance: Number(matrixData.distances[originIndex][destinationMatrixIndex].toFixed(2)),
                    duration: Number((matrixData.durations[originIndex][destinationMatrixIndex] / 60).toFixed(1))
                };
            })
        );

        return {
            success: true,
            provider: matrixData.provider,
            matrix
        };
    } catch (error) {
        console.error('Distance matrix calculation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const calculateETA = async (origin, destination, vehicleType = 'motorcycle') => {
    try {
        const route = await optimizeDeliveryRoute(origin, [destination], vehicleType, {
            maxStops: 1
        });

        if (!route.success) return route;

        const etaMinutes = route.totalDuration;
        const estimatedArrivalTime = new Date(
            Date.now() + etaMinutes * 60 * 1000
        ).toISOString();

        return {
            success: true,
            provider: route.provider,
            eta: etaMinutes,
            distance: route.totalDistance,
            estimatedArrivalTime,
            trafficDelay: 0,
            googleMapsUrl: route.googleMapsUrl,
            openRouteServiceUrl: route.openRouteServiceUrl,
            warnings: route.warnings
        };
    } catch (error) {
        console.error('ETA calculation failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

export const validateApiKey = async () => {
    if (!hasOpenRouteKey()) {
        return {
            success: true,
            valid: false,
            fallbackAvailable: true,
            message: 'OPENROUTE_API_KEY is not configured; local routing fallback is available.'
        };
    }

    try {
        const data = await makeOpenRouteRequest('/v2/directions/driving-car', {
            coordinates: [[36.8172, -1.2864], [36.8219, -1.2847]]
        });

        return {
            success: true,
            valid: Array.isArray(data.routes) && data.routes.length > 0,
            fallbackAvailable: true
        };
    } catch (error) {
        return {
            success: true,
            valid: false,
            fallbackAvailable: true,
            error: error.message
        };
    }
};

export const getUsageStatistics = async () => ({
    success: true,
    provider: hasOpenRouteKey() ? 'openrouteservice' : 'local-haversine',
    message: hasOpenRouteKey()
        ? 'OpenRouteService key configured. Matrix and directions APIs are used with local fallback.'
        : 'No OpenRouteService key configured. Local routing estimates are active.'
});

export default {
    geocodeAddress,
    reverseGeocode,
    optimizeDeliveryRoute,
    calculateDistanceMatrix,
    calculateETA,
    validateApiKey,
    getUsageStatistics,
    calculateDistanceBetweenCoords
};

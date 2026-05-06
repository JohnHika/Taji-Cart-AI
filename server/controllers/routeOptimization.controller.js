import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import OrderModel from '../models/order.model.js';

// Helper function to get current time category
function getCurrentTimeCategory() {
    const now = new Date();
    const hours = now.getHours();

    if (hours >= 7 && hours < 10) return 'morning';
    if (hours >= 16 && hours < 19) return 'evening';
    if (hours >= 22 || hours < 6) return 'night';
    return 'daytime';
}
import {
    advancedOptimizeDeliveryRoute,
    advancedOptimizeMultiDriverRoutes,
    advancedCalculateETA
} from '../services/advancedRouteOptimization.service.js';

function formatDeliveryAddress(address) {
    if (!address || typeof address !== 'object') return 'Nairobi, Kenya';

    if (address.fullAddress) return address.fullAddress;
    if (address.address_line) {
        return [
            address.address_line,
            address.city,
            address.state,
            address.country || 'Kenya'
        ].filter(Boolean).join(', ');
    }
    if (address.street) {
        return [
            address.street,
            address.city || address.town || 'Nairobi',
            address.country || 'Kenya'
        ].filter(Boolean).join(', ');
    }

    return 'Nairobi, Kenya';
}

function parseLocationString(location) {
    const [lat, lng] = String(location).split(',').map(Number);
    return {
        lat: Number.isFinite(lat) ? lat : -1.2864,
        lng: Number.isFinite(lng) ? lng : 36.8172
    };
}

// Optimize delivery route for a driver
export const optimizeDriverRoute = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { maxDeliveries = 5 } = req.query;

        // Find driver
        const driver = await DriverPersonnelModel.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (driver.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'Only verified drivers can have routes optimized'
            });
        }

        // Get driver's current location or use their assigned zone
        let origin;
        if (driver.currentLocation?.lat && driver.currentLocation?.lng) {
            origin = `${driver.currentLocation.lat},${driver.currentLocation.lng}`;
        } else {
            // Use a default location based on zone
            const zoneLocations = {
                north: '-1.2345,36.8126', // Example: Westlands
                south: '-1.3214,36.8567',  // Example: Karen
                east: '-1.2921,36.8945',   // Example: Embakasi
                west: '-1.2834,36.7654',   // Example: Ngong Road
                central: '-1.2864,36.8172' // Example: CBD
            };
            origin = zoneLocations[driver.assignedZone] || '-1.2864,36.8172'; // Default to CBD
        }

        // Find pending deliveries for this driver
        const pendingDeliveries = await OrderModel.find({
            status: { $in: ['dispatched', 'driver_assigned'] },
            deliveryPersonnel: driverId,
            fulfillment_type: 'delivery'
        })
        .select('delivery_address orderId totalAmt')
        .populate('delivery_address')
        .limit(parseInt(maxDeliveries));

        if (pendingDeliveries.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No pending deliveries found for this driver'
            });
        }

        // Extract delivery addresses
        const destinations = pendingDeliveries.map(order =>
            formatDeliveryAddress(order.delivery_address)
        );

        // Use advanced optimization with Kenyan traffic patterns
        const timeOfDay = getCurrentTimeCategory();
        const routeData = await advancedOptimizeDeliveryRoute(origin, destinations, driver.vehicleDetails?.type || 'motorcycle', { timeOfDay });

        if (!routeData.success) {
            return res.status(500).json({
                success: false,
                message: 'Route optimization failed',
                error: routeData.error
            });
        }

        const originLocation = parseLocationString(origin);
        const routeStops = (routeData.waypoints || []).filter(
            waypoint => waypoint.type === 'stop'
        );

        // Update driver's current route
        driver.currentRoute = {
            startLocation: originLocation,
            waypoints: routeStops.map((waypoint, waypointIndex) => ({
                lat: waypoint.coordinates.lat,
                lng: waypoint.coordinates.lng,
                orderId: pendingDeliveries[waypoint.originalIndex]._id,
                originalIndex: waypoint.originalIndex,
                waypointIndex
            })),
            endLocation: originLocation,
            estimatedDuration: routeData.totalDuration,
            estimatedDistance: routeData.totalDistance,
            optimizedAt: new Date()
        };

        await driver.save();

        // Prepare response with order details in optimized order
        const optimizedOrders = routeStops.map(waypoint => {
            const orderIndex = waypoint.originalIndex;
            const order = pendingDeliveries[orderIndex];
            return {
                orderId: order._id,
                deliveryAddress: order.delivery_address,
                amount: order.totalAmt,
                coordinates: waypoint.coordinates,
                sequenceIndex: waypoint.sequenceIndex
            };
        });

        res.status(200).json({
            success: true,
            data: {
                driverId: driver._id,
                driverName: driver.name,
                origin,
                optimizedRoute: routeData,
                orders: optimizedOrders,
                googleMapsUrl: routeData.googleMapsUrl,
                openRouteServiceUrl: routeData.openRouteServiceUrl
            }
        });

    } catch (error) {
        console.error('Error optimizing driver route:', error);
        res.status(500).json({
            success: false,
            message: 'Error optimizing driver route',
            error: error.message
        });
    }
};

// Get optimized route for multiple drivers (dispatch optimization)
export const optimizeMultiDriverRoutes = async (req, res) => {
    try {
        const { zone, maxDrivers = 3 } = req.query;

        // Find available drivers in the zone
        const availableDrivers = await DriverPersonnelModel.find({
            verificationStatus: 'verified',
            isAvailable: true,
            assignedZone: zone || { $exists: true }
        }).limit(parseInt(maxDrivers));

        if (availableDrivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No available drivers found'
            });
        }

        // Find pending deliveries in the zone
        const pendingDeliveries = await OrderModel.find({
            status: 'pending',
            fulfillment_type: 'delivery'
        }).select('delivery_address orderId totalAmt')
        .populate('delivery_address')
        .limit(availableDrivers.length * 5); // Max 5 deliveries per driver

        if (pendingDeliveries.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No pending deliveries found'
            });
        }

        const timeOfDay = getCurrentTimeCategory();
        const dispatchPlan = await advancedOptimizeMultiDriverRoutes(
            availableDrivers,
            pendingDeliveries,
            { timeOfDay, maxDeliveriesPerDriver: 5 }
        );

        if (!dispatchPlan.success) {
            return res.status(500).json({
                success: false,
                message: 'Multi-driver route optimization failed',
                error: dispatchPlan.error || dispatchPlan.message
            });
        }

        res.status(200).json({
            success: true,
            data: {
                zone: zone || 'all',
                totalDrivers: availableDrivers.length,
                totalDeliveries: pendingDeliveries.length,
                assignments: dispatchPlan.optimizedRoutes,
                unassignedDeliveries: dispatchPlan.unassignedDeliveries
            }
        });

    } catch (error) {
        console.error('Error optimizing multi-driver routes:', error);
        res.status(500).json({
            success: false,
            message: 'Error optimizing multi-driver routes',
            error: error.message
        });
    }
};

// Calculate ETA for a specific delivery
export const calculateDeliveryETA = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel.findById(orderId).populate('delivery_address');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get origin (warehouse or driver location)
        const origin = '-1.2864,36.8172'; // Default to Nairobi CBD

        // Get destination
        const destination = formatDeliveryAddress(order.delivery_address);

        const timeOfDay = getCurrentTimeCategory();
        const etaData = await advancedCalculateETA(origin, destination, 'motorcycle', { timeOfDay, includeWarnings: true });

        if (!etaData.success) {
            return res.status(500).json({
                success: false,
                message: 'ETA calculation failed',
                error: etaData.error
            });
        }

        // Update order with ETA
        order.estimatedDeliveryTime = etaData.estimatedArrivalTime
            ? new Date(etaData.estimatedArrivalTime)
            : new Date(Date.now() + etaData.eta * 60 * 1000);
        await order.save();

        res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                eta: etaData.eta,
                distance: etaData.distance,
                trafficDelay: etaData.trafficDelay,
                estimatedArrivalTime: etaData.estimatedArrivalTime,
                provider: etaData.provider,
                warnings: etaData.warnings
            }
        });

    } catch (error) {
        console.error('Error calculating delivery ETA:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating delivery ETA',
            error: error.message
        });
    }
};

// OpenStreetMap doesn't provide real-time traffic data, so this feature is removed
// The free solution focuses on route optimization without traffic data

// Validate OpenStreetMap API key
export const validateOpenStreetMapApiKey = async (req, res) => {
    try {
        const { validateApiKey } = await import('../services/openStreetMap.service.js');
        const result = await validateApiKey();

        res.status(200).json({
            success: true,
            valid: result.valid,
            message: result.valid ? 'OpenStreetMap API is working' : 'OpenStreetMap API validation failed',
            info: 'OpenRouteService provides 2000 free requests per day'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            valid: false,
            message: 'Error validating OpenStreetMap API',
            error: error.message
        });
    }
};

// Get driver's current optimized route
export const getDriverCurrentRoute = async (req, res) => {
    try {
        const { driverId } = req.params;

        const driver = await DriverPersonnelModel.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (!driver.currentRoute) {
            return res.status(404).json({
                success: false,
                message: 'No active route found for this driver'
            });
        }

        // Get order details for each waypoint
        const orders = await OrderModel.find({
            _id: { $in: driver.currentRoute.waypoints.map(w => w.orderId) }
        }).select('orderId delivery_address status totalAmt')
        .populate('delivery_address');

        res.status(200).json({
            success: true,
            data: {
                driverId: driver._id,
                driverName: driver.name,
                currentRoute: driver.currentRoute,
                orders: orders.map(order => ({
                    orderId: order._id,
                    status: order.status,
                    address: order.delivery_address,
                    amount: order.totalAmt
                })),
                lastUpdated: driver.currentRoute.optimizedAt
            }
        });

    } catch (error) {
        console.error('Error getting driver current route:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting driver current route',
            error: error.message
        });
    }
};

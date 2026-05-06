import DriverPerformanceModel from '../models/driverperformance.model.js';
import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import OrderModel from '../models/order.model.js';

// Get driver performance summary
export const getDriverPerformanceSummary = async (req, res) => {
    try {
        const { driverId } = req.params;

        const performance = await DriverPerformanceModel.findOne({ driverId });

        if (!performance) {
            return res.status(404).json({
                success: false,
                message: 'Performance records not found'
            });
        }

        res.status(200).json({
            success: true,
            data: performance
        });

    } catch (error) {
        console.error('Error fetching performance summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance summary',
            error: error.message
        });
    }
};

// Update delivery performance metrics
export const updateDeliveryPerformance = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { driverId, isOnTime, deliveryTime, rating } = req.body;

        // Validate order
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find or create performance record
        let performance = await DriverPerformanceModel.findOne({ driverId });
        if (!performance) {
            performance = new DriverPerformanceModel({ driverId });
        }

        // Update metrics
        performance.currentMetrics.successfulDeliveries += 1;

        if (isOnTime) {
            performance.currentMetrics.onTimeDeliveries += 1;
        } else {
            performance.currentMetrics.lateDeliveries += 1;
        }

        // Update delivery time average
        const totalDeliveries = performance.currentMetrics.successfulDeliveries;
        const currentAvgTime = performance.currentMetrics.averageDeliveryTime;
        performance.currentMetrics.averageDeliveryTime =
            ((currentAvgTime * (totalDeliveries - 1)) + deliveryTime) / totalDeliveries;

        // Update rating if provided
        if (rating) {
            performance.currentMetrics.customerRatings.push({
                rating,
                date: new Date()
            });

            // Calculate new average rating
            const ratingsSum = performance.currentMetrics.customerRatings.reduce((sum, r) => sum + r.rating, 0);
            performance.currentMetrics.averageRating = ratingsSum / performance.currentMetrics.customerRatings.length;
        }

        // Calculate reliability score (0-100)
        const onTimeRate = performance.currentMetrics.onTimeDeliveries / totalDeliveries;
        const avgRating = performance.currentMetrics.averageRating || 0;
        performance.currentMetrics.reliabilityScore = Math.round(
            (onTimeRate * 50) + (avgRating * 10)
        );

        // Update last performance update
        performance.lastPerformanceUpdate = new Date();

        await performance.save();

        res.status(200).json({
            success: true,
            message: 'Performance updated successfully',
            data: performance
        });

    } catch (error) {
        console.error('Error updating delivery performance:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating delivery performance',
            error: error.message
        });
    }
};

// Record cancelled delivery
export const recordCancelledDelivery = async (req, res) => {
    try {
        const { driverId } = req.params;

        let performance = await DriverPerformanceModel.findOne({ driverId });
        if (!performance) {
            performance = new DriverPerformanceModel({ driverId });
        }

        performance.currentMetrics.cancelledDeliveries += 1;
        performance.currentMetrics.reliabilityScore = Math.max(0, performance.currentMetrics.reliabilityScore - 5);
        performance.lastPerformanceUpdate = new Date();

        await performance.save();

        res.status(200).json({
            success: true,
            message: 'Cancelled delivery recorded',
            data: performance
        });

    } catch (error) {
        console.error('Error recording cancelled delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording cancelled delivery',
            error: error.message
        });
    }
};

// Get performance history
export const getPerformanceHistory = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { year } = req.query;

        const performance = await DriverPerformanceModel.findOne({ driverId });

        if (!performance) {
            return res.status(404).json({
                success: false,
                message: 'Performance records not found'
            });
        }

        // Filter by year if provided
        let history = performance.performanceHistory;
        if (year) {
            history = history.filter(item => item.year == year);
        }

        res.status(200).json({
            success: true,
            data: {
                currentMetrics: performance.currentMetrics,
                history
            }
        });

    } catch (error) {
        console.error('Error fetching performance history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance history',
            error: error.message
        });
    }
};

// Generate monthly performance report
export const generateMonthlyPerformanceReport = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }

        const performances = await DriverPerformanceModel.find({
            'performanceHistory.month': month,
            'performanceHistory.year': year
        }).populate('driverId', 'name email');

        const report = performances.map(perf => {
            const monthlyData = perf.performanceHistory.find(h =>
                h.month === month && h.year == year
            );

            return {
                driverId: perf.driverId._id,
                driverName: perf.driverId.name,
                driverEmail: perf.driverId.email,
                month,
                year,
                deliveriesCompleted: monthlyData?.deliveriesCompleted || 0,
                onTimeRate: monthlyData?.onTimeRate || 0,
                averageRating: monthlyData?.averageRating || 0,
                averageDeliveryTime: monthlyData?.averageDeliveryTime || 0,
                earnings: monthlyData?.earnings || 0,
                currentReliabilityScore: perf.currentMetrics.reliabilityScore
            };
        });

        // Sort by reliability score
        report.sort((a, b) => b.currentReliabilityScore - a.currentReliabilityScore);

        res.status(200).json({
            success: true,
            data: {
                month,
                year,
                report
            }
        });

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating monthly report',
            error: error.message
        });
    }
};

// Get top performing drivers
export const getTopPerformers = async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const topDrivers = await DriverPerformanceModel.find({
            'currentMetrics.successfulDeliveries': { $gt: 0 }
        })
            .sort({ 'currentMetrics.reliabilityScore': -1 })
            .limit(parseInt(limit))
            .populate('driverId', 'name email profileImage');

        res.status(200).json({
            success: true,
            data: topDrivers
        });

    } catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching top performers',
            error: error.message
        });
    }
};

// Add performance note
export const addPerformanceNote = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { note } = req.body;
        const adminId = req.userId;

        const performance = await DriverPerformanceModel.findOne({ driverId });

        if (!performance) {
            return res.status(404).json({
                success: false,
                message: 'Performance records not found'
            });
        }

        performance.performanceNotes.push({
            note,
            addedBy: adminId,
            date: new Date()
        });

        await performance.save();

        res.status(200).json({
            success: true,
            message: 'Performance note added successfully',
            data: performance
        });

    } catch (error) {
        console.error('Error adding performance note:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding performance note',
            error: error.message
        });
    }
};

// Update performance indicators
export const updatePerformanceIndicators = async (req, res) => {
    try {
        const { driverId } = req.params;
        const indicators = req.body;

        const performance = await DriverPerformanceModel.findOneAndUpdate(
            { driverId },
            { $set: { performanceIndicators: indicators } },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Performance indicators updated successfully',
            data: performance
        });

    } catch (error) {
        console.error('Error updating performance indicators:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating performance indicators',
            error: error.message
        });
    }
};

// Calculate and update monthly performance history
export const updateMonthlyPerformanceHistory = async (driverId) => {
    try {
        const today = new Date();
        const month = today.toLocaleString('default', { month: 'long' });
        const year = today.getFullYear();

        const performance = await DriverPerformanceModel.findOne({ driverId });
        if (!performance) {
            return;
        }

        // Check if we already have an entry for this month
        const existingEntry = performance.performanceHistory.find(
            h => h.month === month && h.year === year
        );

        if (existingEntry) {
            // Update existing entry
            existingEntry.deliveriesCompleted = performance.currentMetrics.successfulDeliveries;
            existingEntry.onTimeRate = performance.currentMetrics.onTimeDeliveries /
                (performance.currentMetrics.successfulDeliveries || 1);
            existingEntry.averageRating = performance.currentMetrics.averageRating;
            existingEntry.averageDeliveryTime = performance.currentMetrics.averageDeliveryTime;
        } else {
            // Add new entry
            performance.performanceHistory.push({
                month,
                year,
                deliveriesCompleted: performance.currentMetrics.successfulDeliveries,
                onTimeRate: performance.currentMetrics.onTimeDeliveries /
                    (performance.currentMetrics.successfulDeliveries || 1),
                averageRating: performance.currentMetrics.averageRating,
                averageDeliveryTime: performance.currentMetrics.averageDeliveryTime,
                earnings: 0 // This would be calculated from financial data
            });
        }

        await performance.save();

    } catch (error) {
        console.error('Error updating monthly performance history:', error);
    }
};
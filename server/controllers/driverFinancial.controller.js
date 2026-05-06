import DriverFinancialModel from '../models/driverfinancial.model.js';
import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import OrderModel from '../models/order.model.js';
import { uploadFileToCloudinary } from '../utils/cloudinary.js';

// Get driver financial summary
export const getDriverFinancialSummary = async (req, res) => {
    try {
        const { driverId } = req.params;

        const financials = await DriverFinancialModel.findOne({ driverId })
            .populate('payouts.processedBy', 'name email');

        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        res.status(200).json({
            success: true,
            data: financials
        });

    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching financial summary',
            error: error.message
        });
    }
};

// Calculate and add commission for completed delivery
export const addDeliveryCommission = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { driverId, amount, rate } = req.body;

        // Validate order
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find or create financial record
        let financials = await DriverFinancialModel.findOne({ driverId });
        if (!financials) {
            financials = new DriverFinancialModel({ driverId });
        }

        // Add commission
        financials.commissions.push({
            orderId,
            amount,
            rate,
            date: new Date()
        });

        // Update earnings
        financials.earnings.total += amount;
        financials.earnings.pending += amount;

        await financials.save();

        // Update driver's commission rate if this is their first delivery
        const driver = await DriverPersonnelModel.findById(driverId);
        if (driver && financials.commissions.length === 1) {
            driver.financials.commissionRate = rate;
            await driver.save();
        }

        res.status(200).json({
            success: true,
            message: 'Commission added successfully',
            data: financials
        });

    } catch (error) {
        console.error('Error adding commission:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding commission',
            error: error.message
        });
    }
};

// Request payout
export const requestPayout = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { amount, method, notes } = req.body;

        const financials = await DriverFinancialModel.findOne({ driverId });

        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        if (amount > financials.earnings.pending) {
            return res.status(400).json({
                success: false,
                message: 'Requested amount exceeds pending earnings'
            });
        }

        // Add payout request
        financials.payouts.push({
            amount,
            method,
            status: 'pending',
            notes
        });

        // Update pending earnings
        financials.earnings.pending -= amount;

        await financials.save();

        res.status(200).json({
            success: true,
            message: 'Payout requested successfully',
            data: financials
        });

    } catch (error) {
        console.error('Error requesting payout:', error);
        res.status(500).json({
            success: false,
            message: 'Error requesting payout',
            error: error.message
        });
    }
};

// Process payout (Admin)
export const processPayout = async (req, res) => {
    try {
        const { driverId, payoutId } = req.params;
        const { status, reference } = req.body;
        const adminId = req.userId;

        const financials = await DriverFinancialModel.findOne({ driverId });

        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        const payout = financials.payouts.id(payoutId);
        if (!payout) {
            return res.status(404).json({
                success: false,
                message: 'Payout request not found'
            });
        }

        if (payout.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Payout can only be processed if status is pending'
            });
        }

        // Update payout status
        payout.status = status;
        payout.reference = reference;
        payout.processedBy = adminId;
        payout.processedAt = new Date();

        if (status === 'processed') {
            financials.earnings.paid += payout.amount;
        } else if (status === 'failed') {
            // Return amount to pending if failed
            financials.earnings.pending += payout.amount;
        }

        await financials.save();

        res.status(200).json({
            success: true,
            message: 'Payout processed successfully',
            data: financials
        });

    } catch (error) {
        console.error('Error processing payout:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payout',
            error: error.message
        });
    }
};

// Add expense
export const addExpense = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { type, amount, receiptImage, notes } = req.body;

        const financials = await DriverFinancialModel.findOne({ driverId });

        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        // Handle file upload if needed
        let receiptImageUrl = receiptImage;
        if (req.file) {
            const result = await uploadFileToCloudinary(req.file.path);
            receiptImageUrl = result.secure_url;
        }

        financials.expenses.push({
            type,
            amount,
            receiptImage: receiptImageUrl,
            notes
        });

        await financials.save();

        res.status(200).json({
            success: true,
            message: 'Expense added successfully',
            data: financials
        });

    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding expense',
            error: error.message
        });
    }
};

// Update payout preferences
export const updatePayoutPreferences = async (req, res) => {
    try {
        const { driverId } = req.params;
        const preferences = req.body;

        const financials = await DriverFinancialModel.findOneAndUpdate(
            { driverId },
            { $set: { payoutPreferences: preferences } },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Payout preferences updated successfully',
            data: financials.payoutPreferences
        });

    } catch (error) {
        console.error('Error updating payout preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payout preferences',
            error: error.message
        });
    }
};

// Get all payouts for admin
export const getAllPayouts = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) {
            query['payouts.status'] = status;
        }

        const financials = await DriverFinancialModel.find(query)
            .populate('driverId')
            .populate('payouts.processedBy', 'name email')
            .sort({ 'payouts.processedAt': -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await DriverFinancialModel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: financials,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payouts',
            error: error.message
        });
    }
};

// Calculate driver earnings for a period
export const calculateDriverEarnings = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const financials = await DriverFinancialModel.findOne({ driverId });

        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        // Filter commissions by date range
        const periodCommissions = financials.commissions.filter(commission => {
            const commissionDate = new Date(commission.date);
            return commissionDate >= start && commissionDate <= end;
        });

        const totalEarnings = periodCommissions.reduce((sum, commission) => sum + commission.amount, 0);
        const deliveryCount = periodCommissions.length;
        const avgCommission = deliveryCount > 0 ? totalEarnings / deliveryCount : 0;

        res.status(200).json({
            success: true,
            data: {
                period: { startDate, endDate },
                totalEarnings,
                deliveryCount,
                avgCommission,
                commissions: periodCommissions
            }
        });

    } catch (error) {
        console.error('Error calculating earnings:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating earnings',
            error: error.message
        });
    }
};
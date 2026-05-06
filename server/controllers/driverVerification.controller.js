import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import DriverFinancialModel from '../models/driverfinancial.model.js';
import DriverPerformanceModel from '../models/driverperformance.model.js';
import { uploadFileToCloudinary } from '../utils/cloudinary.js';

// Submit driver documents for verification
export const submitDriverDocuments = async (req, res) => {
    try {
        const { driverId } = req.params;
        const {
            idNumber,
            kraPin,
            licenseNumber,
            licenseExpiry,
            vehicleType,
            registrationNumber,
            insuranceExpiry,
            insuranceProvider
        } = req.body;

        const driver = await DriverPersonnelModel.findById(driverId);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        // Handle file uploads
        let idFrontImage = driver.idFrontImage;
        let idBackImage = driver.idBackImage;
        let licenseFrontImage = driver.licenseFrontImage;

        if (req.files) {
            if (req.files.idFront) {
                const result = await uploadFileToCloudinary(req.files.idFront[0].path);
                idFrontImage = result.secure_url;
            }
            if (req.files.idBack) {
                const result = await uploadFileToCloudinary(req.files.idBack[0].path);
                idBackImage = result.secure_url;
            }
            if (req.files.licenseFront) {
                const result = await uploadFileToCloudinary(req.files.licenseFront[0].path);
                licenseFrontImage = result.secure_url;
            }
        }

        // Update driver verification data
        driver.verificationStatus = 'pending';
        driver.idNumber = idNumber;
        driver.idFrontImage = idFrontImage;
        driver.idBackImage = idBackImage;
        driver.kraPin = kraPin;
        driver.licenseNumber = licenseNumber;
        driver.licenseExpiry = new Date(licenseExpiry);
        driver.vehicleDetails = {
            type: vehicleType,
            registrationNumber,
            insuranceValidUntil: new Date(insuranceExpiry),
            insuranceProvider
        };
        driver.licenseFrontImage = licenseFrontImage;

        await driver.save();

        // Create financial and performance records if they don't exist
        await DriverFinancialModel.findOneAndUpdate(
            { driverId: driverId },
            { $setOnInsert: { driverId } },
            { upsert: true, new: true }
        );

        await DriverPerformanceModel.findOneAndUpdate(
            { driverId: driverId },
            { $setOnInsert: { driverId } },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Documents submitted successfully. Awaiting verification.'
        });

    } catch (error) {
        console.error('Error submitting driver documents:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting documents',
            error: error.message
        });
    }
};

// Admin: Get all drivers for verification
export const getDriversForVerification = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) {
            query.verificationStatus = status;
        }

        const drivers = await DriverPersonnelModel.find(query)
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await DriverPersonnelModel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: drivers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching drivers for verification:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching drivers',
            error: error.message
        });
    }
};

// Admin: Verify or reject driver
export const verifyDriver = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { status, notes } = req.body;
        const adminId = req.userId;

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "verified" or "rejected"'
            });
        }

        const driver = await DriverPersonnelModel.findById(driverId);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        driver.verificationStatus = status;
        driver.verificationNotes = notes;
        driver.verifiedBy = adminId;
        driver.verifiedAt = new Date();

        await driver.save();

        res.status(200).json({
            success: true,
            message: `Driver ${status} successfully`
        });

    } catch (error) {
        console.error('Error verifying driver:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying driver',
            error: error.message
        });
    }
};

// Get driver verification status
export const getDriverVerificationStatus = async (req, res) => {
    try {
        const { driverId } = req.params;

        const driver = await DriverPersonnelModel.findById(driverId)
            .select('verificationStatus verificationNotes verifiedAt vehicleDetails licenseNumber licenseExpiry')
            .populate('verifiedBy', 'name email');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        res.status(200).json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Error fetching verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status',
            error: error.message
        });
    }
};

// Check if driver documents are expiring soon
export const checkExpiringDocuments = async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const driversWithExpiringDocs = await DriverPersonnelModel.find({
            verificationStatus: 'verified',
            $or: [
                { 'licenseExpiry': { $lte: thirtyDaysFromNow } },
                { 'vehicleDetails.insuranceValidUntil': { $lte: thirtyDaysFromNow } }
            ]
        }).populate('userId', 'name email mobile');

        res.status(200).json({
            success: true,
            data: driversWithExpiringDocs
        });

    } catch (error) {
        console.error('Error checking expiring documents:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking expiring documents',
            error: error.message
        });
    }
};
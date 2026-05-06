import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import DriverFinancialModel from '../models/driverfinancial.model.js';
import DriverPerformanceModel from '../models/driverperformance.model.js';
import OrderModel from '../models/order.model.js';
import {
    submitDriverDocuments,
    verifyDriver,
    getDriversForVerification
} from '../controllers/driverVerification.controller.js';
import {
    addDeliveryCommission,
    requestPayout,
    processPayout
} from '../controllers/driverFinancial.controller.js';
import {
    updateDeliveryPerformance,
    getDriverPerformanceSummary
} from '../controllers/driverPerformance.controller.js';
import {
    optimizeDriverRoute,
    calculateDeliveryETA
} from '../controllers/routeOptimization.controller.js';

describe('Driver Management System - Comprehensive Tests', function() {
    this.timeout(10000);

    before(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    after(async () => {
        // Clean up test data
        await DriverPersonnelModel.deleteMany({});
        await DriverFinancialModel.deleteMany({});
        await DriverPerformanceModel.deleteMany({});
        await OrderModel.deleteMany({});
        await mongoose.disconnect();
    });

    describe('Driver Verification System', () => {
        let testDriver, testUser;

        before(async () => {
            // Create test user
            testUser = new mongoose.models.User({
                name: 'Test Driver',
                email: 'test@example.com',
                mobile: '254712345678',
                isDelivery: true,
                role: 'delivery'
            });
            await testUser.save();

            // Create test driver
            testDriver = new DriverPersonnelModel({
                userId: testUser._id,
                name: 'Test Driver',
                verificationStatus: 'pending'
            });
            await testDriver.save();
        });

        it('should submit driver documents successfully', async () => {
            const mockFiles = {
                idFront: [{ path: 'test/id-front.jpg' }],
                idBack: [{ path: 'test/id-back.jpg' }],
                licenseFront: [{ path: 'test/license.jpg' }]
            };

            const mockUpload = sinon.stub();
            mockUpload.resolves({ secure_url: 'https://test.com/image.jpg' });

            const req = {
                params: { driverId: testDriver._id },
                body: {
                    idNumber: '12345678',
                    kraPin: 'A123456789B',
                    licenseNumber: 'DL123456',
                    licenseExpiry: '2025-12-31',
                    vehicleType: 'motorcycle',
                    registrationNumber: 'KCA 123X',
                    insuranceExpiry: '2024-12-31',
                    insuranceProvider: 'Test Insurance'
                },
                files: mockFiles
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await submitDriverDocuments(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;

            // Verify driver was updated
            const updatedDriver = await DriverPersonnelModel.findById(testDriver._id);
            expect(updatedDriver.verificationStatus).to.equal('pending');
            expect(updatedDriver.idNumber).to.equal('12345678');
        });

        it('should verify a driver successfully', async () => {
            const req = {
                params: { driverId: testDriver._id },
                body: { status: 'verified', notes: 'Documents look good' },
                userId: testUser._id
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await verifyDriver(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;

            const updatedDriver = await DriverPersonnelModel.findById(testDriver._id);
            expect(updatedDriver.verificationStatus).to.equal('verified');
        });

        it('should get drivers for verification', async () => {
            const req = { query: { status: 'pending' } };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await getDriversForVerification(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });

    describe('Financial Management System', () => {
        let testDriver, testOrder;

        before(async () => {
            // Create test driver
            testDriver = new DriverPersonnelModel({
                userId: new mongoose.Types.ObjectId(),
                name: 'Financial Test Driver',
                verificationStatus: 'verified'
            });
            await testDriver.save();

            // Create test order
            testOrder = new OrderModel({
                orderId: 'TEST123',
                status: 'delivered',
                totalAmt: 1500,
                deliveryFee: 100,
                fulfillment_type: 'delivery'
            });
            await testOrder.save();
        });

        it('should add delivery commission successfully', async () => {
            const req = {
                params: { driverId: testDriver._id, orderId: testOrder._id },
                body: { amount: 50, rate: 10 }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await addDeliveryCommission(req, res);

            expect(res.status.calledWith(200)).to.be.true;

            const financials = await DriverFinancialModel.findOne({ driverId: testDriver._id });
            expect(financials).to.exist;
            expect(financials.commissions.length).to.equal(1);
            expect(financials.earnings.pending).to.equal(50);
        });

        it('should request payout successfully', async () => {
            // First add some earnings
            const financials = new DriverFinancialModel({
                driverId: testDriver._id,
                earnings: { total: 1000, pending: 1000, paid: 0 }
            });
            await financials.save();

            const req = {
                params: { driverId: testDriver._id },
                body: { amount: 500, method: 'mpesa', notes: 'Test payout' }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await requestPayout(req, res);

            expect(res.status.calledWith(200)).to.be.true;

            const updatedFinancials = await DriverFinancialModel.findOne({ driverId: testDriver._id });
            expect(updatedFinancials.payouts.length).to.equal(1);
            expect(updatedFinancials.earnings.pending).to.equal(500);
        });

        it('should process payout successfully', async () => {
            const financials = await DriverFinancialModel.findOne({ driverId: testDriver._id });
            const payoutId = financials.payouts[0]._id;

            const req = {
                params: { driverId: testDriver._id, payoutId },
                body: { status: 'processed', reference: 'MPESA123' },
                userId: new mongoose.Types.ObjectId()
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await processPayout(req, res);

            expect(res.status.calledWith(200)).to.be.true;

            const updatedFinancials = await DriverFinancialModel.findOne({ driverId: testDriver._id });
            const processedPayout = updatedFinancials.payouts[0];
            expect(processedPayout.status).to.equal('processed');
            expect(updatedFinancials.earnings.paid).to.equal(500);
        });
    });

    describe('Performance Analytics System', () => {
        let testDriver, testOrder;

        before(async () => {
            testDriver = new DriverPersonnelModel({
                userId: new mongoose.Types.ObjectId(),
                name: 'Performance Test Driver',
                verificationStatus: 'verified'
            });
            await testDriver.save();

            testOrder = new OrderModel({
                orderId: 'PERF123',
                status: 'delivered',
                totalAmt: 2000,
                deliveredAt: new Date()
            });
            await testOrder.save();
        });

        it('should update delivery performance successfully', async () => {
            const req = {
                params: { driverId: testDriver._id, orderId: testOrder._id },
                body: { isOnTime: true, deliveryTime: 30, rating: 5 }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await updateDeliveryPerformance(req, res);

            expect(res.status.calledWith(200)).to.be.true;

            const performance = await DriverPerformanceModel.findOne({ driverId: testDriver._id });
            expect(performance).to.exist;
            expect(performance.currentMetrics.successfulDeliveries).to.equal(1);
            expect(performance.currentMetrics.onTimeDeliveries).to.equal(1);
        });

        it('should get driver performance summary', async () => {
            const req = { params: { driverId: testDriver._id } };
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await getDriverPerformanceSummary(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });

    describe('Route Optimization System', () => {
        let testDriver, testOrder;

        before(async () => {
            testDriver = new DriverPersonnelModel({
                userId: new mongoose.Types.ObjectId(),
                name: 'Route Test Driver',
                verificationStatus: 'verified',
                vehicleDetails: { type: 'motorcycle' },
                currentLocation: { lat: -1.2864, lng: 36.8172 }
            });
            await testDriver.save();

            testOrder = new OrderModel({
                orderId: 'ROUTE123',
                status: 'dispatched',
                delivery_address: {
                    fullAddress: 'Westlands, Nairobi, Kenya',
                    street: 'Chiromo Road',
                    city: 'Nairobi'
                },
                deliveryPersonnel: testDriver._id
            });
            await testOrder.save();
        });

        it('should calculate delivery ETA successfully', async () => {
            const origin = 'Nairobi CBD, Kenya';
            const destination = 'Westlands, Nairobi, Kenya';

            const req = {
                params: { orderId: testOrder._id }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await calculateDeliveryETA(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            const response = res.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.data.eta).to.be.a('number');
        });

        it('should optimize driver route successfully', async () => {
            const req = {
                params: { driverId: testDriver._id },
                query: { maxDeliveries: 5 }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await optimizeDriverRoute(req, res);

            expect(res.status.calledWith(200)).to.be.true;
            const response = res.json.firstCall.args[0];
            expect(response.success).to.be.true;
            expect(response.data.optimizedRoute).to.exist;
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete delivery workflow', async () => {
            // 1. Create a new driver
            const driverUser = new mongoose.models.User({
                name: 'Integration Test Driver',
                email: 'integration@example.com',
                isDelivery: true
            });
            await driverUser.save();

            const driver = new DriverPersonnelModel({
                userId: driverUser._id,
                name: 'Integration Test Driver'
            });
            await driver.save();

            // 2. Submit verification documents
            const docReq = {
                params: { driverId: driver._id },
                body: {
                    idNumber: '98765432',
                    kraPin: 'A987654321C',
                    licenseNumber: 'DL987654',
                    licenseExpiry: '2025-12-31',
                    vehicleType: 'motorcycle',
                    registrationNumber: 'KCB 987Y',
                    insuranceExpiry: '2024-12-31',
                    insuranceProvider: 'Integration Insurance'
                },
                files: {}
            };

            const docRes = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await submitDriverDocuments(docReq, docRes);
            expect(docRes.status.calledWith(200)).to.be.true;

            // 3. Verify the driver
            const verifyReq = {
                params: { driverId: driver._id },
                body: { status: 'verified' },
                userId: driverUser._id
            };

            const verifyRes = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await verifyDriver(verifyReq, verifyRes);
            expect(verifyRes.status.calledWith(200)).to.be.true;

            // 4. Create an order
            const order = new OrderModel({
                orderId: 'INTEG123',
                status: 'delivered',
                totalAmt: 2500,
                deliveryFee: 150,
                deliveryPersonnel: driver._id,
                deliveredAt: new Date()
            });
            await order.save();

            // 5. Add commission
            const commissionReq = {
                params: { driverId: driver._id, orderId: order._id },
                body: { amount: 75, rate: 10 }
            };

            const commissionRes = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await addDeliveryCommission(commissionReq, commissionRes);
            expect(commissionRes.status.calledWith(200)).to.be.true;

            // 6. Update performance
            const perfReq = {
                params: { driverId: driver._id, orderId: order._id },
                body: { isOnTime: true, deliveryTime: 45, rating: 4 }
            };

            const perfRes = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await updateDeliveryPerformance(perfReq, perfRes);
            expect(perfRes.status.calledWith(200)).to.be.true;

            // Verify final state
            const finalDriver = await DriverPersonnelModel.findById(driver._id);
            expect(finalDriver.verificationStatus).to.equal('verified');

            const financials = await DriverFinancialModel.findOne({ driverId: driver._id });
            expect(financials.commissions.length).to.equal(1);

            const performance = await DriverPerformanceModel.findOne({ driverId: driver._id });
            expect(performance.currentMetrics.successfulDeliveries).to.equal(1);
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle missing driver gracefully', async () => {
            const req = {
                params: { driverId: new mongoose.Types.ObjectId() }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await verifyDriver(req, res);
            expect(res.status.calledWith(404)).to.be.true;
        });

        it('should handle invalid verification status', async () => {
            const driver = new DriverPersonnelModel({
                userId: new mongoose.Types.ObjectId(),
                name: 'Error Test Driver'
            });
            await driver.save();

            const req = {
                params: { driverId: driver._id },
                body: { status: 'invalid_status' }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await verifyDriver(req, res);
            expect(res.status.calledWith(400)).to.be.true;
        });

        it('should handle geocoding failures', async () => {
            const req = {
                params: { orderId: new mongoose.Types.ObjectId() }
            };

            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };

            await calculateDeliveryETA(req, res);
            // Should handle gracefully even if geocoding fails
            expect(res.status.called).to.be.true;
        });
    });
});

// Helper function to calculate distance between coordinates
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
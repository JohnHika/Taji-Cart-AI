// Simple test to verify key functionality without complex setup
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

async function runSimpleTests() {
    console.log('🧪 Running Simple Functionality Tests...\n');

    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Database Connection
    try {
        console.log('Test 1: Database Connection...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db');
        console.log('✅ PASS: Database connected successfully\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: Database connection failed:', error.message, '\n');
        testsFailed++;
    }

    // Test 2: Model Loading
    try {
        console.log('Test 2: Model Loading...');
        await import('../models/deliverypersonnel.model.js');
        await import('../models/driverfinancial.model.js');
        await import('../models/driverperformance.model.js');
        await import('../models/order.model.js');

        const DriverPersonnelModel = mongoose.model('DeliveryPersonnel');
        const DriverFinancialModel = mongoose.model('DriverFinancial');
        const DriverPerformanceModel = mongoose.model('DriverPerformance');
        const OrderModel = mongoose.model('order');
        console.log('✅ PASS: All models loaded successfully\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: Model loading failed:', error.message, '\n');
        testsFailed++;
    }

    // Test 3: Basic CRUD Operations
    try {
        console.log('Test 3: Basic CRUD Operations...');

        const DriverPersonnelModel = mongoose.model('DeliveryPersonnel');

        // Create
        const testDriver = new DriverPersonnelModel({
            userId: new mongoose.Types.ObjectId(),
            name: 'Test Driver',
            verificationStatus: 'pending'
        });
        await testDriver.save();

        // Read
        const foundDriver = await DriverPersonnelModel.findById(testDriver._id);
        if (!foundDriver) throw new Error('Driver not found');

        // Update
        foundDriver.verificationStatus = 'verified';
        await foundDriver.save();

        // Delete
        await DriverPersonnelModel.deleteOne({ _id: testDriver._id });

        console.log('✅ PASS: CRUD operations working correctly\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: CRUD operations failed:', error.message, '\n');
        testsFailed++;
    }

    // Test 4: Geocoding Service
    try {
        console.log('Test 4: Geocoding Service...');
        const { geocodeAddress } = await import('../services/openStreetMap.service.js');

        const result = await geocodeAddress('Nairobi, Kenya');
        if (!result.success) throw new Error('Geocoding failed');

        console.log('✅ PASS: Geocoding service working\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: Geocoding service failed:', error.message, '\n');
        testsFailed++;
    }

    // Test 5: Route Optimization Service
    try {
        console.log('Test 5: Route Optimization Service...');
        const { advancedOptimizeDeliveryRoute } = await import('../services/advancedRouteOptimization.service.js');

        const result = await advancedOptimizeDeliveryRoute(
            'Nairobi CBD, Kenya',
            ['Westlands, Nairobi, Kenya'],
            'motorcycle'
        );

        if (!result.success) throw new Error('Route optimization failed');

        console.log('✅ PASS: Route optimization service working\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: Route optimization failed:', error.message, '\n');
        testsFailed++;
    }

    // Test 6: Financial Calculations
    try {
        console.log('Test 6: Financial Calculations...');
        const { calculateFuelConsumption, calculateCO2Emissions } = await import('../services/advancedRouteOptimization.service.js');

        const { calculateFuelConsumption: calcFuelFunc, calculateCO2Emissions: calcCO2Func } = (await import('../services/advancedRouteOptimization.service.js')).default;
        const fuel = calcFuelFunc(50, 'motorcycle'); // 50km
        const co2 = calcCO2Func(50, 'motorcycle');

        if (fuel <= 0 || co2 <= 0) throw new Error('Invalid calculations');

        console.log('✅ PASS: Financial calculations working\n');
        testsPassed++;
    } catch (error) {
        console.error('❌ FAIL: Financial calculations failed:', error.message, '\n');
        testsFailed++;
    }

    // Clean up
    try {
        await mongoose.disconnect();
        console.log('✅ Database connection closed\n');
    } catch (error) {
        console.error('⚠️  Warning: Database disconnect error:', error.message, '\n');
    }

    // Final Results
    console.log('='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (testsFailed === 0) {
        console.log('\n🎉 All tests passed! System is working correctly.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
        process.exit(1);
    }
}

runSimpleTests().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
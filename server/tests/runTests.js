import mongoose from 'mongoose';
import dotenv from 'dotenv';
import pkg from 'mocha';
const { Mocha } = pkg;
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

// Load environment variables
dotenv.config({ path: '../.env' });

// Configure chai
chai.use(sinonChai);
global.expect = chai.expect;
global.sinon = sinon;

// Create Mocha instance
const mocha = new Mocha({
    reporter: 'spec',
    timeout: 10000,
    color: true
});

// Add test files
mocha.addFile('./driverSystem.test.js');

// Set up mongoose before running tests
async function setupDatabase() {
    console.log('Connecting to test database...');
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Test database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Run tests
async function runTests() {
    await setupDatabase();

    try {
        console.log('Running test suite...');
        const failures = await new Promise((resolve) => {
            mocha.run(resolve);
        });

        // Clean up
        await mongoose.disconnect();
        console.log('✅ Database connection closed');

        // Exit with appropriate code
        if (failures) {
            console.error(`❌ ${failures} test(s) failed`);
            process.exit(1);
        } else {
            console.log('✅ All tests passed successfully!');
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
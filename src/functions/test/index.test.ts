
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { onHairdresserDeleted } from '../index'; // Adjust path as needed
import { FeaturesList } from 'firebase-functions-test/lib/features';

// Initialize firebase-functions-test.
// This allows us to use an offline mode that doesn't affect real data.
const testEnv: FeaturesList = functionsTest();

describe('Cloud Functions: SalonVerse', () => {
    let adminInitStub: sinon.SinonStub;
    let deleteUserStub: sinon.SinonStub;

    before(() => {
        // Stub the admin.initializeApp() call to prevent it from trying to connect.
        adminInitStub = sinon.stub(admin, 'initializeApp');
    });

    after(() => {
        // Clean up stubs and mocks
        adminInitStub.restore();
        testEnv.cleanup();
    });

    beforeEach(() => {
        // Before each test, stub the specific admin SDK methods we expect to be called.
        // We stub `admin.auth().deleteUser` to spy on its calls without actually deleting a user.
        deleteUserStub = sinon.stub(admin.auth(), 'deleteUser');
    });

    afterEach(() => {
        // Restore the stubs after each test to ensure a clean state for the next test.
        deleteUserStub.restore();
    });

    describe('onHairdresserDeleted', () => {
        it('should delete the auth user when a hairdresser document is deleted', async () => {
            // 1. Arrange
            const hairdresserId = 'test-hairdresser-uid-123';
            const fakeData = {
                email: 'test@example.com',
                name: 'Test Hairdresser',
            };
            
            // Create a fake Firestore event object that mimics a document deletion.
            const fakeEvent = testEnv.firestore.makeDocumentSnapshot(fakeData, `hairdressers/${hairdresserId}`);
            
            // Wrap our cloud function with the test environment to get a testable version.
            const wrapped = testEnv.wrap(onHairdresserDeleted);
            
            // 2. Act
            // Call the wrapped function with the fake event.
            await wrapped({ params: { hairdresserId }, data: fakeEvent });
            
            // 3. Assert
            // Expect that `admin.auth().deleteUser` was called exactly once.
            expect(deleteUserStub.calledOnce).to.be.true;
            // Expect that it was called with the correct hairdresser ID.
            expect(deleteUserStub.firstCall.args[0]).to.equal(hairdresserId);
        });

        it('should log a warning and not throw if the auth user is already deleted', async () => {
            // 1. Arrange
            const hairdresserId = 'already-deleted-uid';
            const fakeData = { email: 'deleted@example.com', name: 'Deleted User' };

            // Configure the stub to simulate an "auth/user-not-found" error.
            const authError = { code: 'auth/user-not-found', message: 'User not found.' };
            deleteUserStub.throws(authError);
            
            const fakeEvent = testEnv.firestore.makeDocumentSnapshot(fakeData, `hairdressers/${hairdresserId}`);
            const wrapped = testEnv.wrap(onHairdresserDeleted);

            // 2. Act & 3. Assert
            // We expect the function to run without throwing an error into the test runner.
            // The function itself should catch this specific error and log it.
            try {
                await wrapped({ params: { hairdresserId }, data: fakeEvent });
                // If we get here, the function handled the error correctly.
                expect(deleteUserStub.calledOnce).to.be.true;
            } catch (e) {
                // If the function re-threw the error, the test fails.
                expect.fail('Function should have handled the auth/user-not-found error gracefully.');
            }
        });
    });
});


import * as admin from "firebase-admin";
import * as functionsTest from "firebase-functions-test";
import {expect} from "chai";
import * as sinon from "sinon";
import {onHairdresserDeleted} from "../index";

// Initialize firebase-functions-test.
const testEnv = functionsTest();

describe("Cloud Functions: SalonVerse", () => {
  let adminInitStub: sinon.SinonStub;
  let deleteUserStub: sinon.SinonStub;

  before(() => {
    // Stub the admin.initializeApp() call to prevent it from trying to connect.
    adminInitStub = sinon.stub(admin, "initializeApp");
  });

  after(() => {
    // Clean up stubs and mocks
    adminInitStub.restore();
    testEnv.cleanup();
  });

  beforeEach(() => {
    // Before each test, stub the specific admin SDK methods we expect to be called.
    deleteUserStub = sinon.stub(admin.auth(), "deleteUser");
  });

  afterEach(() => {
    // Restore the stubs after each test to ensure a clean state for the next test.
    deleteUserStub.restore();
  });

  describe("onHairdresserDeleted", () => {
    it("should delete the auth user when a hairdresser document is deleted", async () => {
      // 1. Arrange
      const hairdresserId = "test-hairdresser-uid-123";
      const fakeData = {
        email: "test@example.com",
        name: "Test Hairdresser",
      };
      
      const fakeEvent = testEnv.firestore.makeDocumentSnapshot(fakeData, `hairdressers/${hairdresserId}`);
      
      const wrapped = testEnv.wrap(onHairdresserDeleted);
      
      // 2. Act
      await wrapped({params: {hairdresserId}, data: fakeEvent});
      
      // 3. Assert
      expect(deleteUserStub.calledOnce).to.be.true;
      expect(deleteUserStub.firstCall.args[0]).to.equal(hairdresserId);
    });

    it("should log a warning and not throw if the auth user is already deleted", async () => {
      // 1. Arrange
      const hairdresserId = "already-deleted-uid";
      const fakeData = {email: "deleted@example.com", name: "Deleted User"};

      const authError = {code: "auth/user-not-found", message: "User not found."};
      deleteUserStub.throws(authError);
      
      const fakeEvent = testEnv.firestore.makeDocumentSnapshot(fakeData, `hairdressers/${hairdresserId}`);
      const wrapped = testEnv.wrap(onHairdresserDeleted);

      // 2. Act & 3. Assert
      try {
        await wrapped({params: {hairdresserId}, data: fakeEvent});
        expect(deleteUserStub.calledOnce).to.be.true;
      } catch (e) {
        expect.fail("Function should have handled the auth/user-not-found error gracefully.");
      }
    });
  });
});

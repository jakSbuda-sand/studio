
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App (v2 Signatures).
 */

import {onCall, HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
  logger.log("Firebase Admin SDK initialized.");
}

const db = admin.firestore();

interface CreateHairdresserData {
  email: string;
  password?: string;
  displayName: string;
  assigned_locations: string[];
  availability: string;
  specialties?: string[];
  profilePictureUrl?: string;
  working_days: string[]; // Added this as it's used in the function body
}

export const createHairdresserUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateHairdresserData>) => {
    logger.log("createHairdresserUser function started. Caller UID:", request.auth?.uid);
    logger.log("Received data:", JSON.stringify(request.data));

    if (!request.auth) {
      logger.error("Function called while unauthenticated.");
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const callerUid = request.auth.uid;
    const adminUserDocRef = db.collection("users").doc(callerUid);

    try {
      logger.log("Verifying admin role for UID:", callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        logger.error("Caller is not an admin. Role:", adminUserDoc.data()?.role);
        throw new HttpsError(
          "permission-denied",
          "Caller does not have admin privileges."
        );
      }
      logger.log("Admin role verified for UID:", callerUid);
    } catch (error: any) {
      logger.error("Error verifying admin role:", error.message, error.stack, JSON.stringify(error));
      if (error instanceof HttpsError) throw error; // Re-throw HttpsError directly
      throw new HttpsError(
        "internal",
        `Failed to verify admin privileges: ${error.message}`
      );
    }

    const data = request.data;

    if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
      logger.error("Missing required fields in input data.", data);
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, displayName, assigned_locations, availability, working_days."
      );
    }

    const temporaryPassword = data.password || Math.random().toString(36).slice(-10);
    logger.log("Temporary password selected/generated.");

    let newUserRecord;
    try {
      logger.log("Attempting to create Firebase Auth user for email:", data.email);
      newUserRecord = await admin.auth().createUser({
        email: data.email,
        password: temporaryPassword,
        displayName: data.displayName,
        emailVerified: false, // You might want to set this based on your app's flow
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("Successfully created Firebase Auth user with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("Error creating Firebase Auth user:", error.message, error.stack, JSON.stringify(error));
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "The email address is already in use by another account.");
      }
      throw new HttpsError(
        "internal",
        `Error creating Firebase Auth user: ${error.message}`
      );
    }

    const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
    try {
      logger.log("Attempting to create Firestore document for hairdresser UID:", newUserRecord.uid);
      const hairdresserDocData = {
        user_id: newUserRecord.uid, // Storing the Auth UID
        name: data.displayName,
        email: data.email,
        assigned_locations: data.assigned_locations || [],
        working_days: data.working_days || [],
        availability: data.availability,
        must_reset_password: true, // New hairdressers should reset their password
        specialties: data.specialties || [],
        profilePictureUrl: data.profilePictureUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      logger.log("Hairdresser document data to be written:", JSON.stringify(hairdresserDocData));
      await newHairdresserDocRef.set(hairdresserDocData);
      logger.log("Successfully created Firestore document for hairdresser:", newUserRecord.uid);

      // Return a success message (or data) to the client
      return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`,
      };
    } catch (error: any) {
      logger.error("Error creating Firestore document for hairdresser:", error.message, error.stack, JSON.stringify(error));
      // Attempt to delete the orphaned Firebase Auth user if Firestore write fails
      logger.log("Attempting to delete orphaned auth user UID:", newUserRecord.uid);
      await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError) => {
        logger.error("CRITICAL: Error deleting orphaned auth user after Firestore failure:", deleteError.message, deleteError.stack, JSON.stringify(deleteError));
      });
      throw new HttpsError(
        "internal",
        `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`
      );
    }
  }
);


// Example HTTP onRequest function (v2)
export const helloWorld = onRequest(
  {region: "us-central1"},
  (request, response) => {
    logger.info("Hello logs!", {structuredData: true});
    response.send("Hello from Firebase! (v2)");
  }
);

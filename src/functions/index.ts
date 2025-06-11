
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App (v2 Signatures).
 */

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
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
  working_days: string[];
}

export const createHairdresserUser = onCall(
  { region: "us-central1" }, // You can specify options like region here
  async (request: CallableRequest<CreateHairdresserData>) => {
    logger.log("createHairdresserUser (v2) function started. Caller UID:", request.auth?.uid);
    logger.log("Received data (v2):", JSON.stringify(request.data));

    if (!request.auth) {
      logger.error("Function (v2) called while unauthenticated.");
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const callerUid = request.auth.uid;
    const adminUserDocRef = db.collection("users").doc(callerUid);

    try {
      logger.log("Verifying admin role for UID (v2):", callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        logger.error("Caller is not an admin (v2). Role:", adminUserDoc.data()?.role);
        throw new HttpsError(
          "permission-denied",
          "Caller does not have admin privileges."
        );
      }
      logger.log("Admin role verified for UID (v2):", callerUid);
    } catch (error: any) {
      logger.error("Error verifying admin role (v2):", error.message, error.stack, JSON.stringify(error));
      if (error instanceof HttpsError) throw error; // Re-throw HttpsError directly
      throw new HttpsError(
        "internal",
        `Failed to verify admin privileges: ${error.message}`
      );
    }

    const data = request.data;

    if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
      logger.error("Missing required fields in input data (v2).", data);
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, displayName, assigned_locations, availability, working_days."
      );
    }

    const temporaryPassword = data.password || Math.random().toString(36).slice(-10);
    logger.log("Temporary password selected/generated (v2).");

    let newUserRecord;
    try {
      logger.log("Attempting to create Firebase Auth user for email (v2):", data.email);
      newUserRecord = await admin.auth().createUser({
        email: data.email,
        password: temporaryPassword,
        displayName: data.displayName,
        emailVerified: false,
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("Successfully created Firebase Auth user with UID (v2):", newUserRecord.uid);
    } catch (error: any) {
      logger.error("Error creating Firebase Auth user (v2):", error.message, error.stack, JSON.stringify(error));
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
      logger.log("Attempting to create Firestore document for hairdresser UID (v2):", newUserRecord.uid);
      const hairdresserDocData = {
        user_id: newUserRecord.uid,
        name: data.displayName,
        email: data.email,
        assigned_locations: data.assigned_locations || [],
        working_days: data.working_days || [],
        availability: data.availability,
        must_reset_password: true,
        specialties: data.specialties || [],
        profilePictureUrl: data.profilePictureUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      logger.log("Hairdresser document data to be written (v2):", JSON.stringify(hairdresserDocData));
      await newHairdresserDocRef.set(hairdresserDocData);
      logger.log("Successfully created Firestore document for hairdresser (v2):", newUserRecord.uid);

      return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`,
      };
    } catch (error: any) {
      logger.error("Error creating Firestore document for hairdresser (v2):", error.message, error.stack, JSON.stringify(error));
      logger.log("Attempting to delete orphaned auth user UID (v2):", newUserRecord.uid);
      await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError) => {
        logger.error("CRITICAL: Error deleting orphaned auth user after Firestore failure (v2):", deleteError.message, deleteError.stack, JSON.stringify(deleteError));
      });
      throw new HttpsError(
        "internal",
        `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`
      );
    }
  }
);

export const helloWorld = onRequest(
  { region: "us-central1" }, // You can specify options like region here
  (request, response) => {
    logger.info("Hello logs! (v2)", { structuredData: true });
    response.send("Hello from Firebase! (v2)");
  }
);

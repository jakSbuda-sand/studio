/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
  functions.logger.log("Firebase Admin SDK initialized in createHairdresserUser function.");
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

export const createHairdresserUser = functions.https.onCall(async (data: CreateHairdresserData, context) => {
  functions.logger.log("createHairdresserUser function started. Caller UID:", context.auth?.uid);
  functions.logger.log("Received data:", JSON.stringify(data));

  if (!context.auth) {
    functions.logger.error("Function called while unauthenticated.");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const callerUid = context.auth.uid;
  const adminUserDocRef = db.collection("users").doc(callerUid);

  try {
    functions.logger.log("Verifying admin role for UID:", callerUid);
    const adminUserDoc = await adminUserDocRef.get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
      functions.logger.error("Caller is not an admin. Role:", adminUserDoc.data()?.role);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller does not have admin privileges."
      );
    }
    functions.logger.log("Admin role verified for UID:", callerUid);
  } catch (error: any) {
    functions.logger.error("Error verifying admin role:", error.message, error.stack, JSON.stringify(error));
    throw new functions.https.HttpsError(
      "internal",
      `Failed to verify admin privileges: ${error.message}`
    );
  }

  if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
    functions.logger.error("Missing required fields in input data.", data);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: email, displayName, assigned_locations, availability, working_days."
    );
  }

  const temporaryPassword = data.password || Math.random().toString(36).slice(-10);
  functions.logger.log("Temporary password selected/generated.");

  let newUserRecord;
  try {
    functions.logger.log("Attempting to create Firebase Auth user for email:", data.email);
    newUserRecord = await admin.auth().createUser({
      email: data.email,
      password: temporaryPassword,
      displayName: data.displayName,
      emailVerified: false,
      photoURL: data.profilePictureUrl || undefined,
    });
    functions.logger.log("Successfully created Firebase Auth user with UID:", newUserRecord.uid);
  } catch (error: any) {
    functions.logger.error("Error creating Firebase Auth user:", error.message, error.stack, JSON.stringify(error));
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firebase Auth user: ${error.message}`
    );
  }

  const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
  try {
    functions.logger.log("Attempting to create Firestore document for hairdresser UID:", newUserRecord.uid);
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
    functions.logger.log("Hairdresser document data to be written:", JSON.stringify(hairdresserDocData));
    await newHairdresserDocRef.set(hairdresserDocData);
    functions.logger.log("Successfully created Firestore document for hairdresser:", newUserRecord.uid);

    return {
      status: "success",
      userId: newUserRecord.uid,
      message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`
    };

  } catch (error: any) {
    functions.logger.error("Error creating Firestore document for hairdresser:", error.message, error.stack, JSON.stringify(error));
    functions.logger.log("Attempting to delete orphaned auth user UID:", newUserRecord.uid);
    await admin.auth().deleteUser(newUserRecord.uid).catch(deleteError => {
      functions.logger.error("CRITICAL: Error deleting orphaned auth user after Firestore failure:", deleteError.message, deleteError.stack, JSON.stringify(deleteError));
    });
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`
    );
  }
});

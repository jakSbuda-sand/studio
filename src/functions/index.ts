
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
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
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const callerUid = context.auth.uid;
  const userDocRef = db.collection("users").doc(callerUid);

  try {
    const userDoc = await userDocRef.get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller does not have admin privileges."
      );
    }
  } catch (error) {
    functions.logger.error("Error checking admin role:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to verify admin privileges."
    );
  }

  if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: email, displayName, assigned_locations, availability, working_days."
    );
  }

  const temporaryPassword = data.password || Math.random().toString(36).slice(-10);

  let newUserRecord;
  try {
    newUserRecord = await admin.auth().createUser({
      email: data.email,
      password: temporaryPassword,
      displayName: data.displayName,
      emailVerified: false, // Consider setting to true if you have an email verification flow
      photoURL: data.profilePictureUrl || undefined,
    });
    functions.logger.log("Successfully created new auth user:", newUserRecord.uid);
  } catch (error: any) {
    functions.logger.error("Error creating new auth user:", error);
    if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firebase Auth user: ${error.message}`
    );
  }

  // Create a document in the 'hairdressers' collection
  const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
  try {
    await newHairdresserDocRef.set({
      user_id: newUserRecord.uid, // Storing Auth UID
      name: data.displayName,
      email: data.email,
      assigned_locations: data.assigned_locations || [],
      working_days: data.working_days || [],
      availability: data.availability,
      specialties: data.specialties || [],
      profilePictureUrl: data.profilePictureUrl || "",
      must_reset_password: true, // User must reset their password on first login
      createdAt: admin.firestore.Timestamp.now(), // Using Timestamp.now()
      updatedAt: admin.firestore.Timestamp.now(), // Using Timestamp.now()
    });
    functions.logger.log("Successfully created Firestore document for hairdresser:", newUserRecord.uid);

    return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`
    };

  } catch (error: any) {
    functions.logger.error("Error creating Firestore document for hairdresser:", error);
    // Best practice: If Firestore write fails, delete the created Auth user to avoid orphans
    await admin.auth().deleteUser(newUserRecord.uid).catch(deleteError => {
        functions.logger.error("Error deleting auth user after Firestore failure:", deleteError);
    });
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firestore document for hairdresser: ${error.message}`
    );
  }
});

// TODO: Implement a secure deleteHairdresser function
// This function needs to:
// 1. Delete the Firebase Auth user.
// 2. Delete the hairdresser document from 'hairdressers' collection.
// 3. Handle any related data cleanup (e.g., reassigning bookings or notifying clients).
// export const deleteHairdresserUser = functions.https.onCall(async (data: { userIdToDelete: string }, context) => {
//   // Authentication & Admin Check
//   // ...
//   // Implementation
//   // ...
// });


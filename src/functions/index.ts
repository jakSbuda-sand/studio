
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue; // Get FieldValue more directly

interface CreateHairdresserData {
  email: string;
  password?: string;
  displayName: string;
  assigned_locations: string[];
  // working_days: string[]; // This might be derived or simplified if 'availability' string is primary
  availability: string; // Text description of availability, e.g., "Mon-Fri 9am-5pm"
  specialties?: string[];
  profilePictureUrl?: string;
  // working_days might be parsed from availability string if needed
  working_days: string[]; // Keep if form sends it, or parse from availability
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

  if (!data.email || !data.displayName || !data.assigned_locations || !data.availability) { // Removed working_days from this direct check if it's derived
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: email, displayName, assigned_locations, availability."
    );
  }

  const temporaryPassword = data.password || Math.random().toString(36).slice(-10);

  let newUserRecord;
  try {
    newUserRecord = await admin.auth().createUser({
      email: data.email,
      password: temporaryPassword,
      displayName: data.displayName,
      emailVerified: false, // Consider sending a verification email
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

  const batch = db.batch();

  const newUserDocRef = db.collection("users").doc(newUserRecord.uid);
  batch.set(newUserDocRef, {
    name: data.displayName,
    email: data.email,
    role: "hairdresser",
    created_at: FieldValue.serverTimestamp(),
  });

  const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
  batch.set(newHairdresserDocRef, {
    user_id: newUserRecord.uid,
    name: data.displayName,
    email: data.email,
    assigned_locations: data.assigned_locations,
    working_days: data.working_days || [], // Ensure it's an array, even if empty
    availability: data.availability,
    specialties: data.specialties || [],
    profilePictureUrl: data.profilePictureUrl || "",
    must_reset_password: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    await batch.commit();
    functions.logger.log("Successfully created Firestore documents for hairdresser:", newUserRecord.uid);
    return { 
        status: "success", 
        userId: newUserRecord.uid, 
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.` 
    };
  } catch (error: any) {
    functions.logger.error("Error committing batch for Firestore documents:", error);
    // Consider deleting the Auth user if Firestore writes fail
    // await admin.auth().deleteUser(newUserRecord.uid);
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firestore documents: ${error.message}`
    );
  }
});


// TODO: Implement a secure deleteHairdresser function
// This function needs to:
// 1. Delete the Firebase Auth user.
// 2. Delete the hairdresser document from 'hairdressers' collection.
// 3. Delete the user document from 'users' collection.
// 4. Handle any related data cleanup (e.g., bookings).
// export const deleteHairdresserUser = functions.https.onCall(async (data: { userIdToDelete: string }, context) => {
//   // Authentication & Admin Check
//   // ...
//   // Implementation
//   // ...
// });

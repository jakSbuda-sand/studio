
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App.
 *
 * To deploy these functions:
 * 1. Ensure you have Firebase CLI installed and logged in.
 * 2. Initialize Firebase Functions in your project: `firebase init functions` (select TypeScript).
 * 3. Place this file (or its content) in your functions `src` directory (e.g., `functions/src/index.ts`).
 * 4. Install dependencies in the `functions` directory:
 *    `cd functions`
 *    `npm install firebase-admin firebase-functions`
 *    `npm install -D typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint` (or similar for linting)
 * 5. Deploy: `firebase deploy --only functions`
 *
 * It's crucial to set up billing for your Firebase project if you haven't already,
 * as Cloud Functions (especially those making outbound network requests or using Admin SDK)
 * require the Blaze (pay-as-you-go) plan.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
// This usually happens automatically when deployed in the Firebase environment.
// If running locally with emulators, ensure emulators are configured or SDK is initialized.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

interface CreateHairdresserData {
  email: string;
  password?: string; // Temporary password, can be auto-generated if not provided
  displayName: string;
  assigned_locations: string[]; // Array of location IDs
  working_days: string[]; // Array of day names e.g. ["Monday", "Tuesday"]
  color_code: string; // Hex color string e.g. "#RRGGBB"
  specialties?: string[];
  profilePictureUrl?: string;
}

/**
 * Creates a new Firebase Auth user for a hairdresser,
 * and corresponding documents in 'users' and 'hairdressers' Firestore collections.
 *
 * This function should be callable by an authenticated admin user.
 */
export const createHairdresserUser = functions.https.onCall(async (data: CreateHairdresserData, context) => {
  // 1. Authentication Check: Ensure the caller is an admin.
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
    console.error("Error checking admin role:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to verify admin privileges."
    );
  }

  // 2. Validate input data
  if (!data.email || !data.displayName || !data.assigned_locations || !data.working_days || !data.color_code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: email, displayName, assigned_locations, working_days, color_code."
    );
  }

  const temporaryPassword = data.password || Math.random().toString(36).slice(-10); // Auto-generate if not provided

  let newUserRecord;
  try {
    // 3. Create Firebase Auth user
    newUserRecord = await admin.auth().createUser({
      email: data.email,
      password: temporaryPassword,
      displayName: data.displayName,
      emailVerified: false, // Or true, depending on your flow
      // photoURL: data.profilePictureUrl || undefined, // Set if provided
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

  // 4. Create document in 'users' collection
  const newUserDocRef = db.collection("users").doc(newUserRecord.uid);
  batch.set(newUserDocRef, {
    name: data.displayName,
    email: data.email,
    role: "hairdresser",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    // associated_hairdresser_id: newUserRecord.uid, // If 'hairdressers' uses Auth UID as doc ID
  });

  // 5. Create document in 'hairdressers' collection (using Auth UID as document ID)
  const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
  batch.set(newHairdresserDocRef, {
    user_id: newUserRecord.uid, // Explicitly store Auth UID
    name: data.displayName,
    email: data.email,
    assigned_locations: data.assigned_locations,
    working_days: data.working_days,
    color_code: data.color_code,
    specialties: data.specialties || [],
    profilePictureUrl: data.profilePictureUrl || "",
    must_reset_password: true, // Key flag for first login
    // availability_schedule: {}, // More detailed schedule if needed
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await batch.commit();
    functions.logger.log("Successfully created Firestore documents for hairdresser:", newUserRecord.uid);
    return { 
        status: "success", 
        userId: newUserRecord.uid, 
        message: `Hairdresser ${data.displayName} created successfully. Temporary password: ${temporaryPassword}` 
    };
  } catch (error: any) {
    functions.logger.error("Error committing batch for Firestore documents:", error);
    // Potentially try to delete the Auth user if Firestore writes fail to keep things consistent
    // await admin.auth().deleteUser(newUserRecord.uid);
    throw new functions.https.HttpsError(
      "internal",
      `Error creating Firestore documents: ${error.message}`
    );
  }
});


// Example of another function to delete a hairdresser (Auth user and Firestore docs)
// export const deleteHairdresserUser = functions.https.onCall(async (data: { userId: string, hairdresserDocId: string }, context) => {
//   // 1. Authentication and Admin Check (similar to createHairdresserUser)
//   if (!context.auth || (await db.collection("users").doc(context.auth.uid).get()).data()?.role !== "admin") {
//     throw new functions.https.HttpsError("permission-denied", "Caller is not an admin.");
//   }

//   const { userId, hairdresserDocId } = data;
//   if (!userId || !hairdresserDocId) {
//     throw new functions.https.HttpsError("invalid-argument", "Missing userId or hairdresserDocId.");
//   }

//   try {
//     await admin.auth().deleteUser(userId);
//     functions.logger.log("Successfully deleted Auth user:", userId);

//     const batch = db.batch();
//     batch.delete(db.collection("hairdressers").doc(hairdresserDocId)); // Assuming hairdresserDocId might be different from userId
//     batch.delete(db.collection("users").doc(userId));
//     // Consider also deleting related bookings or reassigning them.

//     await batch.commit();
//     functions.logger.log("Successfully deleted Firestore documents for user:", userId);
//     return { status: "success", message: "Hairdresser deleted successfully." };
//   } catch (error: any) {
//     functions.logger.error("Error deleting hairdresser:", error);
//     throw new functions.https.HttpsError("internal", `Error deleting hairdresser: ${error.message}`);
//   }
// });

    
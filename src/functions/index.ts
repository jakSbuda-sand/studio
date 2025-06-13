
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
  working_days: string[];
}

interface UpdateUserProfileData {
  name?: string;
  avatarUrl?: string;
}

interface UpdateUserProfileResult {
  status: string;
  message: string;
  updatedName?: string;
  updatedAvatarUrl?: string;
}

export const updateUserProfile = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<UpdateUserProfileData>): Promise<UpdateUserProfileResult> => {
    logger.log("[updateUserProfile] Function started. Caller UID:", request.auth?.uid);
    logger.log("[updateUserProfile] Received data from client:", JSON.stringify(request.data));

    if (!request.auth) {
      logger.error("[updateUserProfile] Unauthenticated call.");
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const uid = request.auth.uid;
    const {name: newName, avatarUrl: newAvatarUrl} = request.data;

    // Fetch current user details from Firebase Auth to compare
    let currentAuthUser;
    try {
      currentAuthUser = await admin.auth().getUser(uid);
    } catch (error: any) {
      logger.error("[updateUserProfile] Error fetching current Auth user for UID:", uid, error);
      throw new HttpsError("internal", "Failed to fetch current user data.");
    }

    const currentDisplayName = currentAuthUser.displayName || "";
    const currentPhotoURL = currentAuthUser.photoURL || "";

    const authUpdatePayload: {displayName?: string; photoURL?: string | null} = {};
    let nameChanged = false;
    let avatarChanged = false;

    if (newName !== undefined && newName !== currentDisplayName) {
      authUpdatePayload.displayName = newName;
      nameChanged = true;
      logger.log(`[updateUserProfile] Name change detected for UID: ${uid}. New: '${newName}', Old: '${currentDisplayName}'`);
    }

    if (newAvatarUrl !== undefined && newAvatarUrl !== currentPhotoURL) {
      authUpdatePayload.photoURL = newAvatarUrl === "" ? null : newAvatarUrl;
      avatarChanged = true;
      logger.log(`[updateUserProfile] Avatar URL change detected for UID: ${uid}. New: '${newAvatarUrl}', Old: '${currentPhotoURL}'`);
    }

    if (!nameChanged && !avatarChanged) {
      logger.log("[updateUserProfile] No actual changes to name or avatar detected for UID:", uid);
      return {
        status: "no_change",
        message: "No information was different from current profile.",
      };
    }

    try {
      if (Object.keys(authUpdatePayload).length > 0) {
        logger.log("[updateUserProfile] Updating Firebase Auth for UID:", uid, "with payload:", JSON.stringify(authUpdatePayload));
        await admin.auth().updateUser(uid, authUpdatePayload);
        logger.log("[updateUserProfile] Firebase Auth user updated successfully for UID:", uid);
      } else {
        // This case should be caught by the "no_change" check above, but as a safeguard.
        logger.log("[updateUserProfile] Firebase Auth payload was empty, no Auth update performed for UID:", uid);
      }

      const userDocRef = db.collection("users").doc(uid);
      const hairdresserDocRef = db.collection("hairdressers").doc(uid);
      const userDoc = await userDocRef.get();
      let firestoreUpdated = false;

      if (userDoc.exists) { // User is an admin
        const firestoreUserUpdate: {name?: string; updatedAt: FirebaseFirestore.FieldValue} = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (nameChanged && newName !== undefined) {
          firestoreUserUpdate.name = newName;
        }
        // Admin's avatar is primarily from Auth photoURL; 'users' doc doesn't store avatarUrl.
        if (Object.keys(firestoreUserUpdate).length > 1) { // more than just updatedAt
          await userDocRef.update(firestoreUserUpdate);
          logger.log("[updateUserProfile] Firestore 'users' (admin) doc updated for UID:", uid, JSON.stringify(firestoreUserUpdate));
          firestoreUpdated = true;
        } else {
          logger.log("[updateUserProfile] Firestore 'users' (admin) doc for UID:", uid, "not updated with new field values (only timestamp would change or only avatar changed which is not stored here).");
        }
      } else {
        const hairdresserDoc = await hairdresserDocRef.get();
        if (hairdresserDoc.exists) { // User is a hairdresser
          const firestoreHairdresserUpdate: {
            name?: string;
            profilePictureUrl?: string;
            updatedAt: FirebaseFirestore.FieldValue;
          } = {updatedAt: admin.firestore.FieldValue.serverTimestamp()};

          if (nameChanged && newName !== undefined) {
            firestoreHairdresserUpdate.name = newName;
          }
          if (avatarChanged && newAvatarUrl !== undefined) {
            firestoreHairdresserUpdate.profilePictureUrl = newAvatarUrl; // Store empty string if cleared
          }

          if (Object.keys(firestoreHairdresserUpdate).length > 1) {
            await hairdresserDocRef.update(firestoreHairdresserUpdate);
            logger.log("[updateUserProfile] Firestore 'hairdressers' doc updated for UID:", uid, JSON.stringify(firestoreHairdresserUpdate));
            firestoreUpdated = true;
          } else {
            logger.log("[updateUserProfile] Firestore 'hairdressers' doc for UID:", uid, "not updated with new field values (only timestamp would change).");
          }
        } else {
          logger.warn("[updateUserProfile] User document not found in 'users' or 'hairdressers' for UID:", uid, ". Auth may have been updated but Firestore was not for other details.");
          return {
            status: "warning",
            message: "Profile updated in authentication, but no matching Firestore record found to update specific details (like name in Firestore for hairdresser).",
            updatedName: newName,
            updatedAvatarUrl: newAvatarUrl,
          };
        }
      }
      logger.log(`[updateUserProfile] Final status for UID ${uid}: Name changed: ${nameChanged}, Avatar changed: ${avatarChanged}, Firestore updated: ${firestoreUpdated}`);
      return {
        status: "success",
        message: "Profile updated successfully.",
        updatedName: newName,
        updatedAvatarUrl: newAvatarUrl,
      };
    } catch (error: any) {
      logger.error("[updateUserProfile] Error during update process for UID:", uid, {
        errorMessage: error.message,
        errorStack: error.stack,
        errorDetails: JSON.stringify(error),
      });
      if (error.code && error.code.startsWith("auth/")) {
        throw new HttpsError("internal", `Firebase Auth error: ${error.message}`);
      }
      throw new HttpsError("internal", `Failed to update profile: ${error.message}`);
    }
  },
);

export const createHairdresserUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateHairdresserData>) => {
    logger.log("[createHairdresserUser] Function execution started.", {structuredData: true, timestamp: new Date().toISOString()});
    logger.log("[createHairdresserUser] Received data:", JSON.stringify(request.data));

    if (!request.auth) {
      logger.error("[createHairdresserUser] Function called while unauthenticated.");
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    const callerUid = request.auth.uid;
    const adminUserDocRef = db.collection("users").doc(callerUid);

    try {
      logger.log("[createHairdresserUser] Verifying admin role for UID:", callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        logger.error("[createHairdresserUser] Caller is not an admin. Role:", adminUserDoc.data()?.role);
        throw new HttpsError(
          "permission-denied",
          "Caller does not have admin privileges.",
        );
      }
      logger.log("[createHairdresserUser] Admin role verified for UID:", callerUid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error verifying admin role:", {
        errorMessage: error.message,
        errorStack: error.stack,
        errorDetails: JSON.stringify(error),
      });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        `Failed to verify admin privileges: ${error.message}`,
      );
    }

    const data = request.data;

    if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
      logger.error("[createHairdresserUser] Missing required fields in input data.", {data: JSON.stringify(data)});
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, displayName, assigned_locations, availability, working_days.",
      );
    }

    const temporaryPassword = data.password || Math.random().toString(36).slice(-10);
    logger.log("[createHairdresserUser] Temporary password selected/generated.");

    let newUserRecord;
    try {
      logger.log("[createHairdresserUser] Attempting to create Firebase Auth user for email:", data.email);
      newUserRecord = await admin.auth().createUser({
        email: data.email,
        password: temporaryPassword,
        displayName: data.displayName,
        emailVerified: false, // Consider sending a verification email
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("[createHairdresserUser] Successfully created Firebase Auth user with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firebase Auth user:", {
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        errorDetails: JSON.stringify(error),
      });
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "The email address is already in use by another account.");
      }
      throw new HttpsError(
        "internal",
        `Error creating Firebase Auth user: ${error.message}`,
      );
    }

    const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
    try {
      logger.log("[createHairdresserUser] Attempting to create Firestore document for hairdresser UID:", newUserRecord.uid);
      const hairdresserDocData = {
        user_id: newUserRecord.uid, // Store the Auth UID
        name: data.displayName,
        email: data.email, // Store email for easier querying if needed
        assigned_locations: data.assigned_locations || [],
        working_days: data.working_days || [],
        availability: data.availability,
        must_reset_password: true, // Always true for new hairdressers
        specialties: data.specialties || [],
        profilePictureUrl: data.profilePictureUrl || "", // Default to empty string if not provided
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      logger.log("[createHairdresserUser] Hairdresser document data to be written:", {hairdresserDocData: JSON.stringify(hairdresserDocData)});
      await newHairdresserDocRef.set(hairdresserDocData);
      logger.log("[createHairdresserUser] Successfully created Firestore document for hairdresser:", newUserRecord.uid);

      return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`,
      };
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firestore document for hairdresser:", {
        errorMessage: error.message,
        errorStack: error.stack,
        errorDetails: JSON.stringify(error),
      });
      // Attempt to delete the orphaned Firebase Auth user
      logger.log("[createHairdresserUser] Attempting to delete orphaned auth user UID:", newUserRecord.uid);
      await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError: any) => {
        logger.error("[createHairdresserUser] CRITICAL: Error deleting orphaned auth user after Firestore failure:", {
          deleteErrorMessage: deleteError.message,
          deleteErrorStack: deleteError.stack,
          deleteErrorDetails: JSON.stringify(deleteError),
        });
      });
      throw new HttpsError(
        "internal",
        `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`,
      );
    }
  },
);

export const helloWorld = onRequest(
  {region: "us-central1"},
  (request, response) => {
    logger.info("[helloWorld] Function triggered!", {structuredData: true, timestamp: new Date().toISOString()});
    response.send("Hello from Firebase! (v2) - Logging test successful if you see this in response and logs.");
  },
);

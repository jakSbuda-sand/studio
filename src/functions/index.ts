
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App (v2 Signatures).
 */

import {onCall, HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type {HairdresserWorkingHours, DayOfWeek} from "lib/types"; // Adjusted path relative to rootDir

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
  availability: string; // Text description
  working_days: DayOfWeek[]; // This might become redundant if fully relying on workingHours
  workingHours?: HairdresserWorkingHours; // New structured working hours
  specialties?: string[];
  profilePictureUrl?: string;
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

    let currentAuthUser;
    try {
      currentAuthUser = await admin.auth().getUser(uid);
      logger.log("[updateUserProfile] Fetched current Auth user data:", {uid: currentAuthUser.uid, displayName: currentAuthUser.displayName, photoURL: currentAuthUser.photoURL});
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
      logger.log("[updateUserProfile] Name change detected. New:", newName, "Current:", currentDisplayName);
    }

    if (newAvatarUrl !== undefined && newAvatarUrl !== currentPhotoURL) {
      authUpdatePayload.photoURL = newAvatarUrl === "" ? null : newAvatarUrl;
      avatarChanged = true;
      logger.log("[updateUserProfile] Avatar URL change detected. New:", newAvatarUrl, "Current:", currentPhotoURL, "Payload photoURL:", authUpdatePayload.photoURL);
    }

    if (!nameChanged && !avatarChanged) {
      logger.log("[updateUserProfile] No actual changes to name or avatar URL detected for UID:", uid);
      return {
        status: "no_change",
        message: "No information was different from current profile.",
      };
    }

    logger.log("[updateUserProfile] Auth changes detected. Name changed:", nameChanged, "Avatar changed:", avatarChanged);
    logger.log("[updateUserProfile] Payload for Firebase Auth update for UID", uid, ":", JSON.stringify(authUpdatePayload));

    try {
      if (Object.keys(authUpdatePayload).length > 0) {
        await admin.auth().updateUser(uid, authUpdatePayload);
        logger.log("[updateUserProfile] Firebase Auth user updated successfully for UID:", uid);
      } else {
        logger.log("[updateUserProfile] Firebase Auth payload was empty, no Auth update performed for UID:", uid);
      }

      const userDocRef = db.collection("users").doc(uid);
      const hairdresserDocRef = db.collection("hairdressers").doc(uid);
      const userDoc = await userDocRef.get();
      let firestoreUpdated = false;

      if (userDoc.exists) {
        logger.log("[updateUserProfile] Admin user document exists for UID:", uid);
        const firestoreUserUpdate: {name?: string; updatedAt: FirebaseFirestore.FieldValue} = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (nameChanged && newName !== undefined) {
          firestoreUserUpdate.name = newName;
        }
        if (Object.keys(firestoreUserUpdate).length > 1) {
          await userDocRef.update(firestoreUserUpdate);
          logger.log("[updateUserProfile] Firestore 'users' (admin) doc updated for UID:", uid, JSON.stringify(firestoreUserUpdate));
          firestoreUpdated = true;
        } else {
          logger.log("[updateUserProfile] Firestore 'users' (admin) doc for UID:", uid, "not updated. Avatar changes are Auth-only for admin, or no name change.");
        }
      } else {
        logger.log("[updateUserProfile] Admin user document does NOT exist for UID:", uid, "Checking for hairdresser doc.");
        const hairdresserDoc = await hairdresserDocRef.get();
        if (hairdresserDoc.exists) {
          logger.log("[updateUserProfile] Hairdresser document exists for UID:", uid);
          const firestoreHairdresserUpdate: {
            name?: string;
            profilePictureUrl?: string;
            updatedAt: FirebaseFirestore.FieldValue;
          } = {updatedAt: admin.firestore.FieldValue.serverTimestamp()};

          if (nameChanged && newName !== undefined) {
            firestoreHairdresserUpdate.name = newName;
          }
          if (avatarChanged && newAvatarUrl !== undefined) {
            firestoreHairdresserUpdate.profilePictureUrl = newAvatarUrl;
          }

          if (Object.keys(firestoreHairdresserUpdate).length > 1) {
            await hairdresserDocRef.update(firestoreHairdresserUpdate);
            logger.log("[updateUserProfile] Firestore 'hairdressers' doc updated for UID:", uid, JSON.stringify(firestoreHairdresserUpdate));
            firestoreUpdated = true;
          } else {
            logger.log("[updateUserProfile] Firestore 'hairdressers' doc for UID:", uid, "not updated with new field values.");
          }
        } else {
          logger.warn("[updateUserProfile] User document not found in 'users' or 'hairdressers' for UID:", uid);
          return {
            status: "warning",
            message: "Profile updated in authentication, but no matching Firestore record found to update other details.",
            updatedName: nameChanged ? newName : undefined,
            updatedAvatarUrl: avatarChanged ? newAvatarUrl : undefined,
          };
        }
      }
      logger.log(`[updateUserProfile] Final status for UID ${uid}: Name changed: ${nameChanged}, Avatar changed: ${avatarChanged}, Firestore updated: ${firestoreUpdated}`);
      return {
        status: "success",
        message: "Profile updated successfully.",
        updatedName: nameChanged ? newName : undefined,
        updatedAvatarUrl: avatarChanged ? newAvatarUrl : undefined,
      };
    } catch (error: any) {
      logger.error("[updateUserProfile] Error during Firestore update or final Auth update process for UID:", uid, {
        errorMessage: error.message,
        errorStack: error.stack,
        errorDetails: JSON.stringify(error),
      });
      if (error.code && error.code.startsWith("auth/")) {
        throw new HttpsError("internal", `Firebase Auth error during update: ${error.message}`);
      }
      throw new HttpsError("internal", `Failed to update profile in Firestore: ${error.message}`);
    }
  },
);

export const createHairdresserUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateHairdresserData>) => {
    logger.log("[createHairdresserUser] Function execution started.", {timestamp: new Date().toISOString()});
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
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        logger.error("[createHairdresserUser] Caller is not an admin. Role:", adminUserDoc.data()?.role);
        throw new HttpsError(
          "permission-denied",
          "Caller does not have admin privileges.",
        );
      }
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error verifying admin role:", {error});
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", `Failed to verify admin privileges: ${error.message}`);
    }

    const data = request.data;
    const requiredFields: Array<keyof CreateHairdresserData> = ["email", "displayName", "assigned_locations", "availability", "working_days"];
    for (const field of requiredFields) {
      if (!data[field]) {
        logger.error(`[createHairdresserUser] Missing required field: ${field}.`, {data: JSON.stringify(data)});
        throw new HttpsError("invalid-argument", `Missing required field: ${field}.`);
      }
    }

    const temporaryPassword = data.password || Math.random().toString(36).slice(-10);

    let newUserRecord;
    try {
      newUserRecord = await admin.auth().createUser({
        email: data.email,
        password: temporaryPassword,
        displayName: data.displayName,
        emailVerified: false,
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("[createHairdresserUser] Successfully created Firebase Auth user with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firebase Auth user:", {error});
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "The email address is already in use by another account.");
      }
      throw new HttpsError("internal", `Error creating Firebase Auth user: ${error.message}`);
    }

    const newHairdresserDocRef = db.collection("hairdressers").doc(newUserRecord.uid);
    try {
      const hairdresserDocData = {
        user_id: newUserRecord.uid,
        name: data.displayName,
        email: data.email,
        assigned_locations: data.assigned_locations || [],
        working_days: data.working_days || [],
        availability: data.availability,
        workingHours: data.workingHours || {},
        must_reset_password: true,
        specialties: data.specialties || [],
        profilePictureUrl: data.profilePictureUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await newHairdresserDocRef.set(hairdresserDocData);
      logger.log("[createHairdresserUser] Successfully created Firestore document for hairdresser:", newUserRecord.uid);

      return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`,
      };
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firestore document for hairdresser:", {error});
      await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError: any) => {
        logger.error("[createHairdresserUser] CRITICAL: Error deleting orphaned auth user after Firestore failure:", {deleteError});
      });
      throw new HttpsError("internal", `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`);
    }
  },
);

export const helloWorld = onRequest(
  {region: "us-central1"},
  (request, response) => {
    logger.info("[helloWorld] Function triggered!", {timestamp: new Date().toISOString()});
    response.send("Hello from Firebase! (v2) - Logging test successful if you see this in response and logs.");
  },
);

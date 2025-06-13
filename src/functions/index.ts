
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
    logger.log("[updateUserProfile] Received data:", JSON.stringify(request.data));

    if (!request.auth) {
      logger.error("[updateUserProfile] Function called while unauthenticated.");
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const uid = request.auth.uid;
    const { name, avatarUrl } = request.data;

    if (!name && !avatarUrl) {
      logger.error("[updateUserProfile] No data provided to update.");
      throw new HttpsError(
        "invalid-argument",
        "You must provide a name or avatarUrl to update."
      );
    }

    const authUpdatePayload: { displayName?: string; photoURL?: string } = {};
    if (name) authUpdatePayload.displayName = name;
    if (avatarUrl) authUpdatePayload.photoURL = avatarUrl;

    try {
      logger.log("[updateUserProfile] Updating Firebase Auth user:", uid, JSON.stringify(authUpdatePayload));
      await admin.auth().updateUser(uid, authUpdatePayload);
      logger.log("[updateUserProfile] Firebase Auth user updated successfully.");

      // Now update Firestore
      const userDocRef = db.collection("users").doc(uid);
      const hairdresserDocRef = db.collection("hairdressers").doc(uid);

      const userDoc = await userDocRef.get();
      let firestoreUpdated = false;

      if (userDoc.exists) { // Corrected: .exists is a property
        const firestoreUserUpdate: { name?: string; updatedAt: FirebaseFirestore.FieldValue } = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (name) firestoreUserUpdate.name = name;
        // Admins don't typically have avatarUrl in their 'users' doc in this app structure, but name is primary
        await userDocRef.update(firestoreUserUpdate);
        logger.log("[updateUserProfile] Firestore 'users' document updated for UID:", uid);
        firestoreUpdated = true;
      } else {
        const hairdresserDoc = await hairdresserDocRef.get();
        if (hairdresserDoc.exists) { // Corrected: .exists is a property
          const firestoreHairdresserUpdate: { name?: string; profilePictureUrl?: string; updatedAt: FirebaseFirestore.FieldValue } = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
          if (name) firestoreHairdresserUpdate.name = name;
          if (avatarUrl) firestoreHairdresserUpdate.profilePictureUrl = avatarUrl;
          
          await hairdresserDocRef.update(firestoreHairdresserUpdate);
          logger.log("[updateUserProfile] Firestore 'hairdressers' document updated for UID:", uid);
          firestoreUpdated = true;
        }
      }

      if (!firestoreUpdated) {
        logger.warn("[updateUserProfile] User document not found in 'users' or 'hairdressers' for UID:", uid, "Auth was updated but Firestore was not.");
         return {
          status: "warning",
          message: "Profile updated in authentication, but no matching Firestore record found to update.",
          updatedName: name,
          updatedAvatarUrl: avatarUrl
        };
      }

      return {
        status: "success",
        message: "Profile updated successfully.",
        updatedName: name,
        updatedAvatarUrl: avatarUrl
      };

    } catch (error: any) {
      logger.error("[updateUserProfile] Error updating profile:", {errorMessage: error.message, errorStack: error.stack, errorDetails: JSON.stringify(error)});
      if (error.code && error.code.startsWith('auth/')) {
        throw new HttpsError("internal", `Firebase Auth error: ${error.message}`);
      }
      throw new HttpsError("internal", `Failed to update profile: ${error.message}`);
    }
  }
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
        "The function must be called while authenticated."
      );
    }

    const callerUid = request.auth.uid;
    const adminUserDocRef = db.collection("users").doc(callerUid);

    try {
      logger.log("[createHairdresserUser] Verifying admin role for UID:", callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") { // Corrected: .exists
        logger.error("[createHairdresserUser] Caller is not an admin. Role:", adminUserDoc.data()?.role);
        throw new HttpsError(
          "permission-denied",
          "Caller does not have admin privileges."
        );
      }
      logger.log("[createHairdresserUser] Admin role verified for UID:", callerUid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error verifying admin role:", {errorMessage: error.message, errorStack: error.stack, errorDetails: JSON.stringify(error)});
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        `Failed to verify admin privileges: ${error.message}`
      );
    }

    const data = request.data;

    if (!data.email || !data.displayName || !data.assigned_locations || !data.availability || !data.working_days) {
      logger.error("[createHairdresserUser] Missing required fields in input data.", {data});
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, displayName, assigned_locations, availability, working_days."
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
        emailVerified: false,
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("[createHairdresserUser] Successfully created Firebase Auth user with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firebase Auth user:", {errorMessage: error.message, errorStack: error.stack, errorCode: error.code, errorDetails: JSON.stringify(error)});
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
      logger.log("[createHairdresserUser] Attempting to create Firestore document for hairdresser UID:", newUserRecord.uid);
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
      logger.log("[createHairdresserUser] Hairdresser document data to be written:", {hairdresserDocData});
      await newHairdresserDocRef.set(hairdresserDocData);
      logger.log("[createHairdresserUser] Successfully created Firestore document for hairdresser:", newUserRecord.uid);

      return {
        status: "success",
        userId: newUserRecord.uid,
        message: `Hairdresser ${data.displayName} created successfully. Initial password has been set; user will be prompted to change it.`,
      };
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firestore document for hairdresser:", {errorMessage: error.message, errorStack: error.stack, errorDetails: JSON.stringify(error)});
      logger.log("[createHairdresserUser] Attempting to delete orphaned auth user UID:", newUserRecord.uid);
      await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError: any) => {
        logger.error("[createHairdresserUser] CRITICAL: Error deleting orphaned auth user after Firestore failure:", {deleteErrorMessage: deleteError.message, deleteErrorStack: deleteError.stack, deleteErrorDetails: JSON.stringify(deleteError)});
      });
      throw new HttpsError(
        "internal",
        `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`
      );
    }
  }
);

export const helloWorld = onRequest(
  {region: "us-central1"},
  (request, response) => {
    logger.info("[helloWorld] Function triggered!", {structuredData: true, timestamp: new Date().toISOString()});
    response.send("Hello from Firebase! (v2) - Logging test successful if you see this in response and logs.");
  }
);
    

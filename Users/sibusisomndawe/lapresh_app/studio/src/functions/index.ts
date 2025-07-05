
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App (v2 Signatures).
 */

import {onCall, HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type {HairdresserWorkingHours, DayOfWeek, ServiceDoc} from "./types";
import {format} from "date-fns";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
  logger.log("Firebase Admin SDK initialized.");
}

const db = admin.firestore();

interface CreateAdminData {
  email: string;
  password?: string;
  name: string;
}

interface CreateHairdresserData {
  email: string;
  password?: string;
  displayName: string;
  assignedLocations: string[];
  workingDays: DayOfWeek[];
  workingHours?: HairdresserWorkingHours;
  specialties?: string[];
  profilePictureUrl?: string;
  isActive: boolean;
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

export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminData>) => {
    // 1. Authenticate and authorize the caller
    logger.log("[createAdminUser] Function started. Verifying caller...");
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    try {
      const adminUserDocRef = db.collection("users").doc(callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Caller does not have admin privileges.");
      }
    } catch (error: any) {
      logger.error("[createAdminUser] Error verifying admin role:", {uid: callerUid, error});
      throw new HttpsError("internal", "Failed to verify admin privileges.");
    }
    logger.log("[createAdminUser] Caller verified as admin.");

    // 2. Validate input data
    const {email, password, name} = request.data;
    if (!email || !password || !name || password.length < 6) {
      throw new HttpsError("invalid-argument", "Request must include a valid email, name, and a password of at least 6 characters.");
    }
    logger.log("[createAdminUser] Input data validated for email:", email);

    // 3. Create the new Firebase Auth user
    let newUserRecord;
    try {
      newUserRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
        emailVerified: true,
      });
      logger.log("[createAdminUser] Auth user created successfully with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createAdminUser] Error creating Firebase Auth user:", {email, error});
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", `The email address "${email}" is already in use.`);
      }
      throw new HttpsError("internal", "An unexpected error occurred while creating the new user account.");
    }

    // 4. Create the corresponding Firestore user document
    try {
      await db.collection("users").doc(newUserRecord.uid).set({
        name: name,
        email: email,
        role: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.log("[createAdminUser] Firestore doc created successfully for UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createAdminUser] CRITICAL: Firestore doc creation failed after Auth user was created. Rolling back.", {uid: newUserRecord.uid, error});
      // Rollback Auth user creation if Firestore write fails
      await admin.auth().deleteUser(newUserRecord.uid);
      logger.log("[createAdminUser] Auth user rollback successful for UID:", newUserRecord.uid);
      throw new HttpsError("internal", "Failed to save user information to the database. The user was not created.");
    }

    // 5. Return success
    return {status: "success", message: `Admin user "${name}" created successfully.`};
  }
);


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
      authUpdatePayload.photoURL = newAvatarUrl === "" ? null : newAvatarUrl; // Handle clearing avatar
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
        await userDocRef.update(firestoreUserUpdate);
        logger.log("[updateUserProfile] Firestore 'users' (admin) doc updated for UID:", uid, JSON.stringify(firestoreUserUpdate));
        firestoreUpdated = true;
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
  }
);

export const createHairdresserUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateHairdresserData>) => {
    logger.log("[createHairdresserUser] Function started. Verifying caller...");
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    try {
      const adminUserDocRef = db.collection("users").doc(callerUid);
      const adminUserDoc = await adminUserDocRef.get();
      if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Caller does not have admin privileges.");
      }
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error verifying admin role:", {uid: callerUid, error});
      throw new HttpsError("internal", "Failed to verify admin privileges.");
    }
    logger.log("[createHairdresserUser] Caller verified as admin.");

    // Validate input data
    const data = request.data;
    const {email, displayName, assignedLocations, workingDays} = data;
    const password = data.password || Math.random().toString(36).slice(-10);

    if (!email || !displayName || !assignedLocations || !workingDays || password.length < 6) {
      throw new HttpsError("invalid-argument", "Missing or invalid data. Check name, email, password, locations, and working days.");
    }
    logger.log("[createHairdresserUser] Input data validated for email:", email);

    // Create Auth user
    let newUserRecord;
    try {
      newUserRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: displayName,
        photoURL: data.profilePictureUrl || undefined,
      });
      logger.log("[createHairdresserUser] Auth user created successfully with UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] Error creating Firebase Auth user:", {email, error});
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", `The email address "${email}" is already in use.`);
      }
      throw new HttpsError("internal", "An unexpected error occurred while creating the new user account.");
    }

    // Create Firestore document
    try {
      const hairdresserDocData = {
        userId: newUserRecord.uid,
        name: displayName,
        email: email,
        assignedLocations: assignedLocations,
        workingDays: workingDays,
        workingHours: data.workingHours || {},
        must_reset_password: true,
        specialties: data.specialties || [],
        profilePictureUrl: data.profilePictureUrl || "",
        isActive: data.isActive ?? true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("hairdressers").doc(newUserRecord.uid).set(hairdresserDocData);
      logger.log("[createHairdresserUser] Firestore doc created successfully for UID:", newUserRecord.uid);
    } catch (error: any) {
      logger.error("[createHairdresserUser] CRITICAL: Firestore doc creation failed. Rolling back.", {uid: newUserRecord.uid, error});
      await admin.auth().deleteUser(newUserRecord.uid);
      logger.log("[createHairdresserUser] Auth user rollback successful for UID:", newUserRecord.uid);
      throw new HttpsError("internal", "Failed to save user information to the database. The user was not created.");
    }
    return {
      status: "success",
      userId: newUserRecord.uid,
      message: `Hairdresser "${displayName}" created successfully. They will be prompted to change their password on first login.`,
    };
  }
);

export const onHairdresserDeleted = onDocumentDeleted(
  {
    document: "hairdressers/{hairdresserId}",
    region: "us-central1",
  },
  async (event) => {
    const hairdresserId = event.params.hairdresserId; // This is the Auth UID
    const deletedData = event.data?.data();

    logger.log(`[onHairdresserDeleted] Triggered for hairdresserId: ${hairdresserId}.`);

    if (!deletedData) {
      logger.warn(`[onHairdresserDeleted] No data found for deleted hairdresser: ${hairdresserId}.`);
    } else {
      logger.log(`[onHairdresserDeleted] Hairdresser data before deletion for ${deletedData.email || hairdresserId}:`, JSON.stringify(deletedData));
    }

    try {
      await admin.auth().deleteUser(hairdresserId);
      logger.log(`[onHairdresserDeleted] Successfully deleted Firebase Auth user for UID: ${hairdresserId}.`);
      return {status: "success", message: `Auth user ${hairdresserId} deleted.`};
    } catch (error: any) {
      logger.error(`[onHairdresserDeleted] Error deleting Firebase Auth user for UID: ${hairdresserId}`, {
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack,
      });
      if (error.code === "auth/user-not-found") {
        logger.warn(`[onHairdresserDeleted] Auth user ${hairdresserId} not found. Might have been already deleted.`);
        return {status: "warning", message: `Auth user ${hairdresserId} not found, possibly already deleted.`};
      }
      // Re-throwing the error will cause the function to report a failure if it's not a 'user-not-found' error.
      throw new HttpsError("internal", `Failed to delete Auth user ${hairdresserId}: ${error.message}`);
    }
  }
);

export const onBookingCreated = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    region: "us-central1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.log("[onBookingCreated] No data associated with the event.");
      return;
    }
    const bookingData = snapshot.data();
    const bookingId = event.params.bookingId;

    logger.log(`[onBookingCreated] Triggered for new booking ID: ${bookingId}`, {bookingData});

    if (!bookingData.clientEmail) {
      logger.log(`[onBookingCreated] Booking ${bookingId} has no client email. Skipping notification.`);
      return;
    }

    try {
      const serviceDoc = await db.collection("services").doc(bookingData.serviceId).get();
      const serviceData = serviceDoc.data() as ServiceDoc | undefined;

      const notificationData = {
        bookingId: bookingId,
        type: "email",
        recipientEmail: bookingData.clientEmail,
        status: "pending", // To be processed by processEmailQueue
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        templateId: "booking_confirmation",
        context: {
          clientName: bookingData.clientName,
          serviceName: serviceData?.name || "the service you requested",
          appointmentDate: format(bookingData.appointmentDateTime.toDate(), "EEEE, MMMM do, yyyy"),
          appointmentTime: format(bookingData.appointmentDateTime.toDate(), "p"),
        },
      };

      await db.collection("notifications").add(notificationData);
      logger.log(`[onBookingCreated] Successfully created 'pending' notification record for booking ${bookingId}.`);
    } catch (error: any) {
      logger.error(`[onBookingCreated] Error creating notification record for booking ${bookingId}`, {
        errorMessage: error.message,
        errorStack: error.stack,
      });
    }
  }
);

export const processEmailQueue = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "us-central1",
  },
  async (event) => {
    logger.log("[processEmailQueue] DEPLOYMENT_V_FINAL. Function triggered.");
    const snapshot = event.data;
    if (!snapshot) {
      logger.log("[processEmailQueue] No data associated with event. Exiting.");
      return;
    }

    const notificationId = event.params.notificationId;
    logger.log(`[processEmailQueue] Processing notification ID: ${notificationId}`);

    // This is a diagnostic step. The real logic will be restored later.
    await snapshot.ref.update({
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      errorMessage: "DIAGNOSTIC: Email sending logic is disabled.",
    });

    logger.log(`[processEmailQueue] DIAGNOSTIC: Successfully updated notification ${notificationId} to 'sent'.`);
  }
);


export const helloWorld = onRequest(
  {region: "us-central1"},
  (request, response) => {
    logger.info("[helloWorld] Function triggered!", {timestamp: new Date().toISOString()});
    response.send("Hello from Firebase! (v2) - Logging test successful if you see this in response and logs.");
  }
);

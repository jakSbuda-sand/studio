"use strict";
/**
 * @fileOverview Firebase Cloud Functions for SalonVerse App (v2 Signatures).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = exports.onHairdresserDeleted = exports.createHairdresserUser = exports.updateUserProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore"); // Added for Firestore triggers
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
    admin.initializeApp();
    logger.log("Firebase Admin SDK initialized.");
}
const db = admin.firestore();
exports.updateUserProfile = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    logger.log("[updateUserProfile] Function started. Caller UID:", request.auth?.uid);
    logger.log("[updateUserProfile] Received data from client:", JSON.stringify(request.data));
    if (!request.auth) {
        logger.error("[updateUserProfile] Unauthenticated call.");
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = request.auth.uid;
    const { name: newName, avatarUrl: newAvatarUrl } = request.data;
    let currentAuthUser;
    try {
        currentAuthUser = await admin.auth().getUser(uid);
        logger.log("[updateUserProfile] Fetched current Auth user data:", { uid: currentAuthUser.uid, displayName: currentAuthUser.displayName, photoURL: currentAuthUser.photoURL });
    }
    catch (error) {
        logger.error("[updateUserProfile] Error fetching current Auth user for UID:", uid, error);
        throw new https_1.HttpsError("internal", "Failed to fetch current user data.");
    }
    const currentDisplayName = currentAuthUser.displayName || "";
    const currentPhotoURL = currentAuthUser.photoURL || "";
    const authUpdatePayload = {};
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
        }
        else {
            logger.log("[updateUserProfile] Firebase Auth payload was empty, no Auth update performed for UID:", uid);
        }
        const userDocRef = db.collection("users").doc(uid);
        const hairdresserDocRef = db.collection("hairdressers").doc(uid);
        const userDoc = await userDocRef.get();
        let firestoreUpdated = false;
        if (userDoc.exists) {
            logger.log("[updateUserProfile] Admin user document exists for UID:", uid);
            const firestoreUserUpdate = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (nameChanged && newName !== undefined) {
                firestoreUserUpdate.name = newName;
            }
            if (Object.keys(firestoreUserUpdate).length > 1) {
                await userDocRef.update(firestoreUserUpdate);
                logger.log("[updateUserProfile] Firestore 'users' (admin) doc updated for UID:", uid, JSON.stringify(firestoreUserUpdate));
                firestoreUpdated = true;
            }
            else {
                logger.log("[updateUserProfile] Firestore 'users' (admin) doc for UID:", uid, "not updated. Avatar changes are Auth-only for admin, or no name change.");
            }
        }
        else {
            logger.log("[updateUserProfile] Admin user document does NOT exist for UID:", uid, "Checking for hairdresser doc.");
            const hairdresserDoc = await hairdresserDocRef.get();
            if (hairdresserDoc.exists) {
                logger.log("[updateUserProfile] Hairdresser document exists for UID:", uid);
                const firestoreHairdresserUpdate = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
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
                }
                else {
                    logger.log("[updateUserProfile] Firestore 'hairdressers' doc for UID:", uid, "not updated with new field values.");
                }
            }
            else {
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
    }
    catch (error) {
        logger.error("[updateUserProfile] Error during Firestore update or final Auth update process for UID:", uid, {
            errorMessage: error.message,
            errorStack: error.stack,
            errorDetails: JSON.stringify(error),
        });
        if (error.code && error.code.startsWith("auth/")) {
            throw new https_1.HttpsError("internal", `Firebase Auth error during update: ${error.message}`);
        }
        throw new https_1.HttpsError("internal", `Failed to update profile in Firestore: ${error.message}`);
    }
});
exports.createHairdresserUser = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    logger.log("[createHairdresserUser] Function execution started.", { timestamp: new Date().toISOString() });
    logger.log("[createHairdresserUser] Received data:", JSON.stringify(request.data));
    if (!request.auth) {
        logger.error("[createHairdresserUser] Function called while unauthenticated.");
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    const adminUserDocRef = db.collection("users").doc(callerUid);
    try {
        const adminUserDoc = await adminUserDocRef.get();
        if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "admin") {
            logger.error("[createHairdresserUser] Caller is not an admin. Role:", adminUserDoc.data()?.role);
            throw new https_1.HttpsError("permission-denied", "Caller does not have admin privileges.");
        }
    }
    catch (error) {
        logger.error("[createHairdresserUser] Error verifying admin role:", { error });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", `Failed to verify admin privileges: ${error.message}`);
    }
    const data = request.data;
    const requiredFields = ["email", "displayName", "assigned_locations", "availability", "working_days"];
    for (const field of requiredFields) {
        if (!data[field]) {
            logger.error(`[createHairdresserUser] Missing required field: ${field}.`, { data: JSON.stringify(data) });
            throw new https_1.HttpsError("invalid-argument", `Missing required field: ${field}.`);
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
    }
    catch (error) {
        logger.error("[createHairdresserUser] Error creating Firebase Auth user:", { error });
        if (error.code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "The email address is already in use by another account.");
        }
        throw new https_1.HttpsError("internal", `Error creating Firebase Auth user: ${error.message}`);
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
    }
    catch (error) {
        logger.error("[createHairdresserUser] Error creating Firestore document for hairdresser:", { error });
        await admin.auth().deleteUser(newUserRecord.uid).catch((deleteError) => {
            logger.error("[createHairdresserUser] CRITICAL: Error deleting orphaned auth user after Firestore failure:", { deleteError });
        });
        throw new https_1.HttpsError("internal", `Error creating Firestore document for hairdresser: ${error.message}. Associated Auth user cleanup attempted.`);
    }
});
exports.onHairdresserDeleted = (0, firestore_1.onDocumentDeleted)({
    document: "hairdressers/{hairdresserId}",
    region: "us-central1",
}, async (event) => {
    const hairdresserId = event.params.hairdresserId; // This is the Auth UID
    const deletedData = event.data?.data();
    logger.log(`[onHairdresserDeleted] Triggered for hairdresserId: ${hairdresserId}.`);
    if (!deletedData) {
        logger.warn(`[onHairdresserDeleted] No data found for deleted hairdresser: ${hairdresserId}.`);
    }
    else {
        logger.log(`[onHairdresserDeleted] Hairdresser data before deletion for ${deletedData.email || hairdresserId}:`, JSON.stringify(deletedData));
    }
    try {
        await admin.auth().deleteUser(hairdresserId);
        logger.log(`[onHairdresserDeleted] Successfully deleted Firebase Auth user for UID: ${hairdresserId}.`);
        return { status: "success", message: `Auth user ${hairdresserId} deleted.` };
    }
    catch (error) {
        logger.error(`[onHairdresserDeleted] Error deleting Firebase Auth user for UID: ${hairdresserId}`, {
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack,
        });
        if (error.code === "auth/user-not-found") {
            logger.warn(`[onHairdresserDeleted] Auth user ${hairdresserId} not found. Might have been already deleted.`);
            return { status: "warning", message: `Auth user ${hairdresserId} not found, possibly already deleted.` };
        }
        // Re-throwing the error will cause the function to report a failure if it's not a 'user-not-found' error.
        throw new https_1.HttpsError("internal", `Failed to delete Auth user ${hairdresserId}: ${error.message}`);
    }
});
exports.helloWorld = (0, https_2.onRequest)({ region: "us-central1" }, (request, response) => {
    logger.info("[helloWorld] Function triggered!", { timestamp: new Date().toISOString() });
    response.send("Hello from Firebase! (v2) - Logging test successful if you see this in response and logs.");
});
//# sourceMappingURL=index.js.map
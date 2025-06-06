
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
// import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; // Uncomment if you use Functions
// import { getStorage, connectStorageEmulator } from "firebase/storage"; // Uncomment if you use Storage

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration!
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
// const functions = getFunctions(app); // Uncomment if you use Functions
// const storage = getStorage(app); // Uncomment if you use Storage

// Connect to emulators if running in development and emulators are running
if (process.env.NODE_ENV === 'development') {
  // Check if emulators are running by trying to fetch their config
  // This is a common pattern, but you might need a more robust check
  // or simply rely on an environment variable like process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

  if (useEmulators) {
    console.log("Connecting to Firebase Emulators");
    try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        console.log("Auth Emulator connected");
    } catch (e) {
        console.warn("Auth Emulator connection failed or already connected:", e);
    }
    try {
        connectFirestoreEmulator(db, "localhost", 8080);
        console.log("Firestore Emulator connected");
    } catch (e) {
        console.warn("Firestore Emulator connection failed or already connected:", e);
    }
    // try { // Uncomment if you use Functions
    //   connectFunctionsEmulator(functions, "localhost", 5001);
    //   console.log("Functions Emulator connected");
    // } catch (e) {
    //   console.warn("Functions Emulator connection failed or already connected:", e);
    // }
    // try { // Uncomment if you use Storage
    //   connectStorageEmulator(storage, "localhost", 9199);
    //   console.log("Storage Emulator connected");
    // } catch (e) {
    //   console.warn("Storage Emulator connection failed or already connected:", e);
    // }
  }
}

export { app, auth, db };
// export { app, auth, db, functions, storage }; // Uncomment if you use Functions/Storage


import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator, 
  EmailAuthProvider, 
  GoogleAuthProvider, // Example if you add Google Sign-In
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
  writeBatch,
  serverTimestamp // Import serverTimestamp here
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
// import { getStorage, connectStorageEmulator } from "firebase/storage"; // Uncomment if you use Storage

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
const functions = getFunctions(app, "us-central1"); // Explicitly set region
// const storage = getStorage(app); // Uncomment if you use Storage

if (process.env.NODE_ENV === 'development') {
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
    try { 
      connectFunctionsEmulator(functions, "localhost", 5001);
      console.log("Functions Emulator connected");
    } catch (e) {
      console.warn("Functions Emulator connection failed or already connected:", e);
    }
    // try { // Uncomment if you use Storage
    //   connectStorageEmulator(storage, "localhost", 9199);
    //   console.log("Storage Emulator connected");
    // } catch (e) {
    //   console.warn("Storage Emulator connection failed or already connected:", e);
    // }
  }
}

export { 
  app, 
  auth, 
  db,
  functions, // Export functions
  // storage, // Export storage if used
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  firebaseSendPasswordResetEmail,
  firebaseSignInWithEmailAndPassword,
  firebaseCreateUserWithEmailAndPassword,
  firebaseSignOut,
  firebaseUpdateProfile,
  firebaseUpdatePassword,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
  writeBatch,
  httpsCallable,
  serverTimestamp // Export serverTimestamp here
};


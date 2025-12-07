import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence so reads can be served from cache when offline.
// This is a best-effort call: it will fail in some environments (e.g. Safari private mode)
// and when multiple tabs conflict. We catch and ignore expected errors.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    // failed-precondition: multiple tabs open, unimplemented: browser not supported
    console.warn("Could not enable IndexedDB persistence:", err.code || err.message || err);
  });
} catch (e) {
  // Ignore synchronous errors
  console.warn("Persistence enable failed:", e);
}

export const googleProvider = new GoogleAuthProvider();

export default app;

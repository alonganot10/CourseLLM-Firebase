import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from "firebase/firestore";

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
export const storage = getStorage(app);

// --- Emulator wiring (local dev) ---
// Keep the whole client stack on emulators when enabled; mixing emulator Auth with
// production Firestore will break (tokens won't be accepted by prod rules).
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

// Avoid re-connecting on hot reloads.
const g = globalThis as any;
if (USE_EMULATORS && typeof window !== "undefined" && !g.__COURSELLM_EMULATORS_CONNECTED) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "127.0.0.1";
  const authPort = Number(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || "9099");
  const fsPort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8081");
  const stPort = Number(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || "9199");

  try {
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
  } catch (e) {
    // connectAuthEmulator can throw if already connected; ignore.
    console.warn("connectAuthEmulator failed (likely already connected):", e);
  }

  try {
    connectFirestoreEmulator(db, host, fsPort);
  } catch (e) {
    // connectFirestoreEmulator can throw if already connected; ignore.
    console.warn("connectFirestoreEmulator failed (likely already connected):", e);
  }

  try {
    connectStorageEmulator(storage, host, stPort);
  } catch (e) {
    console.warn("connectStorageEmulator failed (likely already connected):", e);
  }

  g.__COURSELLM_EMULATORS_CONNECTED = true;
}

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

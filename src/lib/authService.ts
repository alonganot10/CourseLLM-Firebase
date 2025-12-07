import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, signInWithRedirect } from "firebase/auth";

export async function signInWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err: any) {
    // Some browser environments (strict COOP/COEP, embedded contexts) block cross-window access
    // which the Firebase popup flow relies on (checking popup.closed). In that case, fall back
    // to the redirect-based flow which does not require cross-window communication.
    const msg = err?.message || "";
    if (/cross-?origin|opener|blocked a frame|window\.closed/i.test(msg)) {
      console.warn("Popup blocked by Cross-Origin-Opener-Policy or similar, falling back to redirect sign-in.");
      try {
        await signInWithRedirect(auth, googleProvider);
        return null as any; // control will not reach here in redirect flow
      } catch (redirectErr) {
        handleAuthError(redirectErr);
        throw redirectErr;
      }
    }
    handleAuthError(err);
    throw err;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function handleAuthError(err: any) {
  if (!err) return;
  // Basic cases - the UI can show friendlier messages
  if (err.code === "auth/popup-closed-by-user") {
    console.warn("Auth popup closed by user");
    return;
  }
  if (err.code === "auth/network-request-failed") {
    console.warn("Network error");
    return;
  }
  // Cross-origin opener / popup blocking issues
  const msg = err?.message || "";
  if (/cross-?origin|opener|blocked a frame|window\.closed/i.test(msg)) {
    console.warn("Popup-based sign-in blocked by browser COOP/COEP or embedding policy. Try enabling third-party cookies or use redirect-based sign-in.");
    return;
  }
  console.error("Auth error", err);
}

import { auth, googleProvider } from "./firebase";
import { signInWithRedirect, signOut } from "firebase/auth";

export async function signInWithGoogle() {
  try {
    // Redirect-only Google sign-in (no popup)
    await signInWithRedirect(auth, googleProvider);
    // In redirect flow, control won't usually return here; user comes back on a new page load.
  } catch (err: any) {
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
    console.warn(
      "Popup-based sign-in blocked by browser COOP/COEP or embedding policy. Try enabling third-party cookies or use redirect-based sign-in."
    );
    return;
  }
  console.error("Auth error", err);
}

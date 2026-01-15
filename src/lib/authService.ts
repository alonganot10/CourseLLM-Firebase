import { auth, googleProvider } from "./firebase";
import {
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";

export async function signInWithGoogle() {
  console.log("[authService] starting Google sign-in (redirect)");
  try {
    await signInWithRedirect(auth, googleProvider);
    // After this, the browser navigates away to Google.
    // No code below here will run on a successful redirect.
  } catch (err: any) {
    handleAuthError(err);
    throw err;
  }
}

// Called once on page load to finish any pending redirect login
export async function completeRedirectSignIn(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log(
        "[authService] redirect sign-in completed:",
        result.user.uid,
        result.user.email,
      );
    } else {
      console.log(
        "[authService] no redirect result (normal on first load or when already signed in)",
      );
    }
  } catch (err: any) {
    handleAuthError(err);
    console.error("[authService] completeRedirectSignIn error", err);
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function handleAuthError(err: any) {
  if (!err) return;

  if (err.code === "auth/popup-closed-by-user") {
    console.warn("[authService] popup closed by user");
    return;
  }

  if (err.code === "auth/network-request-failed") {
    console.warn("[authService] network error during auth");
    return;
  }

  if (err.code === "auth/unauthorized-domain") {
    console.error(
      "[authService] unauthorized domain. In Firebase Console → Authentication → Settings → Authorized domains, add:",
      window.location.origin,
    );
    return;
  }

  console.error("[authService] auth error", err);
}

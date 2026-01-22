import { auth, googleProvider } from "./firebase";
import {
  signInWithRedirect,
  getRedirectResult,
  signOut,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  User,
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



export async function signUpWithEmail(auth: Auth, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Optional: require verification before full access
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function signInWithEmail(auth: Auth, email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function resetPassword(auth: Auth, email: string) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * If the current user signed in with Google, let them add a password too
 * (so they can log in either way in the future).
 */
export async function linkPasswordToCurrentUser(
  auth: Auth,
  email: string,
  password: string
) {
  if (!auth.currentUser) throw new Error("No signed-in user to link credentials to.");

  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(auth.currentUser, credential);
  return result.user;
}

/**
 * Nice UX: detect whether an email is already tied to Google vs password
 * before you decide whether to show "Sign up" or "Sign in".
 */
export async function getSignInMethods(auth: Auth, email: string) {
  return await fetchSignInMethodsForEmail(auth, email);
}

# Authentication & Login — Implementation Details

This document summarizes the authentication and login implementation in this repository, lists the client/server APIs we added, and documents how to run tests that exercise auth flows.

Files and locations
- Firebase init & providers: `src/lib/firebase.ts`
- Auth helpers (client): `src/lib/authService.ts`
- Client auth provider (React context): `src/components/AuthProviderClient.tsx`
- Role guard (client-side): `src/components/RoleGuardClient.tsx`
- Auth redirector (root helper): `src/components/AuthRedirector.tsx`
- Login page: `src/app/login/page.tsx`
- Onboarding page: `src/app/onboarding/page.tsx`
- Sign-out in UI (user menu): `src/components/layout/user-nav.tsx`
- Firestore rules (security): `firestore.rules`
- Test-only token route: `src/app/api/test-token/route.ts` (only enabled when `ENABLE_TEST_AUTH=true`)
- Test signin client page: `src/app/test/signin/page.tsx`
- Playwright tests: `tests/auth.spec.ts` and config `tests/playwright.config.ts`

Overview
--------
The app uses Firebase Authentication (client SDK) and Firestore for user profiles. Users sign in with Google (OAuth). On first login (no `users/{uid}` doc) the app sends them to an onboarding page to collect role/department/courses. Subsequent logins load the Firestore profile and direct users to either the student or teacher dashboard depending on `profile.role`.

Main runtime pieces
-------------------

1) Firebase initialization — `src/lib/firebase.ts`

- Exports:
  - `app` — initialized Firebase App
  - `auth` — Firebase Auth instance
  - `db` — Firestore instance
  - `googleProvider` — `GoogleAuthProvider` instance

- Notes: IndexedDB persistence is enabled for Firestore where possible (best-effort).

2) Client auth service — `src/lib/authService.ts`

- Exposed functions:
  - `signInWithGoogle(): Promise<User | null>`
    - Tries popup sign-in (`signInWithPopup(auth, googleProvider)`). If the popup flow fails due to popup-blocking / COOP/COEP, falls back to `signInWithRedirect(auth, googleProvider)` and returns `null` because redirect will navigate away.
  - `signOutUser(): Promise<void>` — calls Firebase `signOut(auth)`.
  - `handleAuthError(err: any): void` — small helper that inspects common auth errors and logs friendly messages (popup closed, network issues, popup blocked).

3) React client provider — `src/components/AuthProviderClient.tsx`

- Purpose: centralizes auth state (Firebase user), loads Firestore `users/{uid}` profile, computes `onboardingRequired`, and exposes actions via context.

- Context API (via `useAuth()`):
  - `firebaseUser: User | null` — raw Firebase user from onAuthStateChanged
  - `profile: Profile | null` — Firestore user profile (shape below)
  - `loading: boolean` — whether the provider is still initializing/loading
  - `signInWithGoogle: () => Promise<void>` — triggers `authService.signInWithGoogle()`
  - `signOut: () => Promise<void>` — triggers sign out and clears profile
  - `refreshProfile: () => Promise<Profile | null>` — forces a Firestore read for the current user and returns the profile
  - `onboardingRequired: boolean` — derived flag; true when `users/{uid}` is missing or incomplete

- Profile shape (TypeScript):
  ```ts
  type Profile = {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role?: 'student' | 'teacher';
    department?: string;
    courses?: string[];
    authProviders?: string[];
    createdAt?: any;
    updatedAt?: any;
  }
  ```

- Completeness rules: profile considered complete when `role` is `student|teacher`, `department` is non-empty, and `courses` is a non-empty array.

4) Login & onboarding flow

- `src/app/login/page.tsx` renders the sign-in UI. When the user clicks "Sign in with Google":
  - we set a local `navigating` flag to show a loading overlay, then call `signInWithGoogle()`.
  - after sign-in we check if the user is brand-new (Firebase `user.metadata.creationTime === user.metadata.lastSignInTime`). If new, redirect to `/onboarding` immediately.
  - otherwise we attempt to use the in-memory `profile` to redirect immediately. If no profile is present we `refreshProfile()` but only wait a short time (700ms) before falling back to an optimistic redirect (defaulting to `/student`) to avoid long waits.

- `src/app/onboarding/page.tsx` collects `role`, `department`, and `courses` and writes them to `users/{uid}` with `profileComplete: true`. After saving it calls `refreshProfile()` then redirects to `/student` or `/teacher`.

5) Route protection

- `src/components/RoleGuardClient.tsx` (client component) checks `useAuth()` and redirects:
  - If not authenticated → `/login`
  - If `onboardingRequired` → `/onboarding`
  - If authenticated but `profile.role` does not match required role → redirects to the proper dashboard

- `src/components/AuthRedirector.tsx` is mounted in the root layout to redirect neutral pages (e.g., `/` or `/login`) to onboarding or the correct dashboard when the auth state becomes known.

6) Sign-out

- `src/components/layout/user-nav.tsx` contains a `Log out` menu item that calls `signOut()` from the context and then `router.replace('/login')`.

Test helpers & Playwright
-------------------------

To make E2E tests reliable we added a test-only server route and a client page to sign-in using Firebase custom tokens.

- `src/app/api/test-token/route.ts` (server route)
  - Guarded by env var `ENABLE_TEST_AUTH=true`.
  - Accepts query params: `uid`, `role`, `createProfile`.
  - Uses the Firebase Admin SDK to mint a custom token for `uid`. If `role` is provided and `createProfile=true` it will also write a `users/{uid}` doc in Firestore (server-side) with `profileComplete: true`.

- `src/app/test/signin/page.tsx` (client)
  - Reads `token` from query string and calls `signInWithCustomToken(auth, token)` to sign the test browser session in.

- Playwright tests
  - `tests/playwright.config.ts` and `tests/auth.spec.ts` implement tests that cover the scenarios you requested (first-login -> onboarding, role-based access, redirect after login, logout behavior).

Environment variables and Firebase Console steps
----------------------------------------------

Local/.env vars used by the project (see `.env.local.example`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Test-specific env vars (for Playwright custom-token tests):
- `ENABLE_TEST_AUTH=true` — enables the test `/api/test-token` route
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the raw JSON string of a Firebase service account (or use `FIREBASE_SERVICE_ACCOUNT_PATH` to point at a file). Required for minting custom tokens with the Admin SDK.

Firebase Console configuration (minimum for app to work):
1. In Firebase Console → Authentication → Sign-in method, enable **Google** provider.
   - (Optional) You can also enable GitHub historically — note: this repo removed GitHub sign-in.
2. Make sure your web app's config (API key, project id, authDomain, appId, ...) are set in `.env.local` and match the Firebase project.
3. (For tests) Create a service account in Firebase Console → Project settings → Service accounts → Generate new private key — use the JSON to populate `FIREBASE_SERVICE_ACCOUNT_JSON` or save the file and set `FIREBASE_SERVICE_ACCOUNT_PATH`.

Security notes
--------------
- The test token route is powerful and can mint arbitrary custom tokens; keep `ENABLE_TEST_AUTH` disabled except in local/dev/test environments. Do not enable it in production.
- Firestore rules (`firestore.rules`) are used to prevent client reads/writes to other users' profiles — server-side Admin SDK writes (used by the test route) bypass security rules intentionally.

Running tests (quick)
---------------------
1. Install deps: `npm install`
2. Set test env vars (PowerShell example):
   ```powershell
   $env:ENABLE_TEST_AUTH = "true"
   $env:FIREBASE_SERVICE_ACCOUNT_PATH = ".\secrets\firebase-admin.json"
   npm run test:e2e
   ```

If you prefer the emulator-based approach (no service account, fully local), tell me and I can add emulator wiring instead of the Admin SDK route.

Notes / FAQ
-----------
- Q: Why use custom tokens for tests instead of automating Google OAuth?
  - A: Automating Google’s OAuth popup is brittle, slow, and often blocked by Google policies. Custom tokens (or the Auth emulator) provide reliable, fast, and isolated test flows.

- Q: Where does the app decide a user is new?
  - A: The login handler checks Firebase metadata: `creationTime === lastSignInTime`. The onboarding route also checks whether a `users/{uid}` doc exists and sets `onboardingRequired` accordingly.

If you want, I can also:
- Add an emulator-based test suite (no service account needed).
- Add more Playwright assertions (page content, profile checks).
- Add a short developer guide for setting up `.env.local` and the Firebase console step-by-step.

---


## 1. Overview & Objective
To implement a secure, role-based authentication system acting as the "gatekeeper" for the Socratic AI application. The system differentiates between **Students** and **Teachers**, ensuring users are routed to the correct experience (Learning Dashboard vs. Analytics Dashboard) immediately upon login, while handling first-time user onboarding.

---

## 2. User Stories
* **US-1 (New Student):** "As a first-time student, I want to sign up using my school Google account and easily set my profile (role, courses) so I can start asking questions."
* **US-2 (New Teacher):** "As a teacher, I want to sign up (using my Google account) and identify myself as an instructor so I can access the class analytics view."
* **US-3 (Returning Student):** "As a returning student, I want to log in and be routed *directly* to my Learning Dashboard so I can resume my study sessions immediately."
* **US-4 (Returning Teacher):** "As a returning teacher, I want to log in and be routed *directly* to the Analytics Dashboard so I can quickly review class performance without extra clicks."

---

## 3. User Experience (UX/UI)

### 3.1. Login Page
* **Interface:** Clean, centered card.
* **Actions:** Single prominent button: **"Sign in with Google"**.
* **Logic:** No separate "Sign Up" toggle; the system detects new users automatically based on their Google ID.

### 3.2. The "Router" (Loading State)
* **Trigger:** Immediately after the Google popup closes.
* **Visual:** **Full-screen Spinner** with text *"Verifying profile..."*.
* **Logic:** Prevents "flash of unstyled content" while `AuthHandler` queries Firestore.

### 3.3. Onboarding Page (New Users Only)
* **Access:** Authenticated users with **no Firestore profile**.
* **Fields:**
    * **Role:** Radio Buttons `[ Student | Teacher ]`. *(Critical step as both use Google)*
    * **Department:** Text Input.
    * **Courses:** **Tag/Pill Input** (e.g., User types "CS101" + Enter $\rightarrow$ converts to chip).
* **Action:** "Complete Profile" (Disabled until valid).

---

## 4. Technical Architecture

### 4.1. Client-Side Logic (`AuthHandler`)
1.  **Listen:** `onAuthStateChanged` detects login.
2.  **Query:** Fetch `users/{uid}` from Firestore.
3.  **Decision:**
    * **Profile Found:** Redirect to `/{role}/dashboard`.
    * **Profile Missing:** Redirect to `/onboarding`.

### 4.2. Backend Logic (Genkit Flow: `createUserProfileFlow`)
* **Trigger:** HTTP call from Onboarding Frontend.
* **Security:** `firebaseAuth()` policy enabled.
* **Validation:** `role` must be `'student'` or `'teacher'`.
* **Idempotency:** Abort if `users/{uid}` already exists.
* **Action:** Write `UserProfile` to Firestore.

---

## 5. Data Model (Firestore)

**Collection:** `users` | **Document ID:** `uid` (Matches Auth UID)

| Field | Type | Required | Validation / Notes |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | Yes | Primary Key. |
| `email` | `string` | Yes | From Google Auth. |
| `role` | `string` | Yes | **Enum:** `['student', 'teacher']`. Immutable. |
| `department` | `string` | Yes | Max 50 chars. |
| `courses` | `string[]` | Yes | Array of strings. Max 10 items. |
| `createdAt` | `timestamp` | Yes | Server timestamp. |

---

## 6. Dependencies & Assumptions

### 6.1. Dependencies
* **Firebase Project:** Must have **Google Auth provider** enabled and Firestore Database created.
* **Genkit Environment:** Backend must be deployed/running locally to accept the `createUserProfileFlow` call.
* **Env Variables:** Frontend requires `NEXT_PUBLIC_FIREBASE_API_KEY` and `GENKIT_ENV`.

### 6.2. Assumptions
* **Self-Identification:** Users truthfully select "Student" or "Teacher" (no university directory sync for MVP).
* **Browser Support:** Users are on browsers that support Popups (or Redirect fallback is implemented).
* **Google Account:** All users (Students and Teachers) possess a valid Google account.

---

## 7. Acceptance Criteria

### 7.1. Functional
* [ ] **AC-01 (New Student):** Google Sign-in $\rightarrow$ Onboarding $\rightarrow$ Select "Student" $\rightarrow$ Submit $\rightarrow$ Land on Student Dashboard.
* [ ] **AC-02 (New Teacher):** Google Sign-in $\rightarrow$ Onboarding $\rightarrow$ Select "Teacher" $\rightarrow$ Submit $\rightarrow$ Land on Teacher Dashboard.
* [ ] **AC-03 (Returning Student):** Student Login $\rightarrow$ **Spinner** $\rightarrow$ Lands on `/student/dashboard` (Skips Onboarding).
* [ ] **AC-04 (Returning Teacher):** Teacher Login $\rightarrow$ **Spinner** $\rightarrow$ Lands on `/teacher/dashboard` (Skips Onboarding).
* [ ] **AC-05 (Input):** Onboarding "Complete" button is disabled until Role, Dept, and 1 Course are entered.
* [ ] **AC-06 (Persistence):** Submitting onboarding creates a valid Firestore document with `string[]` for courses.

### 7.2. Edge Cases & Security
* [ ] **AC-07 (Ghost User):** User signs in but closes tab during Onboarding. Next login redirects *back* to Onboarding.
* [ ] **AC-08 (Role Guard):** Student tries to access `/teacher/dashboard` $\rightarrow$ Redirect to `/student/dashboard` (Forbidden).
* [ ] **AC-09 (Injection):** Backend API rejects requests with `role: "admin"` or other invalid strings.
* [ ] **AC-10 (Network):** Internet drops during onboarding submit $\rightarrow$ Show Error Toast, preserve form data.
```
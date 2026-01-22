"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import * as authService from "@/lib/authService";

type Profile = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
  authProviders?: string[];
  createdAt?: any;
  updatedAt?: any;
};

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  onboardingRequired: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProviderClient");
  return ctx;
};

export const AuthProviderClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const profileUnsubRef = useRef<null | (() => void)>(null);

  // One-time check for redirect flows (mainly for debugging)
  useEffect(() => {
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          console.log("[AuthProvider] getRedirectResult user:", res.user.uid, res.user.email);
        }
      })
      .catch((err) => {
        if (err?.code !== "auth/no-auth-event") {
          console.error("[AuthProvider] getRedirectResult error:", err);
        }
      });
  }, []);

  function isProfileComplete(p: Profile | null | undefined) {
    if (!p) return false;

    const role = p.role;
    const hasRole = role === "student" || role === "teacher";
    const hasDepartment = !!p.department && p.department.toString().trim().length > 0;

    // Students must pick at least one course; teachers can operate with "all courses"
    const hasCourses =
      role === "teacher"
        ? true
        : Array.isArray(p.courses) && p.courses.map(String).filter((c) => c.trim()).length > 0;

    return hasRole && hasDepartment && hasCourses;
  }

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      console.log(
        "[AuthProvider] onAuthStateChanged RAW user:",
        user ? `${user.uid} / ${user.email}` : null
      );

      // stop old profile listener (important when switching accounts)
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setLoading(true);
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setOnboardingRequired(false);
        setLoading(false);
        return;
      }

      // Realtime listen to the user's profile doc so onboarding updates are immediate
      let first = true;
      const userDocRef = doc(db, "users", user.uid);

      profileUnsubRef.current = onSnapshot(
        userDocRef,
        (snap) => {
          if (!snap.exists()) {
            setProfile(null);
            setOnboardingRequired(true);
          } else {
            const data = snap.data() as Profile;
            const complete = isProfileComplete(data);
            setProfile({ ...data });
            setOnboardingRequired(!complete);
          }

          if (first) {
            first = false;
            setLoading(false);
          }
        },
        (err) => {
          console.error("[AuthProvider] onSnapshot(profile) error:", err);

          // If Firestore is unavailable/offline, don't hard-force onboarding
          const msg = (err as any)?.message || (err as any)?.code || "";
          if (
            msg.toString().toLowerCase().includes("client is offline") ||
            (err as any)?.code === "unavailable" ||
            (err as any)?.code === "failed-precondition"
          ) {
            console.warn("Firestore unavailable (offline?) - will not force onboarding:", err);
            setProfile(null);
            setOnboardingRequired(false);
          } else {
            setProfile(null);
            setOnboardingRequired(true);
          }

          if (first) {
            first = false;
            setLoading(false);
          }
        }
      );
    });

    // Try to complete any pending redirect sign-in.
    (async () => {
      try {
        if (typeof authService.completeRedirectSignIn === "function") {
          await authService.completeRedirectSignIn();
        }
      } catch (err) {
        console.error("[AuthProvider] completeRedirectSignIn error:", err);
      }
    })();

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, []);

  async function refreshProfile(): Promise<Profile | null> {
    const current = firebaseUser || (auth && (auth.currentUser as FirebaseUser | null));
    if (!current) return null;

    // Not strictly required anymore because onSnapshot keeps state fresh,
    // but still useful for manual "refresh" actions.
    const docRef = doc(db, "users", current.uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() as Profile;
    setProfile({ ...data });
    setOnboardingRequired(!isProfileComplete(data));
    return data;
  }

  async function handleSignInWithGoogle() {
    await authService.signInWithGoogle();
  }

  async function handleSignOut() {
    await authService.signOutUser();
    setProfile(null);
    setOnboardingRequired(false);
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        refreshProfile,
        onboardingRequired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProviderClient;

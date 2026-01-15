"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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

export const AuthProviderClient: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  // One-time check for redirect flows (mainly for debugging)
  useEffect(() => {
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          console.log(
            "[AuthProvider] getRedirectResult user:",
            res.user.uid,
            res.user.email
          );
        }
      })
      .catch((err) => {
        if (err?.code !== "auth/no-auth-event") {
          console.error("[AuthProvider] getRedirectResult error:", err);
        }
      });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log(
        "[AuthProvider] onAuthStateChanged RAW user:",
        user ? `${user.uid} / ${user.email}` : null,
      );

      setLoading(true);
      setFirebaseUser(user);

      if (user) {
        try {
          await loadProfile(user.uid);
        } catch (err) {
          console.error("[AuthProvider] loadProfile error:", err);
        }
      } else {
        setProfile(null);
        setOnboardingRequired(false);
      }

      setLoading(false);
    });

    // Try to complete any pending redirect sign-in.
    (async () => {
      try {
        // Will just log and exit if there is no pending redirect
        if (typeof authService.completeRedirectSignIn === "function") {
          await authService.completeRedirectSignIn();
        }
      } catch (err) {
        console.error("[AuthProvider] completeRedirectSignIn error:", err);
      }
    })();

    return () => unsub();
  }, []);


  async function loadProfile(uid: string): Promise<Profile | null> {
    const docRef = doc(db, "users", uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setProfile(null);
        setOnboardingRequired(true);
        return null;
      }

      const data = snap.data() as Profile;
      const isComplete = isProfileComplete(data);

      setProfile({ ...data } as Profile);
      setOnboardingRequired(!isComplete);
      return data;
    } catch (err: any) {
      const msg = err?.message || err?.code || "";
      if (
        msg.toString().toLowerCase().includes("client is offline") ||
        err?.code === "unavailable" ||
        err?.code === "failed-precondition"
      ) {
        console.warn(
          "Firestore unavailable (offline?) - will not force onboarding:",
          err
        );
        setProfile(null);
        setOnboardingRequired(false);
        return null;
      }
      throw err;
    }
  }

  function isProfileComplete(p: Profile | null | undefined) {
    if (!p) return false;
    const hasRole = p.role === "student" || p.role === "teacher";
    const hasDepartment =
      !!p.department && p.department.toString().trim().length > 0;
    const hasCourses = Array.isArray(p.courses) && p.courses.length > 0;
    return hasRole && hasDepartment && hasCourses;
  }

  async function refreshProfile(): Promise<Profile | null> {
    const current = firebaseUser || (auth && (auth.currentUser as FirebaseUser | null));
    if (!current) return null;
    const p = await loadProfile(current.uid);
    return p || null;
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

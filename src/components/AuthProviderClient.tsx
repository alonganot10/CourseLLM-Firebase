"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
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

export const AuthProviderClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);
      if (user) {
        await loadProfile(user.uid);
      } else {
        setProfile(null);
        setOnboardingRequired(false);
      }
      setLoading(false);
    });
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
      // Determine completeness
      const isComplete = isProfileComplete(data);
      setProfile({ ...data } as Profile);
      setOnboardingRequired(!isComplete);
      return data;
    } catch (err: any) {
      // Firestore offline error (client is offline) or other transient network errors.
      // In this case, avoid forcing onboarding redirect. Leave profile null and
      // onboardingRequired false so UI can show an offline retry state instead of
      // redirecting the user to onboarding.
      const msg = err?.message || err?.code || "";
      if (msg.toString().toLowerCase().includes("client is offline") || err?.code === 'unavailable' || err?.code === 'failed-precondition') {
        console.warn("Firestore unavailable (offline?) - will not force onboarding:", err);
        setProfile(null);
        setOnboardingRequired(false);
          return null;
      }
      // Re-throw unexpected errors so they can be observed
      throw err;
    }
  }

  function isProfileComplete(p: Profile | null | undefined) {
    if (!p) return false;
    const hasRole = p.role === "student" || p.role === "teacher";
    const hasDepartment = !!(p.department && p.department.toString().trim().length > 0);
    const hasCourses = Array.isArray(p.courses) && p.courses.length > 0;
    return hasRole && hasDepartment && hasCourses;
  }

  async function refreshProfile(): Promise<Profile | null> {
    // Try to use the current firebaseUser state, fallback to auth.currentUser if needed
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

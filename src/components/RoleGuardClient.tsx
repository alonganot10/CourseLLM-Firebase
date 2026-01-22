"use client";

import React from "react";
import { useAuth } from "./AuthProviderClient";
import { useRouter } from "next/navigation";

export const RoleGuardClient: React.FC<{
  requiredRole?: "student" | "teacher";
  children: React.ReactNode;
}> = ({ requiredRole, children }) => {
  const { firebaseUser, profile, loading, onboardingRequired } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (onboardingRequired) {
      router.replace("/onboarding");
      return;
    }

    // If a role is required but the profile is missing or incomplete, send to onboarding
    if (requiredRole && (!profile || !profile.role)) {
      router.replace("/onboarding");
      return;
    }

    // If profile exists but role doesn't match requiredRole, redirect to their dashboard
    if (requiredRole && profile?.role && profile.role !== requiredRole) {
      const to = profile.role === "teacher" ? "/teacher" : "/student";
      router.replace(to);
      return;
    }
  }, [loading, firebaseUser, onboardingRequired, profile, requiredRole, router]);

  if (loading || !firebaseUser || onboardingRequired) {
    return <div>Loading...</div>;
  }
  // role matched or not required
  return <>{children}</>;
};

export default RoleGuardClient;

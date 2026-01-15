"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProviderClient";

// Routes that any user (even not signed in) is allowed to see
const PUBLIC_ROUTES = ["/login"];

const AuthRedirector = () => {
  const { firebaseUser, profile, onboardingRequired, loading } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while auth state is still resolving
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isOnboarding = pathname.startsWith("/onboarding");

    // 1) Not signed in → send to /login for any protected route
    if (!firebaseUser) {
      if (!isPublic && !isOnboarding) {
        router.replace("/login");
      }
      return;
    }

    // 2) Signed in but needs onboarding → force /onboarding
    if (onboardingRequired) {
      if (!isOnboarding) {
        router.replace("/onboarding");
      }
      return;
    }

    // 3) Signed in, onboarding complete:
    //    If they are on /login, push them to their dashboard.
    if (pathname === "/" || pathname === "/login") {
      if (profile?.role === "teacher") {
        router.replace("/teacher");
        return;
      }
      if (profile?.role === "student") {
        router.replace("/student");
        return;
      }
      // Fallback if role missing but onboarding is marked complete
      router.replace("/student");
      return;
    }

    // For other routes, do nothing – they’re allowed through.
  }, [firebaseUser, profile, onboardingRequired, loading, pathname, router]);

  return null;
};

export default AuthRedirector;

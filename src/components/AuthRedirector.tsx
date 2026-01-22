"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProviderClient";

const PUBLIC_ROUTES = ["/login"];

const AuthRedirector = () => {
  const { firebaseUser, profile, onboardingRequired, loading } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isOnboarding = pathname.startsWith("/onboarding");

    // 1) Not signed in → only allow /login. (Don't allow /onboarding unsigned.)
    if (!firebaseUser) {
      if (!isPublic) router.replace("/login");
      return;
    }

    // 2) Signed in but needs onboarding → force /onboarding
    if (onboardingRequired) {
      if (!isOnboarding) router.replace("/onboarding");
      return;
    }

    // 3) Signed in, onboarding complete:
    //    If they're currently on onboarding (or login/home), push them to dashboard.
    if (isOnboarding || pathname === "/" || pathname === "/login") {
      if (profile?.role === "teacher") {
        router.replace("/teacher");
        return;
      }
      // default to student if role missing (should be rare once "complete")
      router.replace("/student");
      return;
    }

    // Otherwise allow route through.
  }, [firebaseUser, profile?.role, onboardingRequired, loading, pathname, router]);

  return null;
};

export default AuthRedirector;

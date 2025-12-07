"use client";

import React, { useEffect } from 'react';
import { useAuth } from './AuthProviderClient';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthRedirector() {
  const { firebaseUser, profile, loading, onboardingRequired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // If not logged in, do nothing here
    if (!firebaseUser) return;

    // If onboarding required, navigate to onboarding when on neutral pages (root/login)
    if (onboardingRequired) {
      if (pathname === '/' || pathname === '/login' || pathname === '') {
        router.replace('/onboarding');
      }
      return;
    }

    // If profile exists and we're on neutral pages, go to dashboard
    if (profile && profile.role) {
      const target = profile.role === 'teacher' ? '/teacher' : '/student';
      if (pathname === '/' || pathname === '/login' || pathname === '') {
        router.replace(target);
      }
    }
  }, [loading, firebaseUser, profile, onboardingRequired, pathname, router]);

  return null;
}

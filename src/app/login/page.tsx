"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProviderClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogIn, Loader2 } from "lucide-react"

export default function LoginPage() {
  const {
    signInWithGoogle,
    loading,
    firebaseUser,
    refreshProfile,
    profile,
    onboardingRequired,
  } = useAuth()
  const [navigating, setNavigating] = useState(false)
  const router = useRouter()

  // Decide where a signed-in user should go
  const sendUserAway = async () => {
    try {
      setNavigating(true)

      // Try to use in-memory profile first
      let p = profile

      // If we don't have it yet, refresh from Firestore
      if (!p) {
        p = await refreshProfile()
      }

      // If onboarding is required or profile/role is missing → onboarding
      if (onboardingRequired || !p || !p.role) {
        router.replace("/onboarding")
        return
      }

      // Otherwise route by role
      router.replace(p.role === "teacher" ? "/teacher" : "/student")
    } catch (err) {
      console.error("Error deciding post-login route", err)
      // If anything explodes (Firestore, network, etc.) just send to onboarding
      router.replace("/onboarding")
    }
  }

  // Handle click on "Sign in with Google"
  const handleGoogle = async () => {
    try {
      setNavigating(true)
      await signInWithGoogle()
      // Important:
      // - For popup-based login, onAuthStateChanged will fire and the effect below
      //   will call sendUserAway().
      // - For redirect-based login, this function won't resume; the effect will still
      //   run after redirect when firebaseUser becomes non-null.
    } catch (err) {
      console.error(err)
      setNavigating(false)
    }
  }

  // If the user is already signed in (after redirect or reload), don't stay on /login.
  useEffect(() => {
    if (loading) return

    if (!firebaseUser) {
      // Not signed in → stay on login and hide the overlay if it was showing
      setNavigating(false)
      return
    }

    // Signed in → decide where to go
    void sendUserAway()
  }, [firebaseUser, loading, onboardingRequired]) // profile changes will be picked up via refreshProfile

  // Note: GitHub sign-in removed — only Google sign-in is supported.

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to CourseLLM</CardTitle>
            <CardDescription>
              Sign in with Google to continue — we&apos;ll only store the info needed for your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleGoogle} disabled={loading} size="lg">
                <LogIn className="mr-2" /> Sign in with Google
              </Button>
              {firebaseUser && (
                <div className="text-sm text-muted-foreground">
                  Signed in as {firebaseUser.email}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {navigating && (
        <div className="fixed inset-0 z-50 bg-background/75 flex items-center justify-center">
          <div className="w-full max-w-sm px-6">
            <div className="rounded-lg bg-card p-6 shadow-lg text-center">
              <Loader2 className="mx-auto mb-4 animate-spin" />
              <div className="text-lg font-medium">Signing you in…</div>
              <div className="text-sm text-muted-foreground mt-1">
                We&apos;re taking you to your dashboard.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

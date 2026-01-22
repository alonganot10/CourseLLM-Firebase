"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProviderClient"
import { auth } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogIn, Loader2 } from "lucide-react"
import { signInWithEmail, signUpWithEmail, resetPassword } from "@/lib/authService"

export default function LoginPage() {
  const { signInWithGoogle, loading, firebaseUser, refreshProfile, profile } = useAuth()
  const [navigating, setNavigating] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const router = useRouter()

  const gotoAfterAuth = async () => {
    // Fast path: if profile already in memory use it
    if (profile && profile.role) {
      return router.replace(profile.role === "teacher" ? "/teacher" : "/student")
    }

    // Otherwise try to refresh but don't wait long — race against a short timeout
    const refreshPromise = refreshProfile()
    const res = await Promise.race([
      refreshPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 700)),
    ])

    if (res && (res as any).role) {
      return router.replace((res as any).role === "teacher" ? "/teacher" : "/student")
    }

    // Fallback: optimistic default. RoleGuard will correct if needed.
    return router.replace("/student")
  }

  const handleGoogle = async () => {
    try {
      setError(null)
      setInfo(null)
      setNavigating(true)
      await signInWithGoogle()
      // After this, the browser goes to Google and then back.
      // When it returns, AuthProvider + AuthRedirector will handle navigation.
    } catch (err) {
      setNavigating(false)
      console.error("Google sign-in failed", err)
      setError("Google sign-in failed. Check console for details.")
    }
  }

  const handleEmailSignIn = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    setNavigating(true)
    try {
      await signInWithEmail(auth, email.trim(), password)
      await gotoAfterAuth()
    } catch (e: any) {
      setNavigating(false)
      setError(e?.message ?? "Failed to sign in with email/password.")
    } finally {
      setBusy(false)
    }
  }

  const handleEmailSignUp = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    setNavigating(true)
    try {
      await signUpWithEmail(auth, email.trim(), password)
      setInfo("Account created. If email verification is enabled, check your inbox.")
      await gotoAfterAuth()
    } catch (e: any) {
      setNavigating(false)
      setError(e?.message ?? "Failed to create account.")
    } finally {
      setBusy(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await resetPassword(auth, email.trim())
      setInfo("Password reset email sent (if the address exists).")
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset email.")
    } finally {
      setBusy(false)
    }
  }

  const disableEmailActions = loading || busy
  const emailOk = email.trim().length > 0
  const passwordOk = password.length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to CourseLLM</CardTitle>
            <CardDescription>
              Sign in with Google or email/password to continue — we&apos;ll only store the info needed for your profile.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col space-y-4">
              {/* Google */}
              <Button onClick={handleGoogle} disabled={loading} size="lg">
                <LogIn className="mr-2" /> Sign in with Google
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">or</div>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Email/Password */}
              <div className="grid gap-2">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleEmailSignIn}
                    disabled={disableEmailActions || !emailOk || !passwordOk}
                    size="lg"
                    className="flex-1"
                  >
                    Sign in
                  </Button>

                  <Button
                    onClick={handleEmailSignUp}
                    disabled={disableEmailActions || !emailOk || !passwordOk}
                    size="lg"
                    variant="secondary"
                    className="flex-1"
                  >
                    Sign up
                  </Button>
                </div>

                <Button
                  onClick={handleForgotPassword}
                  disabled={disableEmailActions || !emailOk}
                  variant="ghost"
                  className="justify-start px-0"
                >
                  Forgot password?
                </Button>

                {error && <div className="text-sm text-destructive">{error}</div>}
                {info && <div className="text-sm text-muted-foreground">{info}</div>}

                {firebaseUser && (
                  <div className="text-sm text-muted-foreground">
                    Signed in as {firebaseUser.email}
                  </div>
                )}
              </div>
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

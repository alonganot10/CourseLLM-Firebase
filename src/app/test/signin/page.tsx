"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithCustomToken } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function TestSigninPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (!token) {
      router.replace("/login")
      return
    }

    async function run(token: string) {
      try {
        await signInWithCustomToken(auth, token)
        // After signing in, navigate to a neutral page so the app's AuthRedirector
        // can inspect the profile/onboarding state and forward to the correct
        // dashboard (or onboarding). We use /login as a neutral entry point.
        router.replace('/login')
      } catch (e) {
        console.error("test sign-in failed", e)
        router.replace("/login")
      }
    }
    run(token)
  }, [router])

  return <div className="p-6">Signing in test user…</div>
}

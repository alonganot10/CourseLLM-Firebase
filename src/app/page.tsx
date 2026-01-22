import { redirect } from "next/navigation"

export default function Home() {
  // Redirect root to the login page so users land on the auth flow first.
  redirect("/login")
}

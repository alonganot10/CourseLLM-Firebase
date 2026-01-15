"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "@/lib/firebase"

export default function TokenDebugPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Not signed in. Go log in first.");
        return;
      }

      try {
        const t = await user.getIdToken();
        console.log("ID_TOKEN:", t); // this is what you’ll copy from DevTools if you want
        setToken(t);
      } catch (err) {
        console.error(err);
        setError("Failed to get ID token");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">ID Token Debug</h1>
      {error && <p className="text-red-500">{error}</p>}
      {!error && !token && <p>Loading token...</p>}
      {token && (
        <div className="space-y-2">
          <p>
            Copy this token and use it in curl as{" "}
            <code>Authorization: Bearer &lt;TOKEN&gt;</code>
          </p>
          <textarea
            value={token}
            readOnly
            className="w-full h-48 border p-2 text-xs break-all"
          />
        </div>
      )}
    </div>
  );
}

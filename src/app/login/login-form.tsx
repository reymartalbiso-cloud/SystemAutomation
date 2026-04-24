"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signIn, useCurrentUser } from "@/lib/auth-client";
import { seedIfEmpty } from "@/lib/store";

export function LoginForm() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Make sure the demo store is seeded as soon as the login page opens.
  useEffect(() => {
    seedIfEmpty();
  }, []);

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.role === "ADMIN" ? "/admin" : "/personnel");
    }
  }, [currentUser, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { user, error: err } = signIn(username, password);
    if (err || !user) {
      setError(err ?? "Could not sign in.");
      setLoading(false);
      return;
    }
    router.replace(user.role === "ADMIN" ? "/admin" : "/personnel");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. admin"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Sign in
      </button>
    </form>
  );
}

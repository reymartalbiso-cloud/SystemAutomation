"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser, type SessionUser } from "@/lib/auth-client";
import { useHydrated } from "@/lib/store";

export function RouteGuard({
  role,
  children,
}: {
  role: "ADMIN" | "PERSONNEL";
  children: (user: SessionUser) => React.ReactNode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useCurrentUser();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/personnel");
    }
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}

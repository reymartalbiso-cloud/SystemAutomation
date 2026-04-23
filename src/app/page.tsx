"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth-client";

export default function RootPage() {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    } else if (user.role === "ADMIN") {
      router.replace("/admin");
    } else {
      router.replace("/personnel");
    }
  }, [user, router]);

  return null;
}

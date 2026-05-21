"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        await apiClient("/auth/me");
        router.replace("/dashboard");
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );
}

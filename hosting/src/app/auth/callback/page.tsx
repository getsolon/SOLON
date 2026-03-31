"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleOAuthCallback } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const token = handleOAuthCallback();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}

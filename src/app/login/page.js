"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-page text-primary-text">
      <div className="text-center">
        <p className="text-sm font-medium">Redirecting...</p>
      </div>
    </div>
  );
}

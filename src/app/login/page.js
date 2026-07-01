"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-page text-primary-text">
      <Navbar />
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Redirecting to workspace...</p>
      </div>
    </div>
  );
}

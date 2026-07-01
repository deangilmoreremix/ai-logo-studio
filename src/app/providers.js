"use client";

import { SessionProvider } from "@/context/SessionContext";

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

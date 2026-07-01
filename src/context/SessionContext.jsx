"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext({
  sessionId: null,
  credits: 0,
  setCredits: () => {},
});

const SESSION_KEY = "logo_studio_session_id";

function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    let id = null;
    if (typeof window !== "undefined") {
      id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = generateSessionId();
        localStorage.setItem(SESSION_KEY, id);
      }
    }
    setSessionId(id);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, credits, setCredits }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

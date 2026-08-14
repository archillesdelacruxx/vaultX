"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { clearSession, login as doLogin, loadStoredSession, serverLogout, setCookieCache } from "@/lib/auth";
import { setStoredUser } from "@/lib/secure";
import { trpcClient } from "@/lib/trpc";

export interface VaultUser {
  id: number;
  name: string;
  email: string;
  role: string;
  currency: string;
  createdAt: Date;
}

type AuthStatus = "loading" | "signedIn" | "signedOut";

interface AuthContextValue {
  status: AuthStatus;
  user: VaultUser | null;
  needsPin: boolean;
  pinUnlocked: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<VaultUser | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  const refreshMe = useCallback(async () => {
    const me = await trpcClient.auth.me.query();
    setUser(me);
    await setStoredUser(me);
    const { hasPin } = await trpcClient.auth.hasScreenPin.query();
    setNeedsPin(hasPin);
    setPinUnlocked(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadStoredSession();
      const cookie = (await import("@/lib/secure").then((m) => m.getStoredCookie())) ?? null;
      if (!cookie) {
        if (!cancelled) setStatus("signedOut");
        return;
      }
      try {
        await refreshMe();
        if (!cancelled) setStatus("signedIn");
      } catch {
        await clearSession();
        await setStoredUser(null);
        if (!cancelled) setStatus("signedOut");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const result = await doLogin(email, password);
      if (!result.ok) return result.error ?? "Login failed.";
      try {
        await refreshMe();
        setStatus("signedIn");
        return null;
      } catch {
        await clearSession();
        setStatus("signedOut");
        return "Session could not be established.";
      }
    },
    [refreshMe],
  );

  const logout = useCallback(async () => {
    void serverLogout().catch(() => {});
    await clearSession().catch(() => {});
    setCookieCache(null);
    await setStoredUser(null).catch(() => {});
    setUser(null);
    setNeedsPin(false);
    setPinUnlocked(false);
    setStatus("signedOut");
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const res = await trpcClient.auth.verifyScreenPin.mutate({ pin });
    return res.valid;
  }, []);

  const unlock = useCallback(() => setPinUnlocked(true), []);

  const value = useMemo(
    () => ({
      status,
      user,
      needsPin,
      pinUnlocked,
      login,
      logout,
      refreshMe,
      verifyPin,
      unlock,
    }),
    [status, user, needsPin, pinUnlocked, login, logout, refreshMe, verifyPin, unlock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

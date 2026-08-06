"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ScreenLockModal } from "./screen-lock-modal";
import { api } from "~/trpc/react";

interface ScreenLockContextType {
  isLocked: boolean;
  lockScreen: () => void;
  unlockScreen: () => void;
}

const ScreenLockContext = createContext<ScreenLockContextType>({
  isLocked: true,
  lockScreen: () => undefined,
  unlockScreen: () => undefined,
});

export const useScreenLock = () => useContext(ScreenLockContext);

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function ScreenLockProvider({ children, userName }: { children: React.ReactNode; userName?: string }) {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);

  const { data: pinData, isLoading, refetch } = api.auth.hasScreenPin.useQuery(undefined, {
    staleTime: 60_000,
  });

  const lockScreen = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("vaultx_screen_unlocked");
    }
    setIsLocked(true);
  }, []);

  const unlockScreen = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vaultx_screen_unlocked", "true");
    }
    setIsLocked(false);
    void refetch();
  }, [refetch]);

  // Initial check on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("vaultx_screen_unlocked") === "true";
      if (unlocked && pinData?.hasPin) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
      setInitialized(true);
    }
  }, [pinData]);

  // Inactivity listener
  useEffect(() => {
    if (isLocked) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lockScreen();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isLocked, lockScreen]);

  const hasPin = pinData?.hasPin ?? false;
  const isSetupMode = !hasPin;

  return (
    <ScreenLockContext.Provider value={{ isLocked, lockScreen, unlockScreen }}>
      {children}
      {initialized && !isLoading && (
        <ScreenLockModal
          open={isLocked || isSetupMode}
          isSetupMode={isSetupMode}
          onUnlocked={unlockScreen}
          userName={userName}
        />
      )}
    </ScreenLockContext.Provider>
  );
}

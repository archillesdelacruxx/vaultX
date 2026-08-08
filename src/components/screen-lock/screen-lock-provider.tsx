"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ScreenLockModal } from "./screen-lock-modal";
import { useScreenPin } from "~/lib/db/pin-hooks";

interface ScreenLockContextType {
  isLocked: boolean;
  lockScreen: () => void;
  unlockScreen: () => void;
}

const ScreenLockContext = createContext<ScreenLockContextType>({
  isLocked: false,
  lockScreen: () => undefined,
  unlockScreen: () => undefined,
});

export const useScreenLock = () => useContext(ScreenLockContext);

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function ScreenLockProvider({ children, userName }: { children: React.ReactNode; userName?: string }) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  const { hasPin } = useScreenPin();

  const lockScreen = useCallback(() => {
    if (!hasPin) return; // no PIN set -> nothing to lock
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("vaultx_screen_unlocked");
    }
    setIsLocked(true);
  }, [hasPin]);

  const unlockScreen = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vaultx_screen_unlocked", "true");
    }
    setIsLocked(false);
  }, []);

  // Initial check on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlocked = sessionStorage.getItem("vaultx_screen_unlocked") === "true";
    setIsLocked(!unlocked && hasPin);
    setInitialized(true);
  }, [hasPin]);

  // Keep state consistent if the PIN is removed while unlocked
  useEffect(() => {
    if (initialized && !hasPin) {
      setIsLocked(false);
    }
  }, [hasPin, initialized]);

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

  return (
    <ScreenLockContext.Provider value={{ isLocked, lockScreen, unlockScreen }}>
      {children}
      {initialized && isLocked ? (
        <ScreenLockModal open={isLocked} onUnlocked={unlockScreen} userName={userName} />
      ) : null}
    </ScreenLockContext.Provider>
  );
}

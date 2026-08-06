"use client";

import { useEffect, useState } from "react";

export function useVaultLock() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Check session storage
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("vaultx_unlocked") === "true";
      setIsUnlocked(unlocked);
    }
  }, []);

  const requestUnlock = (onUnlocked?: () => void) => {
    if (isUnlocked) {
      if (onUnlocked) onUnlocked();
      return;
    }
    if (onUnlocked) {
      setPendingAction(() => onUnlocked);
    }
    setShowPinModal(true);
  };

  const handleSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const lockVault = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("vaultx_unlocked");
    }
    setIsUnlocked(false);
  };

  return {
    isUnlocked,
    showPinModal,
    requestUnlock,
    handleSuccess,
    lockVault,
    setShowPinModal,
  };
}

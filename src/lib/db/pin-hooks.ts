"use client";

import bcrypt from "bcryptjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { db, getUserId } from "~/lib/db/db";
import { queuePinOp } from "~/lib/db/sync-engine";
import { useSync } from "~/lib/db/sync-context";
import { api } from "~/trpc/react";

export function useScreenPin() {
  const { isOnline, syncNow } = useSync();

  const verifyServer = api.auth.verifyScreenPin.useMutation();
  const setPinServer = api.auth.setScreenPin.useMutation();
  const removePinServer = api.auth.removeScreenPin.useMutation();
  const resetPinServer = api.auth.resetScreenPinWithPassword.useMutation();

  const localPin = useLiveQuery(
    async () => {
      const uid = await getUserId();
      if (uid == null) return null;
      return (await db.localPin.get(uid)) ?? null;
    },
    [],
    null,
  );

  const hasPin = localPin != null;

  const verify = useCallback(
    async (pin: string): Promise<{ valid: boolean; message?: string }> => {
      if (isOnline) {
        try {
          const res = await verifyServer.mutateAsync({ pin });
          if (!res.valid) return res;
          return { valid: true };
        } catch {
          // network/session failure -> fall back to local verification
        }
      }
      if (!localPin) return { valid: false, message: "No PIN set for this account." };
      try {
        const valid = await bcrypt.compare(pin, localPin.hash);
        return { valid };
      } catch {
        return { valid: false, message: "Verification failed. Please try again." };
      }
    },
    [isOnline, localPin, verifyServer],
  );

  const setPin = useCallback(
    async (pin: string): Promise<void> => {
      const uid = await getUserId();
      if (uid == null) throw new Error("Not signed in.");
      const hash = await bcrypt.hash(pin, 10);
      await db.localPin.put({ userId: uid, hash });
      if (isOnline) {
        await setPinServer.mutateAsync({ pin });
      } else {
        await queuePinOp(hash);
      }
      if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
    },
    [isOnline, syncNow, setPinServer],
  );

  const removePin = useCallback(
    async (pin: string): Promise<void> => {
      const uid = await getUserId();
      if (uid == null) throw new Error("Not signed in.");
      if (isOnline) {
        await removePinServer.mutateAsync({ pin });
      } else {
        const ok = await verify(pin);
        if (!ok.valid) throw new Error(ok.message ?? "Incorrect PIN.");
        await queuePinOp(null);
      }
      await db.localPin.delete(uid);
      if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
    },
    [isOnline, verify, syncNow, removePinServer],
  );

  const resetWithPassword = useCallback(
    async (password: string): Promise<void> => {
      if (!isOnline) throw new Error("You need an internet connection to reset your PIN.");
      const uid = await getUserId();
      if (uid == null) throw new Error("Not signed in.");
      await resetPinServer.mutateAsync({ password });
      await db.localPin.delete(uid);
    },
    [isOnline, resetPinServer],
  );

  return { hasPin, verify, setPin, removePin, resetWithPassword };
}

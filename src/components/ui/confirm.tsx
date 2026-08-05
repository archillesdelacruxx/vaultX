"use client";

import { TriangleAlert } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { Modal } from "./modal";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
};

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state !== null}
        onClose={() => close(false)}
        title={state?.title ?? ""}
        size="sm"
        icon={<TriangleAlert className="h-5 w-5 text-red-500" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={() => close(true)}>
              {state?.confirmLabel ?? "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{state?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

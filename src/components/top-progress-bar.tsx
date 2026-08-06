"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";

export function TopProgressBar() {
  const { pending } = useLinkStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <div
      aria-live="polite"
      aria-label="Loading"
      className={`fixed top-0 z-[120] h-1 w-full overflow-hidden bg-transparent transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 flex h-full w-3/4 min-w-24 items-center overflow-hidden rounded-full bg-brand-600">
        <div
          className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-white/25"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255 255 255 / 0.35), transparent)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </div>
  );
}

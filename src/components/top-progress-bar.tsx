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
    // keep the bar visible for a moment after navigation to avoid flicker
    const t = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none fixed top-0 z-[120] h-0.5 w-full overflow-hidden bg-transparent"
      style={{ height: 2 }}
    >
      <div
        className={`h-full w-3/4 min-w-24 animate-pulse rounded-full bg-brand-600 transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
        style={{
          animationDuration: "0.9s",
        }}
      />
    </div>
  );
}

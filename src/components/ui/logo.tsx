import { cn } from "~/lib/cn";

interface VaultXLogoProps {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  onDark?: boolean;
}

export function VaultXLogo({
  className,
  markClassName,
  wordmark = true,
  onDark = false,
}: VaultXLogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-950",
          markClassName,
        )}
      >
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
          <path d="M32 10 L49 17.5 V31 C49 41.5 42.5 48.5 32 52 C21.5 48.5 15 41.5 15 31 V17.5 Z" fill="#fff" />
          <path d="M27.5 36.5 C27.5 33.7 29.5 31.3 32.1 30.7 V27 A2.4 2.4 0 0 1 36.9 27 V30.7 C39.5 31.3 41.5 33.7 41.5 36.5 C41.5 40.4 38.4 43.5 34.5 43.5 C30.6 43.5 27.5 40.4 27.5 36.5 Z" fill="#1d50f1" />
          <rect x="31.6" y="37.5" width="5.8" height="8.5" rx="2.7" fill="#1d50f1" />
        </svg>
      </span>
      {wordmark ? (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            onDark ? "text-white" : "text-slate-900 dark:text-white",
          )}
        >
          Vault<span className={onDark ? "text-brand-300" : "text-brand-600"}>X</span>
        </span>
      ) : null}
    </span>
  );
}

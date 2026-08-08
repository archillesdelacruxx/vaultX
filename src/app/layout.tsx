import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ConfirmProvider } from "~/components/ui/confirm";
import { ToastProvider } from "~/components/ui/toast";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "VaultX — Personal Digital Vault",
  description: "Your secure personal vault: passwords, notes, finances and more.",
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: ["/icon.svg?v=2"],
    apple: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const themeScript = `(function(){try{var t=localStorage.getItem('vaultx-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TRPCReactProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

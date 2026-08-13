import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { RootLayoutClient } from "./RootLayoutClient";

export const metadata: Metadata = {
  title: "Travel Intelligence Hub",
  description: "Decide where to go, compare destinations for exact dates, and plan the trip.",
};

/**
 * Applied before first paint so a dark-theme user never sees a light flash.
 * Kept inline and tiny for the same reason.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("tih-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <RootLayoutClient
          navLinks={<NavLinks />}
          themeToggle={<ThemeToggle />}
        >
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { RootLayoutClient } from "./RootLayoutClient";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Wanderless",
  description: "Decide where to go, compare destinations for exact dates, and plan the trip.",
};

/**
 * Applied before first paint so a dark-theme user never sees a light flash.
 * Kept inline and tiny for the same reason.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("wanderless-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fraunces.variable}>
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

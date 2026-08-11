import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";

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
        <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
          <aside className="border-b border-line bg-surface-1 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
              <Link href="/" className="block">
                <div className="text-[13px] leading-tight font-semibold tracking-tight">
                  Travel Intelligence
                </div>
                <div className="text-[13px] leading-tight font-semibold tracking-tight text-ink-3">
                  Hub
                </div>
              </Link>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>

            <NavLinks />

            <div className="hidden px-4 py-4 lg:block">
              <ThemeToggle />
            </div>
          </aside>

          <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

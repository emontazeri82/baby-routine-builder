import "./globals.css";

import { Inter } from "next/font/google";
import { cn } from "@/lib/utils/cn";
import Providers from "./provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: {
    default: "Baby Routine Builder",
    template: "%s | Baby Routine Builder",
  },
  description: "Smart routine planning for modern parents",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="scroll-smooth"
    >
      <body
        className={cn(
          inter.variable,
          "min-h-screen",
          "bg-gradient-to-br from-neutral-50 to-neutral-100",
          "text-neutral-900"
        )}
      >
        <Providers>
          <div className="relative min-h-screen flex flex-col max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>
            <Toaster />

            {/* Footer */}
            <footer className="text-center text-xs text-neutral-400 py-6">
              © {new Date().getFullYear()} Baby Routine Builder
            </footer>

          </div>
        </Providers>
      </body>
    </html>
  );
}
